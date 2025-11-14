import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { creatorsAPI, BASE_URL } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import Navbar from '../components/Navbar';
import toast from 'react-hot-toast';

const CATEGORIES = [
  'Fashion & Beauty',
  'Lifestyle',
  'Tech & Gaming',
  'Food & Cooking',
  'Travel',
  'Fitness & Health',
  'Business & Finance',
  'Entertainment',
  'Education',
  'Art & Design'
];

const LANGUAGES = ['English', 'Shona', 'Ndebele', 'French', 'Portuguese'];

const CreatorProfileEdit = () => {
  const navigate = useNavigate();
  const { updateProfile: updateAuthProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const [profilePicture, setProfilePicture] = useState(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm();

  const selectedCategories = watch('categories') || [];
  const selectedLanguages = watch('languages') || [];

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await creatorsAPI.getOwnProfile();
      const data = response.data;
      setProfile(data);
      setProfilePicture(data.profile_picture);

      // Set form values
      setValue('bio', data.bio || '');
      setValue('location', data.location || '');
      setValue('portfolio_url', data.portfolio_url || '');
      setValue('follower_count', data.follower_count || 0);
      setValue('engagement_rate', data.engagement_rate || 0);
      setValue('categories', data.categories || []);
      setValue('languages', data.languages || []);
      setValue('availability_status', data.availability_status || 'available');
      setValue('success_stories', data.success_stories || '');

      // Social links
      setValue('instagram', data.social_links?.instagram || '');
      setValue('tiktok', data.social_links?.tiktok || '');
      setValue('youtube', data.social_links?.youtube || '');
      setValue('twitter', data.social_links?.twitter || '');

    } catch (err) {
      setError('Failed to load profile');
    } finally {
      setLoadingProfile(false);
    }
  };

  const toggleCategory = (category) => {
    const current = selectedCategories || [];
    const updated = current.includes(category)
      ? current.filter(c => c !== category)
      : [...current, category];
    setValue('categories', updated);
  };

  const toggleLanguage = (language) => {
    const current = selectedLanguages || [];
    const updated = current.includes(language)
      ? current.filter(l => l !== language)
      : [...current, language];
    setValue('languages', updated);
  };

  const handlePictureUpload = async (e) => {
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

    setUploadingPicture(true);
    try {
      const response = await creatorsAPI.uploadProfilePicture(file);
      setProfilePicture(response.data.profile_picture);
      toast.success('Profile picture uploaded successfully!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to upload profile picture');
    } finally {
      setUploadingPicture(false);
    }
  };

  const onSubmit = async (data) => {
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      // Build social links object
      const socialLinks = {
        instagram: data.instagram || '',
        tiktok: data.tiktok || '',
        youtube: data.youtube || '',
        twitter: data.twitter || ''
      };

      // Build update payload
      const payload = {
        bio: data.bio,
        location: data.location,
        portfolio_url: data.portfolio_url,
        follower_count: parseInt(data.follower_count) || 0,
        engagement_rate: parseFloat(data.engagement_rate) || 0,
        categories: data.categories || [],
        languages: data.languages || [],
        availability_status: data.availability_status,
        social_links: socialLinks,
        success_stories: data.success_stories
      };

      const response = await creatorsAPI.updateProfile(payload);

      // Update the profile in auth context
      updateAuthProfile(response.data.creator);

      setSuccess(true);

      // Redirect immediately with success message
      navigate('/creator/dashboard', { state: { profileUpdated: true } });

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
              to="/creator/dashboard"
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
            <h1 className="text-3xl font-bold text-dark mb-2">Edit Your Profile</h1>
            <p className="text-gray-600">Update your creator profile to attract more brands</p>
          </div>

          {/* Success Message */}
          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800 font-medium">Profile updated successfully! Redirecting...</p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* Profile Picture */}
            <div className="card">
              <h2 className="text-xl font-bold text-dark mb-4">Profile Picture</h2>

              <div className="flex items-center gap-6">
                {/* Profile Picture Preview */}
                <div className="relative">
                  {profilePicture ? (
                    <img
                      src={`${BASE_URL}${profilePicture}`}
                      alt="Profile"
                      className="w-32 h-32 rounded-full object-cover border-4 border-gray-200"
                    />
                  ) : (
                    <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center">
                      <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  )}
                  {uploadingPicture && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
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
                      onChange={handlePictureUpload}
                      className="hidden"
                      disabled={uploadingPicture}
                    />
                    <div className="px-6 py-3 bg-primary hover:bg-primary-dark text-dark font-medium rounded-lg transition-colors inline-block">
                      {uploadingPicture ? 'Uploading...' : 'Upload New Picture'}
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
              <h2 className="text-xl font-bold text-dark mb-4">Basic Information</h2>

              {/* Bio */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-dark mb-2">
                  Bio
                </label>
                <textarea
                  rows={4}
                  className="input"
                  placeholder="Tell brands about yourself..."
                  {...register('bio', {
                    required: 'Bio is required',
                    maxLength: {
                      value: 500,
                      message: 'Bio must be less than 500 characters'
                    }
                  })}
                />
                {errors.bio && (
                  <p className="mt-1 text-sm text-error">{errors.bio.message}</p>
                )}
              </div>

              {/* Location */}
              <div className="mb-6">
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

              {/* Portfolio URL */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-dark mb-2">
                  Portfolio/Website URL
                </label>
                <input
                  type="url"
                  className="input"
                  placeholder="https://your-portfolio.com"
                  {...register('portfolio_url')}
                />
              </div>

              {/* Availability Status */}
              <div>
                <label className="block text-sm font-medium text-dark mb-2">
                  Availability Status
                </label>
                <select
                  className="input"
                  {...register('availability_status')}
                >
                  <option value="available">Available for collaborations</option>
                  <option value="busy">Busy - Limited availability</option>
                  <option value="unavailable">Not available</option>
                </select>
              </div>
            </div>

            {/* Social Stats */}
            <div className="card">
              <h2 className="text-xl font-bold text-dark mb-4">Social Media Stats</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Follower Count */}
                <div>
                  <label className="block text-sm font-medium text-dark mb-2">
                    Total Followers
                  </label>
                  <input
                    type="number"
                    className="input"
                    placeholder="10000"
                    {...register('follower_count', {
                      min: { value: 0, message: 'Cannot be negative' }
                    })}
                  />
                  {errors.follower_count && (
                    <p className="mt-1 text-sm text-error">{errors.follower_count.message}</p>
                  )}
                </div>

                {/* Engagement Rate */}
                <div>
                  <label className="block text-sm font-medium text-dark mb-2">
                    Engagement Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    className="input"
                    placeholder="5.2"
                    {...register('engagement_rate', {
                      min: { value: 0, message: 'Cannot be negative' },
                      max: { value: 100, message: 'Cannot exceed 100%' }
                    })}
                  />
                  {errors.engagement_rate && (
                    <p className="mt-1 text-sm text-error">{errors.engagement_rate.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Social Links */}
            <div className="card">
              <h2 className="text-xl font-bold text-dark mb-4">Social Media Links</h2>

              <div className="space-y-4">
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

                {/* TikTok */}
                <div>
                  <label className="block text-sm font-medium text-dark mb-2">
                    TikTok
                  </label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                      @
                    </span>
                    <input
                      type="text"
                      className="input rounded-l-none"
                      placeholder="username"
                      {...register('tiktok')}
                    />
                  </div>
                </div>

                {/* YouTube */}
                <div>
                  <label className="block text-sm font-medium text-dark mb-2">
                    YouTube
                  </label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Channel URL"
                    {...register('youtube')}
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
              </div>
            </div>

            {/* Categories */}
            <div className="card">
              <h2 className="text-xl font-bold text-dark mb-4">Categories</h2>
              <p className="text-sm text-gray-600 mb-4">Select the categories that best describe your content</p>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {CATEGORIES.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => toggleCategory(category)}
                    className={`
                      px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all
                      ${selectedCategories.includes(category)
                        ? 'border-primary bg-primary text-dark'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-primary'
                      }
                    `}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            {/* Languages */}
            <div className="card">
              <h2 className="text-xl font-bold text-dark mb-4">Languages</h2>
              <p className="text-sm text-gray-600 mb-4">Select languages you create content in</p>

              <div className="flex flex-wrap gap-3">
                {LANGUAGES.map((language) => (
                  <button
                    key={language}
                    type="button"
                    onClick={() => toggleLanguage(language)}
                    className={`
                      px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all
                      ${selectedLanguages.includes(language)
                        ? 'border-primary bg-primary text-dark'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-primary'
                      }
                    `}
                  >
                    {language}
                  </button>
                ))}
              </div>
            </div>

            {/* Success Stories */}
            <div className="card">
              <h2 className="text-xl font-bold text-dark mb-4">Success Stories</h2>
              <p className="text-sm text-gray-600 mb-4">Share your past collaboration successes</p>

              <textarea
                rows={6}
                className="input"
                placeholder="Tell brands about successful campaigns you've run..."
                {...register('success_stories')}
              />
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
                onClick={() => navigate('/creator/dashboard')}
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

export default CreatorProfileEdit;
