from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.orm import Session
from datetime import timedelta

from ..project_models import LoginCredentials, AuthResponse, User, UserCreate
from ..project_database import (
    get_project_db, get_project_user_by_email, get_project_user_by_username, 
    create_project_user
)
from ..auth import (
    verify_password, get_password_hash, create_access_token, 
    ACCESS_TOKEN_EXPIRE_MINUTES
)
from ..dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["authentication"])

@router.post("/login", response_model=AuthResponse)
async def login(credentials: LoginCredentials, db: Session = Depends(get_project_db)):
    """Login user and return JWT token"""
    user = get_project_user_by_email(credentials.email, db)
    if not user or not verify_password(credentials.password, user.hashedPassword):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    if not user.isActive:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account is inactive"
        )
    
    # Create access token
    access_token = create_access_token(
        data={"sub": user.email},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    
    return AuthResponse(
        success=True,
        user=User(
            userId=user.id,
            userName=user.userName,
            email=user.email,
            firstName=user.firstName,
            lastName=user.lastName,
            userRole=user.userRole,
            avatar=user.avatar,
            permissions=[]
        ),
        token=access_token
    )

@router.get("/me", response_model=User)
async def get_current_user_info(current_user: dict = Depends(get_current_user), db: Session = Depends(get_project_db)):
    """Get current user information"""
    user = get_project_user_by_email(current_user.get("email"), db)
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

@router.post("/register", response_model=User)
async def register(user_data: UserCreate, db: Session = Depends(get_project_db)):
    """Register a new user"""
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

@router.post("/logout")
async def logout():
    """Logout user (client-side token removal)"""
    return {"message": "Logged out successfully"}