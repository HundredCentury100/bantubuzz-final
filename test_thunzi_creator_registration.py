"""
Test script for new ThunziAI creator registration endpoint
Tests the API key registration flow that bypasses OTP verification
"""
import sys
import os
import requests
from datetime import datetime

# Fix Windows console encoding for emojis
if sys.platform == 'win32':
    os.system('chcp 65001 > nul')

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from app.services.thunzi_service import ThunziAIService

def test_direct_api_call():
    """Test the API endpoint directly with curl-like request"""
    print("\n" + "="*80)
    print("TEST 1: Direct API Call to /api/creator/register")
    print("="*80)

    # Generate unique test email
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    email = f"test_creator_{timestamp}@bantubuzz.com"
    password = email

    print(f"\nRegistering creator: {email}")

    url = "https://app.thunzi.co/api/creator/register"
    headers = {
        'x-api-key': 'WsoFzZyadXRLP8ypT1mIkhB8',
        'Content-Type': 'application/json'
    }
    payload = {
        "email": email,
        "password": password
    }

    try:
        response = requests.post(url, json=payload, headers=headers)
        print(f"\nResponse Status: {response.status_code}")
        print(f"Response Body: {response.json()}")

        if response.status_code in [200, 201]:
            print("✅ Registration successful!")
            data = response.json()
            print(f"   - User ID: {data.get('id')}")
            print(f"   - Email: {data.get('email')}")
            print(f"   - Role: {data.get('role')}")
            print(f"   - Setup Step: {data.get('setupStep')}")
            print(f"   - Company ID: {data.get('companyId')}")
            return True, email, password
        else:
            print(f"❌ Registration failed: {response.text}")
            return False, None, None

    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False, None, None


def test_service_registration(email=None):
    """Test registration via ThunziAIService"""
    print("\n" + "="*80)
    print("TEST 2: Registration via ThunziAIService.register_creator()")
    print("="*80)

    service = ThunziAIService()

    # Generate unique test email if not provided
    if not email:
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        email = f"test_service_{timestamp}@bantubuzz.com"

    password = email

    print(f"\nRegistering creator: {email}")

    result = service.register_creator(email, password)

    if result:
        print("✅ Registration successful via service!")
        print(f"   - User ID: {result.get('id')}")
        print(f"   - Email: {result.get('email')}")
        print(f"   - Setup Step: {result.get('setupStep')}")
        return True, email, password
    else:
        print("❌ Registration failed via service")
        return False, None, None


def test_login(email, password):
    """Test login after registration"""
    print("\n" + "="*80)
    print("TEST 3: Login After Registration")
    print("="*80)

    service = ThunziAIService()

    print(f"\nAttempting login for: {email}")

    success = service.login(email, password)

    if success:
        print("✅ Login successful!")
        print(f"   - Session authenticated: {service.is_authenticated}")
        return True
    else:
        print("❌ Login failed")
        return False


def test_ensure_user_registered():
    """Test the complete ensure_user_registered flow"""
    print("\n" + "="*80)
    print("TEST 4: Complete ensure_user_registered() Flow")
    print("="*80)

    service = ThunziAIService()

    # Generate unique test email
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    email = f"test_ensure_{timestamp}@bantubuzz.com"

    print(f"\nTesting ensure_user_registered for: {email}")
    print("This should:")
    print("  1. Try to login (will fail - new user)")
    print("  2. Register via API key (should succeed)")
    print("  3. Login after registration (should succeed)")

    result = service.ensure_user_registered(email)

    if result:
        print("\n✅ ensure_user_registered() successful!")
        print(f"   - Email: {result.get('email')}")
        print(f"   - Session authenticated: {service.is_authenticated}")
        return True
    else:
        print("\n❌ ensure_user_registered() failed")
        return False


def test_existing_user_login():
    """Test that existing users can still login"""
    print("\n" + "="*80)
    print("TEST 5: Existing User Login (via ensure_user_registered)")
    print("="*80)

    service = ThunziAIService()

    # Use an email that was just registered in previous test
    # For this test, we'll use a fresh registration
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    email = f"test_existing_{timestamp}@bantubuzz.com"

    print(f"\nStep 1: Register user {email}")
    result1 = service.ensure_user_registered(email)

    if not result1:
        print("❌ Failed to register user for existing user test")
        return False

    print("✅ User registered")

    # Create new service instance to simulate fresh session
    print(f"\nStep 2: Call ensure_user_registered again (should just login)")
    service2 = ThunziAIService()
    result2 = service2.ensure_user_registered(email)

    if result2:
        print("✅ Existing user logged in successfully!")
        print("   - No new registration was needed")
        return True
    else:
        print("❌ Failed to login existing user")
        return False


def run_all_tests():
    """Run all tests"""
    print("\n" + "="*80)
    print("THUNZIAI CREATOR REGISTRATION TESTS")
    print("="*80)
    print(f"Test started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    results = []

    # Test 1: Direct API call
    success1, email1, password1 = test_direct_api_call()
    results.append(("Direct API Call", success1))

    # Test 2: Service registration
    success2, email2, password2 = test_service_registration()
    results.append(("Service Registration", success2))

    # Test 3: Login after registration (use email from test 2)
    if success2:
        success3 = test_login(email2, password2)
        results.append(("Login After Registration", success3))
    else:
        results.append(("Login After Registration", False))

    # Test 4: ensure_user_registered flow
    success4 = test_ensure_user_registered()
    results.append(("ensure_user_registered()", success4))

    # Test 5: Existing user login
    success5 = test_existing_user_login()
    results.append(("Existing User Login", success5))

    # Print summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)

    for test_name, success in results:
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {test_name}")

    total = len(results)
    passed = sum(1 for _, success in results if success)

    print(f"\nTotal: {passed}/{total} tests passed")

    if passed == total:
        print("\n🎉 All tests passed! ThunziAI creator registration is working correctly.")
    else:
        print(f"\n⚠️  {total - passed} test(s) failed. Please review the errors above.")


if __name__ == "__main__":
    run_all_tests()
