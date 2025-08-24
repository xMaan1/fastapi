import os
import uuid
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from sqlalchemy import create_engine, Column, String, Boolean, DateTime, Float, Integer, Text, JSON, ForeignKey, Table, func
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
from sqlalchemy.dialects.postgresql import UUID
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# CustomRole and Permission models
class Permission(Base):
    __tablename__ = "permissions"
    code = Column(String, primary_key=True, index=True)  # e.g. 'manage_projects'
    label = Column(String, nullable=False)
    createdAt = Column(DateTime, default=datetime.utcnow)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class CustomRole(Base):
    __tablename__ = "custom_roles"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    tenantId = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    name = Column(String, nullable=False)
    permissions = Column(JSON, default=[])
    createdAt = Column(DateTime, default=datetime.utcnow)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    tenant = relationship("Tenant")

# CustomRole/Permission DB functions
def get_permissions(db: Session) -> List[Permission]:
    return db.query(Permission).all()

def create_permission(permission_data: dict, db: Session) -> Permission:
    db_perm = Permission(**permission_data)
    db.add(db_perm)
    db.commit()
    db.refresh(db_perm)
    return db_perm

def get_custom_roles(tenant_id: str, db: Session) -> List[CustomRole]:
    return db.query(CustomRole).filter(CustomRole.tenantId == tenant_id).all()

def create_custom_role(role_data: dict, db: Session) -> CustomRole:
    db_role = CustomRole(**role_data)
    db.add(db_role)
    db.commit()
    db.refresh(db_role)
    return db_role

def update_custom_role(role_id: str, update_data: dict, db: Session) -> CustomRole:
    role = db.query(CustomRole).filter(CustomRole.id == role_id).first()
    if role:
        for key, value in update_data.items():
            if hasattr(role, key) and value is not None:
                setattr(role, key, value)
        db.commit()
        db.refresh(role)
    return role

def delete_custom_role(role_id: str, db: Session) -> bool:
    role = db.query(CustomRole).filter(CustomRole.id == role_id).first()
    if role:
        db.delete(role)
        db.commit()
        return True
    return False

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
    
    # Custom tenant-specific options relationships
    createdCustomEventTypes = relationship("CustomEventType", back_populates="createdByUser")
    createdCustomDepartments = relationship("CustomDepartment", back_populates="createdByUser")
    createdCustomLeaveTypes = relationship("CustomLeaveType", back_populates="createdByUser")
    createdCustomLeadSources = relationship("CustomLeadSource", back_populates="createdByUser")
    createdCustomContactSources = relationship("CustomContactSource", back_populates="createdByUser")
    createdCustomCompanyIndustries = relationship("CustomCompanyIndustry", back_populates="createdByUser")
    createdCustomContactTypes = relationship("CustomContactType", back_populates="createdByUser")
    createdCustomIndustries = relationship("CustomIndustry", back_populates="createdByUser")

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
    
    # Custom tenant-specific options relationships
    customEventTypes = relationship("CustomEventType", back_populates="tenant")
    customDepartments = relationship("CustomDepartment", back_populates="tenant")
    customLeaveTypes = relationship("CustomLeaveType", back_populates="tenant")
    customLeadSources = relationship("CustomLeadSource", back_populates="tenant")
    customContactSources = relationship("CustomContactSource", back_populates="tenant")
    customCompanyIndustries = relationship("CustomCompanyIndustry", back_populates="tenant")
    customContactTypes = relationship("CustomContactType", back_populates="tenant")
    customIndustries = relationship("CustomIndustry", back_populates="tenant")

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
    parentTaskId = Column(UUID(as_uuid=True), ForeignKey("tasks.id"))  # For subtasks
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
    parent_task = relationship("Task", remote_side=[id], back_populates="subtasks")
    subtasks = relationship("Task", back_populates="parent_task")

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
        # Delete all subtasks first
        subtasks = db.query(Task).filter(Task.parentTaskId == task_id).all()
        for subtask in subtasks:
            db.delete(subtask)
        
        db.delete(task)
        db.commit()
        return True
    return False

# Subtask functions
def get_subtasks_by_parent(parent_task_id: str, db: Session, tenant_id: str = None) -> List[Task]:
    query = db.query(Task).filter(Task.parentTaskId == parent_task_id)
    if tenant_id:
        query = query.filter(Task.tenant_id == tenant_id)
    return query.all()

def get_main_tasks_by_project(project_id: str, db: Session, tenant_id: str = None) -> List[Task]:
    """Get only main tasks (not subtasks) for a project"""
    query = db.query(Task).filter(
        Task.projectId == project_id,
        Task.parentTaskId.is_(None)
    )
    if tenant_id:
        query = query.filter(Task.tenant_id == tenant_id)
    return query.all()

def get_task_with_subtasks(task_id: str, db: Session, tenant_id: str = None) -> Optional[Task]:
    """Get a task with all its subtasks loaded"""
    query = db.query(Task).filter(Task.id == task_id)
    if tenant_id:
        query = query.filter(Task.tenant_id == tenant_id)
    
    task = query.first()
    if task:
        # Load subtasks
        task.subtasks = get_subtasks_by_parent(task_id, db, tenant_id)
    return task

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

# Event model and functions
class Event(Base):
    __tablename__ = "events"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text)
    eventType = Column(String, nullable=False, default="meeting")  # meeting, workshop, deadline, other
    startDate = Column(DateTime, nullable=False)
    endDate = Column(DateTime, nullable=False)
    timezone = Column(String, default="UTC")
    location = Column(String)
    isOnline = Column(Boolean, default=True)
    googleMeetLink = Column(String)
    googleCalendarEventId = Column(String)
    recurrenceType = Column(String)  # none, daily, weekly, monthly, yearly
    recurrenceData = Column(JSON)  # Store recurrence rules as JSON
    reminderMinutes = Column(Integer, default=15)  # Minutes before event
    participants = Column(JSON, default=[])  # List of participant emails
    discussionPoints = Column(JSON, default=[])  # List of discussion points
    attachments = Column(JSON, default=[])  # List of attachment URLs
    projectId = Column(UUID(as_uuid=True), ForeignKey("projects.id"))
    status = Column(String, default="scheduled")  # scheduled, in_progress, completed, cancelled
    createdById = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    createdAt = Column(DateTime, default=datetime.utcnow)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    tenant = relationship("Tenant")
    project = relationship("Project")
    createdBy = relationship("User", foreign_keys=[createdById])

# Event functions
def get_event_by_id(event_id: str, db: Session, tenant_id: str = None) -> Optional[Event]:
    query = db.query(Event).filter(Event.id == event_id)
    if tenant_id:
        query = query.filter(Event.tenant_id == tenant_id)
    return query.first()

def get_all_events(db: Session, tenant_id: str = None, skip: int = 0, limit: int = 100) -> List[Event]:
    query = db.query(Event)
    if tenant_id:
        query = query.filter(Event.tenant_id == tenant_id)
    return query.offset(skip).limit(limit).all()

def create_event(event_data: dict, db: Session) -> Event:
    db_event = Event(**event_data)
    db.add(db_event)
    db.commit()
    db.refresh(db_event)
    return db_event

def update_event(event_id: str, update_data: dict, db: Session, tenant_id: str = None) -> Optional[Event]:
    query = db.query(Event).filter(Event.id == event_id)
    if tenant_id:
        query = query.filter(Event.tenant_id == tenant_id)
    
    event = query.first()
    if event:
        for key, value in update_data.items():
            if hasattr(event, key) and value is not None:
                setattr(event, key, value)
        event.updatedAt = datetime.utcnow()
        db.commit()
        db.refresh(event)
    return event

def delete_event(event_id: str, db: Session, tenant_id: str = None) -> bool:
    query = db.query(Event).filter(Event.id == event_id)
    if tenant_id:
        query = query.filter(Event.tenant_id == tenant_id)
    
    event = query.first()
    if event:
        db.delete(event)
        db.commit()
        return True
    return False

