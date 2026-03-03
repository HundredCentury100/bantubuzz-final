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
        # Store credentials in env variables
        self.email = os.getenv('THUNZI_EMAIL')
        self.password = os.getenv('THUNZI_PASSWORD')
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
                    account_name: str, access_token: Optional[str] = None) -> Optional[Dict]:
        """
        Add and connect social media platform

        Args:
            company_id: ThunziAI company ID
            platform: One of: youtube, twitter, instagram, facebook, website
            account_name: Social media handle/username
            access_token: Required for Meta platforms (Instagram, Facebook)

        Returns:
            Platform data dict with id, followers, posts, etc.
        """
        self._ensure_authenticated()

        try:
            payload = {
                "companyId": company_id,
                "platform": platform.lower(),
                "accountName": account_name
            }

            # Add access token for Meta platforms
            if access_token and platform.lower() in ['instagram', 'facebook']:
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

    def sync_platform(self, platform_id: int) -> bool:
        """Trigger sync for a platform to update followers/posts"""
        self._ensure_authenticated()

        try:
            response = self.session.post(
                f"{self.BASE_URL}/api/sync",
                json={"platformId": platform_id}
            )

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


# Singleton instance
thunzi_service = ThunziAIService()
