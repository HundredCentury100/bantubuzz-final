"""
Test script to get Instagram post data from Thunzi for Platform ID 189 and 190
"""
import requests
import json
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from app import create_app, db
from app.models import ThunziAccount
from app.services.thunzi_service import thunzi_service

def test_instagram_posts():
    app = create_app()

    with app.app_context():
        print("=" * 80)
        print("Testing Instagram Post Data from Thunzi")
        print("=" * 80)

        # Get Thunzi account for creator 5
        thunzi_account = ThunziAccount.query.filter_by(
            user_id=8  # Creator 5's user_id
        ).first()

        if not thunzi_account:
            print("ERROR: No Thunzi account found")
            return

        # Login to Thunzi
        print(f"\nLogging in to Thunzi as: {thunzi_account.thunzi_email}")
        thunzi_service.login(email=thunzi_account.thunzi_email, password=thunzi_account.thunzi_email)

        # Test platform IDs from the previous output
        platform_ids = [189, 190]

        for platform_id in platform_ids:
            print(f"\n{'=' * 80}")
            print(f"PLATFORM ID: {platform_id}")
            print(f"{'=' * 80}")

            # Fetch posts from this platform
            try:
                url = f"{thunzi_service.BASE_URL}/api/platforms/{platform_id}/posts"
                print(f"\nFetching: {url}")

                response = thunzi_service.session.get(url)

                if response.status_code == 200:
                    posts = response.json()
                    print(f"\nFound {len(posts) if isinstance(posts, list) else 'N/A'} posts")

                    if isinstance(posts, list) and len(posts) > 0:
                        # Show first 3 posts with their metrics
                        for i, post in enumerate(posts[:3]):
                            print(f"\n--- POST {i+1} ---")
                            print(f"ID: {post.get('id')}")
                            print(f"Published: {post.get('publishedAt', 'N/A')}")
                            print(f"Content: {post.get('content', post.get('description', 'N/A'))[:100]}...")
                            print(f"\nMETRICS:")
                            print(f"  reach: {post.get('reach', 'N/A')}")
                            print(f"  views: {post.get('views', 'N/A')}")
                            print(f"  videoViews: {post.get('videoViews', 'N/A')}")
                            print(f"  impressions: {post.get('impressions', 'N/A')}")
                            print(f"  likes: {post.get('likes', 'N/A')}")
                            print(f"  comments: {post.get('comments', 'N/A')}")
                            print(f"  shares: {post.get('shares', 'N/A')}")
                            print(f"  saves: {post.get('saves', 'N/A')}")

                            print(f"\nFULL POST DATA:")
                            print(json.dumps(post, indent=2))
                            print()
                    else:
                        print("No posts found in response")
                else:
                    print(f"ERROR: Failed to fetch posts. Status: {response.status_code}")
                    print(f"Response: {response.text[:500]}")

            except Exception as e:
                print(f"ERROR fetching posts: {str(e)}")
                import traceback
                traceback.print_exc()

if __name__ == '__main__':
    test_instagram_posts()
