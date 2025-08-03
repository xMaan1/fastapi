
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timedelta
import uuid

router = APIRouter(prefix="/tenants", tags=["tenants"])

from ..unified_database import (
    get_db, get_plans, get_plan_by_id, create_tenant, 
    create_subscription, create_tenant_user, get_user_tenants,
    get_tenant_by_id, get_tenant_users, get_subscription_by_tenant,
    get_permissions, create_permission, get_custom_roles, create_custom_role, update_custom_role, delete_custom_role
)
from ..unified_models import (
    Plan, PlansResponse, TenantCreate, Tenant, SubscriptionCreate,
    TenantUserCreate, TenantRole, SubscriptionStatus, TenantUsersResponse,
    SubscribeRequest, CustomRole, CustomRoleCreate, CustomRoleUpdate, Permission
)


from ..dependencies import get_current_user, require_super_admin, require_tenant_admin_or_super_admin

@router.get("/plans", response_model=PlansResponse, dependencies=[Depends(require_super_admin)])
async def get_available_plans(db: Session = Depends(get_db)):
    """Get all available subscription plans"""
    plans = get_plans(db)
    return PlansResponse(plans=plans)

@router.post("/subscribe", dependencies=[Depends(require_super_admin)])
async def subscribe_to_plan(
    req: SubscribeRequest,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Subscribe to a plan and create a new tenant"""
    plan_id = req.planId
    tenant_name = req.tenantName
    domain = req.domain
    # Verify plan exists
    plan = get_plan_by_id(plan_id, db)
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plan not found"
        )
    
    # Create tenant
    tenant_data = {
        "name": tenant_name,
        "domain": f"{tenant_name.lower().replace(' ', '-')}-{str(uuid.uuid4())[:8]}",
        "description": f"{tenant_name} workspace",
        "settings": {}
    }
    
    tenant = create_tenant(tenant_data, db)
    
    # Create subscription (trial for now)
    subscription_data = {
        "tenantId": tenant.id,
        "planId": plan.id,
        "status": SubscriptionStatus.TRIAL.value,
        "startDate": datetime.utcnow(),
        "endDate": datetime.utcnow() + timedelta(days=14),  # 14-day trial
        "autoRenew": True
    }
    
    subscription = create_subscription(subscription_data, db)
    
    # Add user as owner
    tenant_user_data = {
        "tenantId": tenant.id,
        "userId": current_user.id,
        "role": TenantRole.OWNER.value,
        "permissions": ["*"],  # Full permissions for owner
        "isActive": True
    }
    
    tenant_user = create_tenant_user(tenant_user_data, db)
    
    return {
        "success": True,
        "message": "Successfully subscribed to plan",
        "tenant": {
            "id": str(tenant.id),
            "name": tenant.name,
            "domain": tenant.domain
        },
        "subscription": {
            "id": str(subscription.id),
            "status": subscription.status,
            "trial_ends": subscription.endDate
        }
    }

@router.get("/my-tenants")
async def get_my_tenants(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all tenants for the current user"""
    tenant_users = get_user_tenants(str(current_user.id), db)
    
    tenants = []
    for tenant_user in tenant_users:
        tenant = get_tenant_by_id(str(tenant_user.tenantId), db)
        if tenant:
            tenants.append({
                "id": str(tenant.id),
                "name": tenant.name,
                "domain": tenant.domain,
                "role": tenant_user.role,
                "joined_at": tenant_user.joinedAt
            })
    
    return {"tenants": tenants}

@router.get("/{tenant_id}")
async def get_tenant(
    tenant_id: str,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get tenant details"""
    tenant = get_tenant_by_id(tenant_id, db)
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )
    
    # Check if user has access to this tenant
    tenant_users = get_user_tenants(str(current_user.id), db)
    user_tenant = next((tu for tu in tenant_users if str(tu.tenantId) == tenant_id), None)
    
    if not user_tenant:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this tenant"
        )
    
    return {
        "id": str(tenant.id),
        "name": tenant.name,
        "domain": tenant.domain,
        "description": tenant.description,
        "settings": tenant.settings,
        "user_role": user_tenant.role,
        "created_at": tenant.createdAt
    }

@router.get("/{tenant_id}/users", response_model=UsersResponse)
async def get_tenant_users_list(
    tenant_id: str,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all users in a tenant, with their tenant role info"""
    # Verify user has access to tenant
    user_tenants = get_user_tenants(str(current_user.id), db)
    user_tenant = next((tu for tu in user_tenants if str(tu.tenantId) == tenant_id), None)
    if not user_tenant:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this tenant"
        )
    tenant_users = get_tenant_users(tenant_id, db)
    from ..unified_database import User as DBUser
    user_ids = [tu.userId for tu in tenant_users]
    users = db.query(DBUser).filter(DBUser.id.in_(user_ids)).all() if user_ids else []
    # Attach tenant role to each user (as user.userRole)
    user_id_to_role = {tu.userId: tu.role for tu in tenant_users}
    user_dicts = []
    for user in users:
        user_dict = user.to_dict() if hasattr(user, 'to_dict') else {c.name: getattr(user, c.name) for c in user.__table__.columns}
        user_dict['userRole'] = user_id_to_role.get(user.id) or user_id_to_role.get(str(user.id))
        user_dict['userId'] = str(user.id)
        user_dicts.append(user_dict)
    return {"users": user_dicts}