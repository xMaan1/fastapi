
from fastapi import Depends, HTTPException, status, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from .auth import verify_token
from .unified_database import get_db, get_user_by_email, get_user_tenants, get_tenant_by_id
from sqlalchemy.orm import Session
from typing import Optional

security = HTTPBearer()

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Get current user from JWT token"""
    token = credentials.credentials
    payload = verify_token(token, "access")
    email = payload.get("sub")
    if email is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    user = get_user_by_email(email, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    return user

def get_tenant_context(
    x_tenant_id: Optional[str] = Header(None),
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get tenant context from header and verify user access"""
    if not x_tenant_id:
        # For non-tenant specific endpoints, return None
        return None

    # Verify tenant exists
    tenant = get_tenant_by_id(x_tenant_id, db)
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )

    # Verify user has access to this tenant
    user_tenants = get_user_tenants(str(current_user.id), db)
    user_tenant = next((tu for tu in user_tenants if str(tu.tenantId) == x_tenant_id), None)

    if not user_tenant:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this tenant"
        )

    # Normalize role to lower-case string for consistent checks
    user_role = str(user_tenant.role).lower()
    return {
        "tenant": tenant,
        "user_role": user_role,
        "permissions": user_tenant.permissions,
        "tenant_id": x_tenant_id
    }

def require_super_admin(current_user = Depends(get_current_user)):
    if getattr(current_user, 'userRole', None) != 'super_admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail='Super admin privileges required.'
        )
    return current_user

def require_tenant_admin_or_super_admin(
    current_user = Depends(get_current_user),
    tenant_context = Depends(get_tenant_context)
):
    print(f"DEBUG: User {current_user.email} with global role: {current_user.userRole}")
    print(f"DEBUG: Tenant context: {tenant_context}")
    
    # Allow if super admin (global role) - only for cross-tenant operations
    if getattr(current_user, 'userRole', None) == 'super_admin':
        print("DEBUG: Allowed as super admin")
        return current_user
    
    # For tenant-specific operations, check tenant role only
    if tenant_context and tenant_context.get('user_role') in ['admin', 'manager', 'owner']:
        print(f"DEBUG: Allowed with tenant role: {tenant_context.get('user_role')}")
        return current_user
    
    print(f"DEBUG: Access denied - tenant role: {tenant_context.get('user_role') if tenant_context else 'No tenant context'}")
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail='Tenant admin, manager, or owner role required.'
    )

    # (function removed, as only one correct definition should exist)