def get_events_by_project(project_id: str, db: Session, tenant_id: str = None) -> List[Event]:
    query = db.query(Event).filter(Event.projectId == project_id)
    if tenant_id:
        query = query.filter(Event.tenant_id == tenant_id)
    return query.all()

def get_events_by_user(user_id: str, db: Session, tenant_id: str = None) -> List[Event]:
    query = db.query(Event).filter(Event.createdById == user_id)
    if tenant_id:
        query = query.filter(Event.tenant_id == tenant_id)
    return query.all()

def get_upcoming_events(db: Session, tenant_id: str = None, days: int = 7) -> List[Event]:
    from datetime import datetime, timedelta
    start_date = datetime.utcnow()
    end_date = start_date + timedelta(days=days)
    
    query = db.query(Event).filter(
        Event.startDate >= start_date,
        Event.startDate <= end_date
    )
    if tenant_id:
        query = query.filter(Event.tenant_id == tenant_id)
    return query.order_by(Event.startDate).all()

# CRM Database Models
class Lead(Base):
    __tablename__ = "leads"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    tenantId = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    firstName = Column(String, nullable=False)
    lastName = Column(String, nullable=False)
    email = Column(String, nullable=False, index=True)
    phone = Column(String)
    company = Column(String)
    jobTitle = Column(String)
    status = Column(String, default="new")
    source = Column(String, default="website")
    assignedTo = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    notes = Column(Text)
    tags = Column(JSON, default=[])
    score = Column(Integer, default=0)
    budget = Column(Float)
    timeline = Column(String)
    convertedToContact = Column(UUID(as_uuid=True), ForeignKey("contacts.id"))
    convertedToOpportunity = Column(UUID(as_uuid=True), ForeignKey("opportunities.id"))
    lastContactDate = Column(DateTime)
    nextFollowUpDate = Column(DateTime)
    createdBy = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    createdAt = Column(DateTime, default=datetime.utcnow)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    tenant = relationship("Tenant")
    assignedUser = relationship("User", foreign_keys=[assignedTo])
    createdByUser = relationship("User", foreign_keys=[createdBy])
    contact = relationship("Contact", foreign_keys=[convertedToContact])
    opportunity = relationship("Opportunity", foreign_keys=[convertedToOpportunity])

class Contact(Base):
    __tablename__ = "contacts"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    tenantId = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    firstName = Column(String, nullable=False)
    lastName = Column(String, nullable=False)
    email = Column(String, nullable=False, index=True)
    phone = Column(String)
    mobile = Column(String)
    jobTitle = Column(String)
    department = Column(String)
    companyId = Column(UUID(as_uuid=True), ForeignKey("companies.id"))
    type = Column(String, default="customer")
    notes = Column(Text)
    tags = Column(JSON, default=[])
    isActive = Column(Boolean, default=True)
    lastContactDate = Column(DateTime)
    nextFollowUpDate = Column(DateTime)
    createdBy = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    createdAt = Column(DateTime, default=datetime.utcnow)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    tenant = relationship("Tenant")
    company = relationship("Company")
    createdByUser = relationship("User", foreign_keys=[createdBy])

class Company(Base):
    __tablename__ = "companies"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    tenantId = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    name = Column(String, nullable=False, index=True)
    industry = Column(String)
    size = Column(String)
    website = Column(String)
    phone = Column(String)
    address = Column(String)
    city = Column(String)
    state = Column(String)
    country = Column(String)
    postalCode = Column(String)
    description = Column(Text)
    notes = Column(Text)
    tags = Column(JSON, default=[])
    isActive = Column(Boolean, default=True)
    annualRevenue = Column(Float)
    employeeCount = Column(Integer)
    foundedYear = Column(Integer)
    createdBy = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    createdAt = Column(DateTime, default=datetime.utcnow)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    tenant = relationship("Tenant")
    createdByUser = relationship("User", foreign_keys=[createdBy])

class Opportunity(Base):
    __tablename__ = "opportunities"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    tenantId = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text)
    stage = Column(String, default="prospecting")
    amount = Column(Float)
    probability = Column(Integer, default=50)
    expectedCloseDate = Column(DateTime)
    leadId = Column(UUID(as_uuid=True), ForeignKey("leads.id"))
    contactId = Column(UUID(as_uuid=True), ForeignKey("contacts.id"))
    companyId = Column(UUID(as_uuid=True), ForeignKey("companies.id"))
    assignedTo = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    notes = Column(Text)
    tags = Column(JSON, default=[])
    closedDate = Column(DateTime)
    wonAmount = Column(Float)
    lostReason = Column(String)
    createdBy = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    createdAt = Column(DateTime, default=datetime.utcnow)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    tenant = relationship("Tenant")
    lead = relationship("Lead", foreign_keys=[leadId])
    contact = relationship("Contact", foreign_keys=[contactId])
    company = relationship("Company", foreign_keys=[companyId])
    assignedUser = relationship("User", foreign_keys=[assignedTo])
    createdByUser = relationship("User", foreign_keys=[createdBy])

class SalesActivity(Base):
    __tablename__ = "sales_activities"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    tenantId = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    type = Column(String, nullable=False)
    subject = Column(String, nullable=False)
    description = Column(Text)
    dueDate = Column(DateTime)
    completed = Column(Boolean, default=False)
    notes = Column(Text)
    leadId = Column(UUID(as_uuid=True), ForeignKey("leads.id"))
    opportunityId = Column(UUID(as_uuid=True), ForeignKey("opportunities.id"))
    contactId = Column(UUID(as_uuid=True), ForeignKey("contacts.id"))
    companyId = Column(UUID(as_uuid=True), ForeignKey("companies.id"))
    createdBy = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    assignedTo = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    completedAt = Column(DateTime)
    createdAt = Column(DateTime, default=datetime.utcnow)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    tenant = relationship("Tenant")
    lead = relationship("Lead", foreign_keys=[leadId])
    opportunity = relationship("Opportunity", foreign_keys=[opportunityId])
    contact = relationship("Contact", foreign_keys=[contactId])
    company = relationship("Company", foreign_keys=[companyId])
    createdByUser = relationship("User", foreign_keys=[createdBy])
    assignedUser = relationship("User", foreign_keys=[assignedTo])

# CRM Database Functions
def get_leads(db: Session, tenant_id: str = None, skip: int = 0, limit: int = 100) -> List[Lead]:
    query = db.query(Lead)
    if tenant_id:
        query = query.filter(Lead.tenantId == tenant_id)
    return query.offset(skip).limit(limit).all()

def get_lead_by_id(lead_id: str, db: Session, tenant_id: str = None) -> Optional[Lead]:
    query = db.query(Lead).filter(Lead.id == lead_id)
    if tenant_id:
        query = query.filter(Lead.tenantId == tenant_id)
    return query.first()

def create_lead(lead_data: dict, db: Session) -> Lead:
    db_lead = Lead(**lead_data)
    db.add(db_lead)
    db.commit()
    db.refresh(db_lead)
    return db_lead

def update_lead(lead_id: str, update_data: dict, db: Session, tenant_id: str = None) -> Optional[Lead]:
    query = db.query(Lead).filter(Lead.id == lead_id)
    if tenant_id:
        query = query.filter(Lead.tenantId == tenant_id)
    
    lead = query.first()
    if lead:
        for key, value in update_data.items():
            if hasattr(lead, key) and value is not None:
                setattr(lead, key, value)
        lead.updatedAt = datetime.utcnow()
        db.commit()
        db.refresh(lead)
    return lead

def delete_lead(lead_id: str, db: Session, tenant_id: str = None) -> bool:
    query = db.query(Lead).filter(Lead.id == lead_id)
    if tenant_id:
        query = query.filter(Lead.tenantId == tenant_id)
    
    lead = query.first()
    if lead:
        db.delete(lead)
        db.commit()
        return True
    return False

