"""
Migration script to add usernames to existing creators who don't have one.
This ensures all creators have a username going forward.
"""

import sys
import os

# Add parent directory to path to import app modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app, db
from app.models import CreatorProfile, User
import re


def generate_username_from_email(email):
    """Generate a username from email address"""
    # Get the part before @
    username_base = email.split('@')[0]

    # Remove any non-alphanumeric characters except underscores
    username_base = re.sub(r'[^a-zA-Z0-9_]', '_', username_base)

    # Ensure it's at least 3 characters
    if len(username_base) < 3:
        username_base = username_base + '_creator'

    # Limit to 30 characters
    username_base = username_base[:30]

    return username_base


def add_usernames_to_creators():
    """Add usernames to all creators who don't have one"""
    app = create_app()

    with app.app_context():
        # Find all creators without usernames
        creators_without_username = CreatorProfile.query.filter(
            (CreatorProfile.username == None) | (CreatorProfile.username == '')
        ).all()

        print(f"Found {len(creators_without_username)} creators without usernames")

        if len(creators_without_username) == 0:
            print("All creators already have usernames!")
            return

        updated_count = 0

        for creator in creators_without_username:
            # Get the user's email
            user = User.query.get(creator.user_id)
            if not user:
                print(f"Warning: Creator ID {creator.id} has no associated user")
                continue

            # Generate base username from email
            base_username = generate_username_from_email(user.email)

            # Check if username is taken, add suffix if needed
            username = base_username
            counter = 1

            while CreatorProfile.query.filter_by(username=username).first():
                username = f"{base_username}_{counter}"
                counter += 1

            # Update creator profile
            creator.username = username
            updated_count += 1

            print(f"Updated Creator ID {creator.id} ({user.email}) -> username: {username}")

        # Commit all changes
        try:
            db.session.commit()
            print(f"\nSuccessfully updated {updated_count} creators with usernames!")
        except Exception as e:
            db.session.rollback()
            print(f"Error committing changes: {e}")
            return False

        return True


if __name__ == '__main__':
    print("=" * 60)
    print("Adding Usernames to Existing Creators")
    print("=" * 60)
    print()

    # Check for --yes flag for non-interactive mode
    auto_confirm = '--yes' in sys.argv or '-y' in sys.argv

    if not auto_confirm:
        confirm = input("This will update all creators without usernames. Continue? (yes/no): ")
        if confirm.lower() != 'yes':
            print("Migration cancelled.")
            sys.exit(0)

    success = add_usernames_to_creators()
    if success:
        print("\nMigration completed successfully!")
    else:
        print("\nMigration failed!")
        sys.exit(1)
