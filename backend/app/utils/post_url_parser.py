"""
Post URL Parser Utility

Extracts platform and post ID from social media URLs.
Supports Instagram, Facebook, YouTube, TikTok, and Twitter/X.

Created: March 12, 2026
Part of: Brand Analytics Implementation - Phase 1
"""

import re
from typing import Optional, Dict
import requests


class PostURLParser:
    """Parse social media post URLs to extract platform and post ID"""

    # Platform-specific URL patterns
    PLATFORM_PATTERNS = {
        'instagram': [
            r'instagram\.com/p/([A-Za-z0-9_-]+)',           # Regular post
            r'instagram\.com/reel/([A-Za-z0-9_-]+)',        # Reel
            r'instagram\.com/tv/([A-Za-z0-9_-]+)',          # IGTV
        ],
        'facebook': [
            r'facebook\.com/([^/]+)/posts/([A-Za-z0-9_-]+)',           # Page post (supports pfbid and numeric IDs) - captures page_id and post_id
            r'facebook\.com/photo\.php\?fbid=([0-9]+)',                 # Photo
            r'facebook\.com/permalink\.php\?story_fbid=([0-9]+)',      # Permalink
            r'fb\.watch/([A-Za-z0-9_-]+)',                             # FB Watch
            r'facebook\.com/watch/\?v=([0-9]+)',                       # Video
        ],
        'youtube': [
            r'youtube\.com/watch\?v=([A-Za-z0-9_-]+)',      # Regular video
            r'youtu\.be/([A-Za-z0-9_-]+)(?:\?|&|$)',        # Shortened URL (with query params)
            r'youtube\.com/shorts/([A-Za-z0-9_-]+)',        # Shorts
        ],
        'tiktok': [
            r'tiktok\.com/@[^/]+/video/([0-9]+)',           # Video
            r'vm\.tiktok\.com/([A-Za-z0-9_-]+)',            # Shortened URL (includes hyphens and underscores)
        ],
        'twitter': [
            r'twitter\.com/[^/]+/status/([0-9]+)',          # Tweet (twitter.com)
            r'x\.com/[^/]+/status/([0-9]+)',                # Tweet (x.com)
        ]
    }

    @staticmethod
    def _resolve_tiktok_short_url(url: str) -> Optional[str]:
        """
        Resolve TikTok shortened URL (vm.tiktok.com) to get the actual numeric video ID

        Args:
            url: TikTok shortened URL (e.g., https://vm.tiktok.com/ZS9LeUqy1MUgm-ihnDJ/)

        Returns:
            Numeric video ID (e.g., '7493878653856533790') or None if resolution fails
        """
        try:
            # Follow redirects to get the actual TikTok URL
            response = requests.head(url, allow_redirects=True, timeout=5)
            final_url = response.url

            # Extract numeric video ID from the final URL
            # Format: https://www.tiktok.com/@username/video/7493878653856533790
            match = re.search(r'tiktok\.com/@[^/]+/video/([0-9]+)', final_url)
            if match:
                return match.group(1)

            return None
        except Exception as e:
            print(f"Error resolving TikTok short URL: {str(e)}")
            return None

    @staticmethod
    def _convert_facebook_pfbid_to_numeric(page_id: str, pfbid: str, access_token: Optional[str] = None) -> Optional[str]:
        """
        Convert Facebook pfbid (alphanumeric post ID) to numeric post ID using Graph API

        Facebook's newer post URLs use pfbid format (e.g., pfbid0vaZPdb7h...), but the
        Graph API and ThunziAI use numeric IDs (e.g., 123456789_987654321).

        This method uses the Graph API oEmbed endpoint to get the numeric ID.

        Args:
            page_id: Facebook page ID (numeric)
            pfbid: Facebook post ID in pfbid format (alphanumeric)
            access_token: Facebook access token (optional, required for non-public posts)

        Returns:
            Numeric post ID in format "page_id_post_id" or None if conversion fails

        Example:
            >>> _convert_facebook_pfbid_to_numeric("61557380578873", "pfbid0vaZPdb...", token)
            "61557380578873_1234567890"
        """
        try:
            # Construct the full post URL
            post_url = f"https://www.facebook.com/{page_id}/posts/{pfbid}"

            # Use Graph API oEmbed endpoint to get post metadata
            api_url = "https://graph.facebook.com/v19.0/oembed_post"
            params = {"url": post_url}

            if access_token:
                params["access_token"] = access_token

            response = requests.get(api_url, params=params, timeout=10)

            if response.status_code != 200:
                print(f"Facebook pfbid conversion failed: {response.status_code} - {response.text[:200]}")
                return None

            data = response.json()

            # Extract numeric ID from the HTML embed code
            if 'html' in data:
                html = data['html']

                # Look for numeric post ID in various formats
                patterns = [
                    rf'{page_id}_(\d+)',  # page_id_post_id format
                    r'posts/(\d+)',        # /posts/numeric_id format
                    r'story_fbid=(\d+)',   # story_fbid=numeric_id
                ]

                for pattern in patterns:
                    match = re.search(pattern, html)
                    if match:
                        # Return in page_id_post_id format
                        numeric_post_id = match.group(1)
                        return f"{page_id}_{numeric_post_id}"

            return None

        except Exception as e:
            print(f"Error converting Facebook pfbid to numeric ID: {str(e)}")
            return None

    @staticmethod
    def _extract_instagram_media_id(url: str) -> Optional[str]:
        """
        Extract Instagram Graph API media ID from post URL by scraping the page

        Similar to TikTok approach - fetch the page and extract the media ID from metadata.
        ThunziAI uses Instagram Graph API media IDs, which are different from regular media IDs.

        Args:
            url: Instagram post URL (e.g., 'https://www.instagram.com/p/DW4PhkrjeEh/')

        Returns:
            Graph API media ID (e.g., '18067423858748679') or None if extraction fails
        """
        try:
            # Fetch the Instagram page
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
            response = requests.get(url, headers=headers, timeout=10)

            if response.status_code != 200:
                return None

            html = response.text

            # Try to extract media ID from various possible locations in the HTML
            # Method 1: Look for "media_id" in JSON-LD or meta tags
            import json as json_module

            # Look for media_id in Instagram's embedded JSON data
            patterns = [
                r'"media_id":"(\d+)"',  # Direct media_id field
                r'"pk":"(\d+)"',         # pk field (primary key)
                r'"id":"(\d+)"',         # Generic id field in media objects
            ]

            for pattern in patterns:
                match = re.search(pattern, html)
                if match:
                    media_id = match.group(1)
                    # Verify it's a valid Instagram media ID (usually 17-18 digits)
                    if len(media_id) >= 17:
                        return media_id

            return None

        except Exception as e:
            print(f"Error extracting Instagram media ID: {str(e)}")
            return None

    @staticmethod
    def parse_url(url: str, facebook_access_token: Optional[str] = None) -> Optional[Dict[str, str]]:
        """
        Parse social media URL to extract platform and post ID

        Args:
            url: Social media post URL
            facebook_access_token: Optional Facebook access token for pfbid conversion

        Returns:
            {
                'platform': 'instagram',
                'post_id': 'ABC123xyz',
                'url': 'https://instagram.com/p/ABC123xyz/'
            }
            or None if URL not recognized

        Examples:
            >>> PostURLParser.parse_url('https://instagram.com/p/ABC123/')
            {'platform': 'instagram', 'post_id': 'ABC123', 'url': 'https://instagram.com/p/ABC123/'}

            >>> PostURLParser.parse_url('https://youtube.com/watch?v=dQw4w9WgXcQ')
            {'platform': 'youtube', 'post_id': 'dQw4w9WgXcQ', 'url': 'https://youtube.com/watch?v=dQw4w9WgXcQ'}

            >>> PostURLParser.parse_url('https://facebook.com/123/posts/pfbid...', token)
            {'platform': 'facebook', 'post_id': '123_456', 'url': 'https://facebook.com/123/posts/pfbid...'}

            >>> PostURLParser.parse_url('https://invalid-url.com')
            None
        """
        if not url:
            return None

        url = url.strip()

        # Special handling for TikTok shortened URLs - resolve to get numeric ID
        if 'vm.tiktok.com' in url.lower():
            numeric_id = PostURLParser._resolve_tiktok_short_url(url)
            if numeric_id:
                return {
                    'platform': 'tiktok',
                    'post_id': numeric_id,
                    'url': url
                }

        # Try each platform's patterns
        for platform, patterns in PostURLParser.PLATFORM_PATTERNS.items():
            for pattern in patterns:
                match = re.search(pattern, url, re.IGNORECASE)
                if match:
                    # Handle different numbers of capture groups
                    if platform == 'facebook' and len(match.groups()) == 2:
                        # Facebook page post pattern captures both page_id and post_id
                        page_id = match.group(1)
                        post_id = match.group(2)

                        # Check if post_id is pfbid format (alphanumeric starting with 'pfbid')
                        if post_id.startswith('pfbid'):
                            # Try to convert pfbid to numeric ID using Graph API
                            numeric_id = PostURLParser._convert_facebook_pfbid_to_numeric(
                                page_id, post_id, facebook_access_token
                            )
                            if numeric_id:
                                post_id = numeric_id
                            else:
                                # If conversion fails, keep the pfbid format
                                # The matching logic will need to handle both formats
                                print(f"Warning: Could not convert Facebook pfbid to numeric ID. Using pfbid: {post_id}")
                    else:
                        post_id = match.group(1)

                    # Special handling for Instagram - scrape page to get Graph API media ID
                    if platform == 'instagram':
                        media_id = PostURLParser._extract_instagram_media_id(url)
                        if media_id:
                            post_id = media_id

                    return {
                        'platform': platform,
                        'post_id': post_id,
                        'url': url
                    }

        return None

    @staticmethod
    def validate_url(url: str) -> bool:
        """
        Check if URL is a valid social media post URL

        Args:
            url: URL to validate

        Returns:
            True if valid social media post URL, False otherwise

        Examples:
            >>> PostURLParser.validate_url('https://instagram.com/p/ABC123/')
            True

            >>> PostURLParser.validate_url('https://google.com')
            False
        """
        return PostURLParser.parse_url(url) is not None

    @staticmethod
    def get_platform_from_url(url: str) -> Optional[str]:
        """
        Extract just the platform name from URL

        Args:
            url: Social media URL

        Returns:
            Platform name or None

        Examples:
            >>> PostURLParser.get_platform_from_url('https://instagram.com/p/ABC/')
            'instagram'
        """
        parsed = PostURLParser.parse_url(url)
        return parsed['platform'] if parsed else None

    @staticmethod
    def get_post_id_from_url(url: str) -> Optional[str]:
        """
        Extract just the post ID from URL

        Args:
            url: Social media URL

        Returns:
            Post ID or None

        Examples:
            >>> PostURLParser.get_post_id_from_url('https://youtube.com/watch?v=ABC123')
            'ABC123'
        """
        parsed = PostURLParser.parse_url(url)
        return parsed['post_id'] if parsed else None

    @staticmethod
    def normalize_url(url: str) -> Optional[str]:
        """
        Normalize URL to canonical format

        Args:
            url: Social media URL (any format)

        Returns:
            Normalized URL or None if invalid

        Examples:
            >>> PostURLParser.normalize_url('instagram.com/p/ABC123')
            'https://instagram.com/p/ABC123'
        """
        if not url:
            return None

        # Add https:// if missing
        if not url.startswith(('http://', 'https://')):
            url = 'https://' + url

        # Validate
        if PostURLParser.validate_url(url):
            return url

        return None

    @staticmethod
    def get_supported_platforms() -> list:
        """
        Get list of supported platforms

        Returns:
            List of platform names

        Examples:
            >>> PostURLParser.get_supported_platforms()
            ['instagram', 'facebook', 'youtube', 'tiktok', 'twitter']
        """
        return list(PostURLParser.PLATFORM_PATTERNS.keys())

    @staticmethod
    def is_platform_supported(platform: str) -> bool:
        """
        Check if platform is supported

        Args:
            platform: Platform name (case-insensitive)

        Returns:
            True if supported, False otherwise

        Examples:
            >>> PostURLParser.is_platform_supported('instagram')
            True

            >>> PostURLParser.is_platform_supported('snapchat')
            False
        """
        return platform.lower() in PostURLParser.PLATFORM_PATTERNS
