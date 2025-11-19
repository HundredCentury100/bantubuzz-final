import os
import uuid
from werkzeug.utils import secure_filename
from flask import current_app

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}


def allowed_file(filename):
    """Check if file has allowed extension"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def save_profile_picture(file, folder='profiles'):
    """
    Save uploaded profile picture

    Args:
        file: FileStorage object from request.files
        folder: Subfolder within uploads directory

    Returns:
        str: Relative path to saved file (e.g., '/uploads/profiles/filename.png')

    Raises:
        ValueError: If file type is not allowed
    """
    if not file or file.filename == '':
        raise ValueError('No file provided')

    if not allowed_file(file.filename):
        raise ValueError('File type not allowed. Allowed types: png, jpg, jpeg, gif, webp')

    # Generate unique filename
    ext = file.filename.rsplit('.', 1)[1].lower()
    filename = f"{uuid.uuid4().hex}.{ext}"

    # Create upload directory if it doesn't exist
    upload_dir = os.path.join(current_app.root_path, '..', 'uploads', folder)
    os.makedirs(upload_dir, exist_ok=True)

    # Save file
    file_path = os.path.join(upload_dir, filename)
    file.save(file_path)

    # Return relative path for database storage
    return f'/uploads/{folder}/{filename}'


def delete_profile_picture(file_path):
    """
    Delete profile picture file

    Args:
        file_path: Relative path to file (e.g., '/uploads/profiles/filename.png')
    """
    try:
        if not file_path:
            return

        # Convert relative path to absolute path
        # Remove leading slash if present
        if file_path.startswith('/'):
            file_path = file_path[1:]

        abs_path = os.path.join(current_app.root_path, '..', file_path)

        if os.path.exists(abs_path):
            os.remove(abs_path)
    except Exception as e:
        print(f"Error deleting file {file_path}: {str(e)}")
