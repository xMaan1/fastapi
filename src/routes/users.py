from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.orm import Session
from typing import List

from ..project_models import User, UserCreate, UserUpdate, UsersResponse
from ..project_database import (
    get_project_db, get_project_user_by_email, get_project_user_by_username,
    get_project_user_by_id, create_project_user, get_all_project_users
)
from ..auth import get_password_hash
from ..dependencies import get_current_user

router = APIRouter(prefix="/users", tags=["users"])

@router.get("", response_model=UsersResponse)
async def get_users(db: Session = Depends(get_project_db)):
    """Get all users"""
    users = get_all_project_users(db)
    user_list = []
    for user in users:
        user_list.append(User(
            userId=user.id,
            userName=user.userName,
            email=user.email,
            firstName=user.firstName,
            lastName=user.lastName,
            userRole=user.userRole,
            avatar=user.avatar,
            permissions=[]
        ))
    
    return UsersResponse(users=user_list)

@router.get("/{user_id}", response_model=User)
async def get_user(user_id: str, db: Session = Depends(get_project_db)):
    """Get a specific user"""
    user = get_project_user_by_id(user_id, db)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return User(
        userId=user.id,
        userName=user.userName,
        email=user.email,
        firstName=user.firstName,
        lastName=user.lastName,
        userRole=user.userRole,
        avatar=user.avatar,
        permissions=[]
    )

@router.post("", response_model=User)
async def create_user(
    user_data: UserCreate, 
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_project_db)
):
    """Create a new user (admin only)"""
    # Check if current user is admin
    current_db_user = get_project_user_by_email(current_user.get("email"), db)
    if not current_db_user or current_db_user.userRole.value != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can create users"
        )
    
    # Check if user already exists
    if get_project_user_by_email(user_data.email, db):
        raise HTTPException(status_code=400, detail="Email already registered")
    if get_project_user_by_username(user_data.userName, db):
        raise HTTPException(status_code=400, detail="Username already taken")
    
    # Hash password and create user
    hashed_password = get_password_hash(user_data.password)
    user_dict = user_data.dict()
    user_dict.pop('password')
    user_dict['hashedPassword'] = hashed_password
    
    db_user = create_project_user(user_dict, db)
    
    return User(
        userId=db_user.id,
        userName=db_user.userName,
        email=db_user.email,
        firstName=db_user.firstName,
        lastName=db_user.lastName,
        userRole=db_user.userRole,
        avatar=db_user.avatar,
        permissions=[]
    )

@router.put("/{user_id}", response_model=User)
async def update_user(
    user_id: str,
    user_data: UserUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_project_db)
):
    """Update a user"""
    # Get current user
    current_db_user = get_project_user_by_email(current_user.get("email"), db)
    if not current_db_user:
        raise HTTPException(status_code=404, detail="Current user not found")
    
    # Check if user exists
    user = get_project_user_by_id(user_id, db)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check permissions (admin or self)
    if current_db_user.userRole.value != "super_admin" and current_db_user.id != user_id:
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
        userId=user.id,
        userName=user.userName,
        email=user.email,
        firstName=user.firstName,
        lastName=user.lastName,
        userRole=user.userRole,
        avatar=user.avatar,
        permissions=[]
    )

@router.delete("/{user_id}")
async def delete_user(
    user_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_project_db)
):
    """Delete a user (admin only)"""
    # Check if current user is admin
    current_db_user = get_project_user_by_email(current_user.get("email"), db)
    if not current_db_user or current_db_user.userRole.value != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can delete users"
        )
    
    # Check if user exists
    user = get_project_user_by_id(user_id, db)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Don't allow deleting self
    if current_db_user.id == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot delete your own account"
        )
    
    # Soft delete (set inactive)
    user.isActive = False
    db.commit()
    
    return {"message": "User deleted successfully"}