def get_contacts(db: Session, tenant_id: str = None, skip: int = 0, limit: int = 100) -> List[Contact]:
    query = db.query(Contact)
    if tenant_id:
        query = query.filter(Contact.tenantId == tenant_id)
    return query.offset(skip).limit(limit).all()

def get_contact_by_id(contact_id: str, db: Session, tenant_id: str = None) -> Optional[Contact]:
    query = db.query(Contact).filter(Contact.id == contact_id)
    if tenant_id:
        query = query.filter(Contact.tenantId == tenant_id)
    return query.first()

def create_contact(contact_data: dict, db: Session) -> Contact:
    db_contact = Contact(**contact_data)
    db.add(db_contact)
    db.commit()
    db.refresh(db_contact)
    return db_contact

def update_contact(contact_id: str, update_data: dict, db: Session, tenant_id: str = None) -> Optional[Contact]:
    query = db.query(Contact).filter(Contact.id == contact_id)
    if tenant_id:
        query = query.filter(Contact.tenantId == tenant_id)
    
    contact = query.first()
    if contact:
        for key, value in update_data.items():
            if hasattr(contact, key) and value is not None:
                setattr(contact, key, value)
        contact.updatedAt = datetime.utcnow()
        db.commit()
        db.refresh(contact)
    return contact

def delete_contact(contact_id: str, db: Session, tenant_id: str = None) -> bool:
    query = db.query(Contact).filter(Contact.id == contact_id)
    if tenant_id:
        query = query.filter(Contact.tenantId == tenant_id)
    
    contact = query.first()
    if contact:
        db.delete(contact)
        db.commit()
        return True
    return False

def get_companies(db: Session, tenant_id: str = None, skip: int = 0, limit: int = 100) -> List[Company]:
    query = db.query(Company)
    if tenant_id:
        query = query.filter(Company.tenantId == tenant_id)
    return query.offset(skip).limit(limit).all()

def get_company_by_id(company_id: str, db: Session, tenant_id: str = None) -> Optional[Company]:
    query = db.query(Company).filter(Company.id == company_id)
    if tenant_id:
        query = query.filter(Company.tenantId == tenant_id)
    return query.first()

def create_company(company_data: dict, db: Session) -> Company:
    db_company = Company(**company_data)
    db.add(db_company)
    db.commit()
    db.refresh(db_company)
    return db_company

def update_company(company_id: str, update_data: dict, db: Session, tenant_id: str = None) -> Optional[Company]:
    query = db.query(Company).filter(Company.id == company_id)
    if tenant_id:
        query = query.filter(Company.tenantId == tenant_id)
    
    company = query.first()
    if company:
        for key, value in update_data.items():
            if hasattr(company, key) and value is not None:
                setattr(company, key, value)
        company.updatedAt = datetime.utcnow()
        db.commit()
        db.refresh(company)
    return company

def delete_company(company_id: str, db: Session, tenant_id: str = None) -> bool:
    query = db.query(Company).filter(Company.id == company_id)
    if tenant_id:
        query = query.filter(Company.tenantId == tenant_id)
    
    company = query.first()
    if company:
        db.delete(company)
        db.commit()
        return True
    return False

def get_opportunities(db: Session, tenant_id: str = None, skip: int = 0, limit: int = 100) -> List[Opportunity]:
    query = db.query(Opportunity)
    if tenant_id:
        query = query.filter(Opportunity.tenantId == tenant_id)
    return query.offset(skip).limit(limit).all()

def get_opportunity_by_id(opportunity_id: str, db: Session, tenant_id: str = None) -> Optional[Opportunity]:
    query = db.query(Opportunity).filter(Opportunity.id == opportunity_id)
    if tenant_id:
        query = query.filter(Opportunity.tenantId == tenant_id)
    return query.first()

def create_opportunity(opportunity_data: dict, db: Session) -> Opportunity:
    db_opportunity = Opportunity(**opportunity_data)
    db.add(db_opportunity)
    db.commit()
    db.refresh(db_opportunity)
    return db_opportunity

def update_opportunity(opportunity_id: str, update_data: dict, db: Session, tenant_id: str = None) -> Optional[Opportunity]:
    query = db.query(Opportunity).filter(Opportunity.id == opportunity_id)
    if tenant_id:
        query = query.filter(Opportunity.tenantId == tenant_id)
    
    opportunity = query.first()
    if opportunity:
        for key, value in update_data.items():
            if hasattr(opportunity, key) and value is not None:
                setattr(opportunity, key, value)
        opportunity.updatedAt = datetime.utcnow()
        db.commit()
        db.refresh(opportunity)
    return opportunity

def delete_opportunity(opportunity_id: str, db: Session, tenant_id: str = None) -> bool:
    query = db.query(Opportunity).filter(Opportunity.id == opportunity_id)
    if tenant_id:
        query = query.filter(Opportunity.tenantId == tenant_id)
    
    opportunity = query.first()
    if opportunity:
        db.delete(opportunity)
        db.commit()
        return True
    return False

def get_sales_activities(db: Session, tenant_id: str = None, skip: int = 0, limit: int = 100) -> List[SalesActivity]:
    query = db.query(SalesActivity)
    if tenant_id:
        query = query.filter(SalesActivity.tenantId == tenant_id)
    return query.offset(skip).limit(limit).all()

def get_sales_activity_by_id(activity_id: str, db: Session, tenant_id: str = None) -> Optional[SalesActivity]:
    query = db.query(SalesActivity).filter(SalesActivity.id == activity_id)
    if tenant_id:
        query = query.filter(SalesActivity.tenantId == tenant_id)
    return query.first()

def create_sales_activity(activity_data: dict, db: Session) -> SalesActivity:
    db_activity = SalesActivity(**activity_data)
    db.add(db_activity)
    db.commit()
    db.refresh(db_activity)
    return db_activity

def update_sales_activity(activity_id: str, update_data: dict, db: Session, tenant_id: str = None) -> Optional[SalesActivity]:
    query = db.query(SalesActivity).filter(SalesActivity.id == activity_id)
    if tenant_id:
        query = query.filter(SalesActivity.tenantId == tenant_id)
    
    activity = query.first()
    if activity:
        for key, value in update_data.items():
            if hasattr(activity, key) and value is not None:
                setattr(activity, key, value)
        activity.updatedAt = datetime.utcnow()
        db.commit()
        db.refresh(activity)
    return activity

def delete_sales_activity(activity_id: str, db: Session, tenant_id: str = None) -> bool:
    query = db.query(SalesActivity).filter(SalesActivity.id == activity_id)
    if tenant_id:
        query = query.filter(SalesActivity.tenantId == tenant_id)
    
    activity = query.first()
    if activity:
        db.delete(activity)
        db.commit()
        return True
    return False

