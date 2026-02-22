"""
Milestone Deliverable Endpoints - To be appended to collaborations.py
"""

MILESTONE_ENDPOINTS = '''

# ============================================================================
# MILESTONE DELIVERABLE ENDPOINTS (for Brief/Campaign Collaborations)
# ============================================================================

@bp.route('/<int:collab_id>/milestones/<int:milestone_id>/deliverables', methods=['POST'])
@jwt_required()
def submit_milestone_deliverable(collab_id, milestone_id):
    """Submit deliverable to a specific milestone (creator only)"""
    try:
        user_id = int(get_jwt_identity())
        creator = CreatorProfile.query.filter_by(user_id=user_id).first()

        if not creator:
            return jsonify({'error': 'Creator profile not found'}), 404

        collaboration = Collaboration.query.get(collab_id)
        if not collaboration:
            return jsonify({'error': 'Collaboration not found'}), 404

        if collaboration.creator_id != creator.id:
            return jsonify({'error': 'Unauthorized'}), 403

        milestone = CollaborationMilestone.query.get(milestone_id)
        if not milestone or milestone.collaboration_id != collab_id:
            return jsonify({'error': 'Milestone not found'}), 404

        data = request.get_json()

        # Validate required fields
        if 'title' not in data or 'url' not in data:
            return jsonify({'error': 'Title and URL are required'}), 400

        # Create deliverable
        deliverable = MilestoneDeliverable(
            collaboration_milestone_id=milestone.id,
            title=data['title'],
            url=data['url'],
            description=data.get('description', ''),
            status='pending_review'
        )
        db.session.add(deliverable)

        # Update milestone status if it's pending
        if milestone.status == 'pending':
            milestone.status = 'in_progress'

        db.session.commit()

        # Update collaboration
        collaboration.last_update = f"Deliverable submitted for {milestone.title}"
        collaboration.last_update_date = datetime.utcnow()
        db.session.commit()

        # Notify brand
        brand_user = User.query.get(collaboration.brand.user_id)
        if brand_user:
            notify_collaboration_update(
                user_id=brand_user.id,
                collaboration_title=collaboration.title,
                collaboration_id=collaboration.id,
                update_message=f"New deliverable submitted for milestone: {milestone.title}"
            )

        return jsonify({
            'message': 'Deliverable submitted successfully',
            'deliverable': deliverable.to_dict(),
            'milestone': milestone.to_dict(include_deliverables=True)
        }), 201

    except Exception as e:
        db.session.rollback()
        print(f"Error submitting milestone deliverable: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:collab_id>/milestones/<int:milestone_id>/deliverables/<int:deliverable_id>/approve', methods=['POST'])
@jwt_required()
def approve_milestone_deliverable(collab_id, milestone_id, deliverable_id):
    """Approve milestone deliverable (brand only)"""
    try:
        user_id = int(get_jwt_identity())
        brand = BrandProfile.query.filter_by(user_id=user_id).first()

        if not brand:
            return jsonify({'error': 'Brand profile not found'}), 404

        collaboration = Collaboration.query.get(collab_id)
        if not collaboration:
            return jsonify({'error': 'Collaboration not found'}), 404

        if collaboration.brand_id != brand.id:
            return jsonify({'error': 'Unauthorized'}), 403

        milestone = CollaborationMilestone.query.get(milestone_id)
        if not milestone or milestone.collaboration_id != collab_id:
            return jsonify({'error': 'Milestone not found'}), 404

        deliverable = MilestoneDeliverable.query.get(deliverable_id)
        if not deliverable or deliverable.collaboration_milestone_id != milestone.id:
            return jsonify({'error': 'Deliverable not found'}), 404

        # Approve deliverable
        deliverable.status = 'approved'
        deliverable.approved_at = datetime.utcnow()
        db.session.commit()

        # Check if milestone is now complete (all deliverables approved)
        if milestone.is_complete():
            milestone.status = 'completed'
            milestone.completed_at = datetime.utcnow()
            milestone.approved_at = datetime.utcnow()

            # Trigger escrow for this milestone
            milestone.escrow_triggered_at = datetime.utcnow()
            milestone.escrow_release_date = (datetime.utcnow() + timedelta(days=30)).date()

            # Release escrow for this specific milestone
            from app.services.payment_service import release_milestone_escrow
            try:
                transaction = release_milestone_escrow(milestone.id, platform_fee_percentage=15)
                print(f"Milestone {milestone.id} escrow released. Transaction: {transaction.id}")
            except Exception as e:
                print(f"Warning: Failed to release milestone escrow: {str(e)}")

            # Check if all milestones are complete
            all_milestones = collaboration.milestones.all()
            all_complete = all(m.status == 'completed' for m in all_milestones)

            if all_complete:
                collaboration.status = 'completed'
                collaboration.actual_completion_date = datetime.utcnow()
                collaboration.progress_percentage = 100

                # Notify both parties
                creator_user = User.query.get(collaboration.creator.user_id)
                if creator_user:
                    notify_collaboration_status(
                        user_id=creator_user.id,
                        status='completed',
                        collaboration_title=collaboration.title,
                        collaboration_id=collaboration.id,
                        user_type='creator'
                    )

                brand_user = User.query.get(collaboration.brand.user_id)
                if brand_user:
                    notify_collaboration_status(
                        user_id=brand_user.id,
                        status='completed',
                        collaboration_title=collaboration.title,
                        collaboration_id=collaboration.id,
                        user_type='brand'
                    )

        db.session.commit()

        # Notify creator about approval
        creator_user = User.query.get(collaboration.creator.user_id)
        if creator_user:
            notify_collaboration_update(
                user_id=creator_user.id,
                collaboration_title=collaboration.title,
                collaboration_id=collaboration.id,
                update_message=f"Deliverable approved for {milestone.title}"
            )

        return jsonify({
            'message': 'Deliverable approved successfully',
            'deliverable': deliverable.to_dict(),
            'milestone': milestone.to_dict(include_deliverables=True),
            'collaboration': collaboration.to_dict(include_relations=True)
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error approving milestone deliverable: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:collab_id>/milestones/<int:milestone_id>/deliverables/<int:deliverable_id>/request-revision', methods=['POST'])
@jwt_required()
def request_milestone_deliverable_revision(collab_id, milestone_id, deliverable_id):
    """Request revision on milestone deliverable (brand only)"""
    try:
        user_id = int(get_jwt_identity())
        brand = BrandProfile.query.filter_by(user_id=user_id).first()

        if not brand:
            return jsonify({'error': 'Brand profile not found'}), 404

        collaboration = Collaboration.query.get(collab_id)
        if not collaboration:
            return jsonify({'error': 'Collaboration not found'}), 404

        if collaboration.brand_id != brand.id:
            return jsonify({'error': 'Unauthorized'}), 403

        milestone = CollaborationMilestone.query.get(milestone_id)
        if not milestone or milestone.collaboration_id != collab_id:
            return jsonify({'error': 'Milestone not found'}), 404

        deliverable = MilestoneDeliverable.query.get(deliverable_id)
        if not deliverable or deliverable.collaboration_milestone_id != milestone.id:
            return jsonify({'error': 'Deliverable not found'}), 404

        data = request.get_json()
        revision_notes = data.get('notes', '')

        if not revision_notes:
            return jsonify({'error': 'Revision notes are required'}), 400

        # Update deliverable
        deliverable.status = 'revision_requested'
        deliverable.revision_notes = revision_notes
        deliverable.revision_requested_at = datetime.utcnow()

        db.session.commit()

        # Notify creator
        creator_user = User.query.get(collaboration.creator.user_id)
        if creator_user:
            notify_collaboration_update(
                user_id=creator_user.id,
                collaboration_title=collaboration.title,
                collaboration_id=collaboration.id,
                update_message=f"Revision requested for deliverable in {milestone.title}"
            )

        return jsonify({
            'message': 'Revision requested successfully',
            'deliverable': deliverable.to_dict(),
            'milestone': milestone.to_dict(include_deliverables=True)
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error requesting milestone deliverable revision: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
'''
