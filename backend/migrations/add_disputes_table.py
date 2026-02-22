"""
Migration: Add disputes table
Run: python migrations/add_disputes_table.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app, db
from sqlalchemy import text

app = create_app()

with app.app_context():
    sql = """
    CREATE TABLE IF NOT EXISTS disputes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        reference VARCHAR(20) UNIQUE NOT NULL,
        collaboration_id INTEGER REFERENCES collaborations(id),
        raised_by_user_id INTEGER NOT NULL REFERENCES users(id),
        against_user_id INTEGER NOT NULL REFERENCES users(id),
        issue_type VARCHAR(30) NOT NULL,
        description TEXT NOT NULL,
        evidence_urls JSON,
        status VARCHAR(20) NOT NULL DEFAULT 'open',
        resolution VARCHAR(30),
        resolution_notes TEXT,
        payout_percentage FLOAT,
        assigned_admin_id INTEGER REFERENCES users(id),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        resolved_at DATETIME
    );
    """
    try:
        db.session.execute(text(sql))
        db.session.commit()
        print("✓ disputes table created successfully")
    except Exception as e:
        print(f"✗ Error: {e}")
        db.session.rollback()
