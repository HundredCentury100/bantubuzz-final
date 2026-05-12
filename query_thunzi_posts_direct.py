"""
Direct query to Thunzi API for Instagram posts to see actual response
"""
import requests
import json

# Thunzi credentials
THUNZI_EMAIL = "hundredtechacademy@gmail.com"
THUNZI_PASSWORD = "hundredtechacademy@gmail.com"
BASE_URL = "https://app.thunzi.co"

# Login
print("=" * 80)
print("Direct Thunzi API Test - Instagram Post Data")
print("=" * 80)

session = requests.Session()

print(f"\nLogging in as: {THUNZI_EMAIL}")
login_response = session.post(
    f"{BASE_URL}/api/login",
    json={"email": THUNZI_EMAIL, "password": THUNZI_PASSWORD}
)

if login_response.status_code == 200:
    print("[OK] Login successful!")
else:
    print(f"[ERROR] Login failed: {login_response.status_code}")
    print(login_response.text)
    exit(1)

# Query Instagram platforms 189 and 190
platform_ids = [189, 190]

for platform_id in platform_ids:
    print(f"\n{'=' * 80}")
    print(f"PLATFORM ID: {platform_id}")
    print(f"{'=' * 80}")

    url = f"{BASE_URL}/api/platforms/{platform_id}/posts"
    print(f"\nFetching: {url}")

    response = session.get(url)

    if response.status_code == 200:
        posts = response.json()

        if isinstance(posts, list):
            print(f"\n[OK] Found {len(posts)} posts")

            # Show first 2 posts with ALL fields
            for i, post in enumerate(posts[:2]):
                print(f"\n{'-' * 80}")
                print(f"POST #{i+1}")
                print(f"{'-' * 80}")
                print(json.dumps(post, indent=2))

                # Specifically highlight views vs reach
                print(f"\nKEY METRICS:")
                print(f"  reach:       {post.get('reach', 'NOT PROVIDED')}")
                print(f"  views:       {post.get('views', 'NOT PROVIDED')}")
                print(f"  videoViews:  {post.get('videoViews', 'NOT PROVIDED')}")
                print(f"  impressions: {post.get('impressions', 'NOT PROVIDED')}")
        else:
            print(f"\n[ERROR] Unexpected response format")
            print(json.dumps(posts, indent=2))
    else:
        print(f"\n[ERROR] Failed to fetch posts: {response.status_code}")
        print(response.text[:500])

print(f"\n{'=' * 80}")
print("Test Complete")
print(f"{'=' * 80}")
