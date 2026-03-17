"""
Post URL Parser Utility

Extracts platform and post ID from social media URLs.
Supports Instagram, Facebook, YouTube, TikTok, and Twitter/X.

Created: March 12, 2026
Part of: Brand Analytics Implementation - Phase 1
"""

import re
from typing import Optional, Dict


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
            r'facebook\.com/[^/]+/posts/([0-9]+)',                      # Page post
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
            r'vm\.tiktok\.com/([A-Za-z0-9]+)',              # Shortened URL
        ],
        'twitter': [
            r'twitter\.com/[^/]+/status/([0-9]+)',          # Tweet (twitter.com)
            r'x\.com/[^/]+/status/([0-9]+)',                # Tweet (x.com)
        ]
    }

    @staticmethod
    def parse_url(url: str) -> Optional[Dict[str, str]]:
        """
        Parse social media URL to extract platform and post ID

        Args:
            url: Social media post URL

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

            >>> PostURLParser.parse_url('https://invalid-url.com')
            None
        """
        if not url:
            return None

        url = url.strip()

        # Try each platform's patterns
        for platform, patterns in PostURLParser.PLATFORM_PATTERNS.items():
            for pattern in patterns:
                match = re.search(pattern, url, re.IGNORECASE)
                if match:
                    post_id = match.group(1)
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
