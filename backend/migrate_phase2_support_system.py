#!/usr/bin/env python3
"""
BantuBuzz Phase 2: Support & Ticketing System Database Migration

This migration creates the database schema for the Help & Support Center:
- support_tickets: Main ticket records
- support_ticket_messages: Conversation threads
- support_ticket_attachments: File attachments

Created: March 10, 2026
Part of: Trust, Safety & Support Implementation Plan - Phase 2
"""

import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from datetime import datetime
import sys

# Database configuration
DB_CONFIG = {
    'host': 'localhost',
    'database': 'bantubuzz',
    'user': 'bantubuzz_user',
    'password': 'Qwerty@298'
}

def log(message):
    """Print timestamped log message"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] {message}")

def run_migration():
    """Execute the Phase 2 support system migration"""

    conn = None
    cursor = None

    try:
        # Connect to database
        log("Connecting to database...")
        conn = psycopg2.connect(**DB_CONFIG)
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()
        log("Connected successfully!")

        # ============================================
        # 1. CREATE SUPPORT_TICKETS TABLE
        # ============================================
        log("Creating support_tickets table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS support_tickets (
                id SERIAL PRIMARY KEY,
                ticket_number VARCHAR(20) UNIQUE NOT NULL,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

                -- Ticket Details
                category VARCHAR(50) NOT NULL,
                subject VARCHAR(200) NOT NULL,
                description TEXT NOT NULL,
                priority VARCHAR(20) DEFAULT 'normal',

                -- Optional References
                collaboration_id INTEGER REFERENCES collaborations(id) ON DELETE SET NULL,
                booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
                payment_reference VARCHAR(100),
                message_thread_id VARCHAR(100),

                -- Status
                status VARCHAR(30) DEFAULT 'open',
                assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,

                -- Metadata
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                resolved_at TIMESTAMP,
                closed_at TIMESTAMP,

                -- Tracking
                response_count INTEGER DEFAULT 0,
                last_response_at TIMESTAMP,
                last_response_by INTEGER REFERENCES users(id) ON DELETE SET NULL,

                -- Constraints
                CONSTRAINT valid_category CHECK (category IN (
                    'technical', 'campaign', 'payment', 'messaging',
                    'account', 'inquiry', 'other'
                )),
                CONSTRAINT valid_priority CHECK (priority IN (
                    'low', 'normal', 'high', 'emergency'
                )),
                CONSTRAINT valid_status CHECK (status IN (
                    'open', 'under_review', 'awaiting_user', 'investigating',
                    'resolved', 'closed'
                ))
            );
        """)
        log("✓ support_tickets table created")

        # Create indexes for support_tickets
        log("Creating indexes for support_tickets...")
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_support_tickets_user
            ON support_tickets(user_id);
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_support_tickets_status
            ON support_tickets(status);
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_support_tickets_category
            ON support_tickets(category);
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned
            ON support_tickets(assigned_to);
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_support_tickets_priority
            ON support_tickets(priority);
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_support_tickets_created
            ON support_tickets(created_at DESC);
        """)
        log("✓ Indexes created for support_tickets")

        # ============================================
        # 2. CREATE SUPPORT_TICKET_MESSAGES TABLE
        # ============================================
        log("Creating support_ticket_messages table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS support_ticket_messages (
                id SERIAL PRIMARY KEY,
                ticket_id INTEGER NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                is_admin BOOLEAN DEFAULT FALSE,

                -- Message Content
                message TEXT NOT NULL,

                -- Metadata
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                -- Read Status
                read_by_user BOOLEAN DEFAULT FALSE,
                read_by_admin BOOLEAN DEFAULT FALSE
            );
        """)
        log("✓ support_ticket_messages table created")

        # Create indexes for support_ticket_messages
        log("Creating indexes for support_ticket_messages...")
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket
            ON support_ticket_messages(ticket_id);
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_ticket_messages_created
            ON support_ticket_messages(created_at DESC);
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_ticket_messages_user
            ON support_ticket_messages(user_id);
        """)
        log("✓ Indexes created for support_ticket_messages")

        # ============================================
        # 3. CREATE SUPPORT_TICKET_ATTACHMENTS TABLE
        # ============================================
        log("Creating support_ticket_attachments table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS support_ticket_attachments (
                id SERIAL PRIMARY KEY,
                ticket_id INTEGER REFERENCES support_tickets(id) ON DELETE CASCADE,
                message_id INTEGER REFERENCES support_ticket_messages(id) ON DELETE CASCADE,

                -- File Details
                filename VARCHAR(255) NOT NULL,
                file_path VARCHAR(500) NOT NULL,
                file_type VARCHAR(50),
                file_size INTEGER,

                -- Metadata
                uploaded_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        log("✓ support_ticket_attachments table created")

        # Create indexes for support_ticket_attachments
        log("Creating indexes for support_ticket_attachments...")
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_ticket_attachments_ticket
            ON support_ticket_attachments(ticket_id);
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_ticket_attachments_message
            ON support_ticket_attachments(message_id);
        """)
        log("✓ Indexes created for support_ticket_attachments")

        # ============================================
        # 4. CREATE TRIGGER FOR UPDATED_AT
        # ============================================
        log("Creating trigger for automatic updated_at timestamp...")

        # Create function if not exists
        cursor.execute("""
            CREATE OR REPLACE FUNCTION update_support_ticket_timestamp()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        """)

        # Create trigger
        cursor.execute("""
            DROP TRIGGER IF EXISTS update_support_ticket_timestamp
            ON support_tickets;
        """)
        cursor.execute("""
            CREATE TRIGGER update_support_ticket_timestamp
            BEFORE UPDATE ON support_tickets
            FOR EACH ROW
            EXECUTE FUNCTION update_support_ticket_timestamp();
        """)
        log("✓ Trigger created for updated_at")

        # ============================================
        # 5. CREATE SEQUENCE FOR TICKET NUMBERS
        # ============================================
        log("Creating sequence for ticket numbers...")
        cursor.execute("""
            CREATE SEQUENCE IF NOT EXISTS support_ticket_number_seq
            START WITH 1
            INCREMENT BY 1;
        """)
        log("✓ Ticket number sequence created")

        # ============================================
        # 6. VERIFY TABLES
        # ============================================
        log("\nVerifying created tables...")

        cursor.execute("""
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name IN (
                'support_tickets',
                'support_ticket_messages',
                'support_ticket_attachments'
            )
            ORDER BY table_name;
        """)

        tables = cursor.fetchall()
        log(f"Found {len(tables)} support system tables:")
        for table in tables:
            log(f"  ✓ {table[0]}")

        # ============================================
        # 7. VERIFY INDEXES
        # ============================================
        log("\nVerifying indexes...")
        cursor.execute("""
            SELECT indexname
            FROM pg_indexes
            WHERE schemaname = 'public'
            AND tablename IN (
                'support_tickets',
                'support_ticket_messages',
                'support_ticket_attachments'
            )
            AND indexname LIKE 'idx_%'
            ORDER BY indexname;
        """)

        indexes = cursor.fetchall()
        log(f"Found {len(indexes)} indexes for support system")

        # ============================================
        # MIGRATION COMPLETE
        # ============================================
        log("\n" + "="*60)
        log("Phase 2 Support System Migration Completed Successfully!")
        log("="*60)
        log("\nCreated Tables:")
        log("  1. support_tickets - Main ticket records")
        log("  2. support_ticket_messages - Conversation threads")
        log("  3. support_ticket_attachments - File attachments")
        log("\nCreated Indexes: 11 indexes for query optimization")
        log("Created Triggers: 1 trigger for automatic timestamps")
        log("Created Sequences: 1 sequence for ticket numbering")
        log("\nNext Steps:")
        log("  1. Create SQLAlchemy models")
        log("  2. Build API endpoints")
        log("  3. Create frontend components")
        log("="*60)

    except psycopg2.Error as e:
        log(f"\n❌ Database error occurred: {e}")
        log(f"Error code: {e.pgcode}")
        log(f"Error message: {e.pgerror}")
        sys.exit(1)

    except Exception as e:
        log(f"\n❌ Unexpected error: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()
            log("\nDatabase connection closed")

if __name__ == "__main__":
    log("="*60)
    log("BantuBuzz Phase 2: Support System Database Migration")
    log("="*60)
    run_migration()
