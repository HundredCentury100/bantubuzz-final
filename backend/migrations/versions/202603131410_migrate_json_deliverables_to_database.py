"""migrate json deliverables to database

Revision ID: 202603131410
Revises: 202603131405
Create Date: 2026-03-13 14:10:00.000000

"""
from alembic import op
import sqlalchemy as sa
from datetime import datetime
import json

# revision identifiers, used by Alembic.
revision = '202603131410'
down_revision = '202603131405'
branch_labels = None
depends_on = None


def upgrade():
    """
    Migrate existing JSON deliverables from collaborations table to package_deliverables table

    This processes all package-based collaborations and moves their deliverables from:
    - collaborations.submitted_deliverables (JSON column)
    - collaborations.draft_deliverables (JSON column)

    To:
    - package_deliverables table (database records)

    Important: This migration is idempotent and can be run multiple times safely.
    """
    # Get database connection
    connection = op.get_bind()

    # Fetch all package collaborations with deliverables
    collaborations = connection.execute(sa.text("""
        SELECT id, submitted_deliverables, draft_deliverables
        FROM collaborations
        WHERE collaboration_type = 'package'
        AND (
            submitted_deliverables IS NOT NULL
            OR draft_deliverables IS NOT NULL
        )
    """)).fetchall()

    print(f"\n[MIGRATION] Found {len(collaborations)} package collaborations to process")

    total_migrated = 0

    for collab in collaborations:
        collab_id = collab[0]
        submitted = collab[1] or []
        drafts = collab[2] or []

        # Ensure we're working with lists
        if isinstance(submitted, str):
            submitted = json.loads(submitted)
        if isinstance(drafts, str):
            drafts = json.loads(drafts)

        print(f"\n[MIGRATION] Processing collaboration {collab_id}")
        print(f"  - Submitted deliverables: {len(submitted)}")
        print(f"  - Draft deliverables: {len(drafts)}")

        # Migrate submitted deliverables
        for deliv in submitted:
            if not deliv:
                continue

            # Check if already migrated (by checking if ID exists in package_deliverables)
            existing = connection.execute(sa.text("""
                SELECT id FROM package_deliverables
                WHERE collaboration_id = :collab_id AND title = :title
            """), {'collab_id': collab_id, 'title': deliv.get('title')}).fetchone()

            if existing:
                print(f"  - Skipping already migrated deliverable: {deliv.get('title')}")
                continue

            # Parse dates
            submitted_at = deliv.get('submitted_at')
            if isinstance(submitted_at, str):
                try:
                    submitted_at = datetime.fromisoformat(submitted_at.replace('Z', '+00:00'))
                except:
                    submitted_at = datetime.utcnow()
            elif not submitted_at:
                submitted_at = datetime.utcnow()

            approved_at = deliv.get('approved_at')
            if isinstance(approved_at, str):
                try:
                    approved_at = datetime.fromisoformat(approved_at.replace('Z', '+00:00'))
                except:
                    approved_at = None
            elif not approved_at:
                approved_at = None

            url_submitted_at = deliv.get('url_submitted_at')
            if isinstance(url_submitted_at, str):
                try:
                    url_submitted_at = datetime.fromisoformat(url_submitted_at.replace('Z', '+00:00'))
                except:
                    url_submitted_at = None

            # Insert into package_deliverables
            connection.execute(sa.text("""
                INSERT INTO package_deliverables (
                    collaboration_id, title, url, description, status,
                    submitted_at, approved_at,
                    post_platform, post_id, post_url_validated, url_submitted_at
                ) VALUES (
                    :collaboration_id, :title, :url, :description, :status,
                    :submitted_at, :approved_at,
                    :post_platform, :post_id, :post_url_validated, :url_submitted_at
                )
            """), {
                'collaboration_id': collab_id,
                'title': deliv.get('title', 'Untitled'),
                'url': deliv.get('url', ''),
                'description': deliv.get('description', ''),
                'status': 'approved',  # submitted_deliverables are approved
                'submitted_at': submitted_at,
                'approved_at': approved_at or datetime.utcnow(),
                'post_platform': deliv.get('post_platform'),
                'post_id': deliv.get('post_id'),
                'post_url_validated': deliv.get('post_url_validated', False),
                'url_submitted_at': url_submitted_at
            })

            total_migrated += 1
            print(f"  ✅ Migrated submitted deliverable: {deliv.get('title')}")

        # Migrate draft deliverables
        for deliv in drafts:
            if not deliv:
                continue

            # Check if already migrated
            existing = connection.execute(sa.text("""
                SELECT id FROM package_deliverables
                WHERE collaboration_id = :collab_id AND title = :title
            """), {'collab_id': collab_id, 'title': deliv.get('title')}).fetchone()

            if existing:
                print(f"  - Skipping already migrated deliverable: {deliv.get('title')}")
                continue

            # Parse dates
            submitted_at = deliv.get('submitted_at')
            if isinstance(submitted_at, str):
                try:
                    submitted_at = datetime.fromisoformat(submitted_at.replace('Z', '+00:00'))
                except:
                    submitted_at = datetime.utcnow()
            elif not submitted_at:
                submitted_at = datetime.utcnow()

            revision_requested_at = deliv.get('revision_requested_at')
            if isinstance(revision_requested_at, str):
                try:
                    revision_requested_at = datetime.fromisoformat(revision_requested_at.replace('Z', '+00:00'))
                except:
                    revision_requested_at = None

            # Insert into package_deliverables
            connection.execute(sa.text("""
                INSERT INTO package_deliverables (
                    collaboration_id, title, url, description, status,
                    submitted_at, revision_notes, revision_requested_at
                ) VALUES (
                    :collaboration_id, :title, :url, :description, :status,
                    :submitted_at, :revision_notes, :revision_requested_at
                )
            """), {
                'collaboration_id': collab_id,
                'title': deliv.get('title', 'Untitled'),
                'url': deliv.get('url', ''),
                'description': deliv.get('description', ''),
                'status': deliv.get('status', 'pending_review'),
                'submitted_at': submitted_at,
                'revision_notes': deliv.get('revision_notes'),
                'revision_requested_at': revision_requested_at
            })

            total_migrated += 1
            print(f"  ✅ Migrated draft deliverable: {deliv.get('title')}")

    print(f"\n[MIGRATION] Successfully migrated {total_migrated} deliverables to package_deliverables table")
    print("[MIGRATION] JSON columns (submitted_deliverables, draft_deliverables) will be deprecated in future release")


