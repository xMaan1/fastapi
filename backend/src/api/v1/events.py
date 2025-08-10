from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
import uuid

from ...config.unified_database import get_db, get_event_by_id, get_all_events, create_event, update_event, delete_event, get_events_by_project, get_events_by_user, get_upcoming_events
from ...models.unified_models import EventCreate, EventUpdate, Event, EventResponse, EventType, EventStatus, RecurrenceType
from ...api.dependencies import get_current_user, get_current_tenant
from ...services.google_meet_service import google_meet_service

router = APIRouter(prefix="/events", tags=["events"])

def convert_event_to_response(event):
    """Convert database event object to response model"""
    # Check if the meet link is valid, if not, set it to None
    google_meet_link = event.googleMeetLink
    if google_meet_link and ('_meet/whoops' in google_meet_link or not google_meet_link.startswith('https://meet.google.com/')):
        # Invalid meet link, set to None so frontend can handle it
        google_meet_link = None
    
    return {
        "id": str(event.id),
        "title": event.title,
        "description": event.description,
        "eventType": event.eventType,
        "startDate": event.startDate,
        "endDate": event.endDate,
        "timezone": event.timezone,
        "location": event.location,
        "isOnline": event.isOnline,
        "googleMeetLink": google_meet_link,
        "googleCalendarEventId": event.googleCalendarEventId,
        "recurrenceType": event.recurrenceType,
        "recurrenceData": event.recurrenceData,
        "reminderMinutes": event.reminderMinutes,
        "participants": event.participants or [],
        "discussionPoints": event.discussionPoints or [],
        "attachments": event.attachments or [],
        "projectId": str(event.projectId) if event.projectId else None,
        "status": event.status,
        "createdBy": str(event.createdById),
        "tenantId": str(event.tenant_id),
        "createdAt": event.createdAt,
        "updatedAt": event.updatedAt
    }

@router.post("/", response_model=Event)
async def create_new_event(
    event: EventCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    current_tenant: dict = Depends(get_current_tenant)
):
    """Create a new event with Google Meet integration"""
    try:
        # Prepare event data
        event_data = event.dict()
        event_data['id'] = str(uuid.uuid4())
        event_data['tenant_id'] = str(current_tenant['id'])
        event_data['createdById'] = str(current_user.id)
        event_data['createdAt'] = datetime.utcnow()
        event_data['updatedAt'] = datetime.utcnow()
        
        # Handle optional fields that should be None instead of empty strings
        if event_data.get('projectId') == '':
            event_data['projectId'] = None
        if event_data.get('location') == '':
            event_data['location'] = None
            
        # Convert enum values to strings
        if 'eventType' in event_data and hasattr(event_data['eventType'], 'value'):
            event_data['eventType'] = event_data['eventType'].value
        if 'recurrenceType' in event_data and hasattr(event_data['recurrenceType'], 'value'):
            event_data['recurrenceType'] = event_data['recurrenceType'].value
        if 'status' in event_data and hasattr(event_data['status'], 'value'):
            event_data['status'] = event_data['status'].value
        
        # Create Google Meet event if online
        if event_data.get('isOnline', True):
            meet_result = google_meet_service.create_meeting(event_data)
            if meet_result['success']:
                event_data['googleMeetLink'] = meet_result.get('meet_link')
                event_data['googleCalendarEventId'] = meet_result.get('event_id')
            else:
                # Log the error but continue with event creation
                print(f"Google Meet creation failed: {meet_result.get('error')}")
        
        # Create event in database
        db_event = create_event(event_data, db)
        
        # Convert database object to response model
        return convert_event_to_response(db_event)
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create event: {str(e)}"
        )

@router.get("/", response_model=EventResponse)
async def get_events(
    skip: int = 0,
    limit: int = 100,
    project_id: Optional[str] = None,
    user_id: Optional[str] = None,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    current_tenant: dict = Depends(get_current_tenant)
):
    """Get all events with optional filtering"""
    try:
        if project_id:
            events = get_events_by_project(project_id, db, str(current_tenant['id']))
        elif user_id:
            events = get_events_by_user(user_id, db, str(current_tenant['id']))
        else:
            events = get_all_events(db, str(current_tenant['id']), skip, limit)
        
        # Apply status filter if provided
        if status_filter:
            events = [event for event in events if event.status == status_filter]
        
        # Convert database objects to response models
        events_response = [convert_event_to_response(event) for event in events]
        
        return {
            "events": events_response,
            "pagination": {
                "skip": skip,
                "limit": limit,
                "total": len(events)
            }
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch events: {str(e)}"
        )

@router.get("/upcoming", response_model=EventResponse)
async def get_upcoming_events_route(
    days: int = 7,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    current_tenant: dict = Depends(get_current_tenant)
):
    """Get upcoming events for the next N days"""
    try:
        events = get_upcoming_events(db, str(current_tenant['id']), days)
        
        # Convert database objects to response models
        events_response = [convert_event_to_response(event) for event in events]
        
        return {
            "events": events_response,
            "pagination": {
                "total": len(events),
                "days": days
            }
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch upcoming events: {str(e)}"
        )

