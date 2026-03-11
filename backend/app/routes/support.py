"""
Support Ticket Routes (User-Facing)

Handles user support ticket creation, viewing, and messaging.
Users can submit tickets, reply to them, and close/reopen them.

Created: March 11, 2026
Part of: Trust, Safety & Support Implementation Plan - Phase 2
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.user import User
from app.models.support_ticket import SupportTicket
from app.models.support_ticket_message import SupportTicketMessage
from app.models.support_ticket_attachment import SupportTicketAttachment
from datetime import datetime

bp = Blueprint('support', __name__)


@bp.route('/support/tickets', methods=['POST'])
@jwt_required()
def create_ticket():
    """
    Create a new support ticket

    Required fields: category, subject, description
    Optional fields: collaboration_id, booking_id, payment_reference, message_thread_id, priority
    """
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)

        if not current_user:
            return jsonify({'success': False, 'error': 'User not found'}), 404

        data = request.get_json()

        # Validate required fields
        if not data.get('category'):
            return jsonify({'success': False, 'error': 'Category is required'}), 400
        if not data.get('subject'):
            return jsonify({'success': False, 'error': 'Subject is required'}), 400
        if not data.get('description'):
            return jsonify({'success': False, 'error': 'Description is required'}), 400

        # Validate category
        if data['category'] not in SupportTicket.VALID_CATEGORIES:
            return jsonify({
                'success': False,
                'error': f'Invalid category. Must be one of: {", ".join(SupportTicket.VALID_CATEGORIES)}'
            }), 400

        # Validate priority if provided
        priority = data.get('priority', 'normal')
        if priority not in SupportTicket.VALID_PRIORITIES:
            return jsonify({
                'success': False,
                'error': f'Invalid priority. Must be one of: {", ".join(SupportTicket.VALID_PRIORITIES)}'
            }), 400

        # Generate ticket number
        ticket_number = SupportTicket.generate_ticket_number()

        # Create ticket
        ticket = SupportTicket(
            ticket_number=ticket_number,
            user_id=current_user.id,
            category=data['category'],
            subject=data['subject'],
            description=data['description'],
            priority=priority,
            collaboration_id=data.get('collaboration_id'),
            booking_id=data.get('booking_id'),
            payment_reference=data.get('payment_reference'),
            message_thread_id=data.get('message_thread_id'),
            status='open'
        )

        db.session.add(ticket)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Support ticket created successfully',
            'ticket': ticket.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        print(f"Error creating support ticket: {str(e)}")
        return jsonify({'success': False, 'error': 'Failed to create support ticket'}), 500


@bp.route('/support/tickets', methods=['GET'])
@jwt_required()
def get_my_tickets():
    """
    Get all tickets for the current user

    Query params:
    - status: filter by status
    - category: filter by category
    - page: page number (default 1)
    - per_page: items per page (default 20)
    """
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)

        if not current_user:
            return jsonify({'success': False, 'error': 'User not found'}), 404

        # Get query parameters
        status = request.args.get('status')
        category = request.args.get('category')
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 20))

        # Build query
        query = SupportTicket.query.filter_by(user_id=current_user.id)

        if status:
            query = query.filter_by(status=status)
        if category:
            query = query.filter_by(category=category)

        # Order by created date (newest first)
        query = query.order_by(SupportTicket.created_at.desc())

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
        print(f"Error fetching tickets: {str(e)}")
        return jsonify({'success': False, 'error': 'Failed to fetch tickets'}), 500


@bp.route('/support/tickets/<int:ticket_id>', methods=['GET'])
@jwt_required()
def get_ticket(ticket_id):
    """Get details of a specific ticket including messages"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)

        if not current_user:
            return jsonify({'success': False, 'error': 'User not found'}), 404

        ticket = SupportTicket.query.get(ticket_id)

        if not ticket:
            return jsonify({'success': False, 'error': 'Ticket not found'}), 404

        # Verify ownership
        if ticket.user_id != current_user.id:
            return jsonify({'success': False, 'error': 'Unauthorized'}), 403

        # Mark all admin messages as read by user
        SupportTicketMessage.query.filter_by(
            ticket_id=ticket_id,
            is_admin=True,
            read_by_user=False
        ).update({'read_by_user': True})
        db.session.commit()

        return jsonify({
            'success': True,
            'ticket': ticket.to_admin_dict()  # Includes messages and attachments
        }), 200

    except Exception as e:
        print(f"Error fetching ticket: {str(e)}")
        return jsonify({'success': False, 'error': 'Failed to fetch ticket'}), 500


