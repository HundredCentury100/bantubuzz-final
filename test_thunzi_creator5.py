"""
Test script to retrieve ThunziAI data for Creator 5
"""
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from app import create_app, db
from app.models.thunzi_account import ThunziAccount
from app.models.creator_profile import CreatorProfile
from app.services.thunzi_service import thunzi_service

def test_creator_5_thunzi():
    """Test ThunziAI access for creator 5"""
    app = create_app()

    with app.app_context():
        print("=" * 60)
        print("Testing ThunziAI Access for Creator 5")
        print("=" * 60)

        # Get creator 5
        creator = CreatorProfile.query.get(5)
        if not creator:
            print("❌ Creator 5 not found")
            return

        print(f"\n✅ Found Creator: {creator.display_name}")
        print(f"   User ID: {creator.user_id}")
        print(f"   Email: {creator.user.email if creator.user else 'N/A'}")

        # Get ThunziAI account
        thunzi_account = ThunziAccount.query.filter_by(user_id=creator.user_id).first()

        if not thunzi_account:
            print("\n❌ No ThunziAI account found for creator 5")
            return

        print(f"\n✅ ThunziAI Account Found:")
        print(f"   Company ID: {thunzi_account.thunzi_company_id}")
        print(f"   BantuBuzz ID: {thunzi_account.bantubuzz_id}")
        print(f"   Thunzi Email: {thunzi_account.thunzi_email}")
        print(f"   Active: {thunzi_account.is_active}")

        # Login to ThunziAI
        print("\n" + "=" * 60)
        print("Attempting ThunziAI Login...")
        print("=" * 60)

        if thunzi_account.thunzi_email:
            # Password = email (BantuBuzz convention)
            success = thunzi_service.login(
                email=thunzi_account.thunzi_email,
                password=thunzi_account.thunzi_email
            )

            if not success:
                print("❌ Failed to login to ThunziAI")
                return

            print("✅ Successfully logged in to ThunziAI")
        else:
            print("❌ No ThunziAI email found")
            return

        # Get platforms
        print("\n" + "=" * 60)
        print("Fetching Connected Platforms...")
        print("=" * 60)

        if thunzi_account.bantubuzz_id:
            # Use creator endpoint
            platforms = thunzi_service.get_creator_platforms(thunzi_account.bantubuzz_id)
        elif thunzi_account.thunzi_company_id:
            # Use company endpoint
            platforms = thunzi_service.get_platforms(thunzi_account.thunzi_company_id)
        else:
            print("❌ No BantuBuzz ID or Company ID found")
            return

        if not platforms:
            print("❌ No platforms found")
            return

        print(f"\n✅ Found {len(platforms)} platform(s):")

        for idx, platform in enumerate(platforms, 1):
            print(f"\n--- Platform {idx} ---")
            print(f"Platform ID: {platform.get('id')}")
            print(f"Platform: {platform.get('platform')}")
            print(f"Account Name: {platform.get('accountName')}")
            print(f"Connected: {platform.get('isConnected')}")
            print(f"Followers: {platform.get('followers', 0)}")
            print(f"Posts: {platform.get('posts', 0)}")
            print(f"Sync Status: {platform.get('syncStatus')}")

            if platform.get('averageEngagementRate'):
                print(f"Avg Engagement: {platform.get('averageEngagementRate')}%")

        # Test audience endpoint for each connected platform
        print("\n" + "=" * 60)
        print("Testing Audience Endpoint...")
        print("=" * 60)

        connected_platforms = [p for p in platforms if p.get('isConnected')]

        if not connected_platforms:
            print("❌ No connected platforms to test")
            return

        for platform in connected_platforms:
            platform_id = platform.get('id')
            platform_name = platform.get('platform')
            account_name = platform.get('accountName')

            print(f"\n--- Testing Platform ID {platform_id} ({platform_name} - @{account_name}) ---")

            # Test direct curl
            import requests
            try:
                url = f"https://app.thunzi.co/api/platforms/{platform_id}/audience"
                print(f"Fetching: {url}")

                response = requests.get(url)

                if response.status_code == 200:
                    data = response.json()
                    print(f"✅ Audience data retrieved!")
                    print(f"   Age groups: {len(data.get('ageGender', []))}")
                    print(f"   Countries: {len(data.get('countries', []))}")
                    print(f"   Cities: {len(data.get('cities', []))}")
                    print(f"   Gender data: {len(data.get('gender', []))}")

                    # Show top age group
                    if data.get('ageGender'):
                        ages = []
                        for age_arr in data.get('ageGender', []):
                            if age_arr and len(age_arr) > 0:
                                ages.append(age_arr[0])

                        if ages:
                            top_age = max(ages, key=lambda x: x.get('value', 0))
                            print(f"\n   Top Age Group: {top_age.get('breakdown')} ({top_age.get('value')}%)")

                    # Show top country
                    if data.get('countries'):
                        countries = []
                        for country_arr in data.get('countries', []):
                            if country_arr and len(country_arr) > 0:
                                countries.append(country_arr[0])

                        if countries:
                            top_country = max(countries, key=lambda x: x.get('value', 0))
                            print(f"   Top Country: {top_country.get('breakdown')} ({top_country.get('value')}%)")

                    # Show gender breakdown
                    if data.get('gender'):
                        print(f"\n   Gender Breakdown:")
                        for gender_arr in data.get('gender', []):
                            if gender_arr and len(gender_arr) > 0:
                                g = gender_arr[0]
                                gender_label = 'Male' if g.get('breakdown') == 'M' else 'Female' if g.get('breakdown') == 'F' else 'Unknown'
                                print(f"      {gender_label}: {g.get('value')}%")

                else:
                    print(f"❌ Failed to retrieve audience data: {response.status_code}")
                    print(f"   Response: {response.text[:200]}")

            except Exception as e:
                print(f"❌ Error: {str(e)}")

        print("\n" + "=" * 60)
        print("Test Complete!")
        print("=" * 60)

if __name__ == '__main__':
    test_creator_5_thunzi()
