"""
Create Support System Tables

Uses Flask-SQLAlchemy to create support system tables.
Run this script to initialize Phase 2 database schema.

Usage: python create_support_tables.py
"""

from app import create_app, db
from app.models.support_ticket import SupportTicket
from app.models.support_ticket_message import SupportTicketMessage
from app.models.support_ticket_attachment import SupportTicketAttachment

print("="*60)
print("Creating Support System Tables")
print("="*60)

# Create Flask app
app = create_app()

with app.app_context():
    print("\nImporting models...")
    print(f"  ✓ SupportTicket")
    print(f"  ✓ SupportTicketMessage")
    print(f"  ✓ SupportTicketAttachment")

    print("\nCreating tables...")
    db.create_all()
    print("  ✓ All tables created successfully!")

    print("\n" + "="*60)
    print("Phase 2 Support System Tables Created!")
    print("="*60)
    print("\nTables created:")
    print("  1. support_tickets")
    print("  2. support_ticket_messages")
    print("  3. support_ticket_attachments")
    print("\nYou can now proceed with creating API endpoints.")
    print("="*60)
