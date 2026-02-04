"""
Delete a specific proposal by ID
Usage: python delete_proposal.py <proposal_id>
"""
from app import create_app, db
from app.models import Proposal, ProposalMilestone
import sys

def delete_proposal(proposal_id):
    app = create_app()
    with app.app_context():
        try:
            # Find the proposal
            proposal = Proposal.query.get(proposal_id)
            if not proposal:
                print(f"Proposal {proposal_id} not found")
                return False

            print(f"Found proposal:")
            print(f"  ID: {proposal.id}")
            print(f"  Brief ID: {proposal.brief_id}")
            print(f"  Creator ID: {proposal.creator_id}")
            print(f"  Status: {proposal.status}")
            print(f"  Total price: ${proposal.total_price}")

            # Delete associated milestones first
            milestones = ProposalMilestone.query.filter_by(proposal_id=proposal_id).all()
            print(f"\nDeleting {len(milestones)} milestones...")
            for milestone in milestones:
                db.session.delete(milestone)

            # Delete the proposal
            print(f"Deleting proposal {proposal_id}...")
            db.session.delete(proposal)
            db.session.commit()

            print(f"\n✓ Proposal {proposal_id} and its milestones deleted successfully!")
            return True

        except Exception as e:
            db.session.rollback()
            print(f"\n✗ Error deleting proposal: {e}")
            return False

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python delete_proposal.py <proposal_id>")
        sys.exit(1)

    try:
        proposal_id = int(sys.argv[1])
        delete_proposal(proposal_id)
    except ValueError:
        print("Error: proposal_id must be a number")
        sys.exit(1)
