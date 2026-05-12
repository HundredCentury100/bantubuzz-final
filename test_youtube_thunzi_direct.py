#!/usr/bin/env python3
"""
Test script to send YouTube platform data directly to ThunziAI API
This helps debug the "Malformed auth code" error we're getting
"""

import requests
import json
from datetime import datetime

# ThunziAI API endpoint
THUNZI_API_BASE = "https://api.thunzi.ai"

# Test data from the successful YouTube OAuth exchange
test_data = {
    "companyId": 12,
    "platform": "youtube",
    "accountName": "Hundred Tech Academy",
    "accountId": "UCtNefyLeMkrM3B-g70hUnyg",
    "accessToken": "ya29.a0Aa7MYirSNud4f_L5zeNrdFm8CtqhM-J7rgu3begJqkM",  # Placeholder - will need real token
    "refreshToken": "1//038jqdH1kne2jCgYIARAAGAMSNwF-L9Iryth0Awon4nKYT6"  # Placeholder - will need real token
}

def test_add_platform():
    """Test adding YouTube platform to ThunziAI"""
    url = f"{THUNZI_API_BASE}/api/platforms"

    print("=" * 70)
    print("Testing ThunziAI Add Platform API")
    print("=" * 70)
    print(f"\nEndpoint: {url}")
    print(f"\nRequest Data:")
    print(json.dumps(test_data, indent=2))
    print("\n" + "=" * 70)

    try:
        response = requests.post(
            url,
            json=test_data,
            headers={
                "Content-Type": "application/json"
            },
            timeout=30
        )

        print(f"\nResponse Status: {response.status_code}")
        print(f"Response Headers:")
        for key, value in response.headers.items():
            print(f"  {key}: {value}")

        print(f"\nResponse Body:")
        try:
            response_json = response.json()
            print(json.dumps(response_json, indent=2))
        except:
            print(response.text)

        print("\n" + "=" * 70)

        if response.status_code == 200:
            print("✓ SUCCESS: Platform added successfully")
            return True
        else:
            print(f"✗ FAILED: Status {response.status_code}")
            return False

    except requests.exceptions.RequestException as e:
        print(f"\n✗ REQUEST ERROR: {str(e)}")
        return False

def test_get_platforms():
    """Test getting platforms from ThunziAI for company 12"""
    url = f"{THUNZI_API_BASE}/api/platforms"
    params = {"companyId": 12}

    print("\n" + "=" * 70)
    print("Testing ThunziAI Get Platforms API")
    print("=" * 70)
    print(f"\nEndpoint: {url}")
    print(f"Params: {params}")

    try:
        response = requests.get(
            url,
            params=params,
            timeout=30
        )

        print(f"\nResponse Status: {response.status_code}")
        print(f"\nResponse Body:")
        try:
            response_json = response.json()
            print(json.dumps(response_json, indent=2))
        except:
            print(response.text)

        print("\n" + "=" * 70)

    except requests.exceptions.RequestException as e:
        print(f"\n✗ REQUEST ERROR: {str(e)}")

if __name__ == "__main__":
    print(f"\nTimestamp: {datetime.now().isoformat()}")
    print(f"Testing YouTube platform connection to ThunziAI")
    print(f"\nNOTE: This script uses placeholder tokens.")
    print(f"For real test, you'll need to provide actual OAuth tokens from a fresh YouTube login.\n")

    # Test adding platform
    success = test_add_platform()

    # Also try getting existing platforms
    test_get_platforms()

    print("\n" + "=" * 70)
    print("Test Complete")
    print("=" * 70)