def get_crm_dashboard_data(db: Session, tenant_id: str) -> dict:
    """Get CRM dashboard metrics and data"""
    from sqlalchemy import func
    
    # Get counts
    total_leads = db.query(func.count(Lead.id)).filter(Lead.tenantId == tenant_id).scalar() or 0
    active_leads = db.query(func.count(Lead.id)).filter(
        Lead.tenantId == tenant_id,
        Lead.status.in_(["new", "contacted", "qualified", "proposal_sent", "negotiation"])
    ).scalar() or 0
    
    total_contacts = db.query(func.count(Contact.id)).filter(Contact.tenantId == tenant_id).scalar() or 0
    total_companies = db.query(func.count(Company.id)).filter(Company.tenantId == tenant_id).scalar() or 0
    
    total_opportunities = db.query(func.count(Opportunity.id)).filter(Opportunity.tenantId == tenant_id).scalar() or 0
    open_opportunities = db.query(func.count(Opportunity.id)).filter(
        Opportunity.tenantId == tenant_id,
        Opportunity.stage.in_(["prospecting", "qualification", "proposal", "negotiation"])
    ).scalar() or 0
    
    # Get revenue data
    total_revenue = db.query(func.coalesce(func.sum(Opportunity.wonAmount), 0)).filter(
        Opportunity.tenantId == tenant_id,
        Opportunity.stage == "closed_won"
    ).scalar() or 0
    
    projected_revenue = db.query(func.coalesce(func.sum(Opportunity.amount), 0)).filter(
        Opportunity.tenantId == tenant_id,
        Opportunity.stage.in_(["prospecting", "qualification", "proposal", "negotiation"])
    ).scalar() or 0
    
    # Calculate conversion rate
    conversion_rate = 0
    if total_leads > 0:
        converted_leads = db.query(func.count(Lead.id)).filter(
            Lead.tenantId == tenant_id,
            Lead.status.in_(["won", "lost"])
        ).scalar() or 0
        conversion_rate = (converted_leads / total_leads) * 100
    
    # Calculate average deal size
    avg_deal_size = 0
    if total_opportunities > 0:
        avg_deal_size = projected_revenue / total_opportunities
    
    return {
        "totalLeads": total_leads,
        "activeLeads": active_leads,
        "totalContacts": total_contacts,
        "totalCompanies": total_companies,
        "totalOpportunities": total_opportunities,
        "openOpportunities": open_opportunities,
        "totalRevenue": total_revenue,
        "projectedRevenue": projected_revenue,
        "conversionRate": round(conversion_rate, 2),
        "averageDealSize": round(avg_deal_size, 2)
    }