@bp.route('/support/tickets/<int:ticket_id>/messages', methods=['POST'])
@jwt_required()
def add_ticket_message(ticket_id):
    """Add a message to a support ticket"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)

        if not current_user:
            return jsonify({'success': False, 'error': 'User not found'}), 404

        ticket = SupportTicket.query.get(ticket_id)

        if not ticket:
            return jsonify({'success': False, 'error': 'Ticket not found'}), 404

        # Verify ownership
        if ticket.user_id != current_user.id:
            return jsonify({'success': False, 'error': 'Unauthorized'}), 403

        # Check if ticket is closed
        if ticket.status == 'closed':
            return jsonify({'success': False, 'error': 'Cannot add messages to closed ticket'}), 400

        data = request.get_json()
        if not data.get('message'):
            return jsonify({'success': False, 'error': 'Message is required'}), 400

        # Create message
        message = SupportTicketMessage(
            ticket_id=ticket_id,
            user_id=current_user.id,
            is_admin=False,
            message=data['message'],
            read_by_user=True,  # User wrote it, so it's read
            read_by_admin=False
        )

        db.session.add(message)

        # Update ticket
        ticket.response_count += 1
        ticket.last_response_at = datetime.utcnow()
        ticket.last_response_by = current_user.id

        # If ticket was resolved/awaiting_user, reopen it
        if ticket.status in ['resolved', 'awaiting_user']:
            ticket.status = 'under_review'

        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Message added successfully',
            'ticket_message': message.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        print(f"Error adding message: {str(e)}")
        return jsonify({'success': False, 'error': 'Failed to add message'}), 500


@bp.route('/support/tickets/<int:ticket_id>/close', methods=['PUT'])
@jwt_required()
def close_ticket(ticket_id):
    """Close a support ticket"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)

        if not current_user:
            return jsonify({'success': False, 'error': 'User not found'}), 404

        ticket = SupportTicket.query.get(ticket_id)

        if not ticket:
            return jsonify({'success': False, 'error': 'Ticket not found'}), 404

        # Verify ownership
        if ticket.user_id != current_user.id:
            return jsonify({'success': False, 'error': 'Unauthorized'}), 403

        if ticket.status == 'closed':
            return jsonify({'success': False, 'error': 'Ticket is already closed'}), 400

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
        print(f"Error closing ticket: {str(e)}")
        return jsonify({'success': False, 'error': 'Failed to close ticket'}), 500


@bp.route('/support/tickets/<int:ticket_id>/reopen', methods=['PUT'])
@jwt_required()
def reopen_ticket(ticket_id):
    """Reopen a closed support ticket"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)

        if not current_user:
            return jsonify({'success': False, 'error': 'User not found'}), 404

        ticket = SupportTicket.query.get(ticket_id)

        if not ticket:
            return jsonify({'success': False, 'error': 'Ticket not found'}), 404

        # Verify ownership
        if ticket.user_id != current_user.id:
            return jsonify({'success': False, 'error': 'Unauthorized'}), 403

        if ticket.status != 'closed':
            return jsonify({'success': False, 'error': 'Ticket is not closed'}), 400

        ticket.status = 'open'
        ticket.closed_at = None

        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Ticket reopened successfully',
            'ticket': ticket.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error reopening ticket: {str(e)}")
        return jsonify({'success': False, 'error': 'Failed to reopen ticket'}), 500


@bp.route('/support/categories', methods=['GET'])
def get_support_categories():
    """Get list of available support categories"""
    return jsonify({
        'success': True,
        'categories': [
            {'value': 'technical', 'label': 'Technical Issue'},
            {'value': 'campaign', 'label': 'Campaign/Collaboration'},
            {'value': 'payment', 'label': 'Payment Issue'},
            {'value': 'messaging', 'label': 'Messaging'},
            {'value': 'account', 'label': 'Account Support'},
            {'value': 'inquiry', 'label': 'General Inquiry'},
            {'value': 'other', 'label': 'Other'}
        ]
    }), 200