@router.get("/{event_id}", response_model=Event)
async def get_event(
    event_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    current_tenant: dict = Depends(get_current_tenant)
):
    """Get a specific event by ID"""
    try:
        event = get_event_by_id(event_id, db, str(current_tenant['id']))
        if not event:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Event not found"
            )
        
        # Convert database object to response model
        return convert_event_to_response(event)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch event: {str(e)}"
        )

@router.put("/{event_id}", response_model=Event)
async def update_existing_event(
    event_id: str,
    event_update: EventUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    current_tenant: dict = Depends(get_current_tenant)
):
    """Update an existing event"""
    try:
        # Get existing event
        existing_event = get_event_by_id(event_id, db, str(current_tenant['id']))
        if not existing_event:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Event not found"
            )
        
        # Prepare update data
        update_data = event_update.dict(exclude_unset=True)
        update_data['updatedAt'] = datetime.utcnow()
        
        # Update Google Calendar event if it exists
        if existing_event.googleCalendarEventId and update_data:
            meet_result = google_meet_service.update_meeting(
                existing_event.googleCalendarEventId,
                update_data
            )
            if not meet_result['success']:
                print(f"Google Calendar update failed: {meet_result.get('error')}")
        
        # Update event in database
        updated_event = update_event(event_id, update_data, db, str(current_tenant['id']))
        
        if not updated_event:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update event"
            )
        
        # Convert database object to response model
        return convert_event_to_response(updated_event)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update event: {str(e)}"
        )

@router.delete("/{event_id}")
async def delete_existing_event(
    event_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    current_tenant: dict = Depends(get_current_tenant)
):
    """Delete an existing event"""
    try:
        # Get existing event
        existing_event = get_event_by_id(event_id, db, str(current_tenant['id']))
        if not existing_event:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Event not found"
            )
        
        # Delete from Google Calendar if it exists
        if existing_event.googleCalendarEventId:
            meet_result = google_meet_service.delete_meeting(existing_event.googleCalendarEventId)
            if not meet_result['success']:
                print(f"Google Calendar deletion failed: {meet_result.get('error')}")
        
        # Delete event from database
        success = delete_event(event_id, db, str(current_tenant['id']))
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete event"
            )
        
        return {"message": "Event deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete event: {str(e)}"
        )

@router.post("/{event_id}/regenerate-meet-link")
async def regenerate_meet_link(
    event_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    current_tenant: dict = Depends(get_current_tenant)
):
    """Regenerate Google Meet link for an existing event"""
    try:
        # Get existing event
        existing_event = get_event_by_id(event_id, db, str(current_tenant['id']))
        if not existing_event:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Event not found"
            )
        
        # Check if event is online
        if not existing_event.isOnline:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot generate meet link for offline events"
            )
        
        # Generate new Google Meet link
        meet_result = google_meet_service.create_meeting({
            'id': str(existing_event.id),
            'title': existing_event.title,
            'startDate': existing_event.startDate,
            'endDate': existing_event.endDate
        })
        
        if not meet_result['success']:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to generate meet link: {meet_result.get('error')}"
            )
        
        # Update event with new meet link
        update_data = {
            'googleMeetLink': meet_result.get('meet_link'),
            'googleCalendarEventId': meet_result.get('event_id'),
            'updatedAt': datetime.utcnow()
        }
        
        updated_event = update_event(event_id, update_data, db, str(current_tenant['id']))
        
        if not updated_event:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update event with new meet link"
            )
        
        # Convert database object to response model
        return convert_event_to_response(updated_event)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to regenerate meet link: {str(e)}"
        )

@router.post("/{event_id}/join")
async def join_event(
    event_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    current_tenant: dict = Depends(get_current_tenant)
):
    """Join an event (add user to participants)"""
    try:
        event = get_event_by_id(event_id, db, str(current_tenant['id']))
        if not event:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Event not found"
            )
        
        # Add user to participants if not already present
        participants = event.participants or []
        if str(current_user.id) not in participants:
            participants.append(str(current_user.id))
            
            update_data = {
                'participants': participants,
                'updatedAt': datetime.utcnow()
            }
            
            updated_event = update_event(event_id, update_data, db, str(current_tenant['id']))
            if not updated_event:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to join event"
                )
        
        return {"message": "Successfully joined event"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to join event: {str(e)}"
        )

@router.post("/{event_id}/leave")
async def leave_event(
    event_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    current_tenant: dict = Depends(get_current_tenant)
):
    """Leave an event (remove user from participants)"""
    try:
        event = get_event_by_id(event_id, db, str(current_tenant['id']))
        if not event:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Event not found"
            )
        
        # Remove user from participants
        participants = event.participants or []
        if str(current_user.id) in participants:
            participants.remove(str(current_user.id))
            
            update_data = {
                'participants': participants,
                'updatedAt': datetime.utcnow()
            }
            
            updated_event = update_event(event_id, update_data, db, str(current_tenant['id']))
            if not updated_event:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to leave event"
                )
        
        return {"message": "Successfully left event"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to leave event: {str(e)}"
        )
