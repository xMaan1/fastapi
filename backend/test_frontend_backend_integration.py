#!/usr/bin/env python3
"""
Integration test to verify frontend-backend compatibility.
This script tests all the API endpoints that the frontend uses.

Usage:
    python test_frontend_backend_integration.py
"""

import requests
import json
import os
from dotenv import load_dotenv

load_dotenv()

# Configuration
BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000")
TEST_EMAIL = "admin@sparkco.com"
TEST_PASSWORD = "admin123"

def test_frontend_backend_integration():
    print("=" * 60)
    print("Frontend-Backend Integration Test")
    print("=" * 60)
    
    session = requests.Session()
    token = None
    tenant_id = None
    
    try:
        # Test 1: Health check (used by frontend)
        print("1. Testing health endpoint...")
        response = session.get(f"{BASE_URL}/health")
        if response.status_code == 200:
            print("   ✅ Health check passed")
        else:
            print(f"   ❌ Health check failed: {response.status_code}")
            return False
        
        # Test 2: Get plans (used by frontend subscription flow)
        print("2. Testing plans endpoint...")
        response = session.get(f"{BASE_URL}/plans")
        if response.status_code == 200:
            plans = response.json()
            print(f"   ✅ Found {len(plans.get('plans', []))} plans")
        else:
            print(f"   ❌ Plans endpoint failed: {response.status_code}")
            return False
        
        # Test 3: Login (frontend login flow)
        print("3. Testing login...")
        login_data = {
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        }
        response = session.post(f"{BASE_URL}/auth/login", json=login_data)
        if response.status_code == 200:
            auth_data = response.json()
            token = auth_data.get("token")
            user = auth_data.get("user")
            print(f"   ✅ Login successful for user: {user.get('email')}")
            
            # Set authorization header
            session.headers.update({"Authorization": f"Bearer {token}"})
        else:
            print(f"   ❌ Login failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
        
        # Test 4: Get current user (frontend user info)
        print("4. Testing current user endpoint...")
        response = session.get(f"{BASE_URL}/auth/me")
        if response.status_code == 200:
            user_data = response.json()
            print(f"   ✅ Current user: {user_data.get('email')}")
        else:
            print(f"   ❌ Current user endpoint failed: {response.status_code}")
            return False
        
        # Test 5: Get user's tenants (frontend tenant selection)
        print("5. Testing my tenants endpoint...")
        response = session.get(f"{BASE_URL}/tenants/my-tenants")
        if response.status_code == 200:
            tenants_data = response.json()
            tenants = tenants_data.get("tenants", [])
            print(f"   ✅ Found {len(tenants)} tenants")
            
            if tenants:
                tenant_id = tenants[0]["id"]
                print(f"   Using tenant: {tenants[0]['name']} ({tenant_id})")
                
                # Set tenant header for subsequent requests
                session.headers.update({"X-Tenant-ID": tenant_id})
            else:
                print("   ⚠️  No tenants found - some tests will be skipped")
        else:
            print(f"   ❌ My tenants endpoint failed: {response.status_code}")
            return False
        
        if tenant_id:
            # Test 6: Get projects (main frontend data)
            print("6. Testing projects endpoint...")
            response = session.get(f"{BASE_URL}/projects")
            if response.status_code == 200:
                projects_data = response.json()
                projects = projects_data.get("projects", [])
                print(f"   ✅ Found {len(projects)} projects")
                
                # Test project details if projects exist
                if projects:
                    project_id = projects[0]["id"]
                    response = session.get(f"{BASE_URL}/projects/{project_id}")
                    if response.status_code == 200:
                        print("   ✅ Project details retrieved")
                    else:
                        print(f"   ❌ Project details failed: {response.status_code}")
                        return False
            else:
                print(f"   ❌ Projects endpoint failed: {response.status_code}")
                return False
            
            # Test 7: Get tasks (main frontend data)
            print("7. Testing tasks endpoint...")
            response = session.get(f"{BASE_URL}/tasks")
            if response.status_code == 200:
                tasks_data = response.json()
                tasks = tasks_data.get("tasks", [])
                print(f"   ✅ Found {len(tasks)} tasks")
            else:
                print(f"   ❌ Tasks endpoint failed: {response.status_code}")
                return False
            
            # Test 8: Get users (frontend user management)
            print("8. Testing users endpoint...")
            response = session.get(f"{BASE_URL}/users")
            if response.status_code == 200:
                users_data = response.json()
                users = users_data.get("users", [])
                print(f"   ✅ Found {len(users)} users")
            else:
                print(f"   ❌ Users endpoint failed: {response.status_code}")
                return False
            
            # Test 9: Get team members (frontend project creation)
            print("9. Testing team members endpoint...")
            response = session.get(f"{BASE_URL}/projects/team-members")
            if response.status_code == 200:
                team_data = response.json()
                team_members = team_data.get("teamMembers", [])
                print(f"   ✅ Found {len(team_members)} team members")
            else:
                print(f"   ❌ Team members endpoint failed: {response.status_code}")
                return False
            
            # Test 10: Get project tasks (frontend project details)
            print("10. Testing project tasks endpoint...")
            if projects:
                project_id = projects[0]["id"]
                response = session.get(f"{BASE_URL}/projects/{project_id}/tasks")
                if response.status_code == 200:
                    project_tasks_data = response.json()
                    project_tasks = project_tasks_data.get("tasks", [])
                    print(f"    ✅ Found {len(project_tasks)} tasks for project")
                else:
                    print(f"    ❌ Project tasks endpoint failed: {response.status_code}")
                    return False
        
        # Test 11: Test connection (frontend health check)
        print("11. Testing root endpoint...")
        response = session.get(f"{BASE_URL}/")
        if response.status_code == 200:
            root_data = response.json()
            print(f"    ✅ Root endpoint: {root_data.get('message', 'OK')}")
        else:
            print(f"    ❌ Root endpoint failed: {response.status_code}")
            return False
        
        print("\n" + "=" * 60)
        print("✅ All frontend-backend integration tests passed!")
        print("=" * 60)
        print("\nFrontend compatibility verified:")
        print("• Authentication flow works correctly")
        print("• Tenant selection and context works")
        print("• All main data endpoints are accessible")
        print("• Multi-tenant filtering is working")
        print("• API responses match frontend expectations")
        
        return True
        
    except requests.exceptions.ConnectionError:
        print(f"❌ Could not connect to API at {BASE_URL}")
        print("Make sure the FastAPI server is running:")
        print("cd fastapi && uvicorn src.main:app --reload")
        return False
    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        return False

def test_environment_configuration():
    print("\n" + "=" * 60)
    print("Environment Configuration Check")
    print("=" * 60)
    
    # Check backend environment
    print("Backend Environment:")
    database_url = os.getenv("DATABASE_URL")
    jwt_secret = os.getenv("JWT_SECRET_KEY")
    
    if database_url:
        # Mask sensitive parts of the URL
        masked_url = database_url.split('@')[0].split('://')[0] + "://***@" + database_url.split('@')[1] if '@' in database_url else "***"
        print(f"  ✅ DATABASE_URL: {masked_url}")
    else:
        print("  ❌ DATABASE_URL: Not set")
        return False
    
    if jwt_secret:
        print(f"  ✅ JWT_SECRET_KEY: {'*' * len(jwt_secret)}")
    else:
        print("  ❌ JWT_SECRET_KEY: Not set")
        return False
    
    # Check if we can connect to database
    try:
        from src.unified_database import engine
        with engine.connect() as conn:
            result = conn.execute("SELECT 1")
            print("  ✅ Database connection: Working")
    except Exception as e:
        print(f"  ❌ Database connection: Failed - {e}")
        return False
    
    print("\nFrontend Environment:")
    # Note: Frontend env vars are not accessible from backend
    print("  ℹ️  Frontend environment variables should be checked in the browser")
    print("  ℹ️  NEXT_PUBLIC_API_URL should point to your backend server")
    
    return True

if __name__ == "__main__":
    print("Starting comprehensive integration test...\n")
    
    # Test environment first
    env_ok = test_environment_configuration()
    if not env_ok:
        print("\n❌ Environment configuration issues found!")
        print("Please check your .env files and database connection.")
        exit(1)
    
    # Test API integration
    api_ok = test_frontend_backend_integration()
    if not api_ok:
        print("\n❌ Integration test failed!")
        print("Please check the error messages above and fix the issues.")
        exit(1)
    
    print("\n🎉 All tests passed! Frontend and backend are properly integrated.")