from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.orm import Session
from typing import List, Optional

from ...models.unified_models import User, UserCreate, UserUpdate, UsersResponse
from ...config.unified_database import (
    get_db, get_user_by_email, get_user_by_username,
    get_user_by_id, create_user, get_all_users
)
from ...core.auth import get_password_hash
from ...api.dependencies import get_current_user, get_tenant_context, require_super_admin

router = APIRouter(prefix="/users", tags=["users"])

@router.get("", response_model=UsersResponse, dependencies=[Depends(require_super_admin)])
async def get_users(
    db: Session = Depends(get_db),
    tenant_context: Optional[dict] = Depends(get_tenant_context)
):
    """Get all users (tenant-scoped if tenant context provided)"""
    tenant_id = tenant_context["tenant_id"] if tenant_context else None
    users = get_all_users(db, tenant_id=tenant_id)
    user_list = []
    for user in users:
        user_list.append(User(
            userId=str(user.id),
            userName=user.userName,
            email=user.email,
            firstName=user.firstName,
            lastName=user.lastName,
            userRole=user.userRole,
            avatar=user.avatar,
            permissions=[]
        ))
    
    return UsersResponse(users=user_list)

@router.get("/{user_id}", response_model=User, dependencies=[Depends(require_super_admin)])
async def get_user(
    user_id: str, 
    db: Session = Depends(get_db),
    tenant_context: Optional[dict] = Depends(get_tenant_context)
):
    """Get a specific user"""
    user = get_user_by_id(user_id, db)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check tenant access if tenant context is provided
    if tenant_context and str(user.tenant_id) != tenant_context["tenant_id"]:
        raise HTTPException(status_code=403, detail="Access denied to this user")
    
    return User(
        userId=str(user.id),
        userName=user.userName,
        email=user.email,
        firstName=user.firstName,
        lastName=user.lastName,
        userRole=user.userRole,
        avatar=user.avatar,
        permissions=[]
    )

@router.post("", response_model=User, dependencies=[Depends(require_super_admin)])
async def create_new_user(
    user_data: UserCreate, 
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
    tenant_context: Optional[dict] = Depends(get_tenant_context)
):
    """Create a new user (admin only)"""
    # Check if current user is admin
    if current_user.userRole != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can create users"
        )
    
    # Check if user already exists
    if get_user_by_email(user_data.email, db):
        raise HTTPException(status_code=400, detail="Email already registered")
    if get_user_by_username(user_data.userName, db):
        raise HTTPException(status_code=400, detail="Username already taken")
    
    # Hash password and create user
    hashed_password = get_password_hash(user_data.password)
    user_dict = user_data.dict()
    user_dict.pop('password')
    user_dict['hashedPassword'] = hashed_password
    
    # Set tenant_id if tenant context is provided
    if tenant_context:
        user_dict['tenant_id'] = tenant_context["tenant_id"]
    
    db_user = create_user(user_dict, db)
    
    return User(
        userId=str(db_user.id),
        userName=db_user.userName,
        email=db_user.email,
        firstName=db_user.firstName,
        lastName=db_user.lastName,
        userRole=db_user.userRole,
        avatar=db_user.avatar,
        permissions=[]
    )

@router.put("/{user_id}", response_model=User, dependencies=[Depends(require_super_admin)])
async def update_user(
    user_id: str,
    user_data: UserUpdate,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
    tenant_context: Optional[dict] = Depends(get_tenant_context)
):
    """Update a user"""
    # Check if user exists
    user = get_user_by_id(user_id, db)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check tenant access if tenant context is provided
    if tenant_context and str(user.tenant_id) != tenant_context["tenant_id"]:
        raise HTTPException(status_code=403, detail="Access denied to this user")
    
    # Check permissions (admin or self)
    if current_user.userRole != "super_admin" and str(current_user.id) != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update your own profile"
        )
    
    # Update user
    update_dict = user_data.dict(exclude_unset=True)
    for key, value in update_dict.items():
        if hasattr(user, key) and value is not None:
            setattr(user, key, value)
    
    db.commit()
    db.refresh(user)
    
    return User(
        userId=str(user.id),
        userName=user.userName,
        email=user.email,
        firstName=user.firstName,
        lastName=user.lastName,
        userRole=user.userRole,
        avatar=user.avatar,
        permissions=[]
    )

@router.delete("/{user_id}", dependencies=[Depends(require_super_admin)])
async def delete_user(
    user_id: str,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
    tenant_context: Optional[dict] = Depends(get_tenant_context)
):
    """Delete a user (admin only)"""
    # Check if current user is admin
    if current_user.userRole != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can delete users"
        )
    
    # Check if user exists
    user = get_user_by_id(user_id, db)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check tenant access if tenant context is provided
    if tenant_context and str(user.tenant_id) != tenant_context["tenant_id"]:
        raise HTTPException(status_code=403, detail="Access denied to this user")
    
    # Don't allow deleting self
    if str(current_user.id) == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot delete your own account"
        )
    
    # Soft delete (set inactive)
    user.isActive = False
    db.commit()
    
    return {"message": "User deleted successfully"}