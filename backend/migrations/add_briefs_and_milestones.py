"""
Migration script to add Briefs and Milestones tables
Run after cleanup script
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app, db
from sqlalchemy import text

def run_migration():
    """Create all briefs and milestone tables"""
    app = create_app()

    with app.app_context():
        try:
            print("Starting Briefs & Milestones migration...")
            print("=" * 60)

            # Create briefs table
            print("\n1. Creating 'briefs' table...")
            db.session.execute(text("""
                CREATE TABLE IF NOT EXISTS briefs (
                    id SERIAL PRIMARY KEY,
                    brand_id INTEGER NOT NULL REFERENCES brand_profiles(id) ON DELETE CASCADE,
                    title VARCHAR(200) NOT NULL,
                    description TEXT NOT NULL,
                    goal TEXT NOT NULL,
                    platform VARCHAR(100) NOT NULL,
                    budget_min NUMERIC(10, 2) NOT NULL,
                    budget_max NUMERIC(10, 2) NOT NULL,
                    timeline_days INTEGER NOT NULL,
                    total_duration_days INTEGER NOT NULL,
                    status VARCHAR(20) DEFAULT 'draft',
                    target_categories JSON,
                    target_min_followers INTEGER,
                    target_max_followers INTEGER,
                    target_locations JSON,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    closed_at TIMESTAMP
                )
            """))
            print("✓ 'briefs' table created")

            # Create brief_milestones table
            print("\n2. Creating 'brief_milestones' table...")
            db.session.execute(text("""
                CREATE TABLE IF NOT EXISTS brief_milestones (
                    id SERIAL PRIMARY KEY,
                    brief_id INTEGER NOT NULL REFERENCES briefs(id) ON DELETE CASCADE,
                    milestone_number INTEGER NOT NULL,
                    title VARCHAR(200) NOT NULL,
                    description TEXT,
                    expected_deliverables JSON NOT NULL,
                    duration_days INTEGER NOT NULL,
                    price NUMERIC(10, 2),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(brief_id, milestone_number)
                )
            """))
            print("✓ 'brief_milestones' table created")

            # Create proposals table
            print("\n3. Creating 'proposals' table...")
            db.session.execute(text("""
                CREATE TABLE IF NOT EXISTS proposals (
                    id SERIAL PRIMARY KEY,
                    brief_id INTEGER NOT NULL REFERENCES briefs(id) ON DELETE CASCADE,
                    creator_id INTEGER NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
                    status VARCHAR(20) DEFAULT 'pending',
                    message TEXT NOT NULL,
                    total_price NUMERIC(10, 2) NOT NULL,
                    pricing_type VARCHAR(20) NOT NULL,
                    timeline_days INTEGER NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(brief_id, creator_id)
                )
            """))
            print("✓ 'proposals' table created")

            # Create proposal_milestones table
            print("\n4. Creating 'proposal_milestones' table...")
            db.session.execute(text("""
                CREATE TABLE IF NOT EXISTS proposal_milestones (
                    id SERIAL PRIMARY KEY,
                    proposal_id INTEGER NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
                    milestone_number INTEGER NOT NULL,
                    title VARCHAR(200) NOT NULL,
                    deliverables JSON NOT NULL,
                    duration_days INTEGER NOT NULL,
                    price NUMERIC(10, 2),
                    notes TEXT,
                    UNIQUE(proposal_id, milestone_number)
                )
            """))
            print("✓ 'proposal_milestones' table created")

            # Create collaboration_milestones table
            print("\n5. Creating 'collaboration_milestones' table...")
            db.session.execute(text("""
                CREATE TABLE IF NOT EXISTS collaboration_milestones (
                    id SERIAL PRIMARY KEY,
                    collaboration_id INTEGER NOT NULL REFERENCES collaborations(id) ON DELETE CASCADE,
                    milestone_number INTEGER NOT NULL,
                    title VARCHAR(200) NOT NULL,
                    description TEXT,
                    expected_deliverables JSON NOT NULL,
                    status VARCHAR(20) DEFAULT 'pending',
                    price NUMERIC(10, 2) NOT NULL,
                    due_date DATE,
                    completed_at TIMESTAMP,
                    approved_at TIMESTAMP,
                    escrow_triggered_at TIMESTAMP,
                    escrow_release_date DATE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(collaboration_id, milestone_number)
                )
            """))
            print("✓ 'collaboration_milestones' table created")

            # Create milestone_deliverables table
            print("\n6. Creating 'milestone_deliverables' table...")
            db.session.execute(text("""
                CREATE TABLE IF NOT EXISTS milestone_deliverables (
                    id SERIAL PRIMARY KEY,
                    collaboration_milestone_id INTEGER NOT NULL REFERENCES collaboration_milestones(id) ON DELETE CASCADE,
                    title VARCHAR(200) NOT NULL,
                    url TEXT NOT NULL,
                    description TEXT,
                    status VARCHAR(20) DEFAULT 'pending_review',
                    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    approved_at TIMESTAMP,
                    revision_notes TEXT,
                    revision_requested_at TIMESTAMP
                )
            """))
            print("✓ 'milestone_deliverables' table created")

            # Create campaign_milestones table
            print("\n7. Creating 'campaign_milestones' table...")
            db.session.execute(text("""
                CREATE TABLE IF NOT EXISTS campaign_milestones (
                    id SERIAL PRIMARY KEY,
                    campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
                    milestone_number INTEGER NOT NULL,
                    title VARCHAR(200) NOT NULL,
                    description TEXT,
                    expected_deliverables JSON NOT NULL,
                    duration_days INTEGER NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(campaign_id, milestone_number)
                )
            """))
            print("✓ 'campaign_milestones' table created")

            # Update collaborations table
            print("\n8. Updating 'collaborations' table...")
            db.session.execute(text("""
                ALTER TABLE collaborations
                ADD COLUMN IF NOT EXISTS source_type VARCHAR(20),
                ADD COLUMN IF NOT EXISTS source_id INTEGER,
                ADD COLUMN IF NOT EXISTS brief_id INTEGER REFERENCES briefs(id),
                ADD COLUMN IF NOT EXISTS campaign_id INTEGER REFERENCES campaigns(id),
                ADD COLUMN IF NOT EXISTS has_milestones BOOLEAN DEFAULT TRUE,
                ADD COLUMN IF NOT EXISTS milestone_pricing_type VARCHAR(20),
                ADD COLUMN IF NOT EXISTS is_campaign BOOLEAN DEFAULT FALSE,
                ADD COLUMN IF NOT EXISTS parent_brief_id INTEGER REFERENCES briefs(id)
            """))
            print("✓ 'collaborations' table updated")

            # Update campaigns table
            print("\n9. Updating 'campaigns' table...")
            db.session.execute(text("""
                ALTER TABLE campaigns
                ADD COLUMN IF NOT EXISTS brief_id INTEGER REFERENCES briefs(id),
                ADD COLUMN IF NOT EXISTS has_milestones BOOLEAN DEFAULT TRUE,
                ADD COLUMN IF NOT EXISTS milestone_pricing_type VARCHAR(20),
                ADD COLUMN IF NOT EXISTS total_duration_days INTEGER
            """))
            print("✓ 'campaigns' table updated")

            # Update wallet_transactions table
            print("\n10. Updating 'wallet_transactions' table...")
            db.session.execute(text("""
                ALTER TABLE wallet_transactions
                ADD COLUMN IF NOT EXISTS escrow_release_date DATE,
                ADD COLUMN IF NOT EXISTS milestone_id INTEGER REFERENCES collaboration_milestones(id)
            """))
            print("✓ 'wallet_transactions' table updated")

            # Create indexes for performance
            print("\n11. Creating indexes...")
            db.session.execute(text("CREATE INDEX IF NOT EXISTS idx_briefs_brand_id ON briefs(brand_id)"))
            db.session.execute(text("CREATE INDEX IF NOT EXISTS idx_briefs_status ON briefs(status)"))
            db.session.execute(text("CREATE INDEX IF NOT EXISTS idx_proposals_brief_id ON proposals(brief_id)"))
            db.session.execute(text("CREATE INDEX IF NOT EXISTS idx_proposals_creator_id ON proposals(creator_id)"))
            db.session.execute(text("CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status)"))
            db.session.execute(text("CREATE INDEX IF NOT EXISTS idx_collaboration_milestones_collaboration_id ON collaboration_milestones(collaboration_id)"))
            db.session.execute(text("CREATE INDEX IF NOT EXISTS idx_collaboration_milestones_status ON collaboration_milestones(status)"))
            db.session.execute(text("CREATE INDEX IF NOT EXISTS idx_milestone_deliverables_milestone_id ON milestone_deliverables(collaboration_milestone_id)"))
            db.session.execute(text("CREATE INDEX IF NOT EXISTS idx_campaign_milestones_campaign_id ON campaign_milestones(campaign_id)"))
            db.session.execute(text("CREATE INDEX IF NOT EXISTS idx_wallet_transactions_milestone_id ON wallet_transactions(milestone_id)"))
            print("✓ Indexes created")

            # Commit all changes
            db.session.commit()

            print("\n" + "=" * 60)
            print("✅ Migration completed successfully!")
            print("\nNew tables created:")
            print("  - briefs")
            print("  - brief_milestones")
            print("  - proposals")
            print("  - proposal_milestones")
            print("  - collaboration_milestones")
            print("  - milestone_deliverables")
            print("  - campaign_milestones")
            print("\nTables updated:")
            print("  - collaborations (milestone support)")
            print("  - campaigns (milestone support)")
            print("  - wallet_transactions (escrow tracking)")
            print("=" * 60)

        except Exception as e:
            db.session.rollback()
            print(f"\n❌ Error during migration: {str(e)}")
            import traceback
            traceback.print_exc()
            sys.exit(1)

if __name__ == '__main__':
    run_migration()
