import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { brandsAPI, BASE_URL } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import Navbar from '../components/Navbar';
import toast from 'react-hot-toast';

const INDUSTRIES = [
  'Technology',
  'Fashion & Beauty',
  'Food & Beverage',
  'Health & Fitness',
  'Travel & Tourism',
  'Entertainment',
  'Finance',
  'Retail',
  'Real Estate',
  'Education',
  'Other'
];

const COMPANY_SIZES = ['1-10', '11-50', '51-200', '201-500', '500+'];

const BrandProfileEdit = () => {
  const navigate = useNavigate();
  const { updateProfile: updateAuthProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logo, setLogo] = useState(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await brandsAPI.getOwnProfile();
      const data = response.data;
      setProfile(data);
      setLogo(data.logo);

      // Set form values
      setValue('company_name', data.company_name || '');
      setValue('description', data.description || '');
      setValue('website', data.website || '');
      setValue('industry', data.industry || '');
      setValue('company_size', data.company_size || '');
      setValue('location', data.location || '');

      // Social links
      setValue('facebook', data.social_links?.facebook || '');
      setValue('twitter', data.social_links?.twitter || '');
      setValue('linkedin', data.social_links?.linkedin || '');
      setValue('instagram', data.social_links?.instagram || '');

    } catch (err) {
      setError('Failed to load profile');
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setUploadingLogo(true);
    try {
      const response = await brandsAPI.uploadLogo(file);
      setLogo(response.data.logo);
      toast.success('Logo uploaded successfully!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to upload logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const onSubmit = async (data) => {
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      // Build social links object
      const socialLinks = {
        facebook: data.facebook || '',
        twitter: data.twitter || '',
        linkedin: data.linkedin || '',
        instagram: data.instagram || ''
      };

      // Build update payload
      const payload = {
        company_name: data.company_name,
        description: data.description,
        website: data.website,
        industry: data.industry,
        company_size: data.company_size,
        location: data.location,
        social_links: socialLinks
      };

      const response = await brandsAPI.updateProfile(payload);

      // Update the profile in auth context
      updateAuthProfile(response.data.brand);

      setSuccess(true);

      // Redirect immediately with success message
      navigate('/brand/dashboard', { state: { profileUpdated: true } });

    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  if (loadingProfile) {
    return (
      <div className="min-h-screen bg-light">
        <Navbar />
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-light">
      <Navbar />

      <div className="container-custom section-padding">
        <div className="max-w-4xl mx-auto">
          {/* Navigation */}
          <div className="mb-6">
            <Link
              to="/brand/dashboard"
              className="text-gray-600 hover:text-gray-900 flex items-center gap-2 w-fit"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Dashboard
            </Link>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-dark mb-2">Edit Brand Profile</h1>
            <p className="text-gray-600">Update your company information</p>
          </div>

          {/* Success Message */}
          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-primary rounded-lg">
              <p className="text-primary-dark font-medium">Profile updated successfully! Redirecting...</p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-error">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* Company Logo */}
            <div className="card">
              <h2 className="text-xl font-bold text-dark mb-4">Company Logo</h2>

              <div className="flex items-center gap-6">
                {/* Logo Preview */}
                <div className="relative">
                  {logo ? (
                    <img
                      src={`${BASE_URL}${logo}`}
                      alt="Company Logo"
                      className="w-32 h-32 rounded-lg object-cover border-4 border-gray-200"
                    />
                  ) : (
                    <div className="w-32 h-32 rounded-lg bg-gray-200 flex items-center justify-center">
                      <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                  )}
                  {uploadingLogo && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                    </div>
                  )}
                </div>

                {/* Upload Button */}
                <div className="flex-1">
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                      disabled={uploadingLogo}
                    />
                    <div className="px-6 py-3 bg-primary hover:bg-primary-dark text-dark font-medium rounded-lg transition-colors inline-block">
                      {uploadingLogo ? 'Uploading...' : 'Upload New Logo'}
                    </div>
                  </label>
                  <p className="text-sm text-gray-600 mt-2">
                    JPG, PNG or GIF (max. 5MB)
                  </p>
                </div>
              </div>
            </div>

            {/* Basic Info */}
            <div className="card">
              <h2 className="text-xl font-bold text-dark mb-4">Company Information</h2>

              {/* Company Name */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-dark mb-2">
                  Company Name *
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="Your Company Name"
                  {...register('company_name', {
                    required: 'Company name is required'
                  })}
                />
                {errors.company_name && (
                  <p className="mt-1 text-sm text-error">{errors.company_name.message}</p>
                )}
              </div>

              {/* Description */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-dark mb-2">
                  Company Description
                </label>
                <textarea
                  rows={4}
                  className="input"
                  placeholder="Tell creators about your company..."
                  {...register('description')}
                />
              </div>

              {/* Website */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-dark mb-2">
                  Website
                </label>
                <input
                  type="url"
                  className="input"
                  placeholder="https://yourcompany.com"
                  {...register('website')}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Industry */}
                <div>
                  <label className="block text-sm font-medium text-dark mb-2">
                    Industry
                  </label>
                  <select
                    className="input"
                    {...register('industry')}
                  >
                    <option value="">Select industry</option>
                    {INDUSTRIES.map((industry) => (
                      <option key={industry} value={industry}>
                        {industry}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Company Size */}
                <div>
                  <label className="block text-sm font-medium text-dark mb-2">
                    Company Size
                  </label>
                  <select
                    className="input"
                    {...register('company_size')}
                  >
                    <option value="">Select size</option>
                    {COMPANY_SIZES.map((size) => (
                      <option key={size} value={size}>
                        {size} employees
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Location */}
              <div className="mt-6">
                <label className="block text-sm font-medium text-dark mb-2">
                  Location
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="Harare, Zimbabwe"
                  {...register('location')}
                />
              </div>
            </div>

            {/* Social Media */}
            <div className="card">
              <h2 className="text-xl font-bold text-dark mb-4">Social Media</h2>

              <div className="space-y-4">
                {/* Facebook */}
                <div>
                  <label className="block text-sm font-medium text-dark mb-2">
                    Facebook
                  </label>
                  <input
                    type="url"
                    className="input"
                    placeholder="https://facebook.com/yourcompany"
                    {...register('facebook')}
                  />
                </div>

                {/* Twitter */}
                <div>
                  <label className="block text-sm font-medium text-dark mb-2">
                    Twitter/X
                  </label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                      @
                    </span>
                    <input
                      type="text"
                      className="input rounded-l-none"
                      placeholder="username"
                      {...register('twitter')}
                    />
                  </div>
                </div>

                {/* LinkedIn */}
                <div>
                  <label className="block text-sm font-medium text-dark mb-2">
                    LinkedIn
                  </label>
                  <input
                    type="url"
                    className="input"
                    placeholder="https://linkedin.com/company/yourcompany"
                    {...register('linkedin')}
                  />
                </div>

                {/* Instagram */}
                <div>
                  <label className="block text-sm font-medium text-dark mb-2">
                    Instagram
                  </label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                      @
                    </span>
                    <input
                      type="text"
                      className="input rounded-l-none"
                      placeholder="username"
                      {...register('instagram')}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary flex-1"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-dark mr-2"></div>
                    Saving...
                  </div>
                ) : (
                  'Save Profile'
                )}
              </button>

              <button
                type="button"
                onClick={() => navigate('/brand/dashboard')}
                className="btn btn-secondary"
                disabled={loading}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BrandProfileEdit;
