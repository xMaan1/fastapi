from fastapi import APIRouter, HTTPException, status, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
import json

from ..unified_models import (
    Project, ProjectCreate, ProjectUpdate, ProjectsResponse, TeamMember,
    TasksResponse, Task
)
from ..unified_database import (
    get_db, get_user_by_id, create_project, get_project_by_id,
    get_all_projects, update_project, delete_project, get_tasks_by_project,
    User, Project as DBProject, Task as DBTask
)
from ..dependencies import get_current_user, get_tenant_context, require_tenant_admin_or_super_admin

router = APIRouter(prefix="/projects", tags=["projects"])

def transform_user_to_team_member(user: User) -> TeamMember:
    """Transform a User to TeamMember format"""
    return TeamMember(
        id=str(user.id),
        name=f"{user.firstName or ''} {user.lastName or ''}".strip() or user.userName,
        email=user.email,
        role=user.userRole,
        avatar=user.avatar
    )

def transform_project_to_response(project: DBProject) -> Project:
    """Transform database project to response format"""
    return Project(
        id=str(project.id),
        name=project.name,
        description=project.description,
        status=project.status,
        priority=project.priority,
        startDate=project.startDate,
        endDate=project.endDate,
        completionPercent=project.completionPercent,
        budget=project.budget,
        actualCost=project.actualCost,
        projectManager=transform_user_to_team_member(project.projectManager),
        teamMembers=[transform_user_to_team_member(member) for member in project.teamMembers],
        createdAt=project.createdAt,
        updatedAt=project.updatedAt,
        notes=project.notes,
        activities=[]  # TODO: Implement activities
    )

@router.get("", response_model=ProjectsResponse)
async def get_projects(
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    tenant_context: Optional[dict] = Depends(get_tenant_context)
):
    """Get all projects with optional filtering (tenant-scoped)"""
    skip = (page - 1) * limit
    tenant_id = tenant_context["tenant_id"] if tenant_context else None
    projects = get_all_projects(db, tenant_id=tenant_id, skip=skip, limit=limit)
    
    # Apply filters (basic implementation)
    if status:
        projects = [p for p in projects if p.status == status]
    if priority:
        projects = [p for p in projects if p.priority == priority]
    if search:
        search_lower = search.lower()
        projects = [p for p in projects if 
                   search_lower in p.name.lower() or 
                   (p.description and search_lower in p.description.lower())]
    
    project_list = [transform_project_to_response(project) for project in projects]
    
    return ProjectsResponse(
        projects=project_list,
        pagination={
            "page": page,
            "limit": limit,
            "total": len(project_list),
            "pages": (len(project_list) + limit - 1) // limit
        }
    )

