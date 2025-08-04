import requests
import json

# Base URL - change this when you deploy to AWS
BASE_URL = "http://localhost:8000"

def test_signup():
    """Test user signup"""
    data = {
        "username": "testuser",
        "email": "test@example.com",
        "password": "testpassword123"
    }
    
    response = requests.post(f"{BASE_URL}/signup", json=data)
    print("Signup Response:", response.status_code)
    print(json.dumps(response.json(), indent=2))
    return response.json()

def test_login():
    """Test user login"""
    data = {
        "username": "testuser",
        "password": "testpassword123"
    }
    
    response = requests.post(f"{BASE_URL}/login", json=data)
    print("Login Response:", response.status_code)
    print(json.dumps(response.json(), indent=2))
    return response.json()

def test_protected_route(access_token):
    """Test protected route with token"""
    headers = {
        "Authorization": f"Bearer {access_token}"
    }
    
    response = requests.get(f"{BASE_URL}/me", headers=headers)
    print("Protected Route Response:", response.status_code)
    print(json.dumps(response.json(), indent=2))

def test_refresh_token(refresh_token):
    """Test token refresh"""
    data = {
        "refresh_token": refresh_token
    }
    
    response = requests.post(f"{BASE_URL}/refresh", json=data)
    print("Refresh Token Response:", response.status_code)
    print(json.dumps(response.json(), indent=2))

if __name__ == "__main__":
    print("Testing FastAPI JWT Authentication")
    print("=" * 50)
    
    # Test signup
    print("\n1. Testing Signup:")
    signup_result = test_signup()
    
    # Test login
    print("\n2. Testing Login:")
    login_result = test_login()
    
    if "access_token" in login_result:
        # Test protected route
        print("\n3. Testing Protected Route:")
        test_protected_route(login_result["access_token"])
        
        # Test refresh token
        print("\n4. Testing Refresh Token:")
        test_refresh_token(login_result["refresh_token"])