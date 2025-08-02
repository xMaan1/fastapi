from fastapi import APIRouter, HTTPException, status, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
import json
from datetime import datetime

from ..project_models import Task, TaskCreate, TaskUpdate, TasksResponse
from ..project_database import (
    get_project_db, get_project_user_by_email, get_project_user_by_id,
    get_project_by_id, create_task, get_task_by_id, get_all_tasks,
    get_tasks_by_project, update_task, delete_task,
    Task as DBTask
)
from ..dependencies import get_current_user

router = APIRouter(prefix="/tasks", tags=["tasks"])

def transform_task_to_response(task: DBTask) -> Task:
    """Transform database task to response format"""
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

@router.get("", response_model=TasksResponse)
async def get_tasks(
    project: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    assignedTo: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_project_db)
):
    """Get all tasks with optional filtering"""
    skip = (page - 1) * limit
    
    if project:
        tasks = get_tasks_by_project(project, db)
    else:
        tasks = get_all_tasks(db, skip=skip, limit=limit)
    
    # Apply filters
    if status:
        tasks = [t for t in tasks if t.status.value == status]
    if assignedTo:
        tasks = [t for t in tasks if t.assignedToId == assignedTo]
    
    task_list = [transform_task_to_response(task) for task in tasks]
    
    return TasksResponse(
        tasks=task_list,
        pagination={
            "page": page,
            "limit": limit,
            "total": len(task_list),
            "pages": (len(task_list) + limit - 1) // limit
        }
    )

@router.get("/{task_id}", response_model=Task)
async def get_task(task_id: str, db: Session = Depends(get_project_db)):
    """Get a specific task"""
    task = get_task_by_id(task_id, db)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    return transform_task_to_response(task)

@router.post("", response_model=Task)
async def create_new_task(
    task_data: TaskCreate, 
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_project_db)
):
    """Create a new task"""
    # Get current user
    user = get_project_user_by_email(current_user.get("email"), db)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Verify project exists
    project = get_project_by_id(task_data.project, db)
    if not project:
        raise HTTPException(status_code=400, detail="Project not found")
    
    # Verify assignee exists if provided
    if task_data.assignedTo:
        assignee = get_project_user_by_id(task_data.assignedTo, db)
        if not assignee:
            raise HTTPException(status_code=400, detail="Assignee not found")
    
    # Create task
    task_dict = task_data.dict()
    task_dict['projectId'] = task_dict.pop('project')
    task_dict['assignedToId'] = task_dict.pop('assignedTo', None)
    task_dict['createdById'] = user.id
    task_dict['tags'] = json.dumps(task_dict.get('tags', []))
    
    db_task = create_task(task_dict, db)
    
    return transform_task_to_response(db_task)

@router.put("/{task_id}", response_model=Task)
async def update_existing_task(
    task_id: str, 
    task_data: TaskUpdate, 
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_project_db)
):
    """Update a task"""
    task = get_task_by_id(task_id, db)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    update_dict = task_data.dict(exclude_unset=True)
    
    # Handle assignee update
    if 'assignedTo' in update_dict:
        assignee_id = update_dict.pop('assignedTo')
        if assignee_id:
            assignee = get_project_user_by_id(assignee_id, db)
            if not assignee:
                raise HTTPException(status_code=400, detail="Assignee not found")
        update_dict['assignedToId'] = assignee_id
    
    # Handle tags
    if 'tags' in update_dict:
        update_dict['tags'] = json.dumps(update_dict['tags'])
    
    # Handle completion
    if update_dict.get('status') == 'completed' and task.status != 'completed':
        update_dict['completedAt'] = datetime.utcnow()
    
    updated_task = update_task(task_id, update_dict, db)
    
    return transform_task_to_response(updated_task)

@router.delete("/{task_id}")
async def delete_existing_task(
    task_id: str, 
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_project_db)
):
    """Delete a task"""
    success = delete_task(task_id, db)
    if not success:
        raise HTTPException(status_code=404, detail="Task not found")
    
    return {"message": "Task deleted successfully"}

# This endpoint will be handled by the projects router