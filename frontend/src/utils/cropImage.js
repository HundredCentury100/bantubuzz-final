/**
 * Crop image utility
 * Creates a cropped image blob from canvas
 */

/**
 * Create a cropped image from the provided image and crop area
 * @param {string} imageSrc - Source URL of the image
 * @param {Object} pixelCrop - Pixel coordinates for cropping
 * @param {number} pixelCrop.x - X coordinate
 * @param {number} pixelCrop.y - Y coordinate
 * @param {number} pixelCrop.width - Width of crop area
 * @param {number} pixelCrop.height - Height of crop area
 * @returns {Promise<Blob>} - Cropped image as a blob
 */
export const createCroppedImage = (imageSrc, pixelCrop) => {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous'; // Handle CORS issues
    image.src = imageSrc;

    image.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      // Set canvas dimensions to the crop area
      canvas.width = pixelCrop.width;
      canvas.height = pixelCrop.height;

      // Draw the cropped image
      ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height
      );

      // Convert canvas to blob
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Failed to create blob from canvas'));
          return;
        }
        resolve(blob);
      }, 'image/jpeg', 0.95); // High quality JPEG
    };

    image.onerror = () => {
      reject(new Error('Failed to load image'));
    };
  });
};
