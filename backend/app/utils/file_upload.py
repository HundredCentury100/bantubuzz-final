import os
import uuid
from werkzeug.utils import secure_filename
from flask import current_app

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def save_profile_picture(file, folder='profiles'):
    """
    Save uploaded profile picture and return the URL path

    Args:
        file: FileStorage object from request.files
        folder: Subfolder within uploads directory

    Returns:
        str: Relative path to saved file (e.g., '/uploads/profiles/uuid-filename.jpg')
        None: If file is invalid
    """
    if not file or file.filename == '':
        return None

    if not allowed_file(file.filename):
        raise ValueError(f'Invalid file type. Allowed types: {", ".join(ALLOWED_EXTENSIONS)}')

    # Generate unique filename
    filename = secure_filename(file.filename)
    ext = filename.rsplit('.', 1)[1].lower()
    unique_filename = f"{uuid.uuid4().hex}.{ext}"

    # Create uploads directory if it doesn't exist
    upload_folder = os.path.join(current_app.root_path, '..', 'uploads', folder)
    os.makedirs(upload_folder, exist_ok=True)

    # Save file
    file_path = os.path.join(upload_folder, unique_filename)
    file.save(file_path)

    # Return relative URL path
    return f"/uploads/{folder}/{unique_filename}"

def delete_profile_picture(file_path):
    """
    Delete a profile picture file

    Args:
        file_path: Relative path to file (e.g., '/uploads/profiles/filename.jpg')
    """
    if not file_path:
        return

    try:
        # Convert relative path to absolute path
        full_path = os.path.join(current_app.root_path, '..', file_path.lstrip('/'))
        if os.path.exists(full_path):
            os.remove(full_path)
    except Exception as e:
        current_app.logger.error(f"Error deleting file {file_path}: {str(e)}")
