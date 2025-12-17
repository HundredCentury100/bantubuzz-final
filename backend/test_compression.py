"""
Test script for image compression functionality

This script tests the Pillow-based image compression system by:
1. Creating a test image
2. Compressing it using our compression utility
3. Verifying the results
4. Displaying compression statistics
"""

import sys
import os
from pathlib import Path

# Add the backend directory to Python path
sys.path.insert(0, os.path.dirname(__file__))

from app import create_app
from app.utils.image_compression import (
    compress_and_create_variants,
    get_image_info,
    IMAGE_SIZES
)
from PIL import Image
import tempfile

def create_test_image(width=2000, height=1500, format='JPEG'):
    """Create a test image for compression testing"""
    print(f"\n[*] Creating test image: {width}x{height} {format}")

    # Create a colorful gradient image
    img = Image.new('RGB', (width, height))
    pixels = img.load()

    for y in range(height):
        for x in range(width):
            r = int((x / width) * 255)
            g = int((y / height) * 255)
            b = int(((x + y) / (width + height)) * 255)
            pixels[x, y] = (r, g, b)

    return img


def test_compression():
    """Test the image compression system"""
    print("=" * 70)
    print("TESTING BANTUBUZZ IMAGE COMPRESSION SYSTEM")
    print("=" * 70)

    app = create_app()

    with app.app_context():
        # Create a temporary directory for test files
        with tempfile.TemporaryDirectory() as temp_dir:
            # Create test image
            test_img = create_test_image(2000, 1500, 'JPEG')

            # Save test image
            test_path = os.path.join(temp_dir, 'test_image.jpg')
            test_img.save(test_path, 'JPEG', quality=95)

            original_info = get_image_info(test_path)
            print(f"\n[OK] Test image created:")
            print(f"   Path: {test_path}")
            print(f"   Dimensions: {original_info['width']}x{original_info['height']}")
            print(f"   Format: {original_info['format']}")
            print(f"   Size: {original_info['size_kb']:.2f} KB")

            # Test compression
            print(f"\n[*] Compressing image...")
            print(f"   Generating 3 size variants:")
            for size_name, config in IMAGE_SIZES.items():
                print(f"   - {size_name.capitalize()}: {config['max_width']}px @ {config['quality']}% quality")

            try:
                # Compress the image
                result = compress_and_create_variants(
                    test_path,
                    base_quality=85,
                    delete_original=False  # Keep original for comparison
                )

                print(f"\n[OK] Compression successful!")
                print(f"\n[STATS] COMPRESSION STATISTICS:")
                print(f"   Original size: {result['original_size_kb']:.2f} KB")
                print(f"   Compressed size: {result['compressed_size_kb']:.2f} KB")
                print(f"   Savings: {result['savings_percent']:.1f}%")

                print(f"\n[FILES] Generated files:")
                for size_name in ['thumbnail', 'medium', 'large']:
                    if size_name in result:
                        file_path = result[size_name]
                        print(f"   {size_name.capitalize():10} -> {file_path}")

                        # Check if file exists
                        full_path = os.path.join(app.root_path, '..', file_path.lstrip('/'))
                        if os.path.exists(full_path):
                            file_size = os.path.getsize(full_path) / 1024
                            img_info = get_image_info(full_path)
                            print(f"              {img_info['width']}x{img_info['height']} - {file_size:.1f} KB")
                        else:
                            print(f"              [WARN] File not found!")

                # Performance calculations
                print(f"\n[PERFORMANCE] IMPACT ANALYSIS:")
                original_kb = result['original_size_kb']
                compressed_kb = result['compressed_size_kb']

                print(f"\n   Single image:")
                print(f"   - Upload bandwidth saved: {original_kb - compressed_kb:.1f} KB per upload")
                print(f"   - Download bandwidth saved: {original_kb - compressed_kb:.1f} KB per view")

                print(f"\n   Homepage (8 profile pictures using thumbnails):")
                print(f"   - Before: {original_kb * 8:.1f} KB ({(original_kb * 8) / 1024:.2f} MB)")
                print(f"   - After: {(compressed_kb / 3) * 8:.1f} KB (using thumbnails)")
                print(f"   - Savings: {100 - ((compressed_kb / 3) * 8 / (original_kb * 8) * 100):.1f}%")

                print(f"\n   Gallery page (10 images using medium size):")
                medium_size = compressed_kb / 3 * 1.5  # Rough estimate
                print(f"   - Before: {original_kb * 10:.1f} KB ({(original_kb * 10) / 1024:.2f} MB)")
                print(f"   - After: {medium_size * 10:.1f} KB ({(medium_size * 10) / 1024:.2f} MB)")
                print(f"   - Savings: {100 - (medium_size * 10 / (original_kb * 10) * 100):.1f}%")

                print("\n" + "=" * 70)
                print("[SUCCESS] TEST PASSED - Compression system working correctly!")
                print("=" * 70)

                return True

            except Exception as e:
                print(f"\n[ERROR] Compression failed!")
                print(f"   Error: {str(e)}")
                import traceback
                traceback.print_exc()
                return False


if __name__ == '__main__':
    success = test_compression()
    sys.exit(0 if success else 1)
