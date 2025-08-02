from fastapi import FastAPI, HTTPException, status, Depends
from fastapi.middleware.cors import CORSMiddleware
from datetime import timedelta

from .models import UserCreate, UserLogin, Token, TokenRefresh, UserResponse, User
from .auth import (
    verify_password, 
    get_password_hash, 
    create_access_token, 
    create_refresh_token,
    verify_token,
    ACCESS_TOKEN_EXPIRE_MINUTES
)
from .database import get_user_by_username, get_user_by_email, create_user, get_db, create_tables
from sqlalchemy.orm import Session
from .dependencies import get_current_user


app = FastAPI(title="FastAPI JWT Auth", version="1.0.0")

# Ensure tables are created at startup
@app.on_event("startup")
def on_startup():
    create_tables()

# Add CORS middleware for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this properly for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "FastAPI JWT Authentication API", "status": "running"}

@app.post("/signup", response_model=UserResponse)
def signup(user_data: UserCreate, db: Session = Depends(get_db)):
    """Register a new user"""
    # Check if user already exists
    if get_user_by_username(user_data.username, db):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    if get_user_by_email(user_data.email, db):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    # Hash password and create user
    hashed_password = get_password_hash(user_data.password)
    user = create_user(user_data.username, user_data.email, hashed_password, db)
    # Create tokens
    access_token = create_access_token(
        data={"sub": user.username},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    refresh_token = create_refresh_token(data={"sub": user.username})
    return UserResponse(
        user=User(
            id=user.id,
            username=user.username,
            email=user.email,
            is_active=user.is_active
        ),
        tokens=Token(
            access_token=access_token,
            refresh_token=refresh_token
        )
    )

@app.post("/login", response_model=Token)
def login(user_credentials: UserLogin, db: Session = Depends(get_db)):
    """Login user and return JWT tokens"""
    user = get_user_by_username(user_credentials.username, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )
    if not verify_password(user_credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    # Create tokens
    access_token = create_access_token(
        data={"sub": user.username},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    refresh_token = create_refresh_token(data={"sub": user.username})
    return Token(
        access_token=access_token,
        refresh_token=refresh_token
    )

@app.post("/refresh", response_model=Token)
def refresh_token(token_data: TokenRefresh):
    """Refresh access token using refresh token"""
    payload = verify_token(token_data.refresh_token, "refresh")
    username = payload.get("sub")
    
    if username is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
    
    user = get_user_by_username(username)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    # Create new tokens
    access_token = create_access_token(
        data={"sub": username},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    new_refresh_token = create_refresh_token(data={"sub": username})
    
    return Token(
        access_token=access_token,
        refresh_token=new_refresh_token
    )

@app.get("/me", response_model=User)
def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """Get current user information"""
    return User(
        id=current_user["id"],
        username=current_user["username"],
        email=current_user["email"],
        is_active=current_user["is_active"]
    )

@app.get("/users", response_model=list[User])
def get_all_users():
    """Get all users (public endpoint)"""
    from .database import users_db
    users_list = []
    for user_id, user_data in users_db.items():
        users_list.append(User(
            id=user_id,
            username=user_data["username"],
            email=user_data["email"],
            is_active=user_data["is_active"]
        ))
    return users_list

@app.get("/protected")
def protected_route(current_user: dict = Depends(get_current_user)):
    """Example protected route"""
    return {
        "message": f"Hello {current_user['username']}, this is a protected route!",
        "user_id": current_user["id"]
    }