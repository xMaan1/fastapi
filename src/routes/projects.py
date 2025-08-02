from fastapi import APIRouter, HTTPException, status, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional

from ..project_models import (
    Project, ProjectCreate, ProjectUpdate, ProjectsResponse, TeamMember,
    TasksResponse
)
from ..project_database import (
    get_project_db, get_project_user_by_id, create_project, get_project_by_id,
    get_all_projects, update_project, delete_project, get_tasks_by_project,
    ProjectUser, Project as DBProject, Task as DBTask
)
import json
from ..dependencies import get_current_user

router = APIRouter(prefix="/projects", tags=["projects"])

def transform_user_to_team_member(user: ProjectUser) -> TeamMember:
    """Transform a ProjectUser to TeamMember format"""
    return TeamMember(
        id=user.id,
        name=f"{user.firstName or ''} {user.lastName or ''}".strip() or user.userName,
        email=user.email,
        role=user.userRole.value,
        avatar=user.avatar
    )

def transform_project_to_response(project: DBProject) -> Project:
    """Transform database project to response format"""
    return Project(
        id=project.id,
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
    db: Session = Depends(get_project_db)
):
    """Get all projects with optional filtering"""
    skip = (page - 1) * limit
    projects = get_all_projects(db, skip=skip, limit=limit)
    
    # Apply filters (basic implementation)
    if status:
        projects = [p for p in projects if p.status.value == status]
    if priority:
        projects = [p for p in projects if p.priority.value == priority]
    if search:
        search_lower = search.lower()
        projects = [p for p in projects if 
                   search_lower in p.name.lower() or 
                   search_lower in p.description.lower()]
    
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
async def get_project(project_id: str, db: Session = Depends(get_project_db)):
    """Get a specific project"""
    project = get_project_by_id(project_id, db)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    return transform_project_to_response(project)

@router.post("", response_model=Project)
async def create_new_project(
    project_data: ProjectCreate, 
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_project_db)
):
    """Create a new project"""
    # Verify project manager exists
    project_manager = get_project_user_by_id(project_data.projectManagerId, db)
    if not project_manager:
        raise HTTPException(status_code=400, detail="Project manager not found")
    
    # Verify team members exist
    team_members = []
    for member_id in project_data.teamMemberIds:
        member = get_project_user_by_id(member_id, db)
        if not member:
            raise HTTPException(status_code=400, detail=f"Team member {member_id} not found")
        team_members.append(member)
    
    # Create project
    project_dict = project_data.dict()
    team_member_ids = project_dict.pop('teamMemberIds')
    
    db_project = create_project(project_dict, db)
    
    # Add team members
    db_project.teamMembers = team_members
    db.commit()
    db.refresh(db_project)
    
    return transform_project_to_response(db_project)

@router.put("/{project_id}", response_model=Project)
async def update_existing_project(
    project_id: str, 
    project_data: ProjectUpdate, 
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_project_db)
):
    """Update a project"""
    project = get_project_by_id(project_id, db)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    update_dict = project_data.dict(exclude_unset=True)
    
    # Handle team members update
    if 'teamMemberIds' in update_dict:
        team_member_ids = update_dict.pop('teamMemberIds')
        team_members = []
        for member_id in team_member_ids:
            member = get_project_user_by_id(member_id, db)
            if not member:
                raise HTTPException(status_code=400, detail=f"Team member {member_id} not found")
            team_members.append(member)
        project.teamMembers = team_members
    
    # Update other fields
    updated_project = update_project(project_id, update_dict, db)
    
    return transform_project_to_response(updated_project)

@router.delete("/{project_id}")
async def delete_existing_project(
    project_id: str, 
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_project_db)
):
    """Delete a project"""
    success = delete_project(project_id, db)
    if not success:
        raise HTTPException(status_code=404, detail="Project not found")
    
    return {"message": "Project deleted successfully"}

def transform_task_to_response(task: DBTask):
    """Transform database task to response format for project tasks"""
    from ..project_models import Task
    return Task(
        id=task.id,
        title=task.title,
        description=task.description,
        status=task.status,
        priority=task.priority,
        project=task.projectId,
        assignedTo={
            "id": task.assignedTo.id,
            "name": f"{task.assignedTo.firstName or ''} {task.assignedTo.lastName or ''}".strip() or task.assignedTo.userName,
            "email": task.assignedTo.email
        } if task.assignedTo else None,
        dueDate=task.dueDate,
        estimatedHours=task.estimatedHours,
        actualHours=task.actualHours,
        tags=json.loads(task.tags) if task.tags else [],
        createdBy={
            "id": task.createdBy.id,
            "name": f"{task.createdBy.firstName or ''} {task.createdBy.lastName or ''}".strip() or task.createdBy.userName,
            "email": task.createdBy.email
        },
        completedAt=task.completedAt,
        createdAt=task.createdAt,
        updatedAt=task.updatedAt
    )

@router.get("/{project_id}/tasks", response_model=TasksResponse)
async def get_project_tasks(project_id: str, db: Session = Depends(get_project_db)):
    """Get all tasks for a specific project"""
    project = get_project_by_id(project_id, db)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    tasks = get_tasks_by_project(project_id, db)
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