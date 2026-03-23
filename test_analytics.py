#!/usr/bin/env python3
"""
Test script for new ThunziAI analytics endpoints
"""
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from app.services.thunzi_service import ThunziService

def test_creator_platforms():
    """Test the new get_creator_platforms endpoint"""
    print("\n" + "="*60)
    print("Testing get_creator_platforms()")
    print("="*60)

    service = ThunziService()

    # Login
    print("\nLogging in to ThunziAI...")
    if not service.login():
        print("❌ Login failed")
        return
    print("✓ Login successful")

    # Test with a bantubuzz_id (you'll need to provide one)
    # For now, let's test with a sample ID
    test_bantubuzz_id = "test123"  # Replace with actual ID

    print(f"\nFetching platforms for bantubuzz_id: {test_bantubuzz_id}")
    platforms = service.get_creator_platforms(test_bantubuzz_id)

    if platforms:
        print(f"\n✓ Found {len(platforms)} platforms")
        for platform in platforms:
            print(f"\n  Platform: {platform.get('platform')}")
            print(f"  Account: {platform.get('accountName')}")
            print(f"  Followers: {platform.get('followers')}")
            print(f"  Avg Engagement Rate: {platform.get('averageEngagementRate')}")
            print(f"  Avg Sentiment Score: {platform.get('averageSentimentScore')}")
            print(f"  Avg Views: {platform.get('averageViews')}")
            print(f"  Avg Reach: {platform.get('averageReach')}")
    else:
        print("❌ No platforms found or error occurred")

def test_post_insights():
    """Test the new get_post_insights_by_original_id endpoint"""
    print("\n" + "="*60)
    print("Testing get_post_insights_by_original_id()")
    print("="*60)

    service = ThunziService()

    # Login
    print("\nLogging in to ThunziAI...")
    if not service.login():
        print("❌ Login failed")
        return
    print("✓ Login successful")

    # Test with a sample post ID
    test_post_id = "sample_post_id"  # Replace with actual post ID

    print(f"\nFetching insights for post: {test_post_id}")
    insights = service.get_post_insights_by_original_id(test_post_id)

    if insights:
        print("\n✓ Post insights retrieved")
        print(f"  Post ID: {insights.get('postId')}")
        print(f"  Sentiment Score: {insights.get('sentiment')}")

        if 'commentSentiment' in insights:
            cs = insights['commentSentiment']
            print(f"\n  Comment Sentiment Breakdown:")
            print(f"    Positive: {cs.get('positive', 0)}")
            print(f"    Neutral: {cs.get('neutral', 0)}")
            print(f"    Negative: {cs.get('negative', 0)}")
            print(f"    Critical: {cs.get('critical', 0)}")
    else:
        print("❌ No insights found or error occurred")

def test_post_comments():
    """Test the new get_post_comments_by_original_id endpoint"""
    print("\n" + "="*60)
    print("Testing get_post_comments_by_original_id()")
    print("="*60)

    service = ThunziService()

    # Login
    print("\nLogging in to ThunziAI...")
    if not service.login():
        print("❌ Login failed")
        return
    print("✓ Login successful")

    # Test with a sample post ID
    test_post_id = "sample_post_id"  # Replace with actual post ID

    print(f"\nFetching comments for post: {test_post_id}")
    result = service.get_post_comments_by_original_id(
        test_post_id,
        start_date="2024-01-01",
        end_date="2024-12-31"
    )

    if result and 'comments' in result:
        comments = result['comments']
        print(f"\n✓ Found {len(comments)} comments")

        # Show first 3 comments
        for i, comment in enumerate(comments[:3], 1):
            print(f"\n  Comment {i}:")
            print(f"    Username: {comment.get('username')}")
            print(f"    Sentiment: {comment.get('sentiment')}")
            print(f"    Content: {comment.get('content', '')[:100]}...")
            print(f"    Likes: {comment.get('likes')}")
    else:
        print("❌ No comments found or error occurred")

if __name__ == '__main__':
    print("\n🧪 ThunziAI Analytics Endpoints Test Suite")
    print("==========================================")

    # Run tests
    test_creator_platforms()
    # test_post_insights()  # Uncomment when you have a valid post ID
    # test_post_comments()  # Uncomment when you have a valid post ID

    print("\n" + "="*60)
    print("Test suite completed")
    print("="*60 + "\n")
