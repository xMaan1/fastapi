import os
import uuid
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from sqlalchemy import create_engine, Column, String, Boolean, DateTime, Float, Integer, Text, JSON, ForeignKey, Table
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
from sqlalchemy.dialects.postgresql import UUID
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Association tables
project_team_members = Table(
    'project_team_members',
    Base.metadata,
    Column('project_id', UUID(as_uuid=True), ForeignKey('projects.id'), primary_key=True),
    Column('user_id', UUID(as_uuid=True), ForeignKey('users.id'), primary_key=True)
)

# Core Models with tenant_id for multi-tenancy

class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=True)  # Nullable for system users
    userName = Column(String, nullable=False, index=True)
    email = Column(String, nullable=False, index=True)
    firstName = Column(String)
    lastName = Column(String)
    hashedPassword = Column(String, nullable=False)
    userRole = Column(String, nullable=False, default="team_member")  # super_admin, project_manager, team_member, client
    avatar = Column(String)
    isActive = Column(Boolean, default=True)
    createdAt = Column(DateTime, default=datetime.utcnow)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    tenant = relationship("Tenant", back_populates="users")
    managed_projects = relationship("Project", foreign_keys="Project.projectManagerId", back_populates="projectManager")
    assigned_tasks = relationship("Task", foreign_keys="Task.assignedToId", back_populates="assignedTo")
    created_tasks = relationship("Task", foreign_keys="Task.createdById", back_populates="createdBy")
    team_projects = relationship("Project", secondary=project_team_members, back_populates="teamMembers")

class Tenant(Base):
    __tablename__ = "tenants"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String, nullable=False)
    domain = Column(String, unique=True, index=True)
    description = Column(Text)
    settings = Column(JSON, default={})
    isActive = Column(Boolean, default=True)
    createdAt = Column(DateTime, default=datetime.utcnow)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    users = relationship("User", back_populates="tenant")
    projects = relationship("Project", back_populates="tenant")
    subscriptions = relationship("Subscription", back_populates="tenant")
    tenant_users = relationship("TenantUser", back_populates="tenant")

class Plan(Base):
    __tablename__ = "plans"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String, nullable=False)
    description = Column(Text)
    planType = Column(String, nullable=False)  # starter, professional, enterprise
    price = Column(Float, nullable=False)
    billingCycle = Column(String, nullable=False)  # monthly, yearly
    maxProjects = Column(Integer)
    maxUsers = Column(Integer)
    features = Column(JSON)  # Store as JSON array
    isActive = Column(Boolean, default=True)
    createdAt = Column(DateTime, default=datetime.utcnow)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    subscriptions = relationship("Subscription", back_populates="plan")

class Subscription(Base):
    __tablename__ = "subscriptions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    tenantId = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    planId = Column(UUID(as_uuid=True), ForeignKey("plans.id"), nullable=False)
    status = Column(String, nullable=False, default="trial")  # active, inactive, cancelled, expired, trial
    startDate = Column(DateTime, nullable=False)
    endDate = Column(DateTime)
    autoRenew = Column(Boolean, default=True)
    createdAt = Column(DateTime, default=datetime.utcnow)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    tenant = relationship("Tenant", back_populates="subscriptions")
    plan = relationship("Plan", back_populates="subscriptions")

class TenantUser(Base):
    __tablename__ = "tenant_users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    tenantId = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    userId = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    role = Column(String, nullable=False)  # owner, admin, manager, member, viewer
    permissions = Column(JSON, default=[])
    isActive = Column(Boolean, default=True)
    invitedBy = Column(UUID(as_uuid=True))
    joinedAt = Column(DateTime, default=datetime.utcnow)
    createdAt = Column(DateTime, default=datetime.utcnow)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    tenant = relationship("Tenant", back_populates="tenant_users")

class Project(Base):
    __tablename__ = "projects"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text)
    status = Column(String, nullable=False, default="planning")  # planning, in_progress, on_hold, completed, cancelled
    priority = Column(String, nullable=False, default="medium")  # low, medium, high, critical
    startDate = Column(String)  # Store as string for compatibility
    endDate = Column(String)
    completionPercent = Column(Integer, default=0)
    budget = Column(Float)
    actualCost = Column(Float, default=0.0)
    projectManagerId = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    notes = Column(Text)
    createdAt = Column(DateTime, default=datetime.utcnow)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    tenant = relationship("Tenant", back_populates="projects")
    projectManager = relationship("User", foreign_keys=[projectManagerId], back_populates="managed_projects")
    teamMembers = relationship("User", secondary=project_team_members, back_populates="team_projects")
    tasks = relationship("Task", back_populates="project")

class Task(Base):
    __tablename__ = "tasks"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text)
    status = Column(String, nullable=False, default="todo")  # todo, in_progress, completed, cancelled
    priority = Column(String, nullable=False, default="medium")  # low, medium, high, critical
    projectId = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    assignedToId = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    createdById = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    dueDate = Column(String)  # Store as string for compatibility
    estimatedHours = Column(Float)
    actualHours = Column(Float, default=0.0)
    tags = Column(Text)  # JSON string
    completedAt = Column(DateTime)
    createdAt = Column(DateTime, default=datetime.utcnow)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    project = relationship("Project", back_populates="tasks")
    assignedTo = relationship("User", foreign_keys=[assignedToId], back_populates="assigned_tasks")
    createdBy = relationship("User", foreign_keys=[createdById], back_populates="created_tasks")

# Database functions
def create_tables():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# User functions
def get_user_by_email(email: str, db: Session) -> Optional[User]:
    return db.query(User).filter(User.email == email).first()

