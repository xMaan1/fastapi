from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

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

# Plan models
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

# Tenant models
class TenantBase(BaseModel):
    name: str
    domain: Optional[str] = None
    description: Optional[str] = None
    settings: Optional[Dict[str, Any]] = {}

class TenantCreate(TenantBase):
    planId: str
    ownerEmail: EmailStr

class TenantUpdate(BaseModel):
    name: Optional[str] = None
    domain: Optional[str] = None
    description: Optional[str] = None
    settings: Optional[Dict[str, Any]] = None

class Tenant(TenantBase):
    id: str
    isActive: bool = True
    createdAt: datetime
    updatedAt: datetime
    currentPlan: Plan
    # Remove Subscription forward ref to avoid issues
    # subscription: Optional['Subscription'] = None

    class Config:
        from_attributes = True

# Subscription models
class SubscriptionBase(BaseModel):
    tenantId: str
    planId: str
    status: SubscriptionStatus = SubscriptionStatus.TRIAL
    startDate: datetime
    endDate: Optional[datetime] = None
    autoRenew: bool = True

class SubscriptionCreate(SubscriptionBase):
    pass

class SubscriptionUpdate(BaseModel):
    planId: Optional[str] = None
    status: Optional[SubscriptionStatus] = None
    endDate: Optional[datetime] = None
    autoRenew: Optional[bool] = None

class Subscription(SubscriptionBase):
    id: str
    createdAt: datetime
    updatedAt: datetime
    plan: Plan

    class Config:
        from_attributes = True

# Tenant User models
class TenantUserBase(BaseModel):
    tenantId: str
    userId: str
    role: TenantRole
    permissions: Optional[List[str]] = []
    isActive: bool = True

class TenantUserCreate(TenantUserBase):
    pass

class TenantUserUpdate(BaseModel):
    role: Optional[TenantRole] = None
    permissions: Optional[List[str]] = None
    isActive: Optional[bool] = None

class TenantUser(TenantUserBase):
    id: str
    invitedBy: Optional[str] = None
    joinedAt: datetime
    createdAt: datetime
    updatedAt: datetime
    # Remove User reference to avoid forward ref issues
    # user: Optional['User'] = None
    tenant: Optional[Tenant] = None

    class Config:
        from_attributes = True

# Response models
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

class TenantResponse(BaseModel):
    id: str
    name: str
    domain: str
    ownerId: str
    isActive: bool
    createdAt: datetime
    updatedAt: datetime

class TenantUserResponse(BaseModel):
    id: str
    userId: str
    tenantId: str
    role: TenantRole
    isActive: bool
    joinedAt: datetime

# Invitation models
class TenantInvitationBase(BaseModel):
    tenantId: str
    email: EmailStr
    role: TenantRole
    permissions: Optional[List[str]] = []
    message: Optional[str] = None

class TenantInvitationCreate(TenantInvitationBase):
    pass

class TenantInvitation(TenantInvitationBase):
    id: str
    token: str
    invitedBy: str
    isAccepted: bool = False
    expiresAt: datetime
    createdAt: datetime

    class Config:
        from_attributes = True