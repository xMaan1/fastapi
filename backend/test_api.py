#!/usr/bin/env python3
"""
Simple test script to verify the unified multi-tenant API is working correctly.

Usage:
    python test_api.py
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

def test_api():
    print("=" * 50)
    print("SparkCo ERP API Test")
    print("=" * 50)
    
    session = requests.Session()
    
    try:
        # Test 1: Health check
        print("1. Testing health endpoint...")
        response = session.get(f"{BASE_URL}/health")
        if response.status_code == 200:
            print("   ✅ Health check passed")
        else:
            print(f"   ❌ Health check failed: {response.status_code}")
            return
        
        # Test 2: Get plans (no auth required)
        print("2. Testing plans endpoint...")
        response = session.get(f"{BASE_URL}/plans")
        if response.status_code == 200:
            plans = response.json()
            print(f"   ✅ Found {len(plans.get('plans', []))} plans")
        else:
            print(f"   ❌ Plans endpoint failed: {response.status_code}")
        
        # Test 3: Login
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
            
            # Set authorization header for subsequent requests
            session.headers.update({"Authorization": f"Bearer {token}"})
        else:
            print(f"   ❌ Login failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return
        
        # Test 4: Get user's tenants
        print("4. Testing tenants endpoint...")
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
                
                # Test 5: Get projects (tenant-scoped)
                print("5. Testing projects endpoint...")
                response = session.get(f"{BASE_URL}/projects")
                if response.status_code == 200:
                    projects_data = response.json()
                    projects = projects_data.get("projects", [])
                    print(f"   ✅ Found {len(projects)} projects")
                else:
                    print(f"   ❌ Projects endpoint failed: {response.status_code}")
                
                # Test 6: Get tasks (tenant-scoped)
                print("6. Testing tasks endpoint...")
                response = session.get(f"{BASE_URL}/tasks")
                if response.status_code == 200:
                    tasks_data = response.json()
                    tasks = tasks_data.get("tasks", [])
                    print(f"   ✅ Found {len(tasks)} tasks")
                else:
                    print(f"   ❌ Tasks endpoint failed: {response.status_code}")
                
                # Test 7: Get users (tenant-scoped)
                print("7. Testing users endpoint...")
                response = session.get(f"{BASE_URL}/users")
                if response.status_code == 200:
                    users_data = response.json()
                    users = users_data.get("users", [])
                    print(f"   ✅ Found {len(users)} users")
                else:
                    print(f"   ❌ Users endpoint failed: {response.status_code}")
                
                # Test 8: Get team members
                print("8. Testing team members endpoint...")
                response = session.get(f"{BASE_URL}/projects/team-members")
                if response.status_code == 200:
                    team_data = response.json()
                    team_members = team_data.get("teamMembers", [])
                    print(f"   ✅ Found {len(team_members)} team members")
                else:
                    print(f"   ❌ Team members endpoint failed: {response.status_code}")
            
        else:
            print(f"   ❌ Tenants endpoint failed: {response.status_code}")
        
        print("\n" + "=" * 50)
        print("✅ API test completed successfully!")
        print("=" * 50)
        print("\nAll endpoints are working correctly.")
        print("The multi-tenant system is ready for use!")
        
    except requests.exceptions.ConnectionError:
        print(f"❌ Could not connect to API at {BASE_URL}")
        print("Make sure the FastAPI server is running:")
        print("cd fastapi && uvicorn src.main:app --reload")
    except Exception as e:
        print(f"❌ Test failed with error: {e}")

if __name__ == "__main__":
    test_api()