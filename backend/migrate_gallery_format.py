"""
Migration script to convert gallery_images to new mixed media format with type field
Adds 'type': 'image' and 'url' fields to existing gallery items
"""
from app import create_app, db
from app.models import CreatorProfile

def migrate_gallery_format():
    app = create_app()

    with app.app_context():
        creators = CreatorProfile.query.all()
        migrated_count = 0

        for creator in creators:
            if creator.gallery_images and len(creator.gallery_images) > 0:
                needs_migration = False
                updated_gallery = []

                for item in creator.gallery_images:
                    # Check if item already has type field
                    if 'type' not in item:
                        needs_migration = True
                        # Add type and url fields
                        item['type'] = 'image'
                        item['url'] = item.get('medium', item.get('large', ''))
                        if 'display_order' not in item:
                            item['display_order'] = len(updated_gallery)

                    updated_gallery.append(item)

                if needs_migration:
                    creator.gallery_images = updated_gallery
                    migrated_count += 1
                    print(f"Migrated creator {creator.id} - {creator.username or creator.id}")

        if migrated_count > 0:
            db.session.commit()
            print(f"\n✓ Successfully migrated {migrated_count} creator galleries")
        else:
            print("\n✓ No galleries needed migration")

if __name__ == '__main__':
    migrate_gallery_format()
