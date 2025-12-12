"""
Script to check and reset admin password
"""
from app import create_app, db
from app.models import User
from werkzeug.security import generate_password_hash

app = create_app()

with app.app_context():
    # Find admin account
    admin = User.query.filter_by(email='admin@bantubuzz.com').first()

    if admin:
        print(f"✓ Admin account found:")
        print(f"  Email: {admin.email}")
        print(f"  ID: {admin.id}")
        print(f"  Active: {admin.is_active}")
        print(f"  Verified: {admin.is_verified}")
        print(f"  User Type: {admin.user_type}")

        # Reset password to 'password123'
        admin.password_hash = generate_password_hash('password123')
        admin.is_active = True
        admin.is_verified = True
        db.session.commit()
        print(f"\n✓ Password reset to: password123")
        print(f"✓ Account activated and verified")
    else:
        print("✗ Admin account not found!")
        print("\nListing all users:")
        users = User.query.all()
        for user in users:
            print(f"  - {user.email} ({user.user_type})")
