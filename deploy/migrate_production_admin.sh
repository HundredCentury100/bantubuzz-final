#!/bin/bash

# Production migration script for admin and categories
# Run this on the server after deploying backend code

echo "==============================================="
echo "Running Admin & Categories Migration"
echo "==============================================="

cd /var/www/bantubuzz/backend

# Run the migration script
python3 migrations/migrate_admin.py

# Create admin user
echo ""
echo "Creating admin user..."
python3 <<EOF
from app import create_app, db
from app.models import User

app = create_app()
with app.app_context():
    # Check if admin exists
    admin = User.query.filter_by(email='admin@bantubuzz.com').first()
    if not admin:
        admin = User(
            email='admin@bantubuzz.com',
            password='Admin@Bantu2024!',  # CHANGE THIS PASSWORD AFTER FIRST LOGIN
            user_type='admin'
        )
        admin.is_admin = True
        admin.admin_role = 'super_admin'
        admin.is_verified = True
        admin.is_active = True
        db.session.add(admin)
        db.session.commit()
        print("Admin user created!")
        print("Email: admin@bantubuzz.com")
        print("Password: Admin@Bantu2024!")
        print("IMPORTANT: Change this password after first login!")
    else:
        print("Admin user already exists")
        if not admin.is_admin:
            admin.is_admin = True
            admin.user_type = 'admin'
            admin.admin_role = 'super_admin'
            db.session.commit()
            print("Updated existing user to admin")
EOF

echo ""
echo "==============================================="
echo "Migration Complete!"
echo "==============================================="
