"""
Campaign Chat Models
Handles campaign-level messaging between brands and creators
"""
from app import db
from datetime import datetime
from sqlalchemy.dialects.postgresql import JSONB


class CampaignChat(db.Model):
    """Campaign chat conversation (broadcast or one-to-one)"""
    __tablename__ = 'campaign_chats'

    id = db.Column(db.Integer, primary_key=True)
    campaign_id = db.Column(db.Integer, db.ForeignKey('campaigns.id', ondelete='CASCADE'), nullable=False)
    chat_type = db.Column(db.String(20), nullable=False)  # 'broadcast' or 'one_to_one'
    title = db.Column(db.String(255))
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_message_at = db.Column(db.DateTime)
    last_message_preview = db.Column(db.Text)
    chat_metadata = db.Column(JSONB, default={})

    # Relationships
    campaign = db.relationship('Campaign', backref=db.backref('chats', lazy='dynamic', cascade='all, delete-orphan'))
    participants = db.relationship('CampaignChatParticipant', back_populates='chat', cascade='all, delete-orphan', lazy='dynamic')
    messages = db.relationship('CampaignChatMessage', back_populates='chat', cascade='all, delete-orphan', lazy='dynamic', order_by='CampaignChatMessage.created_at.desc()')

    def __repr__(self):
        return f'<CampaignChat {self.id} - {self.chat_type} - Campaign {self.campaign_id}>'

    @staticmethod
    def create_one_to_one_chat(campaign_id, brand_user_id, creator_user_id, collaboration_id):
        """
        Create or retrieve one-to-one chat between brand and creator
        Uses database function for atomic operation
        """
        try:
            # Call database function
            result = db.session.execute(
                db.text("""
                    SELECT create_one_to_one_chat(:campaign_id, :brand_user_id, :creator_user_id, :collaboration_id)
                """),
                {
                    'campaign_id': campaign_id,
                    'brand_user_id': brand_user_id,
                    'creator_user_id': creator_user_id,
                    'collaboration_id': collaboration_id
                }
            )
            chat_id = result.scalar()
            db.session.commit()

            return CampaignChat.query.get(chat_id)

        except Exception as e:
            db.session.rollback()
            print(f"Error creating one-to-one chat: {e}")
            raise

    @staticmethod
    def create_broadcast_chat(campaign_id, brand_user_id, title=None):
        """
        Create broadcast chat for all campaign collaborators
        Uses database function for atomic operation
        """
        try:
            # Call database function
            result = db.session.execute(
                db.text("""
                    SELECT create_broadcast_chat(:campaign_id, :brand_user_id, :title)
                """),
                {
                    'campaign_id': campaign_id,
                    'brand_user_id': brand_user_id,
                    'title': title or 'Campaign Group Chat'
                }
            )
            chat_id = result.scalar()
            db.session.commit()

            return CampaignChat.query.get(chat_id)

        except Exception as e:
            db.session.rollback()
            print(f"Error creating broadcast chat: {e}")
            raise

    def get_participant_for_user(self, user_id):
        """Get participant record for a specific user"""
        return self.participants.filter_by(user_id=user_id).first()

    def get_unread_count_for_user(self, user_id):
        """Get unread message count for a user"""
        participant = self.get_participant_for_user(user_id)
        return participant.unread_count if participant else 0

    def mark_as_read_for_user(self, user_id):
        """Mark all messages as read for a user"""
        participant = self.get_participant_for_user(user_id)
        if participant:
            participant.last_read_at = datetime.utcnow()
            participant.unread_count = 0
            db.session.commit()

    def to_dict(self, user_id=None):
        """Convert to dictionary"""
        data = {
            'id': self.id,
            'campaign_id': self.campaign_id,
            'campaign_title': self.campaign.title if self.campaign else None,
            'chat_type': self.chat_type,
            'title': self.title,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'last_message_at': self.last_message_at.isoformat() if self.last_message_at else None,
            'last_message_preview': self.last_message_preview,
            'participants_count': self.participants.count(),
            'messages_count': self.messages.count(),
            'metadata': self.chat_metadata or {}
        }

        # Add user-specific data if user_id provided
        if user_id:
            participant = self.get_participant_for_user(user_id)
            if participant:
                data['unread_count'] = participant.unread_count
                data['is_muted'] = participant.is_muted
                data['last_read_at'] = participant.last_read_at.isoformat() if participant.last_read_at else None

        return data


