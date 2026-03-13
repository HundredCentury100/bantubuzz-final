"""
Admin Support Ticket Routes

Handles admin management of support tickets:
- View all tickets with filters
- Assign tickets to admins
- Respond to tickets
- Change ticket status
- Mark tickets as resolved/closed

Created: March 11, 2026
Part of: Trust, Safety & Support Implementation Plan - Phase 2
"""

from flask import request, jsonify, current_app
from flask_jwt_extended import get_jwt_identity
from app import db
from app.models.user import User
from app.models.support_ticket import SupportTicket
from app.models.support_ticket_message import SupportTicketMessage
from app.decorators.admin import admin_required
from datetime import datetime
import traceback
from . import bp


@bp.route('/support/tickets', methods=['GET'])
@admin_required
def get_all_tickets():
    """
    Get all support tickets (admin view)

    Query params:
    - status: filter by status
    - category: filter by category
    - priority: filter by priority
    - assigned_to: filter by assigned admin
    - page: page number (default 1)
    - per_page: items per page (default 20)
    """
    try:
        # Get query parameters
        status = request.args.get('status')
        category = request.args.get('category')
        priority = request.args.get('priority')
        assigned_to = request.args.get('assigned_to')
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 20))

        # Build query
        query = SupportTicket.query

        if status:
            query = query.filter_by(status=status)
        if category:
            query = query.filter_by(category=category)
        if priority:
            query = query.filter_by(priority=priority)
        if assigned_to:
            query = query.filter_by(assigned_to=int(assigned_to))

        # Order by priority and created date
        query = query.order_by(
            db.case(
                (SupportTicket.priority == 'emergency', 1),
                (SupportTicket.priority == 'high', 2),
                (SupportTicket.priority == 'normal', 3),
                (SupportTicket.priority == 'low', 4)
            ),
            SupportTicket.created_at.desc()
        )

        # Paginate
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)

        return jsonify({
            'success': True,
            'tickets': [ticket.to_dict() for ticket in pagination.items],
            'total': pagination.total,
            'page': page,
            'per_page': per_page,
            'total_pages': pagination.pages
        }), 200

    except Exception as e:
        current_app.logger.error(f"Error fetching tickets: {str(e)}\n{traceback.format_exc()}")
        return jsonify({'success': False, 'error': 'Failed to fetch tickets'}), 500


@bp.route('/support/tickets/<int:ticket_id>', methods=['GET'])
@admin_required
def get_ticket_details(ticket_id):
    """Get full ticket details including all messages and user info"""
    try:
        ticket = SupportTicket.query.get(ticket_id)

        if not ticket:
            return jsonify({'success': False, 'error': 'Ticket not found'}), 404

        # Mark all user messages as read by admin
        SupportTicketMessage.query.filter_by(
            ticket_id=ticket_id,
            is_admin=False,
            read_by_admin=False
        ).update({'read_by_admin': True})
        db.session.commit()

        # Get messages separately for frontend compatibility
        messages = [msg.to_dict() for msg in ticket.messages.order_by(SupportTicketMessage.created_at.asc()).all()]

        return jsonify({
            'success': True,
            'ticket': ticket.to_dict(),
            'messages': messages
        }), 200

    except Exception as e:
        current_app.logger.error(f"Error fetching ticket details: {str(e)}\n{traceback.format_exc()}")
        return jsonify({'success': False, 'error': 'Failed to fetch ticket details'}), 500


@bp.route('/support/tickets/<int:ticket_id>/assign', methods=['PUT'])
@admin_required
def assign_ticket(ticket_id):
    """Assign ticket to an admin"""
    try:
        ticket = SupportTicket.query.get(ticket_id)

        if not ticket:
            return jsonify({'success': False, 'error': 'Ticket not found'}), 404

        data = request.get_json()
        admin_id = data.get('admin_id')

        if admin_id:
            # Verify admin exists and is admin
            admin = User.query.get(admin_id)
            if not admin or not admin.is_admin:
                return jsonify({'success': False, 'error': 'Invalid admin user'}), 400

        ticket.assigned_to = admin_id

        # If ticket was open, move to under_review
        if ticket.status == 'open':
            ticket.status = 'under_review'

        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Ticket assigned successfully',
            'ticket': ticket.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error assigning ticket: {str(e)}\n{traceback.format_exc()}")
        return jsonify({'success': False, 'error': 'Failed to assign ticket'}), 500


@bp.route('/support/tickets/<int:ticket_id>/status', methods=['PUT'])
@admin_required
def update_ticket_status(ticket_id):
    """Update ticket status"""
    try:
        ticket = SupportTicket.query.get(ticket_id)

        if not ticket:
            return jsonify({'success': False, 'error': 'Ticket not found'}), 404

        data = request.get_json()
        new_status = data.get('status')

        if not new_status:
            return jsonify({'success': False, 'error': 'Status is required'}), 400

        if new_status not in SupportTicket.VALID_STATUSES:
            return jsonify({
                'success': False,
                'error': f'Invalid status. Must be one of: {", ".join(SupportTicket.VALID_STATUSES)}'
            }), 400

        ticket.status = new_status

        # Set timestamps based on status
        if new_status == 'resolved':
            ticket.resolved_at = datetime.utcnow()
        elif new_status == 'closed':
            ticket.closed_at = datetime.utcnow()

        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Ticket status updated successfully',
            'ticket': ticket.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error updating ticket status: {str(e)}\n{traceback.format_exc()}")
        return jsonify({'success': False, 'error': 'Failed to update ticket status'}), 500


