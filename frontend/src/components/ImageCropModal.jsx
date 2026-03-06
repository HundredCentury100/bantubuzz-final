/**
 * Image Crop Modal Component
 * Allows users to crop images before uploading
 */
import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { X } from 'lucide-react';

const ImageCropModal = ({ image, onCropComplete, onCancel, aspectRatio = 1, cropShape = 'round' }) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const onCropCompleteCallback = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = () => {
    if (croppedAreaPixels) {
      onCropComplete(croppedAreaPixels);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
      <div className="bg-white rounded-2xl w-full max-w-2xl mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-dark">Crop Image</h2>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} className="text-gray-600" />
          </button>
        </div>

        {/* Crop Area */}
        <div className="relative w-full h-96 bg-gray-900">
          <Cropper
            image={image}
            crop={crop}
            zoom={zoom}
            aspect={aspectRatio}
            cropShape={cropShape}
            showGrid={true}
            onCropChange={setCrop}
            onCropComplete={onCropCompleteCallback}
            onZoomChange={setZoom}
          />
        </div>

        {/* Controls */}
        <div className="p-4 border-t border-gray-200">
          {/* Zoom Control */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Zoom
            </label>
            <input
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Instructions */}
          <p className="text-sm text-gray-600 mb-4">
            Drag to reposition • Scroll or use slider to zoom
          </p>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              className="flex-1 px-4 py-2 bg-primary hover:bg-primary-dark text-dark font-medium rounded-lg transition-colors"
            >
              Crop & Upload
            </button>
            <button
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageCropModal;
