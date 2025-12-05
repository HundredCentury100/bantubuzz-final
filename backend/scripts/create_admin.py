"""
Script to create an admin user for BantuBuzz platform
Run this with: python scripts/create_admin.py
"""

import sys
import os
from getpass import getpass

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app, db
from app.models import User

def create_admin():
    app = create_app()

    with app.app_context():
        print("=" * 50)
        print("BantuBuzz Admin User Creation")
        print("=" * 50)
        print()

        # Get admin details
        email = input("Enter admin email: ").strip()

        # Check if user already exists
        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            print(f"\n❌ User with email {email} already exists!")
            update = input("Update existing user to admin? (yes/no): ").strip().lower()
            if update == 'yes':
                existing_user.is_admin = True
                existing_user.user_type = 'admin'
                existing_user.is_verified = True
                existing_user.is_active = True

                print("\nSelect admin role:")
                print("1. Super Admin (full access)")
                print("2. Moderator (content moderation)")
                print("3. Support (user support)")
                print("4. Finance (payments and reports)")

                role_choice = input("Enter choice (1-4): ").strip()
                role_map = {
                    '1': 'super_admin',
                    '2': 'moderator',
                    '3': 'support',
                    '4': 'finance'
                }
                existing_user.admin_role = role_map.get(role_choice, 'super_admin')

                # Update password if needed
                change_password = input("Change password? (yes/no): ").strip().lower()
                if change_password == 'yes':
                    password = getpass("Enter new password: ")
                    password_confirm = getpass("Confirm new password: ")

                    if password != password_confirm:
                        print("\n❌ Passwords don't match!")
                        return

                    existing_user.set_password(password)

                db.session.commit()
                print(f"\n✅ User {email} updated to admin successfully!")
                print(f"Role: {existing_user.admin_role}")
            return

        # Get password
        password = getpass("Enter admin password: ")
        password_confirm = getpass("Confirm password: ")

        if password != password_confirm:
            print("\n❌ Passwords don't match!")
            return

        if len(password) < 6:
            print("\n❌ Password must be at least 6 characters!")
            return

        # Select admin role
        print("\nSelect admin role:")
        print("1. Super Admin (full access)")
        print("2. Moderator (content moderation)")
        print("3. Support (user support)")
        print("4. Finance (payments and reports)")

        role_choice = input("Enter choice (1-4): ").strip()
        role_map = {
            '1': 'super_admin',
            '2': 'moderator',
            '3': 'support',
            '4': 'finance'
        }
        admin_role = role_map.get(role_choice, 'super_admin')

        try:
            # Create admin user
            admin = User(email=email, password=password, user_type='admin')
            admin.is_admin = True
            admin.admin_role = admin_role
            admin.is_verified = True
            admin.is_active = True

            db.session.add(admin)
            db.session.commit()

            print("\n" + "=" * 50)
            print("✅ Admin user created successfully!")
            print("=" * 50)
            print(f"Email: {email}")
            print(f"Role: {admin_role}")
            print("\nYou can now login to the admin dashboard.")

        except Exception as e:
            print(f"\n❌ Error creating admin user: {str(e)}")
            db.session.rollback()

if __name__ == '__main__':
    create_admin()