def get_user_by_username(username: str, db: Session) -> Optional[User]:
    return db.query(User).filter(User.userName == username).first()

def get_user_by_id(user_id: str, db: Session) -> Optional[User]:
    return db.query(User).filter(User.id == user_id).first()

def get_all_users(db: Session, tenant_id: str = None, skip: int = 0, limit: int = 100) -> List[User]:
    query = db.query(User)
    if tenant_id:
        query = query.filter(User.tenant_id == tenant_id)
    return query.filter(User.isActive == True).offset(skip).limit(limit).all()

def create_user(user_data: dict, db: Session) -> User:
    db_user = User(**user_data)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

# Tenant functions
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

# Plan functions
def get_plan_by_id(plan_id: str, db: Session) -> Optional[Plan]:
    return db.query(Plan).filter(Plan.id == plan_id).first()

def get_plans(db: Session, skip: int = 0, limit: int = 100) -> List[Plan]:
    return db.query(Plan).filter(Plan.isActive == True).offset(skip).limit(limit).all()

def create_plan(plan_data: dict, db: Session) -> Plan:
    db_plan = Plan(**plan_data)
    db.add(db_plan)
    db.commit()
    db.refresh(db_plan)
    return db_plan

# Project functions
def get_project_by_id(project_id: str, db: Session, tenant_id: str = None) -> Optional[Project]:
    query = db.query(Project).filter(Project.id == project_id)
    if tenant_id:
        query = query.filter(Project.tenant_id == tenant_id)
    return query.first()

def get_all_projects(db: Session, tenant_id: str = None, skip: int = 0, limit: int = 100) -> List[Project]:
    query = db.query(Project)
    if tenant_id:
        query = query.filter(Project.tenant_id == tenant_id)
    return query.offset(skip).limit(limit).all()

def create_project(project_data: dict, db: Session) -> Project:
    db_project = Project(**project_data)
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    return db_project

def update_project(project_id: str, update_data: dict, db: Session, tenant_id: str = None) -> Optional[Project]:
    query = db.query(Project).filter(Project.id == project_id)
    if tenant_id:
        query = query.filter(Project.tenant_id == tenant_id)
    
    project = query.first()
    if project:
        for key, value in update_data.items():
            if hasattr(project, key) and value is not None:
                setattr(project, key, value)
        db.commit()
        db.refresh(project)
    return project

def delete_project(project_id: str, db: Session, tenant_id: str = None) -> bool:
    query = db.query(Project).filter(Project.id == project_id)
    if tenant_id:
        query = query.filter(Project.tenant_id == tenant_id)
    
    project = query.first()
    if project:
        db.delete(project)
        db.commit()
        return True
    return False

# Task functions
def get_task_by_id(task_id: str, db: Session, tenant_id: str = None) -> Optional[Task]:
    query = db.query(Task).filter(Task.id == task_id)
    if tenant_id:
        query = query.filter(Task.tenant_id == tenant_id)
    return query.first()

def get_all_tasks(db: Session, tenant_id: str = None, skip: int = 0, limit: int = 100) -> List[Task]:
    query = db.query(Task)
    if tenant_id:
        query = query.filter(Task.tenant_id == tenant_id)
    return query.offset(skip).limit(limit).all()

def get_tasks_by_project(project_id: str, db: Session, tenant_id: str = None) -> List[Task]:
    query = db.query(Task).filter(Task.projectId == project_id)
    if tenant_id:
        query = query.filter(Task.tenant_id == tenant_id)
    return query.all()

def create_task(task_data: dict, db: Session) -> Task:
    db_task = Task(**task_data)
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task

def update_task(task_id: str, update_data: dict, db: Session, tenant_id: str = None) -> Optional[Task]:
    query = db.query(Task).filter(Task.id == task_id)
    if tenant_id:
        query = query.filter(Task.tenant_id == tenant_id)
    
    task = query.first()
    if task:
        for key, value in update_data.items():
            if hasattr(task, key) and value is not None:
                setattr(task, key, value)
        db.commit()
        db.refresh(task)
    return task

def delete_task(task_id: str, db: Session, tenant_id: str = None) -> bool:
    query = db.query(Task).filter(Task.id == task_id)
    if tenant_id:
        query = query.filter(Task.tenant_id == tenant_id)
    
    task = query.first()
    if task:
        db.delete(task)
        db.commit()
        return True
    return False

# Subscription functions
def create_subscription(subscription_data: dict, db: Session) -> Subscription:
    db_subscription = Subscription(**subscription_data)
    db.add(db_subscription)
    db.commit()
    db.refresh(db_subscription)
    return db_subscription

def get_subscription_by_tenant(tenant_id: str, db: Session) -> Subscription:
    return db.query(Subscription).filter(Subscription.tenantId == tenant_id).first()

# Tenant User functions
def create_tenant_user(tenant_user_data: dict, db: Session) -> TenantUser:
    db_tenant_user = TenantUser(**tenant_user_data)
    db.add(db_tenant_user)
    db.commit()
    db.refresh(db_tenant_user)
    return db_tenant_user

def get_user_tenants(user_id: str, db: Session) -> List[TenantUser]:
    return db.query(TenantUser).filter(
        TenantUser.userId == user_id,
        TenantUser.isActive == True
    ).all()

def get_tenant_users(tenant_id: str, db: Session) -> List[TenantUser]:
    return db.query(TenantUser).filter(
        TenantUser.tenantId == tenant_id,
        TenantUser.isActive == True
    ).all()