# HRM Models
class Employee(Base):
    __tablename__ = "employees"
    
    id = Column(String, primary_key=True, index=True)
    firstName = Column(String, nullable=False)
    lastName = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    phone = Column(String)
    dateOfBirth = Column(String)
    hireDate = Column(String, nullable=False)
    employeeId = Column(String, unique=True, nullable=False, index=True)
    department = Column(String, nullable=False)
    position = Column(String, nullable=False)
    employeeType = Column(String, nullable=False)
    employmentStatus = Column(String, nullable=False)
    managerId = Column(String)
    salary = Column(Float)
    address = Column(String)
    emergencyContact = Column(String)
    emergencyPhone = Column(String)
    skills = Column(JSON, default=list)
    certifications = Column(JSON, default=list)
    notes = Column(String)
    tenantId = Column(String, nullable=False, index=True)
    createdBy = Column(String, nullable=False)
    createdAt = Column(DateTime, default=datetime.utcnow)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class JobPosting(Base):
    __tablename__ = "job_postings"
    
    id = Column(String, primary_key=True, index=True)
    title = Column(String, nullable=False)
    department = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    requirements = Column(JSON, default=list)
    responsibilities = Column(JSON, default=list)
    location = Column(String, nullable=False)
    type = Column(String, nullable=False)
    salaryRange = Column(String)
    benefits = Column(JSON, default=list)
    status = Column(String, nullable=False)
    openDate = Column(String, nullable=False)
    closeDate = Column(String)
    hiringManagerId = Column(String)
    tags = Column(JSON, default=list)
    tenantId = Column(String, nullable=False, index=True)
    createdBy = Column(String, nullable=False)
    createdAt = Column(DateTime, default=datetime.utcnow)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Application(Base):
    __tablename__ = "applications"
    
    id = Column(String, primary_key=True, index=True)
    jobPostingId = Column(String, nullable=False, index=True)
    firstName = Column(String, nullable=False)
    lastName = Column(String, nullable=False)
    email = Column(String, nullable=False)
    phone = Column(String)
    resume = Column(String)
    coverLetter = Column(String)
    experience = Column(Text)
    education = Column(Text)
    skills = Column(JSON, default=list)
    status = Column(String, nullable=False)
    assignedTo = Column(String)
    notes = Column(Text)
    interviewDate = Column(String)
    interviewNotes = Column(Text)
    tenantId = Column(String, nullable=False, index=True)
    createdBy = Column(String, nullable=False)
    createdAt = Column(DateTime, default=datetime.utcnow)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class PerformanceReview(Base):
    __tablename__ = "performance_reviews"
    
    id = Column(String, primary_key=True, index=True)
    employeeId = Column(String, nullable=False, index=True)
    reviewerId = Column(String, nullable=False)
    reviewType = Column(String, nullable=False)
    reviewPeriod = Column(String, nullable=False)
    reviewDate = Column(String, nullable=False)
    status = Column(String, nullable=False)
    goals = Column(JSON, default=list)
    achievements = Column(JSON, default=list)
    areasOfImprovement = Column(JSON, default=list)
    overallRating = Column(Integer)
    technicalRating = Column(Integer)
    communicationRating = Column(Integer)
    teamworkRating = Column(Integer)
    leadershipRating = Column(Integer)
    comments = Column(Text)
    nextReviewDate = Column(String)
    tenantId = Column(String, nullable=False, index=True)
    createdBy = Column(String, nullable=False)
    createdAt = Column(DateTime, default=datetime.utcnow)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class TimeEntry(Base):
    __tablename__ = "time_entries"
    
    id = Column(String, primary_key=True, index=True)
    employeeId = Column(String, nullable=False, index=True)
    date = Column(String, nullable=False)
    clockIn = Column(String, nullable=False)
    clockOut = Column(String)
    totalHours = Column(Float)
    overtimeHours = Column(Float)
    projectId = Column(String)
    taskId = Column(String)
    notes = Column(Text)
    status = Column(String, default="active")
    tenantId = Column(String, nullable=False, index=True)
    createdBy = Column(String, nullable=False)
    createdAt = Column(DateTime, default=datetime.utcnow)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class LeaveRequest(Base):
    __tablename__ = "leave_requests"
    
    id = Column(String, primary_key=True, index=True)
    employeeId = Column(String, nullable=False, index=True)
    leaveType = Column(String, nullable=False)
    startDate = Column(String, nullable=False)
    endDate = Column(String, nullable=False)
    totalDays = Column(Float, nullable=False)
    reason = Column(Text, nullable=False)
    status = Column(String, nullable=False)
    approvedBy = Column(String)
    approvedAt = Column(String)
    rejectionReason = Column(Text)
    notes = Column(Text)
    tenantId = Column(String, nullable=False, index=True)
    createdBy = Column(String, nullable=False)
    createdAt = Column(DateTime, default=datetime.utcnow)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Payroll(Base):
    __tablename__ = "payroll"
    
    id = Column(String, primary_key=True, index=True)
    employeeId = Column(String, nullable=False, index=True)
    payPeriod = Column(String, nullable=False)
    startDate = Column(String, nullable=False)
    endDate = Column(String, nullable=False)
    basicSalary = Column(Float, nullable=False)
    allowances = Column(Float, default=0)
    deductions = Column(Float, default=0)
    overtimePay = Column(Float, default=0)
    bonus = Column(Float, default=0)
    netPay = Column(Float, nullable=False)
    status = Column(String, nullable=False)
    paymentDate = Column(String)
    notes = Column(Text)
    tenantId = Column(String, nullable=False, index=True)
    createdBy = Column(String, nullable=False)
    createdAt = Column(DateTime, default=datetime.utcnow)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Benefits(Base):
    __tablename__ = "benefits"
    
    id = Column(String, primary_key=True, index=True)
    employeeId = Column(String, nullable=False, index=True)
    benefitType = Column(String, nullable=False)
    provider = Column(String, nullable=False)
    policyNumber = Column(String)
    startDate = Column(String, nullable=False)
    endDate = Column(String)
    monthlyCost = Column(Float, nullable=False)
    employeeContribution = Column(Float, nullable=False)
    employerContribution = Column(Float, nullable=False)
    status = Column(String, default="active")
    notes = Column(Text)
    tenantId = Column(String, nullable=False, index=True)
    createdBy = Column(String, nullable=False)
    createdAt = Column(DateTime, default=datetime.utcnow)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Training(Base):
    __tablename__ = "training"
    
    id = Column(String, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    trainingType = Column(String, nullable=False)
    duration = Column(String, nullable=False)
    cost = Column(Float, nullable=False)
    provider = Column(String, nullable=False)
    startDate = Column(String, nullable=False)
    endDate = Column(String, nullable=False)
    maxParticipants = Column(Integer)
    status = Column(String, nullable=False)
    materials = Column(JSON, default=list)
    objectives = Column(JSON, default=list)
    prerequisites = Column(JSON, default=list)
    tenantId = Column(String, nullable=False, index=True)
    createdBy = Column(String, nullable=False)
    createdAt = Column(DateTime, default=datetime.utcnow)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class TrainingEnrollment(Base):
    __tablename__ = "training_enrollments"
    
    id = Column(String, primary_key=True, index=True)
    trainingId = Column(String, nullable=False, index=True)
    employeeId = Column(String, nullable=False, index=True)
    enrollmentDate = Column(String, nullable=False)
    completionDate = Column(String)
    status = Column(String, nullable=False)
    score = Column(Integer)
    certificate = Column(String)
    feedback = Column(Text)
    tenantId = Column(String, nullable=False, index=True)
    createdBy = Column(String, nullable=False)
    createdAt = Column(DateTime, default=datetime.utcnow)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# HRM CRUD Functions
def get_employees(db: Session, tenant_id: str, skip: int = 0, limit: int = 100):
    return db.query(Employee).filter(Employee.tenantId == tenant_id).offset(skip).limit(limit).all()

def get_employee_by_id(db: Session, employee_id: str, tenant_id: str):
    return db.query(Employee).filter(Employee.id == employee_id, Employee.tenantId == tenant_id).first()

def create_employee(db: Session, employee: Employee):
    db.add(employee)
    db.commit()
    db.refresh(employee)
    return employee

def update_employee(db: Session, employee_id: str, employee_update: dict, tenant_id: str):
    employee = get_employee_by_id(db, employee_id, tenant_id)
    if employee:
        for key, value in employee_update.items():
            setattr(employee, key, value)
        employee.updatedAt = datetime.utcnow()
        db.commit()
        db.refresh(employee)
    return employee

def delete_employee(db: Session, employee_id: str, tenant_id: str):
    employee = get_employee_by_id(db, employee_id, tenant_id)
    if employee:
        db.delete(employee)
        db.commit()
        return True
    return False

def get_job_postings(db: Session, tenant_id: str, skip: int = 0, limit: int = 100):
    return db.query(JobPosting).filter(JobPosting.tenantId == tenant_id).offset(skip).limit(limit).all()

def get_job_posting_by_id(db: Session, job_id: str, tenant_id: str):
    return db.query(JobPosting).filter(JobPosting.id == job_id, JobPosting.tenantId == tenant_id).first()

def create_job_posting(db: Session, job_posting: JobPosting):
    db.add(job_posting)
    db.commit()
    db.refresh(job_posting)
    return job_posting

def update_job_posting(db: Session, job_id: str, job_update: dict, tenant_id: str):
    job = get_job_posting_by_id(db, job_id, tenant_id)
    if job:
        for key, value in job_update.items():
            setattr(job, key, value)
        job.updatedAt = datetime.utcnow()
        db.commit()
        db.refresh(job)
    return job

def delete_job_posting(db: Session, job_id: str, tenant_id: str):
    job = get_job_posting_by_id(db, job_id, tenant_id)
    if job:
        db.delete(job)
        db.commit()
        return True
    return False

def get_applications(db: Session, tenant_id: str, skip: int = 0, limit: int = 100):
    return db.query(Application).filter(Application.tenantId == tenant_id).offset(skip).limit(limit).all()

def get_application_by_id(db: Session, application_id: str, tenant_id: str):
    return db.query(Application).filter(Application.id == application_id, Application.tenantId == tenant_id).first()

def create_application(db: Session, application: Application):
    db.add(application)
    db.commit()
    db.refresh(application)
    return application

def update_application(db: Session, application_id: str, application_update: dict, tenant_id: str):
    application = get_application_by_id(db, application_id, tenant_id)
    if application:
        for key, value in application_update.items():
            setattr(application, key, value)
        application.updatedAt = datetime.utcnow()
        db.commit()
        db.refresh(application)
    return application

def delete_application(db: Session, application_id: str, tenant_id: str):
    application = get_application_by_id(db, application_id, tenant_id)
    if application:
        db.delete(application)
        db.commit()
        return True
    return False

def get_performance_reviews(db: Session, tenant_id: str, skip: int = 0, limit: int = 100):
    return db.query(PerformanceReview).filter(PerformanceReview.tenantId == tenant_id).offset(skip).limit(limit).all()

def get_performance_review_by_id(db: Session, review_id: str, tenant_id: str):
    return db.query(PerformanceReview).filter(PerformanceReview.id == review_id, PerformanceReview.tenantId == tenant_id).first()

def create_performance_review(db: Session, review: PerformanceReview):
    db.add(review)
    db.commit()
    db.refresh(review)
    return review

def update_performance_review(db: Session, review_id: str, review_update: dict, tenant_id: str):
    review = get_performance_review_by_id(db, review_id, tenant_id)
    if review:
        for key, value in review_update.items():
            setattr(review, key, value)
        review.updatedAt = datetime.utcnow()
        db.commit()
        db.refresh(review)
    return review

def delete_performance_review(db: Session, review_id: str, tenant_id: str):
    review = get_performance_review_by_id(db, review_id, tenant_id)
    if review:
        db.delete(review)
        db.commit()
        return True
    return False

def get_time_entries(db: Session, tenant_id: str, skip: int = 0, limit: int = 100):
    return db.query(TimeEntry).filter(TimeEntry.tenantId == tenant_id).offset(skip).limit(limit).all()

def get_time_entry_by_id(db: Session, time_entry_id: str, tenant_id: str):
    return db.query(TimeEntry).filter(TimeEntry.id == time_entry_id, TimeEntry.tenantId == tenant_id).first()

def create_time_entry(db: Session, time_entry: TimeEntry):
    db.add(time_entry)
    db.commit()
    db.refresh(time_entry)
    return time_entry

def update_time_entry(db: Session, time_entry_id: str, time_entry_update: dict, tenant_id: str):
    time_entry = get_time_entry_by_id(db, time_entry_id, tenant_id)
    if time_entry:
        for key, value in time_entry_update.items():
            setattr(time_entry, key, value)
        time_entry.updatedAt = datetime.utcnow()
        db.commit()
        db.refresh(time_entry)
    return time_entry

def delete_time_entry(db: Session, time_entry_id: str, tenant_id: str):
    time_entry = get_time_entry_by_id(db, time_entry_id, tenant_id)
    if time_entry:
        db.delete(time_entry)
        db.commit()
        return True
    return False

def get_leave_requests(db: Session, tenant_id: str, skip: int = 0, limit: int = 100):
    return db.query(LeaveRequest).filter(LeaveRequest.tenantId == tenant_id).offset(skip).limit(limit).all()

def get_leave_request_by_id(db: Session, leave_request_id: str, tenant_id: str):
    return db.query(LeaveRequest).filter(LeaveRequest.id == leave_request_id, LeaveRequest.tenantId == tenant_id).first()

def create_leave_request(db: Session, leave_request: LeaveRequest):
    db.add(leave_request)
    db.commit()
    db.refresh(leave_request)
    return leave_request

def update_leave_request(db: Session, leave_request_id: str, leave_request_update: dict, tenant_id: str):
    leave_request = get_leave_request_by_id(db, leave_request_id, tenant_id)
    if leave_request:
        for key, value in leave_request_update.items():
            setattr(leave_request, key, value)
        leave_request.updatedAt = datetime.utcnow()
        db.commit()
        db.refresh(leave_request)
        return leave_request
    return None

def delete_leave_request(db: Session, leave_request_id: str, tenant_id: str):
    leave_request = get_leave_request_by_id(db, leave_request_id, tenant_id)
    if leave_request:
        db.delete(leave_request)
        db.commit()
        return True
    return False

def get_payroll(db: Session, tenant_id: str, skip: int = 0, limit: int = 100):
    return db.query(Payroll).filter(Payroll.tenantId == tenant_id).offset(skip).limit(limit).all()

def get_payroll_by_id(db: Session, payroll_id: str, tenant_id: str):
    return db.query(Payroll).filter(Payroll.id == payroll_id, Payroll.tenantId == tenant_id).first()

def create_payroll(db: Session, payroll: Payroll):
    db.add(payroll)
    db.commit()
    db.refresh(payroll)
    return payroll

def update_payroll(db: Session, payroll_id: str, payroll_update: dict, tenant_id: str):
    payroll = get_payroll_by_id(db, payroll_id, tenant_id)
    if payroll:
        for key, value in payroll_update.items():
            setattr(payroll, key, value)
        payroll.updatedAt = datetime.utcnow()
        db.commit()
        db.refresh(payroll)
    return payroll

def delete_payroll(db: Session, payroll_id: str, tenant_id: str):
    payroll = get_payroll_by_id(db, payroll_id, tenant_id)
    if payroll:
        db.delete(payroll)
        db.commit()
        return True
    return False

def get_benefits(db: Session, tenant_id: str, skip: int = 0, limit: int = 100):
    return db.query(Benefits).filter(Benefits.tenantId == tenant_id).offset(skip).limit(limit).all()

def get_benefit_by_id(db: Session, benefit_id: str, tenant_id: str):
    return db.query(Benefits).filter(Benefits.id == benefit_id, Benefits.tenantId == tenant_id).first()

def create_benefit(db: Session, benefit: Benefits):
    db.add(benefit)
    db.commit()
    db.refresh(benefit)
    return benefit

def update_benefit(db: Session, benefit_id: str, benefit_update: dict, tenant_id: str):
    benefit = get_benefit_by_id(db, benefit_id, tenant_id)
    if benefit:
        for key, value in benefit_update.items():
            setattr(benefit, key, value)
        benefit.updatedAt = datetime.utcnow()
        db.commit()
        db.refresh(benefit)
    return benefit

def delete_benefit(db: Session, benefit_id: str, tenant_id: str):
    benefit = get_benefit_by_id(db, benefit_id, tenant_id)
    if benefit:
        db.delete(benefit)
        db.commit()
        return True
    return False

def get_training(db: Session, tenant_id: str, skip: int = 0, limit: int = 100):
    return db.query(Training).filter(Training.tenantId == tenant_id).offset(skip).limit(limit).all()

def get_training_by_id(db: Session, training_id: str, tenant_id: str):
    return db.query(Training).filter(Training.id == training_id, Training.tenantId == tenant_id).first()

def create_training(db: Session, training: Training):
    db.add(training)
    db.commit()
    db.refresh(training)
    return training

def update_training(db: Session, training_id: str, training_update: dict, tenant_id: str):
    training = get_training_by_id(db, training_id, tenant_id)
    if training:
        for key, value in training_update.items():
            setattr(training, key, value)
        training.updatedAt = datetime.utcnow()
        db.commit()
        db.refresh(training)
    return training

def delete_training(db: Session, training_id: str, tenant_id: str):
    training = get_training_by_id(db, training_id, tenant_id)
    if training:
        db.delete(training)
        db.commit()
        return True
    return False

def get_training_enrollments(db: Session, tenant_id: str, skip: int = 0, limit: int = 100):
    return db.query(TrainingEnrollment).filter(TrainingEnrollment.tenantId == tenant_id).offset(skip).limit(limit).all()

def get_training_enrollment_by_id(db: Session, enrollment_id: str, tenant_id: str):
    return db.query(TrainingEnrollment).filter(TrainingEnrollment.id == enrollment_id, TrainingEnrollment.tenantId == tenant_id).first()

def create_training_enrollment(db: Session, enrollment: TrainingEnrollment):
    db.add(enrollment)
    db.commit()
    db.refresh(enrollment)
    return enrollment

def update_training_enrollment(db: Session, enrollment_id: str, enrollment_update: dict, tenant_id: str):
    enrollment = get_training_enrollment_by_id(db, enrollment_id, tenant_id)
    if enrollment:
        for key, value in enrollment_update.items():
            setattr(enrollment, key, value)
        enrollment.updatedAt = datetime.utcnow()
        db.commit()
        db.refresh(enrollment)
    return enrollment

def delete_training_enrollment(db: Session, enrollment_id: str, tenant_id: str):
    enrollment = get_training_enrollment_by_id(db, enrollment_id, tenant_id)
    if enrollment:
        db.delete(enrollment)
        db.commit()
        return True
    return False

def get_hrm_dashboard_data(db: Session, tenant_id: str):
    """Get HRM dashboard data with aggregated metrics"""
    try:
        # Get basic counts
        total_employees = db.query(Employee).filter(Employee.tenantId == tenant_id).count()
        active_employees = db.query(Employee).filter(
            Employee.tenantId == tenant_id,
            Employee.employmentStatus == "active"
        ).count()
        
        # Get recent hires (last 30 days)
        thirty_days_ago = (datetime.utcnow() - timedelta(days=30)).strftime("%Y-%m-%d")
        new_hires = db.query(Employee).filter(
            Employee.tenantId == tenant_id,
            Employee.hireDate >= thirty_days_ago
        ).count()
        
        # Get open positions
        open_positions = db.query(JobPosting).filter(
            JobPosting.tenantId == tenant_id,
            JobPosting.status == "published"
        ).count()
        
        # Get pending applications
        pending_applications = db.query(Application).filter(
            Application.tenantId == tenant_id,
            Application.status.in_(["applied", "screening", "interview"])
        ).count()
        
        # Get upcoming reviews (next 30 days)
        upcoming_reviews = db.query(PerformanceReview).filter(
            PerformanceReview.tenantId == tenant_id,
            PerformanceReview.reviewDate >= thirty_days_ago,
            PerformanceReview.status.in_(["draft", "in_progress"])
        ).count()
        
        # Get pending leave requests
        pending_leave_requests = db.query(LeaveRequest).filter(
            LeaveRequest.tenantId == tenant_id,
            LeaveRequest.status == "pending"
        ).count()
        
        # Get average salary
        salary_result = db.query(func.avg(Employee.salary)).filter(
            Employee.tenantId == tenant_id,
            Employee.salary.isnot(None)
        ).scalar()
        average_salary = float(salary_result) if salary_result else 0.0
        
        # Get department distribution
        dept_distribution = db.query(
            Employee.department,
            func.count(Employee.id)
        ).filter(Employee.tenantId == tenant_id).group_by(Employee.department).all()
        
        department_distribution = {dept: count for dept, count in dept_distribution}
        
        # Get recent data for dashboard
        recent_hires = db.query(Employee).filter(
            Employee.tenantId == tenant_id
        ).order_by(Employee.hireDate.desc()).limit(5).all()
        
        upcoming_reviews_list = db.query(PerformanceReview).filter(
            PerformanceReview.tenantId == tenant_id,
            PerformanceReview.reviewDate >= thirty_days_ago
        ).order_by(PerformanceReview.reviewDate).limit(5).all()
        
        pending_leave_list = db.query(LeaveRequest).filter(
            LeaveRequest.tenantId == tenant_id,
            LeaveRequest.status == "pending"
        ).order_by(LeaveRequest.startDate).limit(5).all()
        
        open_jobs = db.query(JobPosting).filter(
            JobPosting.tenantId == tenant_id,
            JobPosting.status == "published"
        ).order_by(JobPosting.openDate.desc()).limit(5).all()
        
        recent_applications = db.query(Application).filter(
            Application.tenantId == tenant_id
        ).order_by(Application.createdAt.desc()).limit(5).all()
        
        training_programs = db.query(Training).filter(
            Training.tenantId == tenant_id,
            Training.status == "active"
        ).order_by(Training.startDate).limit(5).all()
        
        # Calculate turnover rate (simplified)
        terminated_employees = db.query(Employee).filter(
            Employee.tenantId == tenant_id,
            Employee.employmentStatus.in_(["terminated", "resigned"])
        ).count()
        
        turnover_rate = (terminated_employees / max(total_employees, 1)) * 100 if total_employees > 0 else 0.0
        
        # Calculate training completion rate
        total_enrollments = db.query(TrainingEnrollment).filter(
            TrainingEnrollment.tenantId == tenant_id
        ).count()
        
        completed_enrollments = db.query(TrainingEnrollment).filter(
            TrainingEnrollment.tenantId == tenant_id,
            TrainingEnrollment.status == "completed"
        ).count()
        
        training_completion_rate = (completed_enrollments / max(total_enrollments, 1)) * 100 if total_enrollments > 0 else 0.0
        
        return {
            "metrics": {
                "totalEmployees": total_employees,
                "activeEmployees": active_employees,
                "newHires": new_hires,
                "turnoverRate": round(turnover_rate, 2),
                "averageSalary": round(average_salary, 2),
                "openPositions": open_positions,
                "pendingApplications": pending_applications,
                "upcomingReviews": upcoming_reviews,
                "pendingLeaveRequests": pending_leave_requests,
                "trainingCompletionRate": round(training_completion_rate, 2)
            },
            "recentHires": recent_hires,
            "upcomingReviews": upcoming_reviews_list,
            "pendingLeaveRequests": pending_leave_list,
            "openJobPostings": open_jobs,
            "recentApplications": recent_applications,
            "departmentDistribution": department_distribution,
            "trainingPrograms": training_programs
        }
    except Exception as e:
        print(f"Error getting HRM dashboard data: {e}")
        return None

# Custom Tenant-Specific Options Models
class CustomEventType(Base):
    __tablename__ = "custom_event_types"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String, nullable=False)
    description = Column(String)
    tenantId = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    createdBy = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    createdAt = Column(DateTime, default=datetime.utcnow)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    tenant = relationship("Tenant", back_populates="customEventTypes")
    createdByUser = relationship("User", back_populates="createdCustomEventTypes")

