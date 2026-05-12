"""
Test the creator platform analytics API to see what data it returns
"""
import requests
import json

# Direct API call to check what the backend returns
BASE_URL = "https://bantubuzz.com/api"

print("=" * 80)
print("Testing Creator 5 Platform Analytics API")
print("=" * 80)

# Make request to creator 5's platform analytics
url = f"{BASE_URL}/creators/5/platform-analytics"
print(f"\nFetching: {url}")

response = requests.get(url)

if response.status_code == 200:
    data = response.json()
    print(f"\n[OK] Got response!")
    print(f"\nSuccess: {data.get('success')}")
    print(f"Has Platforms: {data.get('has_platforms')}")
    print(f"Number of Platforms: {len(data.get('platforms', []))}")

    if data.get('platforms'):
        print(f"\n{'=' * 80}")
        print("PLATFORM DATA:")
        print(f"{'=' * 80}")

        for i, platform in enumerate(data['platforms']):
            print(f"\n--- PLATFORM {i+1}: {platform.get('platform')} ---")
            print(f"Account: {platform.get('account_name')}")
            print(f"Followers: {platform.get('followers')}")
            print(f"Total Posts: {platform.get('total_posts')}")

            if platform.get('metrics'):
                print(f"\nMETRICS:")
                metrics = platform['metrics']
                for key, value in metrics.items():
                    print(f"  {key}: {value}")

            print()
else:
    print(f"\n[ERROR] Request failed: {response.status_code}")
    print(response.text)

print(f"\n{'=' * 80}")
print("Test Complete")
print(f"{'=' * 80}")
