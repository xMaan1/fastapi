"""
Script to update tenant roles for existing users
"""
import sys
import os
from sqlalchemy.orm import Session

# Add the src directory to the path
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'src'))

from src.unified_database import get_db, User, TenantUser
from src.unified_models import UserRole, TenantRole

def update_tenant_roles():
    """Update tenant roles for existing users"""
    
    # Get database session
    db_gen = get_db()
    db = next(db_gen)
    
    try:
        # Get all tenant users
        tenant_users = db.query(TenantUser).all()
        
        print(f"Found {len(tenant_users)} tenant user relationships")
        print("\nCurrent tenant roles:")
        
        for tenant_user in tenant_users:
            # Get the actual user
            user = db.query(User).filter(User.id == tenant_user.userId).first()
            if not user:
                continue
            print(f"  {user.email} ({user.userRole}): {tenant_user.role}")
        
        print("\nChoose an action:")
        print("1. Set all users to MEMBER role (except super admins)")
        print("2. Set project managers to MANAGER role")
        print("3. Set specific user roles manually")
        print("4. Show current roles only")
        
        choice = input("\nEnter your choice (1-4): ").strip()
        
        if choice == "1":
            # Set all to member except super admins
            for tenant_user in tenant_users:
                user = db.query(User).filter(User.id == tenant_user.userId).first()
                if not user:
                    continue
                    
                old_role = tenant_user.role
                
                if user.userRole == UserRole.SUPER_ADMIN.value:
                    new_role = TenantRole.OWNER.value
                    permissions = ["*"]
                else:
                    new_role = TenantRole.MEMBER.value
                    permissions = []
                
                if tenant_user.role != new_role:
                    tenant_user.role = new_role
                    tenant_user.permissions = permissions
                    print(f"Updated {user.email}: {old_role} -> {new_role}")
                    
        elif choice == "2":
            # Set project managers to manager role
            for tenant_user in tenant_users:
                user = db.query(User).filter(User.id == tenant_user.userId).first()
                if not user:
                    continue
                    
                old_role = tenant_user.role
                
                if user.userRole == UserRole.SUPER_ADMIN.value:
                    new_role = TenantRole.OWNER.value
                    permissions = ["*"]
                elif user.userRole == UserRole.ADMIN.value:
                    new_role = TenantRole.ADMIN.value
                    permissions = ["manage_projects", "manage_users", "view_reports"]
                elif user.userRole == UserRole.PROJECT_MANAGER.value:
                    new_role = TenantRole.MANAGER.value
                    permissions = ["manage_projects", "view_reports"]
                else:
                    new_role = TenantRole.MEMBER.value
                    permissions = []
                
                if tenant_user.role != new_role:
                    tenant_user.role = new_role
                    tenant_user.permissions = permissions
                    print(f"Updated {user.email}: {old_role} -> {new_role}")
                    
        elif choice == "3":
            # Manual role assignment
            for tenant_user in tenant_users:
                user = db.query(User).filter(User.id == tenant_user.userId).first()
                if not user:
                    continue
                    
                print(f"\nUser: {user.email} ({user.userRole})")
                print(f"Current tenant role: {tenant_user.role}")
                print("Available roles: owner, admin, manager, member, viewer")
                
                new_role = input("Enter new tenant role (or press Enter to skip): ").strip().lower()
                
                if new_role and new_role in ['owner', 'admin', 'manager', 'member', 'viewer']:
                    old_role = tenant_user.role
                    tenant_user.role = new_role
                    
                    # Set permissions based on role
                    if new_role == 'owner':
                        permissions = ["*"]
                    elif new_role == 'admin':
                        permissions = ["manage_projects", "manage_users", "view_reports"]
                    elif new_role == 'manager':
                        permissions = ["manage_projects", "view_reports"]
                    else:
                        permissions = []
                    
                    tenant_user.permissions = permissions
                    print(f"Updated {user.email}: {old_role} -> {new_role}")
                    
        elif choice == "4":
            print("Current roles displayed above. No changes made.")
            return
        else:
            print("Invalid choice. No changes made.")
            return
        
        if choice in ["1", "2", "3"]:
            db.commit()
            print("\n✅ Tenant roles updated successfully!")
        
    except Exception as e:
        print(f"❌ Error updating tenant roles: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    update_tenant_roles()