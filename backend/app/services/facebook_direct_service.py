"""
Facebook Direct API Service
Fetches data directly from Facebook Graph API as a workaround for ThunziAI bugs
"""
import requests
from typing import Dict, Optional


class FacebookDirectService:
    """Service to fetch Facebook data directly from Graph API"""

    GRAPH_API_URL = "https://graph.facebook.com/v22.0"

    def get_page_data(self, page_id: str, access_token: str) -> Optional[Dict]:
        """
        Fetch Facebook Page data directly from Graph API

        Args:
            page_id: Facebook Page ID
            access_token: Page access token

        Returns:
            Dict with followers, posts, and other page data
        """
        try:
            response = requests.get(
                f"{self.GRAPH_API_URL}/{page_id}",
                params={
                    'fields': 'id,name,followers_count,fan_count,posts.limit(1).summary(true)',
                    'access_token': access_token
                },
                timeout=10
            )

            if response.status_code == 200:
                data = response.json()

                # Extract follower count (followers_count is more accurate than fan_count)
                followers = data.get('followers_count') or data.get('fan_count', 0)

                # Extract post count from posts summary
                posts_count = 0
                if 'posts' in data and 'summary' in data['posts']:
                    posts_count = data['posts']['summary'].get('total_count', 0)

                return {
                    'id': data.get('id'),
                    'name': data.get('name'),
                    'followers': followers,
                    'posts': posts_count,
                    'success': True
                }
            else:
                print(f"Facebook API error: {response.status_code} - {response.text}")
                return None

        except Exception as e:
            print(f"Error fetching Facebook page data: {str(e)}")
            return None

    def get_instagram_account_from_page(self, page_id: str, page_access_token: str) -> Optional[Dict]:
        """
        Get Instagram Business Account linked to a Facebook Page

        Args:
            page_id: Facebook Page ID
            page_access_token: Page access token

        Returns:
            Dict with Instagram account data or None
        """
        try:
            # Get Instagram Business Account ID from page
            response = requests.get(
                f"{self.GRAPH_API_URL}/{page_id}",
                params={
                    'fields': 'instagram_business_account',
                    'access_token': page_access_token
                },
                timeout=10
            )

            if response.status_code != 200:
                print(f"No Instagram account linked to page {page_id}")
                return None

            data = response.json()

            if 'instagram_business_account' not in data:
                return None

            ig_account_id = data['instagram_business_account']['id']

            # Get Instagram account details
            ig_response = requests.get(
                f"{self.GRAPH_API_URL}/{ig_account_id}",
                params={
                    'fields': 'id,username,name,followers_count,media_count,profile_picture_url',
                    'access_token': page_access_token
                },
                timeout=10
            )

            if ig_response.status_code == 200:
                ig_data = ig_response.json()
                return {
                    'id': ig_data.get('id'),
                    'username': ig_data.get('username'),
                    'name': ig_data.get('name'),
                    'followers': ig_data.get('followers_count', 0),
                    'posts': ig_data.get('media_count', 0),
                    'profile_picture_url': ig_data.get('profile_picture_url'),
                    'success': True
                }
            else:
                print(f"Error fetching Instagram data: {ig_response.status_code}")
                return None

        except Exception as e:
            print(f"Error fetching Instagram account: {str(e)}")
            return None


# Singleton instance
facebook_direct_service = FacebookDirectService()
