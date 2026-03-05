"""
ThunziAI Service
Handles all interactions with ThunziAI API for social media analytics
"""
import os
import requests
from typing import Dict, List, Optional
from datetime import datetime


class ThunziAIService:
    BASE_URL = "https://app.thunzi.co"

    def __init__(self):
        # Store credentials in env variables or use hardcoded values
        self.email = os.getenv('THUNZI_EMAIL', 'your-thunzi-email@example.com')  # TODO: Update this
        self.password = os.getenv('THUNZI_PASSWORD', 'your-thunzi-password')  # TODO: Update this
        self.company_id = os.getenv('THUNZI_COMPANY_ID', None)  # TODO: Add your ThunziAI company ID
        self.session = requests.Session()
        self.is_authenticated = False

    def login(self) -> bool:
        """Login to ThunziAI and store session"""
        try:
            response = self.session.post(
                f"{self.BASE_URL}/api/login",
                json={
                    "email": self.email,
                    "password": self.password
                }
            )

            if response.status_code == 200:
                self.is_authenticated = True
                return True

            print(f"ThunziAI login failed: {response.status_code}")
            return False
        except Exception as e:
            print(f"ThunziAI login error: {str(e)}")
            return False

    def _ensure_authenticated(self):
        """Ensure we're authenticated before making requests"""
        if not self.is_authenticated:
            self.login()

    def get_shared_company_id(self) -> int:
        """
        Get the shared ThunziAI company ID used for all BantuBuzz users
        Returns the company_id from environment variable
        """
        if not self.company_id:
            raise ValueError("THUNZI_COMPANY_ID not configured. Please add it to environment variables.")
        return int(self.company_id)

    def register_user(self, email: str, password: str) -> Optional[Dict]:
        """Register a new ThunziAI user"""
        try:
            response = self.session.post(
                f"{self.BASE_URL}/api/register",
                json={
                    "email": email,
                    "password": password
                }
            )

            if response.status_code == 200:
                return response.json()

            print(f"ThunziAI registration failed: {response.status_code} - {response.text}")
            return None
        except Exception as e:
            print(f"ThunziAI registration error: {str(e)}")
            return None

    def create_company(self, name: str, email: str = None, country: str = "Zimbabwe",
                      industry: str = None) -> Optional[int]:
        """Create ThunziAI company for BantuBuzz user (creator or brand)"""
        self._ensure_authenticated()

        try:
            # Only send required fields - ThunziAI API doesn't accept contactEmail/industry
            payload = {
                "name": name,
                "country": country
            }

            response = self.session.post(
                f"{self.BASE_URL}/api/company",
                json=payload
            )

            if response.status_code in [200, 201]:  # Accept both 200 OK and 201 Created
                data = response.json()
                return data.get('id')

            print(f"ThunziAI company creation failed: {response.status_code} - {response.text}")
            return None
        except Exception as e:
            print(f"ThunziAI company creation error: {str(e)}")
            return None

    def add_platform(self, company_id: int, platform: str,
                    account_name: str, account_id: Optional[str] = None,
                    access_token: Optional[str] = None) -> Optional[Dict]:
        """
        Add and connect social media platform

        NOTE: As per ThunziAI API docs, POST /api/platforms now automatically
        attempts to connect the platform after adding it. Access tokens are
        required for Meta platforms (Facebook/Instagram) to enable syncing.

        Args:
            company_id: ThunziAI company ID
            platform: One of: youtube, twitter, instagram, facebook, website
            account_name: Social media handle/username
            account_id: Facebook Page ID or Instagram Business Account ID (required for Meta platforms)
            access_token: User Access Token required for Meta platforms to enable data syncing

        Returns:
            Platform data dict with id, followers, posts, etc.
            {
                "id": number,
                "companyId": number,
                "platform": string,
                "accountName": string,
                "isConnected": boolean,
                "accountId": string,
                "accountIdSecondary": string,
                "profileUrl": string,
                "accessToken": string,
                "refreshToken": string,
                "tokenExpiry": string,
                "followers": number,
                "posts": number,
                "syncStatus": "pending" | "success" | "failure" | "in_progress",
                "lastSyncedAt": string,
                "createdAt": string
            }
        """
        self._ensure_authenticated()

        try:
            payload = {
                "companyId": company_id,
                "platform": platform.lower(),
                "accountName": account_name
            }

            # IMPORTANT: For Meta platforms (Facebook/Instagram), DO NOT send accountId
            # ThunziAI will extract it from the accessToken itself
            # If we send accountId, ThunziAI returns 400 "Invalid platform connection data"

            # For NON-Meta platforms (YouTube, Twitter), send accountId if provided
            if account_id and platform.lower() not in ['facebook', 'instagram']:
                payload["accountId"] = account_id

            # Add access token for Meta platforms (REQUIRED for syncing)
            if access_token:
                payload["accessToken"] = access_token

            response = self.session.post(
                f"{self.BASE_URL}/api/platforms",
                json=payload
            )

            if response.status_code in [200, 201]:  # Accept both 200 OK and 201 Created
                return response.json()

            print(f"ThunziAI add platform failed: {response.status_code} - {response.text}")
            return None
        except Exception as e:
            print(f"ThunziAI add platform error: {str(e)}")
            return None

    def connect_platform(self, platform_id: int) -> Optional[Dict]:
        """Connect a platform to start syncing data"""
        self._ensure_authenticated()

        try:
            response = self.session.put(
                f"{self.BASE_URL}/api/connect-platform/{platform_id}"
            )

            if response.status_code == 200:
                return response.json()

            print(f"ThunziAI connect platform failed: {response.status_code}")
            return None
        except Exception as e:
            print(f"ThunziAI connect platform error: {str(e)}")
            return None

    def get_platforms(self, company_id: int) -> List[Dict]:
        """Get all connected platforms for a company"""
        self._ensure_authenticated()

        try:
            response = self.session.get(
                f"{self.BASE_URL}/api/platforms",
                params={"companyId": company_id}
            )

            if response.status_code == 200:
                return response.json()

            print(f"ThunziAI get platforms failed: {response.status_code}")
            return []
        except Exception as e:
            print(f"ThunziAI get platforms error: {str(e)}")
            return []

    def sync_platform(self, platform_id: int, account_id: str = None,
                     company_id: int = None, platform: str = None) -> bool:
        """
        Trigger sync for a platform to update followers/posts

        Args:
            platform_id: ThunziAI platform ID (required)
            account_id: Platform account ID (e.g., YouTube Channel ID) - NOT for Meta platforms
            company_id: ThunziAI company ID
            platform: Platform name (youtube, facebook, instagram, twitter)

        Note: For Meta platforms (Facebook/Instagram), DO NOT send accountId.
        ThunziAI already has it from the platform connection.
        """
        self._ensure_authenticated()

        try:
            payload = {"platformId": platform_id}

            # IMPORTANT: For Meta platforms, do NOT send accountId
            # ThunziAI already extracted it when the platform was connected
            if account_id and platform and platform.lower() not in ['facebook', 'instagram']:
                payload["accountId"] = account_id

            if company_id:
                payload["companyId"] = company_id
            if platform:
                payload["platform"] = platform

            response = self.session.post(
                f"{self.BASE_URL}/api/sync",
                json=payload
            )

            if response.status_code != 200:
                print(f"ThunziAI sync failed: {response.status_code} - {response.text[:200]}")

            return response.status_code == 200
        except Exception as e:
            print(f"ThunziAI sync platform error: {str(e)}")
            return False

    def update_platform(self, platform_id: int, updates: Dict) -> Optional[Dict]:
        """Update platform details"""
        self._ensure_authenticated()

        try:
            response = self.session.put(
                f"{self.BASE_URL}/api/platforms/{platform_id}",
                json=updates
            )

            if response.status_code == 200:
                return response.json()

            return None
        except Exception as e:
            print(f"ThunziAI update platform error: {str(e)}")
            return None

    def reconnect_platform(self, platform_id: int, account_name: str, access_token: str) -> Optional[Dict]:
        """
        Reconnect a platform with new access token

        Used when tokens expire or user revokes access and needs to reconnect.

        Args:
            platform_id: ThunziAI platform ID
            account_name: Social media account name
            access_token: New User Access Token

        Returns:
            Updated platform data with new token
        """
        self._ensure_authenticated()

        try:
            response = self.session.put(
                f"{self.BASE_URL}/api/platforms/{platform_id}/reconnect",
                json={
                    "accountName": account_name,
                    "accessToken": access_token
                }
            )

            if response.status_code == 200:
                return response.json()

            print(f"ThunziAI reconnect platform failed: {response.status_code} - {response.text}")
            return None
        except Exception as e:
            print(f"ThunziAI reconnect platform error: {str(e)}")
            return None

    def delete_platform(self, platform_id: int) -> bool:
        """
        Delete/disconnect a platform from ThunziAI

        This removes the platform connection and all its associated posts/data.

        Args:
            platform_id: ThunziAI platform ID

        Returns:
            True if successfully deleted, False otherwise
        """
        self._ensure_authenticated()

        try:
            response = self.session.delete(
                f"{self.BASE_URL}/api/platforms/{platform_id}"
            )

            if response.status_code in [200, 204]:  # 200 OK or 204 No Content
                return True

            print(f"ThunziAI delete platform failed: {response.status_code} - {response.text}")
            return False
        except Exception as e:
            print(f"ThunziAI delete platform error: {str(e)}")
            return False


# Singleton instance
thunzi_service = ThunziAIService()
