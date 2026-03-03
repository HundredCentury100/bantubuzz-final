"""
ThunziAI Account Model
Links BantuBuzz users to their ThunziAI accounts
"""
from app import db
from datetime import datetime


class ThunziAccount(db.Model):
    __tablename__ = 'thunzi_accounts'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), unique=True, nullable=False)
    thunzi_user_id = db.Column(db.Integer)  # ThunziAI user ID
    thunzi_company_id = db.Column(db.Integer)  # ThunziAI company ID
    thunzi_email = db.Column(db.String(255))  # Email used for ThunziAI account
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = db.relationship('User', backref='thunzi_account')

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'thunzi_user_id': self.thunzi_user_id,
            'thunzi_company_id': self.thunzi_company_id,
            'thunzi_email': self.thunzi_email,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

    def __repr__(self):
        return f'<ThunziAccount user_id={self.user_id} company_id={self.thunzi_company_id}>'