@bp.route('/support/tickets/<int:ticket_id>/respond', methods=['POST'])
@admin_required
def respond_to_ticket(ticket_id):
    """Admin response to ticket"""
    try:
        current_user_id = get_jwt_identity()

        ticket = SupportTicket.query.get(ticket_id)

        if not ticket:
            return jsonify({'success': False, 'error': 'Ticket not found'}), 404

        data = request.get_json()
        if not data.get('message'):
            return jsonify({'success': False, 'error': 'Message is required'}), 400

        # Create message
        message = SupportTicketMessage(
            ticket_id=ticket_id,
            user_id=current_user_id,
            is_admin=True,
            message=data['message'],
            read_by_user=False,
            read_by_admin=True  # Admin wrote it, so it's read
        )

        db.session.add(message)

        # Update ticket
        ticket.response_count += 1
        ticket.last_response_at = datetime.utcnow()
        ticket.last_response_by = current_user_id

        # Assign to current admin if not assigned
        if not ticket.assigned_to:
            ticket.assigned_to = current_user_id

        # Update status if provided
        if data.get('status'):
            if data['status'] not in SupportTicket.VALID_STATUSES:
                return jsonify({'success': False, 'error': 'Invalid status'}), 400
            ticket.status = data['status']

            if data['status'] == 'resolved':
                ticket.resolved_at = datetime.utcnow()
        else:
            # If no status provided, move to awaiting_user
            if ticket.status == 'open' or ticket.status == 'under_review':
                ticket.status = 'awaiting_user'

        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Response sent successfully',
            'ticket_message': message.to_dict(),
            'ticket': ticket.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error responding to ticket: {str(e)}\n{traceback.format_exc()}")
        return jsonify({'success': False, 'error': 'Failed to send response'}), 500


@bp.route('/support/tickets/<int:ticket_id>/resolve', methods=['PUT'])
@admin_required
def resolve_ticket(ticket_id):
    """Mark ticket as resolved"""
    try:
        ticket = SupportTicket.query.get(ticket_id)

        if not ticket:
            return jsonify({'success': False, 'error': 'Ticket not found'}), 404

        ticket.status = 'resolved'
        ticket.resolved_at = datetime.utcnow()

        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Ticket marked as resolved',
            'ticket': ticket.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error resolving ticket: {str(e)}\n{traceback.format_exc()}")
        return jsonify({'success': False, 'error': 'Failed to resolve ticket'}), 500


@bp.route('/support/tickets/<int:ticket_id>/close', methods=['PUT'])
@admin_required
def close_ticket_admin(ticket_id):
    """Close ticket (admin)"""
    try:
        ticket = SupportTicket.query.get(ticket_id)

        if not ticket:
            return jsonify({'success': False, 'error': 'Ticket not found'}), 404

        ticket.status = 'closed'
        ticket.closed_at = datetime.utcnow()

        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Ticket closed successfully',
            'ticket': ticket.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error closing ticket: {str(e)}\n{traceback.format_exc()}")
        return jsonify({'success': False, 'error': 'Failed to close ticket'}), 500


@bp.route('/support/stats', methods=['GET'])
@admin_required
def get_support_stats():
    """Get support ticket statistics for admin dashboard"""
    try:
        total_tickets = SupportTicket.query.count()
        open_tickets = SupportTicket.query.filter_by(status='open').count()
        under_review = SupportTicket.query.filter_by(status='under_review').count()
        awaiting_user = SupportTicket.query.filter_by(status='awaiting_user').count()
        resolved_tickets = SupportTicket.query.filter_by(status='resolved').count()
        closed_tickets = SupportTicket.query.filter_by(status='closed').count()

        # Get unassigned tickets
        unassigned_tickets = SupportTicket.query.filter(
            SupportTicket.assigned_to.is_(None),
            SupportTicket.status.notin_(['closed'])
        ).count()

        # Get high priority open tickets
        high_priority = SupportTicket.query.filter(
            SupportTicket.priority.in_(['high', 'emergency']),
            SupportTicket.status.notin_(['closed', 'resolved'])
        ).count()

        # Get category breakdown
        category_breakdown = {}
        for category in SupportTicket.VALID_CATEGORIES:
            count = SupportTicket.query.filter_by(category=category).count()
            category_breakdown[category] = count

        return jsonify({
            'success': True,
            'stats': {
                'total_tickets': total_tickets,
                'open_tickets': open_tickets,
                'under_review': under_review,
                'awaiting_user': awaiting_user,
                'resolved_tickets': resolved_tickets,
                'closed_tickets': closed_tickets,
                'unassigned_tickets': unassigned_tickets,
                'high_priority': high_priority,
                'category_breakdown': category_breakdown
            }
        }), 200

    except Exception as e:
        current_app.logger.error(f"Error fetching support stats: {str(e)}\n{traceback.format_exc()}")
        return jsonify({'success': False, 'error': 'Failed to fetch stats'}), 500
