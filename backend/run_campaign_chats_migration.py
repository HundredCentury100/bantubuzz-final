"""
Campaign Chats Migration Runner
Run this script to create campaign chat tables in the database
"""
import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

def run_migration():
    """Execute the campaign chats migration SQL"""
    try:
        # Connect to database
        conn = psycopg2.connect(
            host=os.getenv('DB_HOST', 'localhost'),
            database=os.getenv('DB_NAME', 'bantubuzz'),
            user=os.getenv('DB_USER', 'postgres'),
            password=os.getenv('DB_PASSWORD', '')
        )
        conn.autocommit = True
        cursor = conn.cursor()

        print("🚀 Running campaign chats migration...")

        # Read migration file
        with open('migrations/create_campaign_chats_tables.sql', 'r') as f:
            sql = f.read()

        # Execute migration
        cursor.execute(sql)

        print("✅ Campaign chats tables created successfully!")
        print("   - campaign_chats")
        print("   - campaign_chat_participants")
        print("   - campaign_chat_messages")
        print("   - Indexes, triggers, and helper functions created")

        # Verify tables exist
        cursor.execute("""
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name IN ('campaign_chats', 'campaign_chat_participants', 'campaign_chat_messages')
            ORDER BY table_name
        """)
        tables = cursor.fetchall()

        print(f"\n📊 Verified {len(tables)} tables:")
        for table in tables:
            cursor.execute(f"SELECT COUNT(*) FROM {table[0]}")
            count = cursor.fetchone()[0]
            print(f"   - {table[0]}: {count} rows")

        cursor.close()
        conn.close()

        print("\n✨ Migration completed successfully!")
        return True

    except Exception as e:
        print(f"❌ Migration failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    run_migration()
