"""Test OTP registration flow"""
import requests
import json

BASE_URL = 'http://localhost:5000/api'

def test_creator_registration():
    """Test creator registration with OTP"""
    print("\n" + "="*60)
    print("Testing Creator Registration with OTP")
    print("="*60)

    # Register a new creator
    register_data = {
        'email': 'testcreator@example.com',
        'password': 'Test123456'
    }

    print("\n1. Registering new creator...")
    print(f"   Email: {register_data['email']}")

    response = requests.post(
        f'{BASE_URL}/auth/register/creator',
        json=register_data,
        headers={'Content-Type': 'application/json'}
    )

    print(f"   Status: {response.status_code}")
    print(f"   Response: {json.dumps(response.json(), indent=2)}")

    if response.status_code == 201:
        print("\n✓ Registration successful!")
        print("✓ OTP email should be sent to:", register_data['email'])
        print("\nTo verify, you'll need the OTP code from the email.")
        print("Then run: POST /api/auth/verify-otp with email and code")
    else:
        print("\n✗ Registration failed")

    return response

def test_brand_registration():
    """Test brand registration with OTP"""
    print("\n" + "="*60)
    print("Testing Brand Registration with OTP")
    print("="*60)

    # Register a new brand
    register_data = {
        'email': 'testbrand@example.com',
        'password': 'Test123456',
        'company_name': 'Test Brand Inc'
    }

    print("\n1. Registering new brand...")
    print(f"   Email: {register_data['email']}")
    print(f"   Company: {register_data['company_name']}")

    response = requests.post(
        f'{BASE_URL}/auth/register/brand',
        json=register_data,
        headers={'Content-Type': 'application/json'}
    )

    print(f"   Status: {response.status_code}")
    print(f"   Response: {json.dumps(response.json(), indent=2)}")

    if response.status_code == 201:
        print("\n✓ Registration successful!")
        print("✓ OTP email should be sent to:", register_data['email'])
        print("\nTo verify, you'll need the OTP code from the email.")
        print("Then run: POST /api/auth/verify-otp with email and code")
    else:
        print("\n✗ Registration failed")

    return response

def test_verify_otp():
    """Test OTP verification (requires manual OTP code)"""
    print("\n" + "="*60)
    print("Testing OTP Verification")
    print("="*60)

    email = input("\nEnter email: ")
    code = input("Enter OTP code: ")

    verify_data = {
        'email': email,
        'code': code
    }

    print("\nVerifying OTP...")
    response = requests.post(
        f'{BASE_URL}/auth/verify-otp',
        json=verify_data,
        headers={'Content-Type': 'application/json'}
    )

    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")

    if response.status_code == 200:
        print("\n✓ OTP verified successfully!")
        print("✓ User can now login")
    else:
        print("\n✗ OTP verification failed")

    return response

def test_resend_otp():
    """Test OTP resend"""
    print("\n" + "="*60)
    print("Testing OTP Resend")
    print("="*60)

    email = input("\nEnter email: ")

    resend_data = {'email': email}

    print("\nResending OTP...")
    response = requests.post(
        f'{BASE_URL}/auth/resend-otp',
        json=resend_data,
        headers={'Content-Type': 'application/json'}
    )

    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")

    if response.status_code == 200:
        print("\n✓ New OTP sent successfully!")
    else:
        print("\n✗ OTP resend failed")

    return response

if __name__ == '__main__':
    print("\n" + "="*60)
    print("BantuBuzz OTP Testing Script")
    print("="*60)

    while True:
        print("\nSelect a test:")
        print("1. Register Creator")
        print("2. Register Brand")
        print("3. Verify OTP")
        print("4. Resend OTP")
        print("5. Exit")

        choice = input("\nEnter choice (1-5): ")

        if choice == '1':
            test_creator_registration()
        elif choice == '2':
            test_brand_registration()
        elif choice == '3':
            test_verify_otp()
        elif choice == '4':
            test_resend_otp()
        elif choice == '5':
            print("\nExiting...")
            break
        else:
            print("\nInvalid choice. Please try again.")
