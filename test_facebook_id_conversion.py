"""
Test Facebook post ID conversion from alphanumeric to numeric
Using Facebook Graph API to resolve pfbid IDs to numeric IDs
"""

import requests

# Test URL: https://www.facebook.com/61557380578873/posts/pfbid0vaZPdb7hkorj3abgyvcdwysdd64w8Vn6gZN3nAXQoNg2FBSByaPyedgJPxw1MbuSl/

# Extracted data
page_id = "61557380578873"
post_id_alphanumeric = "pfbid0vaZPdb7hkorj3abgyvcdwysdd64w8Vn6gZN3nAXQoNg2FBSByaPyedgJPxw1MbuSl"

print("="*80)
print("Facebook Post ID Conversion Test")
print("="*80)
print(f"Page ID: {page_id}")
print(f"Alphanumeric Post ID: {post_id_alphanumeric}")
print()

# Method 1: Try using the alphanumeric ID directly with Graph API
print("Method 1: Query Graph API with alphanumeric ID")
print("-"*80)

# We need an access token - let's try the public approach first
# Format: page_id_post_id
composite_id = f"{page_id}_{post_id_alphanumeric}"
print(f"Composite ID: {composite_id}")

# Try to query without access token (public data)
url = f"https://graph.facebook.com/v19.0/{composite_id}"
params = {
    "fields": "id,message,created_time,permalink_url",
}

print(f"URL: {url}")
print("Attempting request without access token (public data only)...")
response = requests.get(url, params=params)
print(f"Status Code: {response.status_code}")
print(f"Response: {response.text}")
print()

# Method 2: Try with just the pfbid
print("Method 2: Query Graph API with pfbid only")
print("-"*80)
url2 = f"https://graph.facebook.com/v19.0/{post_id_alphanumeric}"
print(f"URL: {url2}")
response2 = requests.get(url2, params=params)
print(f"Status Code: {response2.status_code}")
print(f"Response: {response2.text}")
print()

# Method 3: Try scraping the post URL to extract numeric ID
print("Method 3: Scrape the Facebook post page for numeric ID")
print("-"*80)
post_url = f"https://www.facebook.com/{page_id}/posts/{post_id_alphanumeric}"
print(f"Post URL: {post_url}")

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
}

try:
    response3 = requests.get(post_url, headers=headers, timeout=10)
    print(f"Status Code: {response3.status_code}")
    
    if response3.status_code == 200:
        html = response3.text
        
        # Look for various numeric ID patterns in the HTML
        import re
        
        # Common patterns where Facebook stores the numeric post ID
        patterns = [
            r'"post_id":"(\d+)"',
            r'"postID":"(\d+)"',
            r'"legacy_story_id":"(\d+)"',
            r'story_fbid=(\d+)',
            r'fbid=(\d+)',
            r'"id":"(\d+)_(\d+)"',  # Format: page_id_post_id
        ]
        
        print("\nSearching for numeric IDs in HTML...")
        for pattern in patterns:
            matches = re.findall(pattern, html)
            if matches:
                print(f"Pattern '{pattern}': Found {len(matches)} matches")
                # Show first few matches
                for i, match in enumerate(matches[:5]):
                    print(f"  Match {i+1}: {match}")
        
        # Also check for the specific page_id + post_id pattern
        page_post_pattern = rf'"{page_id}_(\d+)"'
        matches = re.findall(page_post_pattern, html)
        if matches:
            print(f"\nPage-specific post IDs (format {page_id}_XXXXXX):")
            for i, match in enumerate(matches[:5]):
                print(f"  {page_id}_{match}")
        
except Exception as e:
    print(f"Error scraping: {str(e)}")

print()
print("="*80)
print("Conclusion:")
print("="*80)
print("To convert pfbid to numeric ID, we likely need:")
print("1. A valid Facebook access token with pages_read_engagement permission")
print("2. Or scraping approach to extract numeric ID from HTML metadata")
print("3. The Graph API endpoint: /{page_id}_{pfbid} might work with proper token")
