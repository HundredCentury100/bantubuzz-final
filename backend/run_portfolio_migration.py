import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app import create_app, db

app = create_app()

with app.app_context():
    print("Running portfolio items migration...")

    # Read and execute migration SQL
    with open('migrations/create_portfolio_items.sql', 'r') as f:
        sql = f.read()
        statements = [s.strip() for s in sql.split(';') if s.strip()]

        for statement in statements:
            try:
                db.session.execute(db.text(statement))
                print(f"✓ Executed: {statement[:80]}...")
            except Exception as e:
                print(f"✗ Error: {e}")
                db.session.rollback()
                continue

        db.session.commit()
        print("✓ Migration completed successfully!")
