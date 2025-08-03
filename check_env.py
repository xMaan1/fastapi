#!/usr/bin/env python3
"""
Simple script to check if environment variables are properly configured.

Usage:
    python check_env.py
"""

import os
from dotenv import load_dotenv

def check_environment():
    print("=" * 50)
    print("Environment Configuration Check")
    print("=" * 50)
    
    # Load environment variables
    load_dotenv()
    
    # Required environment variables
    required_vars = {
        "DATABASE_URL": "PostgreSQL database connection string",
        "JWT_SECRET_KEY": "Secret key for JWT token signing",
        "JWT_ALGORITHM": "JWT algorithm (usually HS256)",
        "ACCESS_TOKEN_EXPIRE_MINUTES": "Token expiration time in minutes"
    }
    
    all_good = True
    
    print("Checking required environment variables:\n")
    
    for var_name, description in required_vars.items():
        value = os.getenv(var_name)
        if value:
            if var_name == "DATABASE_URL":
                # Mask sensitive parts
                if "@" in value:
                    parts = value.split("@")
                    masked = parts[0].split("://")[0] + "://***@" + parts[1]
                else:
                    masked = "***"
                print(f"✅ {var_name}: {masked}")
            elif "SECRET" in var_name or "KEY" in var_name:
                print(f"✅ {var_name}: {'*' * len(value)}")
            else:
                print(f"✅ {var_name}: {value}")
        else:
            print(f"❌ {var_name}: NOT SET")
            print(f"   Description: {description}")
            all_good = False
    
    print("\n" + "=" * 50)
    
    if all_good:
        print("✅ All required environment variables are set!")
        
        # Test database connection
        print("\nTesting database connection...")
        try:
            from src.unified_database import engine
            with engine.connect() as conn:
                result = conn.execute("SELECT version()")
                version = result.fetchone()[0]
                print(f"✅ Database connection successful!")
                print(f"   PostgreSQL version: {version.split(',')[0]}")
        except Exception as e:
            print(f"❌ Database connection failed: {e}")
            all_good = False
        
        # Test JWT configuration
        print("\nTesting JWT configuration...")
        try:
            from src.auth import create_access_token, verify_token
            from datetime import timedelta
            
            # Create a test token
            test_token = create_access_token(
                data={"sub": "test@example.com"},
                expires_delta=timedelta(minutes=1)
            )
            
            # Verify the token
            payload = verify_token(test_token, "access")
            if payload.get("sub") == "test@example.com":
                print("✅ JWT configuration working correctly!")
            else:
                print("❌ JWT verification failed!")
                all_good = False
                
        except Exception as e:
            print(f"❌ JWT configuration error: {e}")
            all_good = False
    else:
        print("❌ Some environment variables are missing!")
        print("\nTo fix this:")
        print("1. Copy .env.example to .env")
        print("2. Fill in the required values")
        print("3. Run this script again")
    
    return all_good

def show_example_env():
    print("\n" + "=" * 50)
    print("Example .env file content:")
    print("=" * 50)
    print("""
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/sparkco_erp

# JWT Configuration
JWT_SECRET_KEY=your-super-secret-jwt-key-here-make-it-long-and-random
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
""")

if __name__ == "__main__":
    success = check_environment()
    
    if not success:
        show_example_env()
        print("\n💡 Tip: Generate a secure JWT secret key with:")
        print("   python -c \"import secrets; print(secrets.token_urlsafe(32))\"")
        exit(1)
    else:
        print("\n🎉 Environment is properly configured!")
        print("You can now run the application with:")
        print("   uvicorn src.main:app --reload")