import os
import uuid
from werkzeug.utils import secure_filename
from flask import current_app
from app.utils.image_compression import compress_and_create_variants, delete_image_variants

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


def save_and_compress_image(file, folder='profiles', quality=85):
    """
    Save uploaded image, compress it, and create multiple size variants

    This function:
    1. Validates the file
    2. Saves it temporarily
    3. Compresses and creates multiple sizes (thumbnail, medium, large)
    4. Deletes the original
    5. Returns paths to all variants

    Args:
        file: FileStorage object from request.files
        folder: Subfolder within uploads directory
        quality: Compression quality (1-100, default 85)

    Returns:
        dict: {
            'thumbnail': '/uploads/path/xxx_thumbnail.webp',
            'medium': '/uploads/path/xxx_medium.webp',
            'large': '/uploads/path/xxx_large.webp',
            'original_size_kb': 4800.0,
            'compressed_size_kb': 345.0,
            'savings_percent': 93.0
        }

    Raises:
        ValueError: If file is invalid or compression fails
    """
    if not file or file.filename == '':
        raise ValueError('No file provided')

    if not allowed_file(file.filename):
        raise ValueError(f'Invalid file type. Allowed types: {", ".join(ALLOWED_EXTENSIONS)}')

    # Generate unique filename
    filename = secure_filename(file.filename)
    ext = filename.rsplit('.', 1)[1].lower()
    unique_filename = f"{uuid.uuid4().hex}.{ext}"

    # Create uploads directory if it doesn't exist
    upload_folder = os.path.join(current_app.root_path, '..', 'uploads', folder)
    os.makedirs(upload_folder, exist_ok=True)

    # Save file temporarily
    temp_file_path = os.path.join(upload_folder, unique_filename)
    file.save(temp_file_path)

    try:
        # Compress and create variants
        variants = compress_and_create_variants(
            temp_file_path,
            base_quality=quality,
            delete_original=True
        )

        current_app.logger.info(
            f"Image compressed: {variants.get('original_size_kb', 0):.1f} KB → "
            f"{variants.get('compressed_size_kb', 0):.1f} KB "
            f"({variants.get('savings_percent', 0):.1f}% savings)"
        )

        return variants

    except Exception as e:
        # If compression fails, delete the temporary file
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)
        raise ValueError(f"Image compression failed: {str(e)}")
