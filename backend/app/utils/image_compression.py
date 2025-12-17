"""
Image Compression Utility for BantuBuzz Platform

This module provides image compression and optimization functionality using Pillow.
It creates multiple size variants (thumbnail, medium, large) optimized for different use cases.

Features:
- Automatic WebP conversion for maximum compression
- Multiple size variants for responsive loading
- Aspect ratio preservation
- PNG transparency handling
- Quality optimization
- Automatic cleanup of original files
"""

import os
from pathlib import Path
from PIL import Image
from flask import current_app
from typing import Dict, Tuple, Optional
import logging

# Configure logging
logger = logging.getLogger(__name__)

# Image size configurations
IMAGE_SIZES = {
    'thumbnail': {
        'max_width': 150,
        'quality': 85,
        'description': 'Small avatars, list views, cards'
    },
    'medium': {
        'max_width': 600,
        'quality': 85,
        'description': 'Gallery previews, profile views'
    },
    'large': {
        'max_width': 1920,
        'quality': 85,
        'description': 'Full-size display, lightbox views'
    }
}

# WebP compression method (0-6, higher = better compression but slower)
WEBP_METHOD = 6


def get_file_size_kb(file_path: str) -> float:
    """Get file size in KB"""
    try:
        return os.path.getsize(file_path) / 1024
    except Exception:
        return 0.0


def calculate_new_dimensions(original_width: int, original_height: int, max_width: int) -> Tuple[int, int]:
    """
    Calculate new dimensions maintaining aspect ratio

    Args:
        original_width: Original image width
        original_height: Original image height
        max_width: Maximum desired width

    Returns:
        Tuple of (new_width, new_height)
    """
    if original_width <= max_width:
        return original_width, original_height

    aspect_ratio = original_height / original_width
    new_width = max_width
    new_height = int(max_width * aspect_ratio)

    return new_width, new_height


