"""
Migration: Add disputes table (PostgreSQL version)
Run: python migrations/add_disputes_table_pg.py
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
        id SERIAL PRIMARY KEY,
        reference VARCHAR(20) UNIQUE NOT NULL,
        collaboration_id INTEGER REFERENCES collaborations(id),
        raised_by_user_id INTEGER NOT NULL REFERENCES users(id),
        against_user_id INTEGER NOT NULL REFERENCES users(id),
        issue_type VARCHAR(30) NOT NULL,
        description TEXT NOT NULL,
        evidence_urls JSONB,
        status VARCHAR(20) NOT NULL DEFAULT 'open',
        resolution VARCHAR(30),
        resolution_notes TEXT,
        payout_percentage FLOAT,
        assigned_admin_id INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        resolved_at TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_disputes_collaboration ON disputes(collaboration_id);
    CREATE INDEX IF NOT EXISTS idx_disputes_raised_by ON disputes(raised_by_user_id);
    CREATE INDEX IF NOT EXISTS idx_disputes_against ON disputes(against_user_id);
    CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status);
    """
    try:
        db.session.execute(text(sql))
        db.session.commit()
        print("✓ disputes table created successfully with indexes")
    except Exception as e:
        print(f"✗ Error: {e}")
        db.session.rollback()