class CustomDepartment(Base):
    __tablename__ = "custom_departments"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String, nullable=False)
    description = Column(String)
    tenantId = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    createdBy = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    createdAt = Column(DateTime, default=datetime.utcnow)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    tenant = relationship("Tenant", back_populates="customDepartments")
    createdByUser = relationship("User", back_populates="createdCustomDepartments")

class CustomLeaveType(Base):
    __tablename__ = "custom_leave_types"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String, nullable=False)
    description = Column(String)
    tenantId = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    createdBy = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    createdAt = Column(DateTime, default=datetime.utcnow)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    tenant = relationship("Tenant", back_populates="customLeaveTypes")
    createdByUser = relationship("User", back_populates="createdCustomLeaveTypes")

class CustomLeadSource(Base):
    __tablename__ = "custom_lead_sources"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String, nullable=False)
    description = Column(String)
    tenantId = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    createdBy = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    createdAt = Column(DateTime, default=datetime.utcnow)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    tenant = relationship("Tenant", back_populates="customLeadSources")
    createdByUser = relationship("User", back_populates="createdCustomLeadSources")

class CustomContactSource(Base):
    __tablename__ = "custom_contact_sources"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String, nullable=False)
    description = Column(String)
    tenantId = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    createdBy = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    createdAt = Column(DateTime, default=datetime.utcnow)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    tenant = relationship("Tenant", back_populates="customContactSources")
    createdByUser = relationship("User", back_populates="createdCustomContactSources")

