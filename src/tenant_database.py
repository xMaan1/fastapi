import os
import uuid
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from sqlalchemy import create_engine, Column, String, Boolean, DateTime, Float, Integer, Text, JSON, ForeignKey, Table
from .database import Base
from sqlalchemy.orm import sessionmaker, Session, relationship
from sqlalchemy.dialects.postgresql import UUID
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Import User model so users table is included in metadata
from .database import User

# Association table for plan features
plan_features = Table(
    'plan_features',
    Base.metadata,
    Column('plan_id', UUID(as_uuid=True), ForeignKey('plans.id'), primary_key=True),
    Column('feature', String, primary_key=True)
)

class Plan(Base):
    __tablename__ = "plans"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String, nullable=False)
    description = Column(Text)
    plan_type = Column(String, nullable=False)  # starter, professional, enterprise
    price = Column(Float, nullable=False)
    billing_cycle = Column(String, nullable=False)  # monthly, yearly
    max_projects = Column(Integer)
    max_users = Column(Integer)
    features = Column(JSON)  # Store as JSON array
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    subscriptions = relationship("Subscription", back_populates="plan")

class Tenant(Base):
    __tablename__ = "tenants"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String, nullable=False)
    domain = Column(String, unique=True, index=True)
    description = Column(Text)
    settings = Column(JSON, default={})
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    subscriptions = relationship("Subscription", back_populates="tenant")
    tenant_users = relationship("TenantUser", back_populates="tenant")
    invitations = relationship("TenantInvitation", back_populates="tenant")

class Subscription(Base):
    __tablename__ = "subscriptions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    plan_id = Column(UUID(as_uuid=True), ForeignKey("plans.id"), nullable=False)
    status = Column(String, nullable=False, default="trial")  # active, inactive, cancelled, expired, trial
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime)
    auto_renew = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    tenant = relationship("Tenant", back_populates="subscriptions")
    plan = relationship("Plan", back_populates="subscriptions")

class TenantUser(Base):
    __tablename__ = "tenant_users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)  # Reference to main users table
    role = Column(String, nullable=False)  # owner, admin, manager, member, viewer
    permissions = Column(JSON, default=[])
    is_active = Column(Boolean, default=True)
    invited_by = Column(UUID(as_uuid=True))
    joined_at = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    tenant = relationship("Tenant", back_populates="tenant_users")

class TenantInvitation(Base):
    __tablename__ = "tenant_invitations"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    email = Column(String, nullable=False)
    role = Column(String, nullable=False)
    permissions = Column(JSON, default=[])
    token = Column(String, unique=True, nullable=False)
    message = Column(Text)
    invited_by = Column(UUID(as_uuid=True), nullable=False)
    is_accepted = Column(Boolean, default=False)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    tenant = relationship("Tenant", back_populates="invitations")

def create_tenant_tables():
    Base.metadata.create_all(bind=engine)

def get_tenant_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Helper functions
def get_plan_by_id(plan_id: str, db: Session) -> Optional[Plan]:
    return db.query(Plan).filter(Plan.id == plan_id).first()

def get_plans(db: Session, skip: int = 0, limit: int = 100) -> List[Plan]:
    return db.query(Plan).filter(Plan.is_active == True).offset(skip).limit(limit).all()

def create_plan(plan_data: dict, db: Session) -> Plan:
    db_plan = Plan(**plan_data)
    db.add(db_plan)
    db.commit()
    db.refresh(db_plan)
    return db_plan

def get_tenant_by_id(tenant_id: str, db: Session) -> Optional[Tenant]:
    return db.query(Tenant).filter(Tenant.id == tenant_id).first()

def get_tenant_by_domain(domain: str, db: Session) -> Optional[Tenant]:
    return db.query(Tenant).filter(Tenant.domain == domain).first()

def create_tenant(tenant_data: dict, db: Session) -> Tenant:
    db_tenant = Tenant(**tenant_data)
    db.add(db_tenant)
    db.commit()
    db.refresh(db_tenant)
    return db_tenant

def create_subscription(subscription_data: dict, db: Session) -> Subscription:
    db_subscription = Subscription(**subscription_data)
    db.add(db_subscription)
    db.commit()
    db.refresh(db_subscription)
    return db_subscription

def get_subscription_by_tenant(tenant_id: str, db: Session) -> Subscription:
    return db.query(Subscription).filter(
        Subscription.tenant_id == tenant_id
    ).first()

def create_tenant_user(tenant_user_data: dict, db: Session) -> TenantUser:
    db_tenant_user = TenantUser(**tenant_user_data)
    db.add(db_tenant_user)
    db.commit()
    db.refresh(db_tenant_user)
    return db_tenant_user

def get_user_tenants(user_id: str, db: Session) -> List[TenantUser]:
    return db.query(TenantUser).filter(
        TenantUser.user_id == user_id,
        TenantUser.is_active == True
    ).all()

def get_tenant_users(tenant_id: str, db: Session) -> List[TenantUser]:
    return db.query(TenantUser).filter(
        TenantUser.tenant_id == tenant_id,
        TenantUser.is_active == True
    ).all()

def create_invitation(invitation_data: dict, db: Session) -> TenantInvitation:
    invitation_data['token'] = str(uuid.uuid4())
    invitation_data['expires_at'] = datetime.utcnow() + timedelta(days=7)
    db_invitation = TenantInvitation(**invitation_data)
    db.add(db_invitation)
    db.commit()
    db.refresh(db_invitation)
    return db_invitation