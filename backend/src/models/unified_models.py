from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

# Enums
class UserRole(str, Enum):
    SUPER_ADMIN = "super_admin"
    ADMIN = "admin"
    PROJECT_MANAGER = "project_manager"
    TEAM_MEMBER = "team_member"
    CLIENT = "client"

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
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class TaskPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class PlanType(str, Enum):
    STARTER = "starter"
    PROFESSIONAL = "professional"
    ENTERPRISE = "enterprise"

class PlanFeature(str, Enum):
    UNLIMITED_PROJECTS = "unlimited_projects"
    ADVANCED_REPORTING = "advanced_reporting"
    CUSTOM_INTEGRATIONS = "custom_integrations"
    PRIORITY_SUPPORT = "priority_support"
    CUSTOM_BRANDING = "custom_branding"
    API_ACCESS = "api_access"
    ADVANCED_PERMISSIONS = "advanced_permissions"
    AUDIT_LOGS = "audit_logs"

class SubscriptionStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    CANCELLED = "cancelled"
    EXPIRED = "expired"
    TRIAL = "trial"

class TenantRole(str, Enum):
    OWNER = "owner"
    ADMIN = "admin"
    MANAGER = "manager"
    MEMBER = "member"
    VIEWER = "viewer"

class Permission(BaseModel):
    code: str  # e.g. 'manage_projects', 'view_reports'
    label: str  # Human-readable label

class CustomRoleBase(BaseModel):
    tenantId: str
    name: str
    permissions: List[str]  # List of permission codes

class CustomRoleCreate(CustomRoleBase):
    pass

class CustomRoleUpdate(BaseModel):
    name: Optional[str] = None
    permissions: Optional[List[str]] = None

class CustomRole(CustomRoleBase):
    id: str
    createdAt: datetime
    updatedAt: datetime

    class Config:
        from_attributes = True

# Base Models
class UserBase(BaseModel):
    userName: str
    email: EmailStr
    firstName: Optional[str] = None
    lastName: Optional[str] = None
    userRole: UserRole = UserRole.TEAM_MEMBER
    avatar: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    userName: Optional[str] = None
    email: Optional[EmailStr] = None
    firstName: Optional[str] = None
    lastName: Optional[str] = None
    userRole: Optional[UserRole] = None
    avatar: Optional[str] = None

class User(UserBase):
    userId: str
    isActive: bool = True
    permissions: List[str] = []

    class Config:
        from_attributes = True

class TeamMember(BaseModel):
    id: str
    name: str
    email: str
    role: str
    avatar: Optional[str] = None

# Auth Models
class LoginCredentials(BaseModel):
    email: EmailStr
    password: str

class AuthResponse(BaseModel):
    success: bool
    user: User
    token: str

# Project Models
class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None
    status: ProjectStatus = ProjectStatus.PLANNING
    priority: ProjectPriority = ProjectPriority.MEDIUM
    startDate: Optional[str] = None
    endDate: Optional[str] = None
    completionPercent: int = 0
    budget: Optional[float] = None
    actualCost: float = 0.0
    notes: Optional[str] = None

class ProjectCreate(ProjectBase):
    projectManagerId: str
    teamMemberIds: List[str] = []

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[ProjectStatus] = None
    priority: Optional[ProjectPriority] = None
    startDate: Optional[str] = None
    endDate: Optional[str] = None
    completionPercent: Optional[int] = None
    budget: Optional[float] = None
    actualCost: Optional[float] = None
    notes: Optional[str] = None
    projectManagerId: Optional[str] = None
    teamMemberIds: Optional[List[str]] = None

class Project(ProjectBase):
    id: str
    projectManager: TeamMember
    teamMembers: List[TeamMember] = []
    createdAt: datetime
    updatedAt: datetime
    activities: List[Dict[str, Any]] = []

    class Config:
        from_attributes = True

# Task Models
class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    status: TaskStatus = TaskStatus.TODO
    priority: TaskPriority = TaskPriority.MEDIUM
    dueDate: Optional[str] = None
    estimatedHours: Optional[float] = None
    actualHours: float = 0.0
    tags: List[str] = []
    parentTaskId: Optional[str] = None  # For subtasks

class TaskCreate(TaskBase):
    project: str  # project ID
    assignedTo: Optional[str] = None  # user ID

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
    parentTaskId: Optional[str] = None