class CampaignChatParticipant(db.Model):
    """Participant in a campaign chat"""
    __tablename__ = 'campaign_chat_participants'

    id = db.Column(db.Integer, primary_key=True)
    chat_id = db.Column(db.Integer, db.ForeignKey('campaign_chats.id', ondelete='CASCADE'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    collaboration_id = db.Column(db.Integer, db.ForeignKey('collaborations.id', ondelete='SET NULL'))
    role = db.Column(db.String(20), nullable=False)  # 'brand' or 'creator'
    is_muted = db.Column(db.Boolean, default=False)
    last_read_at = db.Column(db.DateTime)
    unread_count = db.Column(db.Integer, default=0)
    joined_at = db.Column(db.DateTime, default=datetime.utcnow)
    left_at = db.Column(db.DateTime)
    participant_metadata = db.Column(JSONB, default={})

    # Relationships
    chat = db.relationship('CampaignChat', back_populates='participants')
    user = db.relationship('User', backref=db.backref('campaign_chat_participations', lazy='dynamic'))
    collaboration = db.relationship('Collaboration', backref=db.backref('chat_participations', lazy='dynamic'))

    # Unique constraint
    __table_args__ = (
        db.UniqueConstraint('chat_id', 'user_id', name='uq_chat_user'),
    )

    def __repr__(self):
        return f'<CampaignChatParticipant {self.id} - User {self.user_id} - Chat {self.chat_id}>'

    def to_dict(self):
        """Convert to dictionary"""
        user_data = {
            'id': self.user.id,
            'email': self.user.email,
            'user_type': self.user.user_type
        }

        # Add creator profile data if creator
        if self.user.user_type == 'creator' and hasattr(self.user, 'creator_profile') and self.user.creator_profile:
            user_data['display_name'] = self.user.creator_profile.display_name
            user_data['profile_picture'] = self.user.creator_profile.profile_picture
        elif self.user.user_type == 'brand' and hasattr(self.user, 'brand_profile') and self.user.brand_profile:
            user_data['company_name'] = self.user.brand_profile.company_name
            user_data['logo'] = self.user.brand_profile.logo

        return {
            'id': self.id,
            'chat_id': self.chat_id,
            'user_id': self.user_id,
            'user': user_data,
            'collaboration_id': self.collaboration_id,
            'role': self.role,
            'is_muted': self.is_muted,
            'last_read_at': self.last_read_at.isoformat() if self.last_read_at else None,
            'unread_count': self.unread_count,
            'joined_at': self.joined_at.isoformat() if self.joined_at else None,
            'left_at': self.left_at.isoformat() if self.left_at else None,
            'metadata': self.participant_metadata or {}
        }


class CampaignChatMessage(db.Model):
    """Message in a campaign chat"""
    __tablename__ = 'campaign_chat_messages'

    id = db.Column(db.Integer, primary_key=True)
    chat_id = db.Column(db.Integer, db.ForeignKey('campaign_chats.id', ondelete='CASCADE'), nullable=False)
    sender_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    sender_type = db.Column(db.String(20), nullable=False)  # 'brand' or 'creator'
    message_type = db.Column(db.String(20), default='text')  # 'text', 'image', 'file', 'system'
    content = db.Column(db.Text, nullable=False)
    attachments = db.Column(JSONB, default=[])
    is_edited = db.Column(db.Boolean, default=False)
    edited_at = db.Column(db.DateTime)
    is_deleted = db.Column(db.Boolean, default=False)
    deleted_at = db.Column(db.DateTime)
    read_by = db.Column(JSONB, default=[])  # Array of user_ids who have read
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    message_metadata = db.Column(JSONB, default={})

    # Relationships
    chat = db.relationship('CampaignChat', back_populates='messages')
    sender = db.relationship('User', backref=db.backref('campaign_chat_messages', lazy='dynamic'))

    def __repr__(self):
        return f'<CampaignChatMessage {self.id} - Chat {self.chat_id} - From User {self.sender_id}>'

    def mark_as_read_by(self, user_id):
        """Mark message as read by a user"""
        if not self.read_by:
            self.read_by = []

        if user_id not in self.read_by:
            self.read_by.append(user_id)
            db.session.commit()

    def edit_content(self, new_content):
        """Edit message content"""
        self.content = new_content
        self.is_edited = True
        self.edited_at = datetime.utcnow()
        db.session.commit()

    def soft_delete(self):
        """Soft delete message"""
        self.is_deleted = True
        self.deleted_at = datetime.utcnow()
        self.content = 'This message has been deleted'
        db.session.commit()

    def to_dict(self):
        """Convert to dictionary"""
        sender_data = {
            'id': self.sender.id,
            'email': self.sender.email,
            'user_type': self.sender.user_type
        }

        # Add sender profile data
        if self.sender.user_type == 'creator' and hasattr(self.sender, 'creator_profile') and self.sender.creator_profile:
            sender_data['display_name'] = self.sender.creator_profile.display_name
            sender_data['profile_picture'] = self.sender.creator_profile.profile_picture
        elif self.sender.user_type == 'brand' and hasattr(self.sender, 'brand_profile') and self.sender.brand_profile:
            sender_data['company_name'] = self.sender.brand_profile.company_name
            sender_data['logo'] = self.sender.brand_profile.logo

        return {
            'id': self.id,
            'chat_id': self.chat_id,
            'sender_id': self.sender_id,
            'sender': sender_data,
            'sender_type': self.sender_type,
            'message_type': self.message_type,
            'content': self.content,
            'attachments': self.attachments or [],
            'is_edited': self.is_edited,
            'edited_at': self.edited_at.isoformat() if self.edited_at else None,
            'is_deleted': self.is_deleted,
            'deleted_at': self.deleted_at.isoformat() if self.deleted_at else None,
            'read_by': self.read_by or [],
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'metadata': self.message_metadata or {}
        }
