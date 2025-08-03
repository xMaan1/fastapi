# SparkCo ERP - Multi-Tenant SaaS Architecture

## Overview

This project has been refactored to use a unified multi-tenant architecture suitable for SaaS applications. All data is now properly tenant-scoped, ensuring complete data isolation between different organizations.

## Key Changes

### 1. Unified Database System
- **Single Database**: All models (users, projects, tasks, tenants, plans) are now in one database
- **File**: `src/unified_database.py` - Contains all database models and functions
- **Models**: `src/unified_models.py` - Contains all Pydantic models for API responses

### 2. Multi-Tenant Architecture
- **Tenant Isolation**: Every data record has a `tenant_id` field
- **Automatic Filtering**: All queries are automatically filtered by tenant
- **Header-Based Context**: Use `X-Tenant-ID` header to specify tenant context

### 3. Removed Files
The following old files have been removed:
- `src/project_database.py` → `src/unified_database.py`
- `src/project_models.py` → `src/unified_models.py`
- `src/tenant_database.py` → `src/unified_database.py`
- `src/tenant_models.py` → `src/unified_models.py`
- `src/seed_data.py` → `src/unified_seed_data.py`

## Database Schema

### Core Tables
1. **tenants** - Organization/workspace information
2. **users** - User accounts (tenant-scoped)
3. **projects** - Projects (tenant-scoped)
4. **tasks** - Tasks (tenant-scoped)
5. **plans** - Subscription plans (global)
6. **subscriptions** - Tenant subscriptions
7. **tenant_users** - User-tenant relationships

### Multi-Tenant Fields
Every tenant-scoped table includes:
- `tenant_id` (UUID) - Links to the tenant
- Automatic filtering in all queries

## API Usage

### Authentication
```bash
# Login (returns JWT token)
POST /auth/login
{
  "email": "user@example.com",
  "password": "password"
}
```

### Tenant Context
```bash
# All tenant-scoped endpoints require X-Tenant-ID header
GET /projects
Headers: {
  "Authorization": "Bearer <jwt_token>",
  "X-Tenant-ID": "<tenant_uuid>"
}
```

### Key Endpoints

#### Plans (Global)
```bash
GET /plans                    # Get all subscription plans
```

#### Tenants
```bash
GET /tenants/my-tenants      # Get user's tenants
POST /tenants/subscribe      # Subscribe to a plan
GET /tenants/{id}            # Get tenant details
GET /tenants/{id}/users      # Get tenant users
```

#### Projects (Tenant-Scoped)
```bash
GET /projects                # Get tenant projects
POST /projects               # Create project
GET /projects/{id}           # Get project
PUT /projects/{id}           # Update project
DELETE /projects/{id}        # Delete project
GET /projects/team-members   # Get available team members
```

#### Tasks (Tenant-Scoped)
```bash
GET /tasks                   # Get tenant tasks
POST /tasks                  # Create task
GET /tasks/{id}              # Get task
PUT /tasks/{id}              # Update task
DELETE /tasks/{id}           # Delete task
```

#### Users (Tenant-Scoped)
```bash
GET /users                   # Get tenant users
POST /users                  # Create user
GET /users/{id}              # Get user
PUT /users/{id}              # Update user
DELETE /users/{id}           # Delete user
```

## Frontend Integration

### Tenant Selection
The frontend includes a `TenantSelector` component that:
- Loads user's available tenants
- Allows switching between tenants
- Automatically adds `X-Tenant-ID` header to API calls

### API Service Updates
```typescript
// Set current tenant
apiService.setTenantId('tenant-uuid');

// Get current tenant
const tenantId = apiService.getTenantId();

// All subsequent API calls will include X-Tenant-ID header
```

## Database Seeding

### Run the Seed Script
```bash
cd fastapi
python -m src.unified_seed_data
```

### What Gets Created
1. **Plans**: Starter, Professional, Enterprise
2. **Demo Tenant**: "SparkCo Demo" with Professional plan trial
3. **Users**: Admin, Manager, Team Members, Client
4. **Projects**: Sample projects with team assignments
5. **Tasks**: Sample tasks assigned to team members

### Default Credentials
- **Admin**: admin@sparkco.com / admin123
- **Manager**: john@sparkco.com / password123
- **Team Member**: sarah@sparkco.com / password123
- **Client**: client@example.com / client123

## Security Features

### Tenant Isolation
- All data queries are automatically filtered by tenant
- Users can only access data from their assigned tenants
- Cross-tenant data access is prevented at the database level

### Role-Based Access
- **Super Admin**: Full system access
- **Project Manager**: Can manage projects and tasks
- **Team Member**: Can view/update assigned tasks
- **Client**: Read-only access to relevant projects

### Tenant Roles
- **Owner**: Full tenant management
- **Admin**: User and project management
- **Manager**: Project management
- **Member**: Standard access
- **Viewer**: Read-only access

## Environment Setup

### Required Environment Variables
```bash
DATABASE_URL=postgresql://user:password@localhost/sparkco_erp
JWT_SECRET_KEY=your-secret-key
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

### Database Setup
1. Create PostgreSQL database
2. Set DATABASE_URL in .env file
3. Run seed script to create tables and sample data

## Development Guidelines

### Adding New Features
1. **Database Models**: Add to `unified_database.py`
2. **API Models**: Add to `unified_models.py`
3. **Routes**: Include tenant context dependency
4. **Always Filter**: Use `tenant_id` in all queries

### Tenant-Aware Queries
```python
# Always include tenant_id in queries
def get_projects(db: Session, tenant_id: str):
    return db.query(Project).filter(Project.tenant_id == tenant_id).all()

# Use tenant context dependency
@router.get("/projects")
async def get_projects(
    tenant_context: dict = Depends(get_tenant_context),
    db: Session = Depends(get_db)
):
    tenant_id = tenant_context["tenant_id"]
    return get_projects(db, tenant_id)
```

## Deployment Considerations

### Scaling
- Single database handles multiple tenants efficiently
- Horizontal scaling possible with read replicas
- Consider database partitioning for very large deployments

### Backup Strategy
- Regular full database backups
- Point-in-time recovery capability
- Tenant-specific backup/restore if needed

### Monitoring
- Track tenant usage and resource consumption
- Monitor query performance across tenants
- Set up alerts for tenant-specific issues

This architecture provides a solid foundation for a multi-tenant SaaS application with proper data isolation, security, and scalability.