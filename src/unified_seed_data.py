"""
Unified seed script to populate the database with initial data
Run this script to seed your database with sample data.

Usage:
1. Make sure your .env file has the correct DATABASE_URL
2. Run: python -m src.unified_seed_data
"""
import sys
import os
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

# Add the src directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from .unified_database import (
    get_db, create_tables, create_user, create_tenant, create_plan,
    create_subscription, create_tenant_user, create_project, create_task,
    User, Tenant, Plan, Project, Task, TenantUser
)
from .unified_models import UserRole, ProjectStatus, ProjectPriority, TaskStatus, TaskPriority, PlanType, PlanFeature, SubscriptionStatus, TenantRole
from .auth import get_password_hash

def seed_database():
    """Seed the database with initial data"""
    
    print("Creating database tables...")
    # Create tables
    create_tables()
    
    # Get database session
    db_gen = get_db()
    db = next(db_gen)
    
    try:
        # Check if data already exists
        existing_users = db.query(User).count()
        existing_plans = db.query(Plan).count()
        existing_tenants = db.query(Tenant).count()
        
        users_exist = existing_users > 0
        plans_exist = existing_plans > 0
        tenants_exist = existing_tenants > 0
        
        print("Database status:")
        print(f"  - Users: {existing_users} ({'exists' if users_exist else 'none'})")
        print(f"  - Plans: {existing_plans} ({'exists' if plans_exist else 'none'})")
        print(f"  - Tenants: {existing_tenants} ({'exists' if tenants_exist else 'none'})")
        
        if plans_exist and tenants_exist:
            print("Plans and tenants already exist. Skipping seed.")
            return
        
        print("\nSeeding missing data...")
        
        # Create subscription plans first (no tenant dependency)
        created_plans = []
        if not plans_exist:
            plans_data = [
                {
                    "name": "Starter",
                    "description": "Perfect for small teams getting started with project management",
                    "planType": PlanType.STARTER.value,
                    "price": 29.0,
                    "billingCycle": "monthly",
                    "maxProjects": 10,
                    "maxUsers": 5,
                    "features": [
                        PlanFeature.API_ACCESS.value
                    ],
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
                    "maxProjects": None,  # Unlimited
                    "maxUsers": None,     # Unlimited
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
                print(f"Created plan: {plan.name}")
        else:
            created_plans = db.query(Plan).all()
            print("Plans already exist, using existing plans")
        
        # Create demo tenant
        demo_tenant = None
        if not tenants_exist:
            tenant_data = {
                "name": "SparkCo Demo",
                "domain": "sparkco-demo",
                "description": "Demo tenant for SparkCo ERP system",
                "settings": {"theme": "default", "timezone": "UTC"}
            }
            demo_tenant = create_tenant(tenant_data, db)
            print(f"Created tenant: {demo_tenant.name}")
            
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
                print(f"Created subscription for tenant: {demo_tenant.name}")
        else:
            demo_tenant = db.query(Tenant).first()
            print("Tenant already exists, using existing tenant")
        
        # Handle existing users or create new ones
        created_users = []
        if users_exist:
            print(f"Found {existing_users} existing users. Updating them for multi-tenant support...")
            
            # Get existing users and assign them to the demo tenant
            existing_users_list = db.query(User).all()
            
            if demo_tenant:
                for user in existing_users_list:
                    # Update existing users to belong to the demo tenant
                    if not user.tenant_id:  # Only update if not already assigned
                        user.tenant_id = demo_tenant.id
                        print(f"Assigned user {user.email} to tenant {demo_tenant.name}")
                        
                        # Create tenant user relationship
                        existing_tenant_user = db.query(TenantUser).filter(
                            TenantUser.tenantId == demo_tenant.id,
                            TenantUser.userId == user.id
                        ).first()
                        
                        if not existing_tenant_user:
                            tenant_user_data = {
                                "tenantId": demo_tenant.id,
                                "userId": user.id,
                                "role": TenantRole.OWNER.value if user.userRole == UserRole.SUPER_ADMIN.value else TenantRole.MEMBER.value,
                                "permissions": ["*"] if user.userRole == UserRole.SUPER_ADMIN.value else [],
                                "isActive": True
                            }
                            create_tenant_user(tenant_user_data, db)
                            print(f"Created tenant user relationship for {user.email}")
                
                db.commit()
                created_users = existing_users_list
            
        elif demo_tenant:
            print("No existing users found. Creating sample users...")
            # Create new users only if none exist
            users_data = [
                # True super admin (not tied to a tenant)
                {
                    "tenant_id": None,
                    "userName": "superadmin",
                    "email": "superadmin@admin.com",
                    "firstName": "Super",
                    "lastName": "Admin",
                    "userRole": UserRole.SUPER_ADMIN.value,
                    "hashedPassword": get_password_hash("superadmin123"),
                    "isActive": True
                },
                # Admin for SparkCo Demo tenant
                {
                    "tenant_id": demo_tenant.id,
                    "userName": "admin",
                    "email": "admin@sparkco.com",
                    "firstName": "System",
                    "lastName": "Administrator",
                    "userRole": UserRole.ADMIN.value,
                    "hashedPassword": get_password_hash("admin123"),
                    "isActive": True
                },
                {
                    "tenant_id": demo_tenant.id,
                    "userName": "john_manager",
                    "email": "john@sparkco.com",
                    "firstName": "John",
                    "lastName": "Smith",
                    "userRole": UserRole.PROJECT_MANAGER.value,
                    "hashedPassword": get_password_hash("password123"),
                    "isActive": True
                },
                {
                    "tenant_id": demo_tenant.id,
                    "userName": "sarah_dev",
                    "email": "sarah@sparkco.com",
                    "firstName": "Sarah",
                    "lastName": "Johnson",
                    "userRole": UserRole.TEAM_MEMBER.value,
                    "hashedPassword": get_password_hash("password123"),
                    "isActive": True
                },
                {
                    "tenant_id": demo_tenant.id,
                    "userName": "mike_dev",
                    "email": "mike@sparkco.com",
                    "firstName": "Mike",
                    "lastName": "Wilson",
                    "userRole": UserRole.TEAM_MEMBER.value,
                    "hashedPassword": get_password_hash("password123"),
                    "isActive": True
                },
                {
                    "tenant_id": demo_tenant.id,
                    "userName": "lisa_designer",
                    "email": "lisa@sparkco.com",
                    "firstName": "Lisa",
                    "lastName": "Brown",
                    "userRole": UserRole.TEAM_MEMBER.value,
                    "hashedPassword": get_password_hash("password123"),
                    "isActive": True
                },
                {
                    "tenant_id": demo_tenant.id,
                    "userName": "client_user",
                    "email": "client@example.com",
                    "firstName": "Client",
                    "lastName": "User",
                    "userRole": UserRole.CLIENT.value,
                    "hashedPassword": get_password_hash("client123"),
                    "isActive": True
                }
            ]
            
            for user_data in users_data:
                user = create_user(user_data, db)
                created_users.append(user)
                print(f"Created user: {user.email}")
                
                # Create tenant user relationship
                tenant_user_data = {
                    "tenantId": demo_tenant.id,
                    "userId": user.id,
                    "role": TenantRole.OWNER.value if user.userRole == UserRole.SUPER_ADMIN.value else TenantRole.MEMBER.value,
                    "permissions": ["*"] if user.userRole == UserRole.SUPER_ADMIN.value else [],
                    "isActive": True
                }
                create_tenant_user(tenant_user_data, db)
        else:
            created_users = db.query(User).filter(User.tenant_id == demo_tenant.id).all() if demo_tenant else []
            print("Users already exist, using existing users")
        
        # Handle existing projects or create new ones
        if demo_tenant:
            # Check if projects already exist
            existing_projects_list = db.query(Project).all()
            existing_projects_count = len(existing_projects_list)
            
            if existing_projects_count > 0:
                print(f"Found {existing_projects_count} existing projects. Updating them for multi-tenant support...")
                
                # Update existing projects to belong to the demo tenant
                for project in existing_projects_list:
                    if not project.tenant_id:  # Only update if not already assigned
                        project.tenant_id = demo_tenant.id
                        print(f"Assigned project '{project.name}' to tenant {demo_tenant.name}")
                
                db.commit()
                print("Updated existing projects for multi-tenant support")
                
            elif created_users and len(created_users) >= 5:
                print("No existing projects found. Creating sample projects...")
                admin = created_users[0]
                john = created_users[1] if len(created_users) > 1 else admin
                sarah = created_users[2] if len(created_users) > 2 else admin
                mike = created_users[3] if len(created_users) > 3 else admin
                lisa = created_users[4] if len(created_users) > 4 else admin
                projects_data = [
                    {
                        "tenant_id": demo_tenant.id,
                        "name": "Website Redesign",
                        "description": "Complete redesign of the company website with modern UI/UX",
                        "status": ProjectStatus.IN_PROGRESS.value,
                        "priority": ProjectPriority.HIGH.value,
                        "startDate": "2024-01-15",
                        "endDate": "2024-03-15",
                        "completionPercent": 65,
                        "budget": 50000.0,
                        "actualCost": 32000.0,
                        "projectManagerId": john.id,
                        "notes": "Focus on mobile responsiveness and SEO optimization"
                    },
                    {
                        "tenant_id": demo_tenant.id,
                        "name": "Mobile App Development",
                        "description": "Native mobile application for iOS and Android platforms",
                        "status": ProjectStatus.PLANNING.value,
                        "priority": ProjectPriority.CRITICAL.value,
                        "startDate": "2024-02-01",
                        "endDate": "2024-06-01",
                        "completionPercent": 15,
                        "budget": 120000.0,
                        "actualCost": 18000.0,
                        "projectManagerId": john.id,
                        "notes": "Cross-platform compatibility is essential"
                    },
                    {
                        "tenant_id": demo_tenant.id,
                        "name": "E-commerce Platform",
                        "description": "Full-featured e-commerce platform with payment integration",
                        "status": ProjectStatus.COMPLETED.value,
                        "priority": ProjectPriority.MEDIUM.value,
                        "startDate": "2023-10-01",
                        "endDate": "2024-01-01",
                        "completionPercent": 100,
                        "budget": 80000.0,
                        "actualCost": 75000.0,
                        "projectManagerId": john.id,
                        "notes": "Successfully delivered on time and under budget"
                    }
                ]
                
                created_projects = []
                for project_data in projects_data:
                    project = create_project(project_data, db)
                    
                    # Add team members to projects
                    if project.name == "Website Redesign":
                        project.teamMembers = [sarah, lisa]
                    elif project.name == "Mobile App Development":
                        project.teamMembers = [sarah, mike]
                    elif project.name == "E-commerce Platform":
                        project.teamMembers = [sarah, mike, lisa]
                    
                    db.commit()
                    db.refresh(project)
                    created_projects.append(project)
                    print(f"Created project: {project.name}")
                
                # Create tasks for projects
                if created_projects and len(created_projects) >= 2:
                    website_project = created_projects[0]
                    mobile_project = created_projects[1]
                    
                    tasks_data = [
                        {
                            "tenant_id": demo_tenant.id,
                            "title": "Design Homepage Mockup",
                            "description": "Create wireframes and mockups for the new homepage design",
                            "status": TaskStatus.COMPLETED.value,
                            "priority": TaskPriority.HIGH.value,
                            "projectId": website_project.id,
                            "assignedToId": lisa.id,
                            "createdById": john.id,
                            "dueDate": "2024-02-01",
                            "estimatedHours": 16.0,
                            "actualHours": 14.0,
                            "tags": '["design", "ui", "homepage"]'
                        },
                        {
                            "tenant_id": demo_tenant.id,
                            "title": "Implement Responsive Navigation",
                            "description": "Develop mobile-responsive navigation menu",
                            "status": TaskStatus.IN_PROGRESS.value,
                            "priority": TaskPriority.MEDIUM.value,
                            "projectId": website_project.id,
                            "assignedToId": sarah.id,
                            "createdById": john.id,
                            "dueDate": "2024-02-15",
                            "estimatedHours": 12.0,
                            "actualHours": 8.0,
                            "tags": '["frontend", "responsive", "navigation"]'
                        },
                        {
                            "tenant_id": demo_tenant.id,
                            "title": "App Architecture Planning",
                            "description": "Define the overall architecture for the mobile application",
                            "status": TaskStatus.IN_PROGRESS.value,
                            "priority": TaskPriority.CRITICAL.value,
                            "projectId": mobile_project.id,
                            "assignedToId": mike.id,
                            "createdById": john.id,
                            "dueDate": "2024-02-20",
                            "estimatedHours": 24.0,
                            "actualHours": 12.0,
                            "tags": '["architecture", "planning", "mobile"]'
                        }
                    ]
                    
                    for task_data in tasks_data:
                        task = create_task(task_data, db)
                        print(f"Created task: {task.title}")
            else:
                print("Not enough users to create sample projects")
        
        # Handle existing tasks
        if demo_tenant:
            existing_tasks_list = db.query(Task).all()
            existing_tasks_count = len(existing_tasks_list)
            
            if existing_tasks_count > 0:
                print(f"Found {existing_tasks_count} existing tasks. Updating them for multi-tenant support...")
                
                # Update existing tasks to belong to the demo tenant
                for task in existing_tasks_list:
                    if not task.tenant_id:  # Only update if not already assigned
                        task.tenant_id = demo_tenant.id
                        print(f"Assigned task '{task.title}' to tenant {demo_tenant.name}")
                
                db.commit()
                print("Updated existing tasks for multi-tenant support")
        
        print("Database seeded successfully!")
        
    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
        raise
    finally:
        db.close()

def main():
    """Main function to run the seed script"""
    print("=" * 50)
    print("SparkCo ERP Unified Database Seeding Script")
    print("=" * 50)
    try:
        seed_database()
        print("\n" + "=" * 50)
        print("✅ Database seeded successfully!")
        print("=" * 50)
        print("\nDefault login credentials:")
        print("Admin: admin@sparkco.com / admin123")
        print("Manager: john@sparkco.com / password123")
        print("Team Member: sarah@sparkco.com / password123")
        print("Client: client@example.com / client123")
        print("=" * 50)
        print("\nTenant Information:")
        print("Demo Tenant: SparkCo Demo (sparkco-demo)")
        print("Use X-Tenant-ID header with tenant ID for API calls")
        print("=" * 50)
    except Exception as e:
        print(f"\n❌ Error seeding database: {e}")
        print("Make sure your DATABASE_URL is correctly set in the .env file")
        print("and that your database is accessible.")
        sys.exit(1)

if __name__ == "__main__":
    main()