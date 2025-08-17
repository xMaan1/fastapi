import os
import json
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from google.auth.transport.requests import Request
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

# If modifying these scopes, update the service account permissions accordingly
SCOPES = ['https://www.googleapis.com/auth/calendar']

class GoogleMeetService:
    def __init__(self):
        self.credentials = None
        self.service = None
        self._load_credentials()
    
    def _load_credentials(self):
        """Load Google API credentials using service account"""
        try:
            # Use service account credentials
            service_account_path = os.getenv('GOOGLE_APPLICATION_CREDENTIALS')
            if not service_account_path:
                raise Exception("GOOGLE_APPLICATION_CREDENTIALS environment variable not set")
            
            if not os.path.exists(service_account_path):
                raise Exception(f"Service account file not found at: {service_account_path}")
            
            # Load service account credentials
            self.credentials = service_account.Credentials.from_service_account_file(
                service_account_path,
                scopes=SCOPES
            )
            
            # Build the service
            self.service = build('calendar', 'v3', credentials=self.credentials)
            
            print("✅ Google API credentials loaded successfully using service account")
            
        except Exception as e:
            print(f"❌ Failed to load Google API credentials: {e}")
            print("Make sure:")
            print("1. GOOGLE_APPLICATION_CREDENTIALS environment variable is set")
            print("2. Service account file exists and is readable")
            print("3. Service account has Calendar API access enabled")
            print("4. Service account has proper permissions for Google Calendar")
            raise Exception(f"Google API configuration failed: {e}")
    
    def create_meeting(self, event_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a Google Calendar event with Google Meet"""
        try:
            if not self.service:
                raise Exception("Google Calendar service not available")
            
            # Prepare event data
            event = {
                'summary': event_data.get('summary', 'Meeting'),
                'description': event_data.get('description', ''),
                'start': {
                    'dateTime': event_data.get('start_time'),
                    'timeZone': event_data.get('timezone', 'UTC'),
                },
                'end': {
                    'dateTime': event_data.get('end_time'),
                    'timeZone': event_data.get('timezone', 'UTC'),
                },
                'attendees': event_data.get('attendees', []),
                'conferenceData': {
                    'createRequest': {
                        'requestId': f"meet-{datetime.now().strftime('%Y%m%d-%H%M%S')}",
                        'conferenceSolutionKey': {
                            'type': 'hangoutsMeet'
                        }
                    }
                }
            }
            
            # Create the event
            event = self.service.events().insert(
                calendarId='primary',
                body=event,
                conferenceDataVersion=1
            ).execute()
            
            # Extract meeting link
            meet_link = None
            if 'conferenceData' in event and 'entryPoints' in event['conferenceData']:
                for entry in event['conferenceData']['entryPoints']:
                    if entry['entryPointType'] == 'video':
                        meet_link = entry['uri']
                        break
            
            return {
                'success': True,
                'event_id': event['id'],
                'meet_link': meet_link,
                'event': event
            }
            
        except HttpError as error:
            print(f"Google Calendar API error: {error}")
            return {
                'success': False,
                'error': str(error),
                'error_details': error.error_details if hasattr(error, 'error_details') else None
            }
        except Exception as e:
            print(f"Unexpected error creating meeting: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_meeting(self, event_id: str) -> Dict[str, Any]:
        """Get a specific meeting/event"""
        try:
            if not self.service:
                raise Exception("Google Calendar service not available")
            
            event = self.service.events().get(
                calendarId='primary',
                eventId=event_id
            ).execute()
            
            return {
                'success': True,
                'event': event
            }
            
        except HttpError as error:
            print(f"Google Calendar API error: {error}")
            return {
                'success': False,
                'error': str(error)
            }
        except Exception as e:
            print(f"Unexpected error getting meeting: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def update_meeting(self, event_id: str, event_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update an existing meeting/event"""
        try:
            if not self.service:
                raise Exception("Google Calendar service not available")
            
            # Get existing event first
            existing_event = self.service.events().get(
                calendarId='primary',
                eventId=event_id
            ).execute()
            
            # Update fields
            if 'summary' in event_data:
                existing_event['summary'] = event_data['summary']
            if 'description' in event_data:
                existing_event['description'] = event_data['description']
            if 'start_time' in event_data:
                existing_event['start']['dateTime'] = event_data['start_time']
            if 'end_time' in event_data:
                existing_event['end']['dateTime'] = event_data['end_time']
            if 'attendees' in event_data:
                existing_event['attendees'] = event_data['attendees']
            
            # Update the event
            updated_event = self.service.events().update(
                calendarId='primary',
                eventId=event_id,
                body=existing_event
            ).execute()
            
            return {
                'success': True,
                'event_id': updated_event['id'],
                'event': updated_event
            }
            
        except HttpError as error:
            print(f"Google Calendar API error: {error}")
            return {
                'success': False,
                'error': str(error)
            }
        except Exception as e:
            print(f"Unexpected error updating meeting: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def delete_meeting(self, event_id: str) -> Dict[str, Any]:
        """Delete a meeting/event"""
        try:
            if not self.service:
                raise Exception("Google Calendar service not available")
            
            self.service.events().delete(
                calendarId='primary',
                eventId=event_id
            ).execute()
            
            return {
                'success': True,
                'message': f'Event {event_id} deleted successfully'
            }
            
        except HttpError as error:
            print(f"Google Calendar API error: {error}")
            return {
                'success': False,
                'error': str(error)
            }
        except Exception as e:
            print(f"Unexpected error deleting meeting: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def list_meetings(self, time_min: str = None, time_max: str = None, max_results: int = 10) -> Dict[str, Any]:
        """List meetings/events within a time range"""
        try:
            if not self.service:
                raise Exception("Google Calendar service not available")
            
            # Set default time range if not provided
            if not time_min:
                time_min = datetime.now().isoformat() + 'Z'
            if not time_max:
                time_max = (datetime.now() + timedelta(days=7)).isoformat() + 'Z'
            
            events_result = self.service.events().list(
                calendarId='primary',
                timeMin=time_min,
                timeMax=time_max,
                maxResults=max_results,
                singleEvents=True,
                orderBy='startTime'
            ).execute()
            
            events = events_result.get('items', [])
            
            return {
                'success': True,
                'events': events,
                'count': len(events)
            }
            
        except HttpError as error:
            print(f"Google Calendar API error: {error}")
            return {
                'success': False,
                'error': str(error)
            }
        except Exception as e:
            print(f"Unexpected error listing meetings: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def is_service_available(self) -> bool:
        """Check if Google Calendar service is available"""
        return self.service is not None and self.credentials is not None
