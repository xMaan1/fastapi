"""
Script to add multi-tenant support to existing database with users, projects, and tasks.
This script will:
1. Create subscription plans if they don't exist
2. Create a demo tenant if it doesn't exist
3. Assign existing users to the demo tenant
4. Assign existing projects to the demo tenant
5. Assign existing tasks to the demo tenant

Usage:
1. Make sure your .env file has the correct DATABASE_URL
2. Run: python -m src.add_multitenant_to_existing
"""
import sys
import os
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

# Add the src directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from .unified_database import (
    get_db, create_tables, create_tenant, create_plan,
    create_subscription, create_tenant_user,
    User, Tenant, Plan, Project, Task, TenantUser
)
from .unified_models import PlanType, PlanFeature, SubscriptionStatus, TenantRole, UserRole

def add_multitenant_support():
    """Add multi-tenant support to existing database"""
    
    print("Adding multi-tenant support to existing database...")
    
    # Ensure tables exist (including new tenant tables)
    create_tables()
    
    # Get database session
    db_gen = get_db()
    db = next(db_gen)
    
    try:
        # Check existing data
        existing_users = db.query(User).count()
        existing_projects = db.query(Project).count()
        existing_tasks = db.query(Task).count()
        existing_plans = db.query(Plan).count()
        existing_tenants = db.query(Tenant).count()
        
        print(f"Found existing data:")
        print(f"  - Users: {existing_users}")
        print(f"  - Projects: {existing_projects}")
        print(f"  - Tasks: {existing_tasks}")
        print(f"  - Plans: {existing_plans}")
        print(f"  - Tenants: {existing_tenants}")
        
        # Step 1: Create subscription plans
        created_plans = []
        if existing_plans == 0:
            print("\n1. Creating subscription plans...")
            plans_data = [
                {
                    "name": "Starter",
                    "description": "Perfect for small teams getting started with project management",
                    "planType": PlanType.STARTER.value,
                    "price": 29.0,
                    "billingCycle": "monthly",
                    "maxProjects": 10,
                    "maxUsers": 5,
                    "features": [PlanFeature.API_ACCESS.value],
                    "isActive": True
                },
                {
                    "name": "Professional",
                    "description": "Ideal for growing teams that need advanced features",
                    "planType": PlanType.PROFESSIONAL.value,
                    "price": 79.0,
                    "billingCycle": "monthly",
                    "maxProjects": 50,
                    "maxUsers": 25,
                    "features": [
                        PlanFeature.API_ACCESS.value,
                        PlanFeature.ADVANCED_REPORTING.value,
                        PlanFeature.PRIORITY_SUPPORT.value,
                        PlanFeature.ADVANCED_PERMISSIONS.value
                    ],
                    "isActive": True
                },
                {
                    "name": "Enterprise",
                    "description": "For large organizations with complex project management needs",
                    "planType": PlanType.ENTERPRISE.value,
                    "price": 199.0,
                    "billingCycle": "monthly",
                    "maxProjects": None,
                    "maxUsers": None,
                    "features": [
                        PlanFeature.UNLIMITED_PROJECTS.value,
                        PlanFeature.ADVANCED_REPORTING.value,
                        PlanFeature.CUSTOM_INTEGRATIONS.value,
                        PlanFeature.PRIORITY_SUPPORT.value,
                        PlanFeature.CUSTOM_BRANDING.value,
                        PlanFeature.API_ACCESS.value,
                        PlanFeature.ADVANCED_PERMISSIONS.value,
                        PlanFeature.AUDIT_LOGS.value
                    ],
                    "isActive": True
                }
            ]
            
            for plan_data in plans_data:
                plan = create_plan(plan_data, db)
                created_plans.append(plan)
                print(f"   ✅ Created plan: {plan.name}")
        else:
            created_plans = db.query(Plan).all()
            print("   ℹ️  Plans already exist, using existing plans")
        
        # Step 2: Create demo tenant
        demo_tenant = None
        if existing_tenants == 0:
            print("\n2. Creating demo tenant...")
            tenant_data = {
                "name": "Your Organization",
                "domain": "your-org",
                "description": "Your organization's workspace",
                "settings": {"theme": "default", "timezone": "UTC"}
            }
            demo_tenant = create_tenant(tenant_data, db)
            print(f"   ✅ Created tenant: {demo_tenant.name}")
            
            # Create subscription for demo tenant
            if created_plans:
                subscription_data = {
                    "tenantId": demo_tenant.id,
                    "planId": created_plans[1].id,  # Professional plan
                    "status": SubscriptionStatus.TRIAL.value,
                    "startDate": datetime.utcnow(),
                    "endDate": datetime.utcnow() + timedelta(days=30),  # 30-day trial
                    "autoRenew": True
                }
                subscription = create_subscription(subscription_data, db)
                print(f"   ✅ Created subscription (30-day trial)")
        else:
            demo_tenant = db.query(Tenant).first()
            print("   ℹ️  Tenant already exists, using existing tenant")
        
        if not demo_tenant:
            print("❌ No tenant available, cannot proceed")
            return
        
        # Step 3: Update existing users for multi-tenant
        if existing_users > 0:
            print(f"\n3. Updating {existing_users} existing users for multi-tenant support...")
            users = db.query(User).all()
            updated_users = 0
            
            for user in users:
                # Assign user to tenant if not already assigned
                if not user.tenant_id:
                    user.tenant_id = demo_tenant.id
                    updated_users += 1
                    print(f"   ✅ Assigned user {user.email} to tenant")
                    
                    # Create tenant user relationship
                    existing_tenant_user = db.query(TenantUser).filter(
                        TenantUser.tenantId == demo_tenant.id,
                        TenantUser.userId == user.id
                    ).first()
                    
                    if not existing_tenant_user:
                        # Determine role based on user role
                        tenant_role = TenantRole.OWNER.value if user.userRole == UserRole.SUPER_ADMIN.value else TenantRole.MEMBER.value
                        permissions = ["*"] if user.userRole == UserRole.SUPER_ADMIN.value else []
                        
                        tenant_user_data = {
                            "tenantId": demo_tenant.id,
                            "userId": user.id,
                            "role": tenant_role,
                            "permissions": permissions,
                            "isActive": True
                        }
                        create_tenant_user(tenant_user_data, db)
                        print(f"   ✅ Created tenant relationship for {user.email} as {tenant_role}")
            
            if updated_users > 0:
                db.commit()
                print(f"   ✅ Updated {updated_users} users")
            else:
                print("   ℹ️  All users already assigned to tenants")
        
        # Step 4: Update existing projects for multi-tenant
        if existing_projects > 0:
            print(f"\n4. Updating {existing_projects} existing projects for multi-tenant support...")
            projects = db.query(Project).all()
            updated_projects = 0
            
            for project in projects:
                if not project.tenant_id:
                    project.tenant_id = demo_tenant.id
                    updated_projects += 1
                    print(f"   ✅ Assigned project '{project.name}' to tenant")
            
            if updated_projects > 0:
                db.commit()
                print(f"   ✅ Updated {updated_projects} projects")
            else:
                print("   ℹ️  All projects already assigned to tenants")
        
        # Step 5: Update existing tasks for multi-tenant
        if existing_tasks > 0:
            print(f"\n5. Updating {existing_tasks} existing tasks for multi-tenant support...")
            tasks = db.query(Task).all()
            updated_tasks = 0
            
            for task in tasks:
                if not task.tenant_id:
                    task.tenant_id = demo_tenant.id
                    updated_tasks += 1
                    print(f"   ✅ Assigned task '{task.title}' to tenant")
            
            if updated_tasks > 0:
                db.commit()
                print(f"   ✅ Updated {updated_tasks} tasks")
            else:
                print("   ℹ️  All tasks already assigned to tenants")
        
        print("\n" + "=" * 60)
        print("✅ Multi-tenant support added successfully!")
        print("=" * 60)
        print(f"\nYour data is now organized under tenant: {demo_tenant.name}")
        print(f"Tenant ID: {demo_tenant.id}")
        print(f"Domain: {demo_tenant.domain}")
        
        if created_plans:
            print(f"\nSubscription Plans Available:")
            for plan in created_plans:
                print(f"  - {plan.name}: ${plan.price}/month")
        
        print(f"\nTo use the API with tenant context, include this header:")
        print(f"X-Tenant-ID: {demo_tenant.id}")
        
    except Exception as e:
        print(f"❌ Error adding multi-tenant support: {e}")
        db.rollback()
        raise
    finally:
        db.close()

def main():
    """Main function to run the script"""
    print("=" * 60)
    print("SparkCo ERP - Add Multi-Tenant Support to Existing Data")
    print("=" * 60)
    
    try:
        add_multitenant_support()
        print("\n🎉 Your existing data is now multi-tenant ready!")
        print("\nNext steps:")
        print("1. Test the API with tenant headers")
        print("2. Use the TenantSelector component in your frontend")
        print("3. All your existing data is preserved and tenant-scoped")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        print("Make sure your DATABASE_URL is correctly set in the .env file")
        print("and that your database is accessible.")
        sys.exit(1)

if __name__ == "__main__":
    main()