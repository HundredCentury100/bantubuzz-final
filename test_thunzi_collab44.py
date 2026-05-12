"""
Test script to get actual Thunzi API response for Creator 5, Collaboration 44
"""
import requests
import json
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from app import create_app, db
from app.models import CreatorProfile, Collaboration, PackageDeliverable, ThunziAccount
from app.services.thunzi_service import thunzi_service

def test_thunzi_collab44():
    app = create_app()

    with app.app_context():
        print("=" * 60)
        print("Testing Thunzi API Response for Creator 5, Collaboration 44")
        print("=" * 60)

        # Get creator 5
        creator = CreatorProfile.query.get(5)
        if not creator:
            print("ERROR: Creator 5 not found")
            return

        print(f"\nCreator: {creator.username} (ID: {creator.id})")

        # Get collaboration 44
        collab = Collaboration.query.get(44)
        if not collab:
            print("ERROR: Collaboration 44 not found")
            return

        print(f"Collaboration: {collab.title} (ID: {collab.id})")
        print(f"Creator ID in collab: {collab.creator_id}")

        # Get Thunzi account
        thunzi_account = ThunziAccount.query.filter_by(
            user_id=creator.user_id
        ).first()

        if not thunzi_account:
            print("ERROR: No Thunzi account found for creator")
            return

        print(f"\nThunzi Account:")
        print(f"  BantuBuzz ID: {thunzi_account.bantubuzz_id}")
        print(f"  Thunzi Email: {thunzi_account.thunzi_email}")

        # Login to Thunzi
        print(f"\nLogging in to Thunzi as: {thunzi_account.thunzi_email}")
        thunzi_service.login(email=thunzi_account.thunzi_email, password=thunzi_account.thunzi_email)

        # Get platforms for creator
        print(f"\nFetching platforms for BantuBuzz ID: {thunzi_account.bantubuzz_id}")
        platforms = thunzi_service.get_creator_platforms(thunzi_account.bantubuzz_id)

        if not platforms:
            print("ERROR: No platforms found")
            return

        print(f"\nFound {len(platforms)} platform(s):")
        print(json.dumps(platforms, indent=2))

        # Get deliverables for collaboration 44
        deliverables = PackageDeliverable.query.filter_by(
            collaboration_id=44
        ).all()

        print(f"\n\nFound {len(deliverables)} deliverable(s) for collaboration 44:")
        for deliv in deliverables:
            print(f"\nDeliverable ID: {deliv.id}")
            print(f"  Title: {deliv.title}")
            print(f"  URL: {deliv.url}")
            print(f"  Platform: {deliv.post_platform}")
            print(f"  Post ID: {deliv.post_id}")
            print(f"  Status: {deliv.status}")

            if deliv.post_platform and deliv.post_id:
                # Try to find matching post in Thunzi platforms
                for platform in platforms:
                    if platform.get('platform') == deliv.post_platform.lower():
                        platform_id = platform['id']
                        print(f"\n  Matching platform found: {platform.get('platform')} (ID: {platform_id})")
                        print(f"  Platform averageViews: {platform.get('averageViews', 0)}")
                        print(f"  Platform averageReach: {platform.get('averageReach', 0)}")

                        # Try to get posts from this platform
                        try:
                            print(f"\n  Fetching posts from platform {platform_id}...")
                            url = f"{thunzi_service.BASE_URL}/api/platforms/{platform_id}/posts"
                            response = thunzi_service.session.get(url)

                            if response.status_code == 200:
                                posts = response.json()
                                print(f"  Found {len(posts) if isinstance(posts, list) else 'N/A'} posts")

                                # Look for matching post
                                if isinstance(posts, list):
                                    for post in posts:
                                        post_id_str = str(post.get('id', ''))
                                        if deliv.post_id in post_id_str or post_id_str in deliv.post_id:
                                            print(f"\n  MATCHING POST FOUND!")
                                            print(f"  Post data:")
                                            print(json.dumps(post, indent=4))
                                            break
                                    else:
                                        print(f"\n  No matching post found for post_id: {deliv.post_id}")
                                        print(f"  First post sample:")
                                        if posts:
                                            print(json.dumps(posts[0], indent=4))
                            else:
                                print(f"  ERROR: Failed to fetch posts. Status: {response.status_code}")
                                print(f"  Response: {response.text[:200]}")
                        except Exception as e:
                            print(f"  ERROR fetching posts: {str(e)}")

if __name__ == '__main__':
    test_thunzi_collab44()