class CustomCompanyIndustry(Base):
    __tablename__ = "custom_company_industries"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String, nullable=False)
    description = Column(String)
    tenantId = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    createdBy = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    createdAt = Column(DateTime, default=datetime.utcnow)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    tenant = relationship("Tenant", back_populates="customCompanyIndustries")
    createdByUser = relationship("User", back_populates="createdCustomCompanyIndustries")

class CustomContactType(Base):
    __tablename__ = "custom_contact_types"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String, nullable=False)
    description = Column(String)
    tenantId = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    createdBy = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    createdAt = Column(DateTime, default=datetime.utcnow)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    tenant = relationship("Tenant", back_populates="customContactTypes")
    createdByUser = relationship("User", back_populates="createdCustomContactTypes")

class CustomIndustry(Base):
    __tablename__ = "custom_industry"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String, nullable=False)
    description = Column(String)
    tenantId = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    createdBy = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    createdAt = Column(DateTime, default=datetime.utcnow)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    tenant = relationship("Tenant", back_populates="customIndustries")
    createdByUser = relationship("User", back_populates="createdCustomIndustries")

# Invoice and Payment Models
class Invoice(Base):
    __tablename__ = "invoices"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    invoiceNumber = Column(String, nullable=False, unique=True)
    tenantId = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    createdBy = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    # Customer information
    customerId = Column(String)
    customerName = Column(String, nullable=False)
    customerEmail = Column(String)
    billingAddress = Column(Text)
    shippingAddress = Column(Text)
    
    # Invoice details
    issueDate = Column(DateTime, nullable=False)
    dueDate = Column(DateTime, nullable=False)
    paymentTerms = Column(String)
    currency = Column(String, default="USD")
    
    # Financial information
    subtotal = Column(Float, default=0.0)
    taxRate = Column(Float, default=0.0)
    taxAmount = Column(Float, default=0.0)
    discount = Column(Float, default=0.0)
    total = Column(Float, default=0.0)
    totalPaid = Column(Float, default=0.0)
    balance = Column(Float, default=0.0)
    
    # Status and tracking
    status = Column(String, default="draft")  # draft, sent, viewed, paid, overdue, partially_paid
    sentAt = Column(DateTime)
    viewedAt = Column(DateTime)
    paidAt = Column(DateTime)
    
    # Additional information
    notes = Column(Text)
    terms = Column(Text)
    
    # Related entities
    opportunityId = Column(String)
    quoteId = Column(String)
    projectId = Column(String)
    
    # Timestamps
    createdAt = Column(DateTime, default=datetime.utcnow)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    tenant = relationship("Tenant")
    createdByUser = relationship("User")
    payments = relationship("Payment", back_populates="invoice")

class Payment(Base):
    __tablename__ = "payments"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    tenantId = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    createdBy = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    invoiceId = Column(UUID(as_uuid=True), ForeignKey("invoices.id"), nullable=False)
    
    # Payment details
    amount = Column(Float, nullable=False)
    paymentMethod = Column(String, nullable=False)  # credit_card, bank_transfer, cash, check, etc.
    paymentDate = Column(DateTime, nullable=False)
    reference = Column(String)  # transaction ID, check number, etc.
    notes = Column(Text)
    
    # Status
    status = Column(String, default="completed")  # pending, completed, failed, refunded
    processedAt = Column(DateTime)
    
    # Timestamps
    createdAt = Column(DateTime, default=datetime.utcnow)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    tenant = relationship("Tenant")
    createdByUser = relationship("User")
    invoice = relationship("Invoice", back_populates="payments")

