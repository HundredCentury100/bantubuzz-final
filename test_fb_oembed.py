import requests
import json
import re

print('='*80)
print('Testing Facebook Graph API oEmbed (No Access Token - Public Post)')
print('='*80)

# Test with the user's provided URL
post_url = 'https://www.facebook.com/61557380578873/posts/pfbid0vaZPdb7hkorj3abgyvcdwysdd64w8Vn6gZN3nAXQoNg2FBSByaPyedgJPxw1MbuSl/'

print(f'Post URL: {post_url}')
print()

# Use Graph API v19.0
api_url = 'https://graph.facebook.com/v19.0/oembed_post'
params = {'url': post_url}

print(f'API Request: {api_url}')
print('Authentication: None (public post)')
print()

try:
    response = requests.get(api_url, params=params, timeout=10)
    print(f'Status Code: {response.status_code}')
    print()
    
    if response.status_code == 200:
        data = response.json()
        print('SUCCESS! Full Response:')
        print(json.dumps(data, indent=2))
        print()
        print('='*80)
        
        # Check the HTML for numeric IDs
        if 'html' in data:
            print('Analyzing HTML embed code for numeric post ID...')
            print('='*80)
            html = data['html']
            
            # Look for numeric IDs in the HTML
            patterns = [
                (r'posts/(\d+)', 'Numeric post ID in posts URL'),
                (r'story_fbid=(\d+)', 'story_fbid parameter'),
                (r'fbid=(\d+)', 'fbid parameter'),
            ]
            
            print('\nSearching for numeric IDs...\n')
            found_ids = {}
            for pattern, description in patterns:
                matches = re.findall(pattern, html)
                if matches:
                    print(f'Found {description}:')
                    for match in set(matches):
                        print(f'  - {match}')
                        found_ids[description] = match
            
            if not found_ids:
                print('No standard numeric post ID patterns found')
                print('\nFull HTML embed code:')
                print(html)
    else:
        print(f'Error Response:')
        try:
            error_data = response.json()
            print(json.dumps(error_data, indent=2))
        except:
            print(response.text)
        
except Exception as e:
    print(f'Exception: {str(e)}')
    import traceback
    traceback.print_exc()
