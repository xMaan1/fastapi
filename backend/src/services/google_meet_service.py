import os
import json
import pickle
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

# If modifying these scopes, delete the file token.pickle.
SCOPES = ['https://www.googleapis.com/auth/calendar']

class GoogleMeetService:
    def __init__(self):
        self.credentials = None
        self.service = None
        self._load_credentials()
    
    def _load_credentials(self):
        """Load or create Google API credentials"""
        token_path = 'token.pickle'
        
        # Load existing credentials
        if os.path.exists(token_path):
            with open(token_path, 'rb') as token:
                self.credentials = pickle.load(token)
        
        # If there are no (valid) credentials available, let the user log in
        if not self.credentials or not self.credentials.valid:
            if self.credentials and self.credentials.expired and self.credentials.refresh_token:
                try:
                    self.credentials.refresh(Request())
                except Exception as e:
                    print(f"Token refresh failed: {e}")
                    self.credentials = None
            
            if not self.credentials:
                try:
                    # Create client_secrets.json if it doesn't exist
                    if not os.path.exists('client_secrets.json'):
                        self._create_client_secrets_file()
                    
                    flow = InstalledAppFlow.from_client_secrets_file(
                        'client_secrets.json', SCOPES)
                    self.credentials = flow.run_local_server(port=8080)
                    
                except Exception as e:
                    print(f"OAuth flow failed: {e}")
                    print("\n=== OAuth Configuration Required ===")
                    print("Please follow these steps to configure OAuth:")
                    print("1. Go to https://console.cloud.google.com")
                    print("2. Select your project: divine-voice-468406-d4")
                    print("3. Go to APIs & Services > Credentials")
                    print("4. Edit your OAuth 2.0 Client ID")
                    print("5. Add these URLs to 'Authorized redirect URIs':")
                    print("   - http://localhost:8080")
                    print("   - http://localhost:8080/")
                    print("   - http://127.0.0.1:8080")
                    print("   - http://127.0.0.1:8080/")
                    print("   - https://your-aws-domain.com (for production)")
                    print("   - http://your-aws-ip:8000 (for production)")
                    print("6. Click Save")
                    print("7. Restart your application")
                    print("================================")
                    raise Exception(f"OAuth configuration failed: {e}")
                
                # Save the credentials for the next run
                if self.credentials:
                    with open(token_path, 'wb') as token:
                        pickle.dump(self.credentials, token)
        
        if self.credentials:
            self.service = build('calendar', 'v3', credentials=self.credentials)
        else:
            raise Exception("Failed to obtain Google API credentials")
    
    def _create_client_secrets_file(self):
        """Create client_secrets.json from environment variables"""
        client_secrets = {
            "web": {
                "client_id": "515705092070-f106o0bdqni5lksvs1fu4clhsbgq1hfu.apps.googleusercontent.com",
                "project_id": "divine-voice-468406-d4",
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
                "client_secret": "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"
            }
        }
        
        with open('client_secrets.json', 'w') as f:
            json.dump(client_secrets, f, indent=2)
    
    def create_meeting(self, event_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a Google Calendar event with Google Meet"""
        try:
            if not self.service:
                raise Exception("Google Calendar service not available")
            
            # Prepare event data for Google Calendar
            start_time = event_data.get('startDate')
            end_time = event_data.get('endDate')
            title = event_data.get('title', 'Meeting')
            description = event_data.get('description', '')
            
            # Convert to RFC3339 format
            if isinstance(start_time, str):
                start_time = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
            if isinstance(end_time, str):
                end_time = datetime.fromisoformat(end_time.replace('Z', '+00:00'))
            
            event = {
                'summary': title,
                'description': description,
                'start': {
                    'dateTime': start_time.isoformat(),
                    'timeZone': event_data.get('timezone', 'UTC'),
                },
                'end': {
                    'dateTime': end_time.isoformat(),
                    'timeZone': event_data.get('timezone', 'UTC'),
                },
                'conferenceData': {
                    'createRequest': {
                        'requestId': f"meet_{int(datetime.now().timestamp())}",
                        'conferenceSolutionKey': {
                            'type': 'hangoutsMeet'
                        }
                    }
                }
            }
            
            # Create the event
            event_result = self.service.events().insert(
                calendarId='primary',
                body=event,
                conferenceDataVersion=1
            ).execute()
            
            # Extract the meet link
            meet_link = None
            if 'conferenceData' in event_result and 'entryPoints' in event_result['conferenceData']:
                for entry_point in event_result['conferenceData']['entryPoints']:
                    if entry_point['entryPointType'] == 'video':
                        meet_link = entry_point['uri']
                        break
            
            if not meet_link:
                # Fallback: try to get the meet link from the event
                meet_link = event_result.get('hangoutLink')
            
            return {
                'success': True,
                'event_id': event_result['id'],
                'meet_link': meet_link,
                'meet_code': event_result.get('id'),
                'message': 'Google Meet link created successfully'
            }
            
        except HttpError as error:
            print(f"Google Calendar API error: {error}")
            return {
                'success': False,
                'error': str(error),
                'message': 'Failed to create Google Meet via API'
            }
        except Exception as e:
            print(f"Error creating Google Meet: {e}")
            return {
                'success': False,
                'error': str(e),
                'message': 'Failed to create Google Meet'
            }
    
    def update_meeting(self, calendar_event_id: str, event_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update a Google Calendar event"""
        try:
            if not self.service:
                raise Exception("Google Calendar service not available")
            
            # Prepare updated event data
            start_time = event_data.get('startDate')
            end_time = event_data.get('endDate')
            title = event_data.get('title', 'Meeting')
            description = event_data.get('description', '')
            
            # Convert to RFC3339 format
            if isinstance(start_time, str):
                start_time = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
            if isinstance(end_time, str):
                end_time = datetime.fromisoformat(end_time.replace('Z', '+00:00'))
            
            event = {
                'summary': title,
                'description': description,
                'start': {
                    'dateTime': start_time.isoformat(),
                    'timeZone': event_data.get('timezone', 'UTC'),
                },
                'end': {
                    'dateTime': end_time.isoformat(),
                    'timeZone': event_data.get('timezone', 'UTC'),
                }
            }
            
            # Update the event
            event_result = self.service.events().update(
                calendarId='primary',
                eventId=calendar_event_id,
                body=event
            ).execute()
            
            return {
                'success': True,
                'event_id': event_result['id'],
                'message': 'Google Calendar event updated successfully'
            }
            
        except HttpError as error:
            print(f"Google Calendar API error: {error}")
            return {
                'success': False,
                'error': str(error),
                'message': 'Failed to update Google Calendar event'
            }
        except Exception as e:
            print(f"Error updating Google Calendar event: {e}")
            return {
                'success': False,
                'error': str(e),
                'message': 'Failed to update Google Calendar event'
            }
    
    def delete_meeting(self, calendar_event_id: str) -> Dict[str, Any]:
        """Delete a Google Calendar event"""
        try:
            if not self.service:
                raise Exception("Google Calendar service not available")
            
            self.service.events().delete(
                calendarId='primary',
                eventId=calendar_event_id
            ).execute()
            
            return {
                'success': True,
                'message': 'Google Calendar event deleted successfully'
            }
            
        except HttpError as error:
            print(f"Google Calendar API error: {error}")
            return {
                'success': False,
                'error': str(error),
                'message': 'Failed to delete Google Calendar event'
            }
        except Exception as e:
            print(f"Error deleting Google Calendar event: {e}")
            return {
                'success': False,
                'error': str(e),
                'message': 'Failed to delete Google Calendar event'
            }
    
    def get_meeting_details(self, calendar_event_id: str) -> Dict[str, Any]:
        """Get details of a Google Calendar event"""
        try:
            if not self.service:
                raise Exception("Google Calendar service not available")
            
            event = self.service.events().get(
                calendarId='primary',
                eventId=calendar_event_id
            ).execute()
            
            return {
                'success': True,
                'event': event,
                'message': 'Google Calendar event retrieved successfully'
            }
            
        except HttpError as error:
            print(f"Google Calendar API error: {error}")
            return {
                'success': False,
                'error': str(error),
                'message': 'Failed to retrieve Google Calendar event'
            }
        except Exception as e:
            print(f"Error retrieving Google Calendar event: {e}")
            return {
                'success': False,
                'error': str(e),
                'message': 'Failed to retrieve Google Calendar event'
            }

# Create a global instance
google_meet_service = GoogleMeetService()