@router.get("/{project_id}", response_model=Project)
async def get_project(
    project_id: str, 
    db: Session = Depends(get_db),
    tenant_context: Optional[dict] = Depends(get_tenant_context)
):
    """Get a specific project"""
    import uuid
    tenant_id = tenant_context["tenant_id"] if tenant_context else None
    # Validate project_id is a valid UUID
    try:
        uuid.UUID(str(project_id))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid project_id format. Must be a UUID.")
    project = get_project_by_id(project_id, db, tenant_id=tenant_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return transform_project_to_response(project)

@router.post("", response_model=Project, dependencies=[Depends(require_tenant_admin_or_super_admin)])
async def create_new_project(
    project_data: ProjectCreate, 
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
    tenant_context: Optional[dict] = Depends(get_tenant_context)
):
    """Create a new project"""
    # Verify project manager exists
    project_manager = get_user_by_id(project_data.projectManagerId, db)
    if not project_manager:
        raise HTTPException(status_code=400, detail="Project manager not found")
    
    # Check tenant access for project manager
    if tenant_context and str(project_manager.tenant_id) != tenant_context["tenant_id"]:
        raise HTTPException(status_code=400, detail="Project manager not in tenant")
    
    # Verify team members exist
    team_members = []
    for member_id in project_data.teamMemberIds:
        member = get_user_by_id(member_id, db)
        if not member:
            raise HTTPException(status_code=400, detail=f"Team member {member_id} not found")
        # Check tenant access for team member
        if tenant_context and str(member.tenant_id) != tenant_context["tenant_id"]:
            raise HTTPException(status_code=400, detail=f"Team member {member_id} not in tenant")
        team_members.append(member)
    
    # Create project
    project_dict = project_data.dict()
    team_member_ids = project_dict.pop('teamMemberIds')
    
    # Set tenant_id if tenant context is provided
    if tenant_context:
        project_dict['tenant_id'] = tenant_context["tenant_id"]
    
    db_project = create_project(project_dict, db)
    
    # Add team members
    db_project.teamMembers = team_members
    db.commit()
    db.refresh(db_project)
    
    return transform_project_to_response(db_project)

@router.put("/{project_id}", response_model=Project, dependencies=[Depends(require_tenant_admin_or_super_admin)])
async def update_existing_project(
    project_id: str, 
    project_data: ProjectUpdate, 
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
    tenant_context: Optional[dict] = Depends(get_tenant_context)
):
    """Update a project"""
    tenant_id = tenant_context["tenant_id"] if tenant_context else None
    project = get_project_by_id(project_id, db, tenant_id=tenant_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    update_dict = project_data.dict(exclude_unset=True)
    
    # Handle team members update
    if 'teamMemberIds' in update_dict:
        team_member_ids = update_dict.pop('teamMemberIds')
        team_members = []
        for member_id in team_member_ids:
            member = get_user_by_id(member_id, db)
            if not member:
                raise HTTPException(status_code=400, detail=f"Team member {member_id} not found")
            # Check tenant access for team member
            if tenant_context and str(member.tenant_id) != tenant_context["tenant_id"]:
                raise HTTPException(status_code=400, detail=f"Team member {member_id} not in tenant")
            team_members.append(member)
        project.teamMembers = team_members
    
    # Update other fields
    updated_project = update_project(project_id, update_dict, db, tenant_id=tenant_id)
    
    return transform_project_to_response(updated_project)

@router.delete("/{project_id}", dependencies=[Depends(require_tenant_admin_or_super_admin)])
async def delete_existing_project(
    project_id: str, 
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
    tenant_context: Optional[dict] = Depends(get_tenant_context)
):
    """Delete a project"""
    tenant_id = tenant_context["tenant_id"] if tenant_context else None
    success = delete_project(project_id, db, tenant_id=tenant_id)
    if not success:
        raise HTTPException(status_code=404, detail="Project not found")
    
    return {"message": "Project deleted successfully"}

def transform_task_to_response(task: DBTask):
    """Transform database task to response format for project tasks"""
    return Task(
        id=str(task.id),
        title=task.title,
        description=task.description,
        status=task.status,
        priority=task.priority,
        project=str(task.projectId),
        assignedTo={
            "id": str(task.assignedTo.id),
            "name": f"{task.assignedTo.firstName or ''} {task.assignedTo.lastName or ''}".strip() or task.assignedTo.userName,
            "email": task.assignedTo.email
        } if task.assignedTo else None,
        dueDate=task.dueDate,
        estimatedHours=task.estimatedHours,
        actualHours=task.actualHours,
        tags=json.loads(task.tags) if task.tags else [],
        createdBy={
            "id": str(task.createdBy.id),
            "name": f"{task.createdBy.firstName or ''} {task.createdBy.lastName or ''}".strip() or task.createdBy.userName,
            "email": task.createdBy.email
        },
        completedAt=task.completedAt,
        createdAt=task.createdAt,
        updatedAt=task.updatedAt
    )

@router.get("/{project_id}/tasks", response_model=TasksResponse)
async def get_project_tasks(
    project_id: str, 
    db: Session = Depends(get_db),
    tenant_context: Optional[dict] = Depends(get_tenant_context)
):
    """Get all tasks for a specific project"""
    tenant_id = tenant_context["tenant_id"] if tenant_context else None
    project = get_project_by_id(project_id, db, tenant_id=tenant_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    tasks = get_tasks_by_project(project_id, db, tenant_id=tenant_id)
    task_list = [transform_task_to_response(task) for task in tasks]
    
    return TasksResponse(
        tasks=task_list,
        pagination={
            "page": 1,
            "limit": len(task_list),
            "total": len(task_list),
            "pages": 1
        }
    )

@router.get("/team-members")
async def get_project_team_members(
    db: Session = Depends(get_db),
    tenant_context: Optional[dict] = Depends(get_tenant_context)
):
    """Get all available team members for project assignment"""
    from ..unified_models import UserRole
    from ..unified_database import get_all_users
    
    # Get all active users who can be team members
    tenant_id = tenant_context["tenant_id"] if tenant_context else None
    users = get_all_users(db, tenant_id=tenant_id)
    team_members = []
    
    for user in users:
        if user.isActive and user.userRole in [UserRole.PROJECT_MANAGER.value, UserRole.TEAM_MEMBER.value]:
            team_members.append({
                "id": str(user.id),
                "name": f"{user.firstName or ''} {user.lastName or ''}".strip() or user.userName,
                "email": user.email,
                "role": user.userRole,
                "avatar": user.avatar
            })
    
    return {"teamMembers": team_members}