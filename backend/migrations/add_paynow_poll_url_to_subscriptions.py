"""
Migration: Add paynow_poll_url column to subscriptions table
"""
import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

def run_migration():
    # Connect to database
    conn = psycopg2.connect(
        dbname=os.getenv('DB_NAME'),
        user=os.getenv('DB_USER'),
        password=os.getenv('DB_PASSWORD'),
        host=os.getenv('DB_HOST'),
        port=os.getenv('DB_PORT', 5432)
    )
    cursor = conn.cursor()

    try:
        print("Adding paynow_poll_url column to subscriptions table...")

        # Add paynow_poll_url column
        cursor.execute("""
            ALTER TABLE subscriptions
            ADD COLUMN IF NOT EXISTS paynow_poll_url TEXT;
        """)

        conn.commit()
        print("✅ Migration completed successfully!")

    except Exception as e:
        conn.rollback()
        print(f"❌ Migration failed: {str(e)}")
        raise

    finally:
        cursor.close()
        conn.close()


if __name__ == '__main__':
    run_migration()