def compress_and_create_variants(
    original_path: str,
    base_quality: int = 85,
    delete_original: bool = True
) -> Dict[str, str]:
    """
    Compress image and create multiple size variants in WebP format

    Args:
        original_path: Absolute path to the uploaded image file
        base_quality: Base quality for WebP compression (1-100, default 85)
        delete_original: Whether to delete the original file after compression

    Returns:
        Dictionary with paths to all generated variants:
        {
            'thumbnail': '/uploads/path/xxx_thumbnail.webp',
            'medium': '/uploads/path/xxx_medium.webp',
            'large': '/uploads/path/xxx_large.webp',
            'original_size_kb': 4800.0,
            'compressed_size_kb': 345.0,
            'savings_percent': 93.0
        }

    Raises:
        ValueError: If image file is invalid or cannot be processed
        FileNotFoundError: If original file doesn't exist
    """
    try:
        # Verify file exists
        if not os.path.exists(original_path):
            raise FileNotFoundError(f"Image file not found: {original_path}")

        # Get original file size for statistics
        original_size_kb = get_file_size_kb(original_path)

        # Open and validate image
        try:
            img = Image.open(original_path)
            img.verify()  # Verify it's a valid image
            img = Image.open(original_path)  # Re-open after verify
        except Exception as e:
            logger.error(f"Invalid image file {original_path}: {str(e)}")
            raise ValueError(f"Invalid image file: {str(e)}")

        # Convert RGBA/LA/P to RGB for WebP/JPEG compatibility
        if img.mode in ('RGBA', 'LA', 'P'):
            # Create white background for transparency
            background = Image.new('RGB', img.size, (255, 255, 255))
            if img.mode == 'P':
                img = img.convert('RGBA')
            background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
            img = background
        elif img.mode != 'RGB':
            img = img.convert('RGB')

        # Get original dimensions
        original_width, original_height = img.size

        # Setup paths
        path_obj = Path(original_path)
        base_name = path_obj.stem  # Filename without extension
        upload_dir = path_obj.parent

        # Get relative path for database storage
        # Convert absolute path to relative /uploads/... path
        try:
            # Find the 'uploads' directory in the path
            path_parts = upload_dir.parts
            uploads_index = path_parts.index('uploads')
            relative_dir = '/'.join(path_parts[uploads_index:])
        except (ValueError, AttributeError):
            # Fallback: use the directory name
            relative_dir = str(upload_dir).replace('\\', '/').split('uploads/')[-1]
            if not relative_dir.startswith('uploads/'):
                relative_dir = 'uploads/' + relative_dir

        # Create variants
        variants = {}
        total_compressed_size = 0.0

        for size_name, config in IMAGE_SIZES.items():
            max_width = config['max_width']
            quality = config['quality']

            # Calculate new dimensions
            new_width, new_height = calculate_new_dimensions(
                original_width, original_height, max_width
            )

            # Resize image if needed
            if new_width != original_width or new_height != original_height:
                resized_img = img.resize((new_width, new_height), Image.LANCZOS)
            else:
                resized_img = img.copy()

            # Generate WebP filename
            webp_filename = f"{base_name}_{size_name}.webp"
            webp_path = upload_dir / webp_filename

            # Save as WebP with optimization
            resized_img.save(
                webp_path,
                'WEBP',
                quality=quality,
                method=WEBP_METHOD,
                optimize=True
            )

            # Track size
            total_compressed_size += get_file_size_kb(str(webp_path))

            # Store relative path for database
            relative_path = f"/{relative_dir}/{webp_filename}".replace('\\', '/')
            variants[size_name] = relative_path

            logger.info(
                f"Created {size_name} variant: {new_width}x{new_height} "
                f"at {webp_path} ({get_file_size_kb(str(webp_path)):.1f} KB)"
            )

        # Calculate savings
        savings_percent = ((original_size_kb - total_compressed_size) / original_size_kb * 100) if original_size_kb > 0 else 0

        # Add statistics to return value
        variants['original_size_kb'] = round(original_size_kb, 2)
        variants['compressed_size_kb'] = round(total_compressed_size, 2)
        variants['savings_percent'] = round(savings_percent, 2)

        logger.info(
            f"Compression complete: {original_size_kb:.1f} KB → {total_compressed_size:.1f} KB "
            f"({savings_percent:.1f}% savings)"
        )

        # Delete original file if requested
        if delete_original:
            try:
                os.remove(original_path)
                logger.info(f"Deleted original file: {original_path}")
            except Exception as e:
                logger.warning(f"Could not delete original file {original_path}: {str(e)}")

        return variants

    except Exception as e:
        logger.error(f"Error compressing image {original_path}: {str(e)}")
        raise


def delete_image_variants(variants: Dict[str, str], app_root: Optional[str] = None) -> None:
    """
    Delete all image variant files

    Args:
        variants: Dictionary with image paths (from compress_and_create_variants)
        app_root: Application root path (uses current_app if not provided)
    """
    if app_root is None:
        app_root = current_app.root_path

    for size_name in ['thumbnail', 'medium', 'large']:
        if size_name in variants and variants[size_name]:
            try:
                # Convert relative path to absolute
                relative_path = variants[size_name].lstrip('/')
                absolute_path = os.path.join(app_root, '..', relative_path)

                if os.path.exists(absolute_path):
                    os.remove(absolute_path)
                    logger.info(f"Deleted {size_name} variant: {absolute_path}")
            except Exception as e:
                logger.warning(f"Could not delete {size_name} variant: {str(e)}")


def get_image_info(file_path: str) -> Dict[str, any]:
    """
    Get information about an image file

    Args:
        file_path: Path to image file

    Returns:
        Dictionary with image information (width, height, format, size, etc.)
    """
    try:
        img = Image.open(file_path)
        return {
            'width': img.width,
            'height': img.height,
            'format': img.format,
            'mode': img.mode,
            'size_kb': get_file_size_kb(file_path),
            'aspect_ratio': round(img.width / img.height, 2) if img.height > 0 else 0
        }
    except Exception as e:
        logger.error(f"Error getting image info for {file_path}: {str(e)}")
        return {}