def downgrade():
    """
    Reverse migration: move deliverables back to JSON

    WARNING: This will lose any new deliverables created after the migration!
    Only use this in emergency rollback scenarios.
    """
    print("\n[ROLLBACK] Moving package deliverables back to JSON columns")
    print("[ROLLBACK] WARNING: Any deliverables created after migration will be LOST!")

    connection = op.get_bind()

    # Get all package collaborations
    collaborations = connection.execute(sa.text("""
        SELECT DISTINCT collaboration_id
        FROM package_deliverables
    """)).fetchall()

    for collab_row in collaborations:
        collab_id = collab_row[0]

        # Get all deliverables for this collaboration
        deliverables = connection.execute(sa.text("""
            SELECT id, title, url, description, status, submitted_at, approved_at,
                   revision_notes, revision_requested_at, post_platform, post_id,
                   post_url_validated, url_submitted_at
            FROM package_deliverables
            WHERE collaboration_id = :collab_id
        """), {'collab_id': collab_id}).fetchall()

        submitted_list = []
        draft_list = []

        for deliv in deliverables:
            deliv_dict = {
                'id': deliv[0],
                'title': deliv[1],
                'url': deliv[2],
                'description': deliv[3],
                'status': deliv[4],
                'submitted_at': deliv[5].isoformat() if deliv[5] else None,
                'approved_at': deliv[6].isoformat() if deliv[6] else None,
                'revision_notes': deliv[7],
                'revision_requested_at': deliv[8].isoformat() if deliv[8] else None,
                'post_platform': deliv[9],
                'post_id': deliv[10],
                'post_url_validated': deliv[11],
                'url_submitted_at': deliv[12].isoformat() if deliv[12] else None
            }

            if deliv[4] == 'approved':
                submitted_list.append(deliv_dict)
            else:
                draft_list.append(deliv_dict)

        # Update collaboration with JSON arrays
        connection.execute(sa.text("""
            UPDATE collaborations
            SET submitted_deliverables = :submitted,
                draft_deliverables = :drafts
            WHERE id = :collab_id
        """), {
            'submitted': json.dumps(submitted_list),
            'drafts': json.dumps(draft_list),
            'collab_id': collab_id
        })

        print(f"[ROLLBACK] Restored {len(submitted_list)} submitted + {len(draft_list)} draft deliverables for collaboration {collab_id}")

    print("[ROLLBACK] Downgrade complete")
