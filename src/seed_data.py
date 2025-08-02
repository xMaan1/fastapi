"""
Seed script to populate the database with initial data
Run this script to seed your AWS RDS database with sample data.

Usage:
1. Make sure your .env file has the correct DATABASE_URL for your AWS RDS
2. Run: python -m src.seed_data
"""
import sys
import os
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

# Add the src directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.project_database import (
    get_project_db, create_project_tables,
    create_project_user, create_project, create_task,
    ProjectUser, Project as DBProject, Task as DBTask
)
from src.project_models import UserRole, ProjectStatus, ProjectPriority, TaskStatus, TaskPriority
from src.tenant_database import get_tenant_db, create_tenant_tables, create_plan
from src.tenant_models import PlanType, PlanFeature
from src.auth import get_password_hash

def seed_database():
    """Seed the database with initial data"""
    
    print("Creating database tables...")
    # Create tables
    create_project_tables()
    create_tenant_tables()
    
    # Get database sessions
    db_gen = get_project_db()
    db = next(db_gen)
    
    tenant_db_gen = get_tenant_db()
    tenant_db = next(tenant_db_gen)
    
    try:
        # Check if data already exists
        existing_users = db.query(ProjectUser).count()
        if existing_users > 0:
            print("Database already contains data. Skipping seed.")
            return
        
        print("Seeding database with initial data...")
        
        # Create users
        users_data = [
            {
                "userName": "admin",
                "email": "admin@sparkco.com",
                "firstName": "System",
                "lastName": "Administrator",
                "userRole": UserRole.SUPER_ADMIN,
                "hashedPassword": get_password_hash("admin123"),
                "isActive": True
            },
            {
                "userName": "john_manager",
                "email": "john@sparkco.com",
                "firstName": "John",
                "lastName": "Smith",
                "userRole": UserRole.PROJECT_MANAGER,
                "hashedPassword": get_password_hash("password123"),
                "isActive": True
            },
            {
                "userName": "sarah_dev",
                "email": "sarah@sparkco.com",
                "firstName": "Sarah",
                "lastName": "Johnson",
                "userRole": UserRole.TEAM_MEMBER,
                "hashedPassword": get_password_hash("password123"),
                "isActive": True
            },
            {
                "userName": "mike_dev",
                "email": "mike@sparkco.com",
                "firstName": "Mike",
                "lastName": "Wilson",
                "userRole": UserRole.TEAM_MEMBER,
                "hashedPassword": get_password_hash("password123"),
                "isActive": True
            },
            {
                "userName": "lisa_designer",
                "email": "lisa@sparkco.com",
                "firstName": "Lisa",
                "lastName": "Brown",
                "userRole": UserRole.TEAM_MEMBER,
                "hashedPassword": get_password_hash("password123"),
                "isActive": True
            },
            {
                "userName": "client_user",
                "email": "client@example.com",
                "firstName": "Client",
                "lastName": "User",
                "userRole": UserRole.CLIENT,
                "hashedPassword": get_password_hash("client123"),
                "isActive": True
            }
        ]
        
        created_users = []
        for user_data in users_data:
            user = create_project_user(user_data, db)
            created_users.append(user)
            print(f"Created user: {user.email}")
        
        # Get users for project creation
        admin = created_users[0]
        john = created_users[1]
        sarah = created_users[2]
        mike = created_users[3]
        lisa = created_users[4]
        
        # Create projects
        projects_data = [
            {
                "name": "Website Redesign",
                "description": "Complete redesign of the company website with modern UI/UX",
                "status": ProjectStatus.IN_PROGRESS,
                "priority": ProjectPriority.HIGH,
                "startDate": "2024-01-15",
                "endDate": "2024-03-15",
                "completionPercent": 65,
                "budget": 50000.0,
                "actualCost": 32000.0,
                "projectManagerId": john.id,
                "notes": "Focus on mobile responsiveness and SEO optimization"
            },
            {
                "name": "Mobile App Development",
                "description": "Native mobile application for iOS and Android platforms",
                "status": ProjectStatus.PLANNING,
                "priority": ProjectPriority.CRITICAL,
                "startDate": "2024-02-01",
                "endDate": "2024-06-01",
                "completionPercent": 15,
                "budget": 120000.0,
                "actualCost": 18000.0,
                "projectManagerId": john.id,
                "notes": "Cross-platform compatibility is essential"
            },
            {
                "name": "E-commerce Platform",
                "description": "Full-featured e-commerce platform with payment integration",
                "status": ProjectStatus.COMPLETED,
                "priority": ProjectPriority.MEDIUM,
                "startDate": "2023-10-01",
                "endDate": "2024-01-01",
                "completionPercent": 100,
                "budget": 80000.0,
                "actualCost": 75000.0,
                "projectManagerId": john.id,
                "notes": "Successfully delivered on time and under budget"
            },
            {
                "name": "Data Analytics Dashboard",
                "description": "Business intelligence dashboard for data visualization",
                "status": ProjectStatus.ON_HOLD,
                "priority": ProjectPriority.LOW,
                "startDate": "2024-03-01",
                "endDate": "2024-05-01",
                "completionPercent": 25,
                "budget": 35000.0,
                "actualCost": 8750.0,
                "projectManagerId": john.id,
                "notes": "Waiting for client requirements clarification"
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
            else:
                project.teamMembers = [sarah]
            
            db.commit()
            db.refresh(project)
            created_projects.append(project)
            print(f"Created project: {project.name}")
        
        # Create tasks
        website_project = created_projects[0]
        mobile_project = created_projects[1]
        
        tasks_data = [
            {
                "title": "Design Homepage Mockup",
                "description": "Create wireframes and mockups for the new homepage design",
                "status": TaskStatus.COMPLETED,
                "priority": TaskPriority.HIGH,
                "projectId": website_project.id,
                "assignedToId": lisa.id,
                "createdById": john.id,
                "dueDate": "2024-02-01",
                "estimatedHours": 16.0,
                "actualHours": 14.0,
                "tags": '["design", "ui", "homepage"]'
            },
            {
                "title": "Implement Responsive Navigation",
                "description": "Develop mobile-responsive navigation menu",
                "status": TaskStatus.IN_PROGRESS,
                "priority": TaskPriority.MEDIUM,
                "projectId": website_project.id,
                "assignedToId": sarah.id,
                "createdById": john.id,
                "dueDate": "2024-02-15",
                "estimatedHours": 12.0,
                "actualHours": 8.0,
                "tags": '["frontend", "responsive", "navigation"]'
            },
            {
                "title": "SEO Optimization",
                "description": "Optimize website for search engines",
                "status": TaskStatus.TODO,
                "priority": TaskPriority.MEDIUM,
                "projectId": website_project.id,
                "assignedToId": sarah.id,
                "createdById": john.id,
                "dueDate": "2024-03-01",
                "estimatedHours": 20.0,
                "tags": '["seo", "optimization", "marketing"]'
            },
            {
                "title": "App Architecture Planning",
                "description": "Define the overall architecture for the mobile application",
                "status": TaskStatus.IN_PROGRESS,
                "priority": TaskPriority.CRITICAL,
                "projectId": mobile_project.id,
                "assignedToId": mike.id,
                "createdById": john.id,
                "dueDate": "2024-02-20",
                "estimatedHours": 24.0,
                "actualHours": 12.0,
                "tags": '["architecture", "planning", "mobile"]'
            },
            {
                "title": "User Authentication System",
                "description": "Implement secure user authentication and authorization",
                "status": TaskStatus.TODO,
                "priority": TaskPriority.HIGH,
                "projectId": mobile_project.id,
                "assignedToId": sarah.id,
                "createdById": john.id,
                "dueDate": "2024-03-15",
                "estimatedHours": 32.0,
                "tags": '["auth", "security", "backend"]'
            }
        ]
        
        for task_data in tasks_data:
            task = create_task(task_data, db)
            print(f"Created task: {task.title}")
        
        # Create subscription plans
        plans_data = [
            {
                "name": "Starter",
                "description": "Perfect for small teams getting started with project management",
                "plan_type": PlanType.STARTER,
                "price": 29.0,
                "billing_cycle": "monthly",
                "max_projects": 10,
                "max_users": 5,
                "features": [
                    PlanFeature.API_ACCESS.value
                ],
                "is_active": True
            },
            {
                "name": "Professional",
                "description": "Ideal for growing teams that need advanced features",
                "plan_type": PlanType.PROFESSIONAL,
                "price": 79.0,
                "billing_cycle": "monthly",
                "max_projects": 50,
                "max_users": 25,
                "features": [
                    PlanFeature.API_ACCESS.value,
                    PlanFeature.ADVANCED_REPORTING.value,
                    PlanFeature.PRIORITY_SUPPORT.value,
                    PlanFeature.ADVANCED_PERMISSIONS.value
                ],
                "is_active": True
            },
            {
                "name": "Enterprise",
                "description": "For large organizations with complex project management needs",
                "plan_type": PlanType.ENTERPRISE,
                "price": 199.0,
                "billing_cycle": "monthly",
                "max_projects": None,  # Unlimited
                "max_users": None,     # Unlimited
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
                "is_active": True
            }
        ]
        
        for plan_data in plans_data:
            plan = create_plan(plan_data, tenant_db)
            print(f"Created plan: {plan.name}")
        
        print("Database seeded successfully!")
        
    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()
        tenant_db.close()

def main():
    """Main function to run the seed script"""
    print("=" * 50)
    print("SparkCo ERP Database Seeding Script")
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
    except Exception as e:
        print(f"\n❌ Error seeding database: {e}")
        print("Make sure your DATABASE_URL is correctly set in the .env file")
        print("and that your database is accessible.")
        sys.exit(1)

if __name__ == "__main__":
    main()