class SubTask(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    status: TaskStatus
    priority: TaskPriority
    assignedTo: Optional[Dict[str, str]] = None
    dueDate: Optional[str] = None
    estimatedHours: Optional[float] = None
    actualHours: float = 0.0
    tags: List[str] = []
    createdBy: Dict[str, str]
    completedAt: Optional[datetime] = None
    createdAt: datetime
    updatedAt: datetime

    class Config:
        from_attributes = True

class Task(TaskBase):
    id: str
    project: str
    assignedTo: Optional[Dict[str, str]] = None
    createdBy: Dict[str, str]
    completedAt: Optional[datetime] = None
    createdAt: datetime
    updatedAt: datetime
    subtasks: List[SubTask] = []
    subtaskCount: int = 0
    completedSubtaskCount: int = 0

    class Config:
        from_attributes = True

# Plan Models
class PlanBase(BaseModel):
    name: str
    description: str
    planType: PlanType
    price: float
    billingCycle: str  # monthly, yearly
    maxProjects: Optional[int] = None
    maxUsers: Optional[int] = None
    features: List[PlanFeature]
    isActive: bool = True

class Plan(PlanBase):
    id: str
    createdAt: datetime
    updatedAt: datetime

    class Config:
        from_attributes = True

# Tenant Models
class TenantBase(BaseModel):
    name: str
    domain: Optional[str] = None
    description: Optional[str] = None
    settings: Optional[Dict[str, Any]] = {}

class TenantCreate(TenantBase):
    planId: str
    ownerEmail: EmailStr

class Tenant(TenantBase):
    id: str
    isActive: bool = True
    createdAt: datetime
    updatedAt: datetime

    class Config:
        from_attributes = True

# Subscription Models
class SubscriptionBase(BaseModel):
    tenantId: str
    planId: str
    status: SubscriptionStatus = SubscriptionStatus.TRIAL
    startDate: datetime
    endDate: Optional[datetime] = None
    autoRenew: bool = True

class SubscriptionCreate(SubscriptionBase):
    pass

class Subscription(SubscriptionBase):
    id: str
    createdAt: datetime
    updatedAt: datetime
    plan: Plan

    class Config:
        from_attributes = True

# Tenant User Models
class TenantUserBase(BaseModel):
    tenantId: str
    userId: str
    role: TenantRole
    permissions: Optional[List[str]] = []
    isActive: bool = True

class TenantUserCreate(TenantUserBase):
    pass

class TenantUser(TenantUserBase):
    id: str
    invitedBy: Optional[str] = None
    joinedAt: datetime
    createdAt: datetime
    updatedAt: datetime

    class Config:
        from_attributes = True

# Response Models
class UsersResponse(BaseModel):
    users: List[User]

class ProjectsResponse(BaseModel):
    projects: List[Project]
    pagination: dict

class TasksResponse(BaseModel):
    tasks: List[Task]
    pagination: dict

class PlansResponse(BaseModel):
    plans: List[Plan]

class TenantsResponse(BaseModel):
    tenants: List[Tenant]
    pagination: dict

class TenantUsersResponse(BaseModel):
    users: List[TenantUser]
    pagination: dict

class SubscribeRequest(BaseModel):
    planId: str
    tenantName: str
    domain: Optional[str] = None

# Event-related enums and models
class EventType(str, Enum):
    MEETING = "meeting"
    WORKSHOP = "workshop"
    DEADLINE = "deadline"
    OTHER = "other"

class EventStatus(str, Enum):
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class RecurrenceType(str, Enum):
    NONE = "none"
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    YEARLY = "yearly"

class EventBase(BaseModel):
    title: str
    description: Optional[str] = None
    eventType: EventType = EventType.MEETING
    startDate: datetime
    endDate: datetime
    timezone: str = "UTC"
    location: Optional[str] = None
    isOnline: bool = True
    googleMeetLink: Optional[str] = None
    googleCalendarEventId: Optional[str] = None
    recurrenceType: Optional[RecurrenceType] = None
    recurrenceData: Optional[Dict[str, Any]] = None
    reminderMinutes: int = 15
    participants: List[str] = []  # List of participant emails
    discussionPoints: List[str] = []
    attachments: List[str] = []
    projectId: Optional[str] = None

class EventCreate(EventBase):
    pass

class EventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    eventType: Optional[EventType] = None
    startDate: Optional[datetime] = None
    endDate: Optional[datetime] = None
    timezone: Optional[str] = None
    location: Optional[str] = None
    isOnline: Optional[bool] = None
    googleMeetLink: Optional[str] = None
    googleCalendarEventId: Optional[str] = None
    recurrenceType: Optional[RecurrenceType] = None
    recurrenceData: Optional[Dict[str, Any]] = None
    reminderMinutes: Optional[int] = None
    participants: Optional[List[str]] = None
    discussionPoints: Optional[List[str]] = None
    attachments: Optional[List[str]] = None
    projectId: Optional[str] = None
    status: Optional[EventStatus] = None

class Event(EventBase):
    id: str
    status: EventStatus = EventStatus.SCHEDULED
    createdBy: str
    tenantId: str
    createdAt: datetime
    updatedAt: datetime

    class Config:
        from_attributes = True

class EventResponse(BaseModel):
    events: List[Event]
    pagination: Optional[dict] = None