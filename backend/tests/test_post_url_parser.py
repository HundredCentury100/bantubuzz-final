"""
Unit Tests for Post URL Parser

Tests URL parsing for Instagram, Facebook, YouTube, TikTok, and Twitter.
"""

import pytest
from app.utils.post_url_parser import PostURLParser


class TestPostURLParser:
    """Test suite for PostURLParser utility"""

    # Instagram URLs
    def test_instagram_post(self):
        url = "https://instagram.com/p/ABC123xyz/"
        result = PostURLParser.parse_url(url)
        assert result is not None
        assert result['platform'] == 'instagram'
        assert result['post_id'] == 'ABC123xyz'

    def test_instagram_reel(self):
        url = "https://www.instagram.com/reel/CdE456FGH/"
        result = PostURLParser.parse_url(url)
        assert result is not None
        assert result['platform'] == 'instagram'
        assert result['post_id'] == 'CdE456FGH'

    def test_instagram_tv(self):
        url = "https://instagram.com/tv/XYZ789abc/"
        result = PostURLParser.parse_url(url)
        assert result is not None
        assert result['platform'] == 'instagram'
        assert result['post_id'] == 'XYZ789abc'

    # Facebook URLs
    def test_facebook_post(self):
        url = "https://facebook.com/page-name/posts/123456789012345"
        result = PostURLParser.parse_url(url)
        assert result is not None
        assert result['platform'] == 'facebook'
        assert result['post_id'] == '123456789012345'

    def test_facebook_photo(self):
        url = "https://www.facebook.com/photo.php?fbid=987654321"
        result = PostURLParser.parse_url(url)
        assert result is not None
        assert result['platform'] == 'facebook'
        assert result['post_id'] == '987654321'

    def test_facebook_watch(self):
        url = "https://fb.watch/abc123XYZ/"
        result = PostURLParser.parse_url(url)
        assert result is not None
        assert result['platform'] == 'facebook'
        assert result['post_id'] == 'abc123XYZ'

    # YouTube URLs
    def test_youtube_watch(self):
        url = "https://youtube.com/watch?v=dQw4w9WgXcQ"
        result = PostURLParser.parse_url(url)
        assert result is not None
        assert result['platform'] == 'youtube'
        assert result['post_id'] == 'dQw4w9WgXcQ'

    def test_youtube_shortened(self):
        url = "https://youtu.be/abc123XYZ"
        result = PostURLParser.parse_url(url)
        assert result is not None
        assert result['platform'] == 'youtube'
        assert result['post_id'] == 'abc123XYZ'

    def test_youtube_shorts(self):
        url = "https://www.youtube.com/shorts/ShortVideo123"
        result = PostURLParser.parse_url(url)
        assert result is not None
        assert result['platform'] == 'youtube'
        assert result['post_id'] == 'ShortVideo123'

    # TikTok URLs
    def test_tiktok_video(self):
        url = "https://www.tiktok.com/@username/video/7123456789012345678"
        result = PostURLParser.parse_url(url)
        assert result is not None
        assert result['platform'] == 'tiktok'
        assert result['post_id'] == '7123456789012345678'

    def test_tiktok_shortened(self):
        url = "https://vm.tiktok.com/ZMeFGHijk/"
        result = PostURLParser.parse_url(url)
        assert result is not None
        assert result['platform'] == 'tiktok'
        assert result['post_id'] == 'ZMeFGHijk'

    # Twitter/X URLs
    def test_twitter_status(self):
        url = "https://twitter.com/username/status/1234567890123456789"
        result = PostURLParser.parse_url(url)
        assert result is not None
        assert result['platform'] == 'twitter'
        assert result['post_id'] == '1234567890123456789'

    def test_x_status(self):
        url = "https://x.com/username/status/9876543210987654321"
        result = PostURLParser.parse_url(url)
        assert result is not None
        assert result['platform'] == 'twitter'
        assert result['post_id'] == '9876543210987654321'

    # Invalid URLs
    def test_invalid_url(self):
        url = "https://google.com"
        result = PostURLParser.parse_url(url)
        assert result is None

    def test_empty_url(self):
        url = ""
        result = PostURLParser.parse_url(url)
        assert result is None

    def test_none_url(self):
        url = None
        result = PostURLParser.parse_url(url)
        assert result is None

    # Validation tests
    def test_validate_valid_url(self):
        url = "https://instagram.com/p/ABC123/"
        assert PostURLParser.validate_url(url) is True

    def test_validate_invalid_url(self):
        url = "https://invalid-site.com"
        assert PostURLParser.validate_url(url) is False

    # Helper methods tests
    def test_get_platform_from_url(self):
        url = "https://youtube.com/watch?v=abc123"
        platform = PostURLParser.get_platform_from_url(url)
        assert platform == 'youtube'

    def test_get_post_id_from_url(self):
        url = "https://instagram.com/p/XYZ789/"
        post_id = PostURLParser.get_post_id_from_url(url)
        assert post_id == 'XYZ789'

    def test_normalize_url_without_protocol(self):
        url = "instagram.com/p/ABC123/"
        normalized = PostURLParser.normalize_url(url)
        assert normalized == "https://instagram.com/p/ABC123/"

    def test_normalize_url_with_protocol(self):
        url = "https://instagram.com/p/ABC123/"
        normalized = PostURLParser.normalize_url(url)
        assert normalized == "https://instagram.com/p/ABC123/"

    def test_get_supported_platforms(self):
        platforms = PostURLParser.get_supported_platforms()
        assert 'instagram' in platforms
        assert 'facebook' in platforms
        assert 'youtube' in platforms
        assert 'tiktok' in platforms
        assert 'twitter' in platforms

    def test_is_platform_supported(self):
        assert PostURLParser.is_platform_supported('instagram') is True
        assert PostURLParser.is_platform_supported('INSTAGRAM') is True
        assert PostURLParser.is_platform_supported('snapchat') is False
