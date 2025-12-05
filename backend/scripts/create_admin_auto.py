"""
Automated script to create admin user for testing
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app, db
from app.models import User

def create_admin():
    app = create_app()

    with app.app_context():
        print("Creating admin user...")

        # Check if admin already exists
        admin_email = "admin@bantubuzz.com"
        existing_admin = User.query.filter_by(email=admin_email).first()

        if existing_admin:
            print(f"Admin user {admin_email} already exists!")
            # Update to admin if not already
            if not existing_admin.is_admin:
                existing_admin.is_admin = True
                existing_admin.user_type = 'admin'
                existing_admin.admin_role = 'super_admin'
                existing_admin.is_verified = True
                existing_admin.is_active = True
                db.session.commit()
                print("Existing user updated to super admin!")
            else:
                print(f"User is already a {existing_admin.admin_role}")
            return

        try:
            # Create admin user
            admin = User(
                email=admin_email,
                password="admin123",  # Default password for testing
                user_type='admin'
            )
            admin.is_admin = True
            admin.admin_role = 'super_admin'
            admin.is_verified = True
            admin.is_active = True

            db.session.add(admin)
            db.session.commit()

            print("\n" + "=" * 50)
            print("Admin user created successfully!")
            print("=" * 50)
            print(f"Email: {admin_email}")
            print(f"Password: admin123")
            print(f"Role: super_admin")
            print("\nYou can now login at: http://localhost:3000/admin/login")
            print("=" * 50)

        except Exception as e:
            print(f"Error creating admin user: {str(e)}")
            db.session.rollback()

if __name__ == '__main__':
    create_admin()
