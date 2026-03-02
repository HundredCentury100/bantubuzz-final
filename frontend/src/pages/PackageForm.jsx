import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { packagesAPI } from '../services/api';
import { PLATFORM_CONFIGS, PACKAGE_TYPES } from '../constants/platformConfig';

const COLLABORATION_TYPES = [
  'Brand Endorsement',
  'UGC (User Generated Content)',
  'Sponsored Post',
  'Product Review',
  'Social Media Takeover',
  'Event Hosting',
  'Affiliate Marketing',
  'Video Production',
  'Photography',
  'Content Creation',
  'Influencer Campaign',
  'Other'
];

const PackageForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [deliverables, setDeliverables] = useState(['']);
  const [packageData, setPackageData] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm();

  const selectedPlatformType = watch('platform_type');

  useEffect(() => {
    if (isEditMode) {
      fetchPackage();
    }
  }, [id]);

  const fetchPackage = async () => {
    try {
      setLoading(true);
      const response = await packagesAPI.getPackage(id);
      const pkg = response.data;
      setPackageData(pkg);

      // Set form values
      setValue('title', pkg.title);
      setValue('description', pkg.description);
      setValue('price', pkg.price);
      setValue('duration_days', pkg.duration_days);
      setValue('collaboration_type', pkg.collaboration_type || pkg.category); // Support both old and new
      setValue('platform_type', pkg.platform_type || '');
      setValue('content_type', pkg.content_type || '');
      setValue('is_active', pkg.is_active);

      // Set deliverables
      if (pkg.deliverables && pkg.deliverables.length > 0) {
        setDeliverables(pkg.deliverables);
      }
    } catch (error) {
      console.error('Error fetching package:', error);
      alert('Failed to load package');
      navigate('/creator/packages');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data) => {
    try {
      setLoading(true);

      // Filter out empty deliverables
      const validDeliverables = deliverables.filter(d => d.trim() !== '');

      const payload = {
        title: data.title,
        description: data.description,
        price: parseFloat(data.price),
        duration_days: parseInt(data.duration_days),
        collaboration_type: data.collaboration_type,
        platform_type: data.platform_type || null,
        content_type: data.content_type || null,
        deliverables: validDeliverables,
        is_active: data.is_active
      };

      if (isEditMode) {
        await packagesAPI.updatePackage(id, payload);
        alert('Package updated successfully!');
      } else {
        await packagesAPI.createPackage(payload);
        alert('Package created successfully!');
      }

      navigate('/creator/packages');
    } catch (error) {
      console.error('Error saving package:', error);
      alert(error.response?.data?.error || 'Failed to save package');
      // Scroll to top to show error
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setLoading(false);
    }
  };

  const onError = (errors) => {
    // Scroll to first error field
    const firstErrorField = Object.keys(errors)[0];
    const element = document.querySelector(`[name="${firstErrorField}"]`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.focus();
    }
  };

  const addDeliverable = () => {
    setDeliverables([...deliverables, '']);
  };

  const removeDeliverable = (index) => {
    const updated = deliverables.filter((_, idx) => idx !== index);
    setDeliverables(updated.length > 0 ? updated : ['']);
  };

  const updateDeliverable = (index, value) => {
    const updated = [...deliverables];
    updated[index] = value;
    setDeliverables(updated);
  };

  if (loading && isEditMode) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => navigate('/creator/packages')}
            className="text-gray-600 hover:text-gray-900 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Packages
          </button>
          <span className="text-gray-300">|</span>
          <Link
            to="/creator/dashboard"
            className="text-gray-600 hover:text-gray-900"
          >
            Back to Dashboard
          </Link>
        </div>
        <h1 className="text-3xl font-bold text-gray-900">
          {isEditMode ? 'Edit Package' : 'Create New Package'}
        </h1>
        <p className="text-gray-600 mt-1">
          {isEditMode
            ? 'Update your package details'
            : 'Create a service package for brands to book'}
        </p>
      </div>

      {/* Form Validation Summary */}
      {Object.keys(errors).length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-lg">
          <div className="flex items-start">
            <svg className="w-6 h-6 text-red-500 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <h3 className="text-red-800 font-semibold mb-1">Please fix the following errors:</h3>
              <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                {Object.entries(errors).map(([field, error]) => (
                  <li key={field}>{error.message}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit, onError)} className="space-y-6">
        {/* Package Title */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Package Title *
          </label>
          <input
            type="text"
            {...register('title', {
              required: 'Package title is required',
              minLength: { value: 3, message: 'Title must be at least 3 characters' }
            })}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 transition ${
              errors.title
                ? 'border-red-500 bg-red-50 focus:ring-red-500 focus:border-red-500'
                : 'border-gray-300 focus:ring-primary focus:border-transparent'
            }`}
            placeholder="e.g., Instagram Story Package - 3 Posts"
          />
          {errors.title && (
            <p className="mt-2 text-sm text-red-600 font-medium flex items-start gap-2">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>{errors.title.message}</span>
            </p>
          )}
        </div>

        {/* Description */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Description *
          </label>
          <textarea
            {...register('description', {
              required: 'Description is required',
              minLength: { value: 20, message: 'Description must be at least 20 characters' }
            })}
            rows={5}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 transition ${
              errors.description
                ? 'border-red-500 bg-red-50 focus:ring-red-500 focus:border-red-500'
                : 'border-gray-300 focus:ring-primary focus:border-transparent'
            }`}
            placeholder="Describe what this package includes, what brands can expect, and any specific requirements..."
          />
          {errors.description && (
            <p className="mt-2 text-sm text-red-600 font-medium flex items-start gap-2">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>{errors.description.message}</span>
            </p>
          )}
        </div>

        {/* Price and Duration */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Price */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Price (USD) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500">$</span>
                <input
                  type="number"
                  step="0.01"
                  {...register('price', {
                    required: 'Price is required',
                    min: { value: 1, message: 'Price must be at least $1' }
                  })}
                  className={`w-full pl-8 pr-4 py-2 border rounded-lg focus:ring-2 transition ${
                    errors.price
                      ? 'border-red-500 bg-red-50 focus:ring-red-500 focus:border-red-500'
                      : 'border-gray-300 focus:ring-primary focus:border-transparent'
                  }`}
                  placeholder="99.99"
                />
              </div>
              {errors.price && (
                <p className="mt-2 text-sm text-red-600 font-medium flex items-start gap-2">
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span>{errors.price.message}</span>
                </p>
              )}
            </div>

            {/* Duration */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Duration (Days) *
              </label>
              <input
                type="number"
                {...register('duration_days', {
                  required: 'Duration is required',
                  min: { value: 1, message: 'Duration must be at least 1 day' }
                })}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 transition ${
                  errors.duration_days
                    ? 'border-red-500 bg-red-50 focus:ring-red-500 focus:border-red-500'
                    : 'border-gray-300 focus:ring-primary focus:border-transparent'
                }`}
                placeholder="7"
              />
              {errors.duration_days && (
                <p className="mt-2 text-sm text-red-600 font-medium flex items-start gap-2">
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span>{errors.duration_days.message}</span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Collaboration Type */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Collaboration Type *
          </label>
          <select
            {...register('collaboration_type', { required: 'Collaboration type is required' })}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 transition ${
              errors.collaboration_type
                ? 'border-red-500 bg-red-50 focus:ring-red-500 focus:border-red-500'
                : 'border-gray-300 focus:ring-primary focus:border-transparent'
            }`}
          >
            <option value="">Select collaboration type</option>
            {COLLABORATION_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          {errors.collaboration_type && (
            <p className="mt-2 text-sm text-red-600 font-medium flex items-start gap-2">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>{errors.collaboration_type.message}</span>
            </p>
          )}
          <p className="mt-2 text-sm text-gray-500">
            Your niche/category can be set in your profile settings
          </p>
        </div>

        {/* Platform Type & Content Type */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Platform Type */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Platform Type
              </label>
              <select
                {...register('platform_type')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                onChange={(e) => {
                  setValue('platform_type', e.target.value);
                  setValue('content_type', ''); // Reset content type when platform changes
                }}
              >
                <option value="">Select platform (optional)</option>
                {PACKAGE_TYPES.map((platform) => {
                  const config = PLATFORM_CONFIGS[platform.value];
                  return (
                    <option key={platform.value} value={platform.value}>
                      {platform.label}
                    </option>
                  );
                })}
              </select>
              <p className="mt-2 text-sm text-gray-500">
                Choose the platform where content will be posted (or UGC for non-posted content)
              </p>
            </div>

            {/* Content Type */}
            {selectedPlatformType && PLATFORM_CONFIGS[selectedPlatformType] && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Content Type
                </label>
                <select
                  {...register('content_type')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">Select content type (optional)</option>
                  {PLATFORM_CONFIGS[selectedPlatformType].contentTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-sm text-gray-500">
                  Specify the type of content for this package
                </p>
              </div>
            )}
          </div>

          {/* Platform Preview Badge */}
          {selectedPlatformType && PLATFORM_CONFIGS[selectedPlatformType] && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-xs text-gray-600 mb-2">Preview:</p>
              <div className="flex items-center gap-2">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${PLATFORM_CONFIGS[selectedPlatformType].bgColor}`}>
                  <svg
                    className={`w-4 h-4 ${PLATFORM_CONFIGS[selectedPlatformType].color}`}
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    {PLATFORM_CONFIGS[selectedPlatformType].icon}
                  </svg>
                  <span className={`text-sm font-medium ${PLATFORM_CONFIGS[selectedPlatformType].color}`}>
                    {selectedPlatformType}
                  </span>
                </div>
                {watch('content_type') && (
                  <span className="text-sm text-gray-600">
                    • {watch('content_type')}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Deliverables */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <label className="block text-sm font-semibold text-gray-700">
              Deliverables
            </label>
            <button
              type="button"
              onClick={addDeliverable}
              className="text-primary hover:text-primary/80 font-medium text-sm flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Deliverable
            </button>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            List the specific deliverables included in this package
          </p>

          <div className="space-y-3">
            {deliverables.map((deliverable, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  value={deliverable}
                  onChange={(e) => updateDeliverable(index, e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder={`Deliverable ${index + 1}`}
                />
                {deliverables.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeDeliverable(index)}
                    className="px-3 py-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Status */}
        {isEditMode && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                {...register('is_active')}
                className="w-5 h-5 text-primary border-gray-300 rounded focus:ring-primary"
              />
              <div>
                <span className="text-sm font-semibold text-gray-700">
                  Active Package
                </span>
                <p className="text-sm text-gray-600">
                  Package is visible to brands and available for booking
                </p>
              </div>
            </label>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => navigate('/creator/packages')}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-900 px-6 py-3 rounded-lg font-semibold transition"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 bg-primary hover:bg-primary/90 text-gray-900 px-6 py-3 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? 'Saving...' : isEditMode ? 'Update Package' : 'Create Package'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PackageForm;
