from datetime import datetime
from app import db


class Category(db.Model):
    """
    Categories for campaigns and packages (e.g., Fashion, Beauty, Tech, Food)
    """
    __tablename__ = 'categories'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    slug = db.Column(db.String(100), unique=True, nullable=False)
    description = db.Column(db.Text)
    image = db.Column(db.String(255))  # Path to category image
    is_active = db.Column(db.Boolean, default=True)
    display_order = db.Column(db.Integer, default=0)  # For sorting categories
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    niches = db.relationship('Niche', backref='category', lazy='dynamic', cascade='all, delete-orphan')

    def to_dict(self, include_niches=False):
        """Convert category to dictionary"""
        data = {
            'id': self.id,
            'name': self.name,
            'slug': self.slug,
            'description': self.description,
            'image': self.image,
            'is_active': self.is_active,
            'display_order': self.display_order,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'niches_count': self.niches.count()
        }

        if include_niches:
            data['niches'] = [niche.to_dict() for niche in self.niches.filter_by(is_active=True).all()]

        return data

    def __repr__(self):
        return f'<Category {self.name}>'


class Niche(db.Model):
    """
    Subcategories/Niches within categories (e.g., Streetwear under Fashion)
    """
    __tablename__ = 'niches'

    id = db.Column(db.Integer, primary_key=True)
    category_id = db.Column(db.Integer, db.ForeignKey('categories.id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    slug = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    image = db.Column(db.String(255))  # Optional image for niche
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Unique constraint: name must be unique within a category
    __table_args__ = (
        db.UniqueConstraint('category_id', 'name', name='unique_category_niche'),
        db.UniqueConstraint('category_id', 'slug', name='unique_category_niche_slug'),
    )

    def to_dict(self, include_category=False):
        """Convert niche to dictionary"""
        data = {
            'id': self.id,
            'category_id': self.category_id,
            'name': self.name,
            'slug': self.slug,
            'description': self.description,
            'image': self.image,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

        if include_category and self.category:
            data['category'] = {
                'id': self.category.id,
                'name': self.category.name,
                'slug': self.category.slug
            }

        return data

    def __repr__(self):
        return f'<Niche {self.name}>'
