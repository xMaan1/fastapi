# Simple in-memory database for demo
# In production, use a real database like PostgreSQL

users_db = {}
user_counter = 1

def get_user_by_username(username: str):
    """Get user by username"""
    for user_id, user in users_db.items():
        if user["username"] == username:
            return {"id": user_id, **user}
    return None

def get_user_by_email(email: str):
    """Get user by email"""
    for user_id, user in users_db.items():
        if user["email"] == email:
            return {"id": user_id, **user}
    return None

def create_user(username: str, email: str, hashed_password: str):
    """Create a new user"""
    global user_counter
    
    user_data = {
        "username": username,
        "email": email,
        "hashed_password": hashed_password,
        "is_active": True
    }
    
    users_db[user_counter] = user_data
    user_id = user_counter
    user_counter += 1
    
    return {"id": user_id, **user_data}