# POS Database Models
class Product(Base):
    __tablename__ = "products"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    tenantId = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    createdBy = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    # Product information
    name = Column(String, nullable=False)
    sku = Column(String, nullable=False, unique=True)
    description = Column(Text)
    category = Column(String, nullable=False)
    unitPrice = Column(Float, nullable=False)
    costPrice = Column(Float, nullable=False)
    stockQuantity = Column(Integer, default=0)
    lowStockThreshold = Column(Integer, default=0)
    maxStockLevel = Column(Integer)
    unitOfMeasure = Column(String, default="piece")
    barcode = Column(String)
    expiryDate = Column(DateTime)
    batchNumber = Column(String)
    serialNumber = Column(String)
    isActive = Column(Boolean, default=True)
    imageUrl = Column(String)
    
    # Timestamps
    createdAt = Column(DateTime, default=datetime.utcnow)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    tenant = relationship("Tenant")
    createdByUser = relationship("User")

class POSShift(Base):
    __tablename__ = "pos_shifts"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    tenantId = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    cashierId = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    # Shift information
    shiftNumber = Column(String, nullable=False, unique=True)
    openingBalance = Column(Float, nullable=False)
    closingBalance = Column(Float)
    totalSales = Column(Float, default=0.0)
    totalTransactions = Column(Integer, default=0)
    status = Column(String, default="open")  # open, closed
    notes = Column(Text)
    
    # Timestamps
    openedAt = Column(DateTime, default=datetime.utcnow)
    closedAt = Column(DateTime)
    createdAt = Column(DateTime, default=datetime.utcnow)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    tenant = relationship("Tenant")
    cashier = relationship("User")

class POSTransaction(Base):
    __tablename__ = "pos_transactions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    tenantId = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    shiftId = Column(UUID(as_uuid=True), ForeignKey("pos_shifts.id"), nullable=False)
    cashierId = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    # Transaction information
    transactionNumber = Column(String, nullable=False, unique=True)
    customerId = Column(String)
    customerName = Column(String)
    items = Column(JSON, nullable=False)  # Array of transaction items
    subtotal = Column(Float, nullable=False)
    discount = Column(Float, default=0.0)
    taxAmount = Column(Float, default=0.0)
    total = Column(Float, nullable=False)
    paymentMethod = Column(String, nullable=False)
    cashAmount = Column(Float, default=0.0)
    changeAmount = Column(Float, default=0.0)
    notes = Column(Text)
    status = Column(String, default="pending")  # pending, completed, cancelled, refunded, void
    
    # Timestamps
    createdAt = Column(DateTime, default=datetime.utcnow)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    tenant = relationship("Tenant")
    shift = relationship("POSShift")
    cashier = relationship("User")

# Database functions for POS
def get_products(db: Session, tenant_id: str, skip: int = 0, limit: int = 100):
    return db.query(Product).filter(Product.tenantId == tenant_id).offset(skip).limit(limit).all()

def get_product_by_id(db: Session, product_id: str, tenant_id: str):
    return db.query(Product).filter(Product.id == product_id, Product.tenantId == tenant_id).first()

def create_product(db: Session, product_data: dict):
    db_product = Product(**product_data)
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product

def update_product(db: Session, product_id: str, product_update: dict, tenant_id: str):
    product = get_product_by_id(db, product_id, tenant_id)
    if product:
        for key, value in product_update.items():
            if hasattr(product, key) and value is not None:
                setattr(product, key, value)
        product.updatedAt = datetime.utcnow()
        db.commit()
        db.refresh(product)
    return product

def delete_product(db: Session, product_id: str, tenant_id: str):
    product = get_product_by_id(db, product_id, tenant_id)
    if product:
        db.delete(product)
        db.commit()
        return True
    return False

def get_pos_shifts(db: Session, tenant_id: str, skip: int = 0, limit: int = 100):
    return db.query(POSShift).filter(POSShift.tenantId == tenant_id).offset(skip).limit(limit).all()

def get_pos_shift_by_id(db: Session, shift_id: str, tenant_id: str):
    return db.query(POSShift).filter(POSShift.id == shift_id, POSShift.tenantId == tenant_id).first()

def get_open_pos_shift(db: Session, tenant_id: str, cashier_id: str):
    return db.query(POSShift).filter(
        POSShift.tenantId == tenant_id,
        POSShift.cashierId == cashier_id,
        POSShift.status == "open"
    ).first()

def create_pos_shift(db: Session, shift_data: dict):
    db_shift = POSShift(**shift_data)
    db.add(db_shift)
    db.commit()
    db.refresh(db_shift)
    return db_shift

def update_pos_shift(db: Session, shift_id: str, shift_update: dict, tenant_id: str):
    shift = get_pos_shift_by_id(db, shift_id, tenant_id)
    if shift:
        for key, value in shift_update.items():
            if hasattr(shift, key) and value is not None:
                setattr(shift, key, value)
        shift.updatedAt = datetime.utcnow()
        db.commit()
        db.refresh(shift)
    return shift

def get_pos_transactions(db: Session, tenant_id: str, skip: int = 0, limit: int = 100):
    return db.query(POSTransaction).filter(POSTransaction.tenantId == tenant_id).offset(skip).limit(limit).all()

def get_pos_transaction_by_id(db: Session, transaction_id: str, tenant_id: str):
    return db.query(POSTransaction).filter(POSTransaction.id == transaction_id, POSTransaction.tenantId == tenant_id).first()

def create_pos_transaction(db: Session, transaction_data: dict):
    db_transaction = POSTransaction(**transaction_data)
    db.add(db_transaction)
    db.commit()
    db.refresh(db_transaction)
    return db_transaction

def update_pos_transaction(db: Session, transaction_id: str, transaction_update: dict, tenant_id: str):
    transaction = get_pos_transaction_by_id(db, transaction_id, tenant_id)
    if transaction:
        for key, value in transaction_update.items():
            if hasattr(transaction, key) and value is not None:
                setattr(transaction, key, value)
        transaction.updatedAt = datetime.utcnow()
        db.commit()
        db.refresh(transaction)
    return transaction

def get_pos_dashboard_data(db: Session, tenant_id: str):
    # Get open shift
    open_shift = db.query(POSShift).filter(
        POSShift.tenantId == tenant_id,
        POSShift.status == "open"
    ).first()
    
    # Get recent transactions
    recent_transactions = db.query(POSTransaction).filter(
        POSTransaction.tenantId == tenant_id
    ).order_by(POSTransaction.createdAt.desc()).limit(10).all()
    
    # Get low stock products
    low_stock_products = db.query(Product).filter(
        Product.tenantId == tenant_id,
        Product.stockQuantity <= Product.lowStockThreshold,
        Product.isActive == True
    ).limit(10).all()
    
    # Calculate metrics
    total_sales = db.query(POSTransaction).filter(
        POSTransaction.tenantId == tenant_id,
        POSTransaction.status == "completed"
    ).with_entities(func.sum(POSTransaction.total)).scalar() or 0.0
    
    total_transactions = db.query(POSTransaction).filter(
        POSTransaction.tenantId == tenant_id,
        POSTransaction.status == "completed"
    ).count()
    
    avg_transaction_value = total_sales / total_transactions if total_transactions > 0 else 0.0
    
    # Get top products (simplified - you can enhance this)
    top_products = []
    
    # Get daily sales for the last 7 days
    daily_sales = []
    for i in range(7):
        date = datetime.utcnow() - timedelta(days=i)
        day_sales = db.query(POSTransaction).filter(
            POSTransaction.tenantId == tenant_id,
            POSTransaction.status == "completed",
            func.date(POSTransaction.createdAt) == date.date()
        ).with_entities(func.sum(POSTransaction.total)).scalar() or 0.0
        
        daily_sales.append({
            "date": date.strftime("%Y-%m-%d"),
            "sales": day_sales
        })
    
    return {
        "openShift": open_shift,
        "recentTransactions": recent_transactions,
        "lowStockProducts": low_stock_products,
        "metrics": {
            "totalSales": total_sales,
            "totalTransactions": total_transactions,
            "averageTransactionValue": avg_transaction_value,
            "topProducts": top_products,
            "dailySales": daily_sales
        }
    }