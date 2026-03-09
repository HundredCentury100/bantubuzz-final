"""
Message Risk Signals model for BantuBuzz Trust & Safety system
"""
from datetime import datetime, date
from app import db


class MessageRiskSignal(db.Model):
    """Model for tracking user messaging risk signals"""
    __tablename__ = 'message_risk_signals'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, unique=True)

    # Risk Signals
    blocks_received_count = db.Column(db.Integer, default=0, nullable=False)
    harassment_reports_count = db.Column(db.Integer, default=0, nullable=False)
    contact_sharing_attempts_count = db.Column(db.Integer, default=0, nullable=False)
    flagged_messages_count = db.Column(db.Integer, default=0, nullable=False)
    false_reports_count = db.Column(db.Integer, default=0, nullable=False)

    # Risk Score (calculated)
    risk_score = db.Column(db.Integer, default=0, nullable=False)
    risk_level = db.Column(db.String(20), default='low', nullable=False)

    # Tracking Period
    tracking_period_start = db.Column(db.Date, default=date.today, nullable=False)
    last_signal_detected_at = db.Column(db.DateTime, nullable=True)

    # Metadata
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationship
    user = db.relationship('User', backref='risk_signals')

    def calculate_risk_score(self):
        """
        Calculate risk score based on signals

        Formula:
        (blocks_received_count * 10) +
        (harassment_reports_count * 15) +
        (contact_sharing_attempts_count * 5) +
        (flagged_messages_count * 8) -
        (false_reports_count * 5)

        Risk Levels:
        - 0-20: Low (green)
        - 21-50: Medium (yellow)
        - 51-80: High (orange)
        - 81+: Critical (red)
        """
        score = (
            (self.blocks_received_count * 10) +
            (self.harassment_reports_count * 15) +
            (self.contact_sharing_attempts_count * 5) +
            (self.flagged_messages_count * 8) -
            (self.false_reports_count * 5)
        )

        # Ensure score is not negative
        score = max(0, score)

        # Determine risk level
        if score <= 20:
            level = 'low'
        elif score <= 50:
            level = 'medium'
        elif score <= 80:
            level = 'high'
        else:
            level = 'critical'

        self.risk_score = score
        self.risk_level = level

        return score, level

    def increment_signal(self, signal_type):
        """Increment a specific signal and recalculate risk"""
        if signal_type == 'blocks_received':
            self.blocks_received_count += 1
        elif signal_type == 'harassment_reports':
            self.harassment_reports_count += 1
        elif signal_type == 'contact_sharing':
            self.contact_sharing_attempts_count += 1
        elif signal_type == 'flagged_messages':
            self.flagged_messages_count += 1
        elif signal_type == 'false_reports':
            self.false_reports_count += 1

        self.last_signal_detected_at = datetime.utcnow()
        self.calculate_risk_score()
        self.updated_at = datetime.utcnow()

    def to_dict(self):
        """Convert risk signals to dictionary"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'blocks_received_count': self.blocks_received_count,
            'harassment_reports_count': self.harassment_reports_count,
            'contact_sharing_attempts_count': self.contact_sharing_attempts_count,
            'flagged_messages_count': self.flagged_messages_count,
            'false_reports_count': self.false_reports_count,
            'risk_score': self.risk_score,
            'risk_level': self.risk_level,
            'tracking_period_start': self.tracking_period_start.isoformat() if self.tracking_period_start else None,
            'last_signal_detected_at': self.last_signal_detected_at.isoformat() if self.last_signal_detected_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

    @staticmethod
    def get_or_create(user_id):
        """Get existing risk signals or create new"""
        signals = MessageRiskSignal.query.filter_by(user_id=user_id).first()
        if not signals:
            signals = MessageRiskSignal(user_id=user_id)
            db.session.add(signals)
            db.session.flush()
        return signals

    def __repr__(self):
        return f'<MessageRiskSignal user={self.user_id} score={self.risk_score} level={self.risk_level}>'
