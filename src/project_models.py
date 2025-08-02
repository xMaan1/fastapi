from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from enum import Enum

class ProjectStatus(str, Enum):
    PLANNING = "planning"
    IN_PROGRESS = "in_progress"
    ON_HOLD = "on_hold"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class ProjectPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class TaskStatus(str, Enum):
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    REVIEW = "review"
    COMPLETED = "completed"

class TaskPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class UserRole(str, Enum):
    SUPER_ADMIN = "super_admin"
    PROJECT_MANAGER = "project_manager"
    TEAM_MEMBER = "team_member"
    CLIENT = "client"
    VIEWER = "viewer"

# User models
class UserBase(BaseModel):
    userName: str
    email: EmailStr
    firstName: Optional[str] = None
    lastName: Optional[str] = None
    userRole: UserRole = UserRole.TEAM_MEMBER

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    userName: Optional[str] = None
    email: Optional[EmailStr] = None
    firstName: Optional[str] = None
    lastName: Optional[str] = None
    userRole: Optional[UserRole] = None

class User(UserBase):
    userId: str
    avatar: Optional[str] = None
    permissions: Optional[List[str]] = []

    class Config:
        from_attributes = True

class TeamMember(BaseModel):
    id: str
    name: str
    email: str
    role: str
    avatar: Optional[str] = None

# Project models
class ProjectBase(BaseModel):
    name: str
    description: str
    status: ProjectStatus = ProjectStatus.PLANNING
    priority: ProjectPriority = ProjectPriority.MEDIUM
    startDate: str
    endDate: str
    budget: Optional[float] = None
    notes: Optional[str] = None

class ProjectCreate(ProjectBase):
    projectManagerId: str
    teamMemberIds: List[str]
    clientEmail: Optional[str] = None

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[ProjectStatus] = None
    priority: Optional[ProjectPriority] = None
    startDate: Optional[str] = None
    endDate: Optional[str] = None
    budget: Optional[float] = None
    completionPercent: Optional[int] = None
    projectManagerId: Optional[str] = None
    teamMemberIds: Optional[List[str]] = None
    clientEmail: Optional[str] = None
    notes: Optional[str] = None

class ProjectActivity(BaseModel):
    id: str
    type: str
    description: str
    performedBy: str
    performedAt: datetime
    meta_data: Optional[dict] = None

class Project(ProjectBase):
    id: str
    completionPercent: int = 0
    actualCost: Optional[float] = None
    projectManager: TeamMember
    teamMembers: List[TeamMember]
    createdAt: datetime
    updatedAt: datetime
    activities: Optional[List[ProjectActivity]] = []

    class Config:
        from_attributes = True

# Task models
class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    status: TaskStatus = TaskStatus.TODO
    priority: TaskPriority = TaskPriority.MEDIUM
    project: str
    dueDate: Optional[str] = None
    estimatedHours: Optional[float] = None
    tags: Optional[List[str]] = []

class TaskCreate(TaskBase):
    assignedTo: Optional[str] = None

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[TaskStatus] = None
    priority: Optional[TaskPriority] = None
    assignedTo: Optional[str] = None
    dueDate: Optional[str] = None
    estimatedHours: Optional[float] = None
    actualHours: Optional[float] = None
    tags: Optional[List[str]] = None

class TaskAssignee(BaseModel):
    id: str
    name: str
    email: str

class TaskCreator(BaseModel):
    id: str
    name: str
    email: str

class Task(TaskBase):
    id: str
    assignedTo: Optional[TaskAssignee] = None
    actualHours: Optional[float] = None
    createdBy: TaskCreator
    completedAt: Optional[datetime] = None
    createdAt: datetime
    updatedAt: datetime

    class Config:
        from_attributes = True

# Response models
class ProjectsResponse(BaseModel):
    projects: List[Project]
    pagination: dict

class TasksResponse(BaseModel):
    tasks: List[Task]
    pagination: dict

class UsersResponse(BaseModel):
    users: List[User]

# Auth models
class LoginCredentials(BaseModel):
    email: str
    password: str

class AuthResponse(BaseModel):
    success: bool
    user: User
    token: str
    message: Optional[str] = None