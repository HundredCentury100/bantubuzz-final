"""
Run the request_logs table migration
"""
import sys
sys.path.insert(0, '/var/www/bantubuzz/backend')

from app import create_app, db

app = create_app()

with app.app_context():
    print("Running request_logs table migration...")

    # Read the SQL file
    with open('/tmp/create_request_logs_table.sql', 'r') as f:
        sql = f.read()

    # Execute the SQL
    db.session.execute(db.text(sql))
    db.session.commit()

    print("✓ Migration completed successfully!")
    print("✓ request_logs table created")
