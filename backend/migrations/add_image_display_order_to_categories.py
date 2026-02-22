"""
Migration to add image and display_order columns to categories table
"""
from app import create_app, db
from sqlalchemy import text

app = create_app()

with app.app_context():
    try:
        # Add image column
        db.session.execute(text('''
            ALTER TABLE categories
            ADD COLUMN IF NOT EXISTS image VARCHAR(255)
        '''))

        # Add display_order column
        db.session.execute(text('''
            ALTER TABLE categories
            ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0
        '''))

        db.session.commit()
        print('✅ Migration completed: Added image and display_order columns to categories')

    except Exception as e:
        db.session.rollback()
        print(f'❌ Migration failed: {str(e)}')
        raise
