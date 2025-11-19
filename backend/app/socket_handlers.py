from flask_socketio import emit, join_room, leave_room
from flask_jwt_extended import decode_token
from app import socketio
from app.models import User


@socketio.on('connect')
def handle_connect(auth):
    """Handle client connection"""
    try:
        if auth and 'token' in auth:
            # Decode JWT token to get user_id
            token_data = decode_token(auth['token'])
            user_id = token_data['sub']

            # Join user-specific room for targeted notifications
            room = f'user_{user_id}'
            join_room(room)

            print(f'User {user_id} connected and joined room {room}')
            emit('connection_success', {'message': 'Connected to notification service', 'room': room})
        else:
            print('Client connected without authentication')

    except Exception as e:
        print(f'Connection error: {str(e)}')
        emit('connection_error', {'error': 'Authentication failed'})


@socketio.on('disconnect')
def handle_disconnect():
    """Handle client disconnection"""
    print('Client disconnected')


@socketio.on('join_notification_room')
def handle_join_room(data):
    """Allow user to explicitly join their notification room"""
    try:
        user_id = data.get('user_id')
        if user_id:
            room = f'user_{user_id}'
            join_room(room)
            emit('joined_room', {'room': room})
            print(f'User {user_id} joined notification room')
    except Exception as e:
        print(f'Error joining room: {str(e)}')


@socketio.on('leave_notification_room')
def handle_leave_room(data):
    """Allow user to leave their notification room"""
    try:
        user_id = data.get('user_id')
        if user_id:
            room = f'user_{user_id}'
            leave_room(room)
            emit('left_room', {'room': room})
            print(f'User {user_id} left notification room')
    except Exception as e:
        print(f'Error leaving room: {str(e)}')


@socketio.on('mark_notification_read')
def handle_mark_read(data):
    """Handle marking notification as read via Socket.IO"""
    try:
        notification_id = data.get('notification_id')
        user_id = data.get('user_id')

        from app.models import Notification
        from app import db

        notification = Notification.query.get(notification_id)
        if notification and notification.user_id == user_id:
            notification.is_read = True
            db.session.commit()

            # Broadcast to user's room
            emit('notification_marked_read', {'notification_id': notification_id}, room=f'user_{user_id}')

    except Exception as e:
        print(f'Error marking notification as read: {str(e)}')
        db.session.rollback()
