import os
from datetime import datetime
from sqlalchemy import create_engine, Column, Integer, String, Boolean, DateTime, Float, Text, ForeignKey, Table, Enum as SQLEnum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
from sqlalchemy.dialects.postgresql import UUID
import uuid
from src.project_models import ProjectStatus, ProjectPriority, TaskStatus, TaskPriority, UserRole

# Use the same database as the existing auth system
from .database import engine, SessionLocal, Base

# Association table for project team members
project_team_members = Table(
    'project_team_members',
    Base.metadata,
    Column('project_id', String, ForeignKey('projects.id'), primary_key=True),
    Column('user_id', String, ForeignKey('project_users.id'), primary_key=True)
)

class ProjectUser(Base):
    __tablename__ = "project_users"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    userName = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    firstName = Column(String, nullable=True)
    lastName = Column(String, nullable=True)
    userRole = Column(SQLEnum(UserRole), default=UserRole.TEAM_MEMBER)
    hashedPassword = Column(String, nullable=False)
    avatar = Column(String, nullable=True)
    isActive = Column(Boolean, default=True)
    createdAt = Column(DateTime, default=datetime.utcnow)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    managed_projects = relationship("Project", foreign_keys="Project.projectManagerId", back_populates="projectManager")
    assigned_tasks = relationship("Task", foreign_keys="Task.assignedToId", back_populates="assignedTo")
    created_tasks = relationship("Task", foreign_keys="Task.createdById", back_populates="createdBy")
    team_projects = relationship("Project", secondary=project_team_members, back_populates="teamMembers")

class Project(Base):
    __tablename__ = "projects"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    status = Column(SQLEnum(ProjectStatus), default=ProjectStatus.PLANNING)
    priority = Column(SQLEnum(ProjectPriority), default=ProjectPriority.MEDIUM)
    startDate = Column(String, nullable=False)
    endDate = Column(String, nullable=False)
    completionPercent = Column(Integer, default=0)
    budget = Column(Float, nullable=True)
    actualCost = Column(Float, nullable=True)
    notes = Column(Text, nullable=True)
    clientEmail = Column(String, nullable=True)
    projectManagerId = Column(String, ForeignKey('project_users.id'), nullable=False)
    createdAt = Column(DateTime, default=datetime.utcnow)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    projectManager = relationship("ProjectUser", foreign_keys=[projectManagerId], back_populates="managed_projects")
    teamMembers = relationship("ProjectUser", secondary=project_team_members, back_populates="team_projects")
    tasks = relationship("Task", back_populates="project")
    activities = relationship("ProjectActivity", back_populates="project")

class Task(Base):
    __tablename__ = "tasks"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    status = Column(SQLEnum(TaskStatus), default=TaskStatus.TODO)
    priority = Column(SQLEnum(TaskPriority), default=TaskPriority.MEDIUM)
    projectId = Column(String, ForeignKey('projects.id'), nullable=False)
    assignedToId = Column(String, ForeignKey('project_users.id'), nullable=True)
    createdById = Column(String, ForeignKey('project_users.id'), nullable=False)
    dueDate = Column(String, nullable=True)
    estimatedHours = Column(Float, nullable=True)
    actualHours = Column(Float, nullable=True)
    tags = Column(String, nullable=True)  # JSON string
    completedAt = Column(DateTime, nullable=True)
    createdAt = Column(DateTime, default=datetime.utcnow)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    project = relationship("Project", back_populates="tasks")
    assignedTo = relationship("ProjectUser", foreign_keys=[assignedToId], back_populates="assigned_tasks")
    createdBy = relationship("ProjectUser", foreign_keys=[createdById], back_populates="created_tasks")

class ProjectActivity(Base):
    __tablename__ = "project_activities"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    projectId = Column(String, ForeignKey('projects.id'), nullable=False)
    type = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    performedBy = Column(String, nullable=False)
    performedAt = Column(DateTime, default=datetime.utcnow)
    activity_metadata = Column(Text, nullable=True)  # JSON string

    # Relationships
    project = relationship("Project", back_populates="activities")

def create_project_tables():
    """Create all project-related tables"""
    Base.metadata.create_all(bind=engine)

def get_project_db():
    """Get database session for project operations"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# User operations
def get_project_user_by_email(email: str, db: Session):
    return db.query(ProjectUser).filter(ProjectUser.email == email).first()

def get_project_user_by_username(username: str, db: Session):
    return db.query(ProjectUser).filter(ProjectUser.userName == username).first()

def get_project_user_by_id(user_id: str, db: Session):
    return db.query(ProjectUser).filter(ProjectUser.id == user_id).first()

def create_project_user(user_data: dict, db: Session):
    db_user = ProjectUser(**user_data)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def get_all_project_users(db: Session):
    return db.query(ProjectUser).filter(ProjectUser.isActive == True).all()

# Project operations
def create_project(project_data: dict, db: Session):
    db_project = Project(**project_data)
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    return db_project

def get_project_by_id(project_id: str, db: Session):
    return db.query(Project).filter(Project.id == project_id).first()

def get_all_projects(db: Session, skip: int = 0, limit: int = 100):
    return db.query(Project).offset(skip).limit(limit).all()

def update_project(project_id: str, project_data: dict, db: Session):
    db_project = db.query(Project).filter(Project.id == project_id).first()
    if db_project:
        for key, value in project_data.items():
            if hasattr(db_project, key) and value is not None:
                setattr(db_project, key, value)
        db_project.updatedAt = datetime.utcnow()
        db.commit()
        db.refresh(db_project)
    return db_project

def delete_project(project_id: str, db: Session):
    db_project = db.query(Project).filter(Project.id == project_id).first()
    if db_project:
        db.delete(db_project)
        db.commit()
        return True
    return False

# Task operations
def create_task(task_data: dict, db: Session):
    db_task = Task(**task_data)
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task

def get_task_by_id(task_id: str, db: Session):
    return db.query(Task).filter(Task.id == task_id).first()

def get_all_tasks(db: Session, skip: int = 0, limit: int = 100):
    return db.query(Task).offset(skip).limit(limit).all()

def get_tasks_by_project(project_id: str, db: Session):
    return db.query(Task).filter(Task.projectId == project_id).all()

def update_task(task_id: str, task_data: dict, db: Session):
    db_task = db.query(Task).filter(Task.id == task_id).first()
    if db_task:
        for key, value in task_data.items():
            if hasattr(db_task, key) and value is not None:
                setattr(db_task, key, value)
        db_task.updatedAt = datetime.utcnow()
        db.commit()
        db.refresh(db_task)
    return db_task

def delete_task(task_id: str, db: Session):
    db_task = db.query(Task).filter(Task.id == task_id).first()
    if db_task:
        db.delete(db_task)
        db.commit()
        return True
    return False