import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { packagesAPI } from '../services/api';

const CATEGORIES = [
  'Social Media Marketing',
  'Content Creation',
  'UGC (User Generated Content)',
  'Brand Endorsement',
  'Event Hosting',
  'Product Review',
  'Sponsored Post',
  'Video Production',
  'Photography',
  'Influencer Campaign',
  'Affiliate Marketing',
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
      setValue('category', pkg.category);
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
        category: data.category,
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
    } finally {
      setLoading(false);
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

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="e.g., Instagram Story Package - 3 Posts"
          />
          {errors.title && (
            <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
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
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="Describe what this package includes, what brands can expect, and any specific requirements..."
          />
          {errors.description && (
            <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
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
                  className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="99.99"
                />
              </div>
              {errors.price && (
                <p className="mt-1 text-sm text-red-600">{errors.price.message}</p>
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="7"
              />
              {errors.duration_days && (
                <p className="mt-1 text-sm text-red-600">{errors.duration_days.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Category */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Category *
          </label>
          <select
            {...register('category', { required: 'Category is required' })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="">Select a category</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          {errors.category && (
            <p className="mt-1 text-sm text-red-600">{errors.category.message}</p>
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
