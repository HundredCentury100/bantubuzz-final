import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { creatorsAPI, BASE_URL } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import Navbar from '../components/Navbar';
import toast from 'react-hot-toast';
import { PLATFORMS, ZIMBABWE_LANGUAGES, COUNTRIES } from '../constants/options';
import axios from 'axios';
import ImageCropModal from '../components/ImageCropModal';
import ProfilePreviewModal from '../components/ProfilePreviewModal';
import { createCroppedImage } from '../utils/cropImage';

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
  const [gallery, setGallery] = useState([]);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [deletingGalleryIndex, setDeletingGalleryIndex] = useState(null);
  const [categories, setCategories] = useState([]);
  const [showCropModal, setShowCropModal] = useState(false);
  const [imageToCrop, setImageToCrop] = useState(null);
  const [originalFileName, setOriginalFileName] = useState('');
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm();

  const selectedCategories = watch('categories') || [];
  const selectedLanguages = watch('languages') || [];
  const selectedPlatforms = watch('platforms') || [];
  const bioText = watch('bio') || '';

  useEffect(() => {
    fetchProfile();
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/categories`);
      // Extract category names from the response
      const categoryNames = response.data.categories.map(cat => cat.name);
      setCategories(categoryNames);
    } catch (err) {
      console.error('Failed to load categories:', err);
      // Fallback to empty array if categories fail to load
      setCategories([]);
    }
  };

  const fetchProfile = async () => {
    try {
      const response = await creatorsAPI.getOwnProfile();
      const data = response.data;
      setProfile(data);
      setProfilePicture(data.profile_picture);

      // Handle both old (array of strings) and new (array of objects) gallery formats
      const galleryData = data.gallery_images || data.gallery || [];
      const galleryPaths = galleryData.map(item =>
        typeof item === 'string' ? item : item.medium || item.large || item.thumbnail
      );
      setGallery(galleryPaths);

      // Set form values
      setValue('username', data.username || '');
      setValue('bio', data.bio || '');
      setValue('location', data.location || '');
      setValue('city', data.city || '');
      setValue('country', data.country || 'ZW');
      setValue('portfolio_url', data.portfolio_url || '');
      setValue('follower_count', data.follower_count || 0);
      setValue('categories', data.categories || []);
      setValue('languages', data.languages || []);
      setValue('platforms', data.platforms || []);
      setValue('availability_status', data.availability_status || 'available');
      setValue('success_stories', data.success_stories || '');

      // Social links
      setValue('instagram', data.social_links?.instagram || '');
      setValue('tiktok', data.social_links?.tiktok || '');
      setValue('youtube', data.social_links?.youtube || '');
      setValue('twitter', data.social_links?.twitter || '');

      // Revision settings
      setValue('free_revisions', data.free_revisions !== undefined ? data.free_revisions : 2);
      setValue('revision_fee', data.revision_fee || 0);

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

  const togglePlatform = (platform) => {
    const current = selectedPlatforms || [];
    const updated = current.includes(platform)
      ? current.filter(p => p !== platform)
      : [...current, platform];
    setValue('platforms', updated);
  };

  const handlePictureSelect = async (e) => {
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

    // Store the file name for later use
    setOriginalFileName(file.name);

    // Create a URL for the image to show in crop modal
    const reader = new FileReader();
    reader.onload = () => {
      setImageToCrop(reader.result);
      setShowCropModal(true);
    };
    reader.readAsDataURL(file);

    // Reset the file input so the same file can be selected again if needed
    e.target.value = '';
  };

  const handleCropComplete = async (croppedAreaPixels) => {
    try {
      setShowCropModal(false);
      setUploadingPicture(true);

      // Create cropped image blob
      const croppedBlob = await createCroppedImage(imageToCrop, croppedAreaPixels);

      // Create a File object from the blob
      const croppedFile = new File([croppedBlob], originalFileName, {
        type: 'image/jpeg',
        lastModified: Date.now()
      });

      // Upload the cropped image
      const response = await creatorsAPI.uploadProfilePicture(croppedFile);

      // Add timestamp to force browser cache refresh
      const picturePath = response.data.profile_picture;
      setProfilePicture(`${picturePath}?t=${Date.now()}`);
      toast.success('Profile picture updated!');

      // Clear crop modal data
      setImageToCrop(null);
      setOriginalFileName('');
    } catch (err) {
      console.error('Error uploading cropped image:', err);
      toast.error(err.response?.data?.error || 'Failed to upload profile picture');
    } finally {
      setUploadingPicture(false);
    }
  };

  const handleCropCancel = () => {
    setShowCropModal(false);
    setImageToCrop(null);
    setOriginalFileName('');
  };

  const handleGalleryUpload = async (e) => {
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

    setUploadingGallery(true);
    try {
      const response = await creatorsAPI.uploadGalleryImage(file);

      // Backend returns gallery_images (new format) with objects containing sizes
      // Extract the medium size for display compatibility
      const galleryImages = response.data.gallery_images || [];
      const galleryPaths = galleryImages.map(item =>
        typeof item === 'string' ? item : item.medium || item.large || item.thumbnail
      );
      setGallery(galleryPaths);

      toast.success('Portfolio image added successfully!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to upload portfolio image');
    } finally {
      setUploadingGallery(false);
      // Reset the file input
      e.target.value = '';
    }
  };

  const handleDeleteGalleryImage = async (index) => {
    setDeletingGalleryIndex(index);
    try {
      const response = await creatorsAPI.deleteGalleryImage(index);

      // Backend returns both gallery and gallery_images
      // Convert gallery_images to paths for display
      const galleryImages = response.data.gallery_images || response.data.gallery || [];
      const galleryPaths = galleryImages.map(item =>
        typeof item === 'string' ? item : item.medium || item.large || item.thumbnail
      );
      setGallery(galleryPaths);

      toast.success('Portfolio image removed successfully!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to remove portfolio image');
    } finally {
      setDeletingGalleryIndex(null);
    }
  };

  const onSubmit = async (data) => {
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      // Validate categories
      if (!data.categories || data.categories.length === 0) {
        setError('Please select at least one category');
        setLoading(false);
        return;
      }

      // Validate platforms
      if (!data.platforms || data.platforms.length === 0) {
        setError('Please select at least one platform');
        setLoading(false);
        return;
      }

      // Build social links object
      const socialLinks = {
        instagram: data.instagram || '',
        tiktok: data.tiktok || '',
        youtube: data.youtube || '',
        twitter: data.twitter || ''
      };

      // Build update payload
      const payload = {
        username: data.username || null,
        bio: data.bio,
        location: data.location,
        city: data.city,
        country: data.country,
        portfolio_url: data.portfolio_url,
        follower_count: parseInt(data.follower_count) || 0,
        categories: data.categories || [],
        languages: data.languages || [],
        platforms: data.platforms || [],
        availability_status: data.availability_status,
        social_links: socialLinks,
        success_stories: data.success_stories,
        free_revisions: parseInt(data.free_revisions) >= 0 ? parseInt(data.free_revisions) : 2,
        revision_fee: parseFloat(data.revision_fee) || 0
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
          <div className="mb-8 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-dark mb-2">Edit Your Profile</h1>
              <p className="text-gray-600">Update your creator profile to attract more brands</p>
            </div>
            <button
              type="button"
              onClick={() => setShowPreviewModal(true)}
              className="px-6 py-3 bg-white border-2 border-primary text-primary hover:bg-primary hover:text-dark font-medium rounded-full transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Preview Profile
            </button>
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

              {/* Info Banner */}
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-blue-900">This is your main display picture</p>
                    <p className="text-xs text-blue-700 mt-1">This photo will be visible to brands on your profile, search results, and all communications.</p>
                  </div>
                </div>
              </div>

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
                      onChange={handlePictureSelect}
                      className="hidden"
                      disabled={uploadingPicture}
                    />
                    <div className="px-6 py-3 bg-primary hover:bg-primary-dark text-dark font-medium rounded-lg transition-colors inline-block">
                      {uploadingPicture ? 'Uploading...' : 'Upload New Picture'}
                    </div>
                  </label>
                  <p className="text-sm text-gray-600 mt-2">
                    Recommended: 400x400px or larger<br />
                    JPG, PNG or GIF (max. 5MB)
                  </p>
                </div>
              </div>
            </div>

            {/* Gallery */}
            <div className="card">
              <h2 className="text-xl font-bold text-dark mb-4">Portfolio Gallery</h2>
              <p className="text-sm text-gray-600 mb-4">Upload images to showcase your work (max 10 images)</p>

              {/* Gallery Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
                {gallery.map((imagePath, index) => (
                  <div key={index} className="relative group aspect-square">
                    <img
                      src={`${BASE_URL}${imagePath}`}
                      alt={`Gallery ${index + 1}`}
                      className="w-full h-full object-cover rounded-lg"
                    />
                    {/* Delete Button */}
                    <button
                      type="button"
                      onClick={() => handleDeleteGalleryImage(index)}
                      disabled={deletingGalleryIndex === index}
                      className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                    >
                      {deletingGalleryIndex === index ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </button>
                  </div>
                ))}

                {/* Upload Button */}
                {gallery.length < 10 && (
                  <label className="cursor-pointer aspect-square border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center hover:border-primary transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleGalleryUpload}
                      className="hidden"
                      disabled={uploadingGallery}
                    />
                    {uploadingGallery ? (
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    ) : (
                      <>
                        <svg className="w-8 h-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span className="text-sm text-gray-500">Add Image</span>
                      </>
                    )}
                  </label>
                )}
              </div>

              {gallery.length === 0 && (
                <p className="text-center text-gray-500 py-4">No gallery images yet. Upload some to showcase your work!</p>
              )}
            </div>

            {/* Basic Info */}
            <div className="card">
              <h2 className="text-xl font-bold text-dark mb-4">Basic Information</h2>

              {/* Username */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-dark mb-2">
                  Username
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                    @
                  </span>
                  <input
                    type="text"
                    className="input rounded-l-none"
                    placeholder="username"
                    {...register('username', {
                      pattern: {
                        value: /^[a-zA-Z0-9_]{3,20}$/,
                        message: 'Username must be 3-20 characters (letters, numbers, underscores only)'
                      }
                    })}
                  />
                </div>
                {errors.username && (
                  <p className="mt-1 text-sm text-error">{errors.username.message}</p>
                )}
                <div className="mt-1">
                  <p className="text-xs text-gray-600 font-medium mb-1">Username requirements:</p>
                  <ul className="text-xs text-gray-500 space-y-0.5 ml-4">
                    <li className="flex items-center gap-1">
                      <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      3-20 characters long
                    </li>
                    <li className="flex items-center gap-1">
                      <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      Only letters, numbers, and underscores
                    </li>
                    <li className="flex items-center gap-1">
                      <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      No spaces or special characters
                    </li>
                  </ul>
                </div>
              </div>

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
                <div className="flex items-center justify-between mt-2">
                  {errors.bio && (
                    <p className="text-sm text-error">{errors.bio.message}</p>
                  )}
                  <p className={`text-sm ml-auto ${bioText.length > 500 ? 'text-error font-medium' : bioText.length > 450 ? 'text-yellow-600' : 'text-gray-500'}`}>
                    {bioText.length} / 500 characters
                  </p>
                </div>
              </div>

              {/* City and Country */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* City */}
                <div>
                  <label className="block text-sm font-medium text-dark mb-2">
                    City/Town <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Harare"
                    {...register('city', { required: 'City is required' })}
                  />
                  {errors.city && (
                    <p className="mt-1 text-sm text-error">{errors.city.message}</p>
                  )}
                </div>

                {/* Country */}
                <div>
                  <label className="block text-sm font-medium text-dark mb-2">
                    Country <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="input"
                    {...register('country', { required: 'Country is required' })}
                  >
                    {COUNTRIES.map((country) => (
                      <option key={country.code} value={country.code}>
                        {country.name}
                      </option>
                    ))}
                  </select>
                  {errors.country && (
                    <p className="mt-1 text-sm text-error">{errors.country.message}</p>
                  )}
                </div>
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

              {/* Follower Count */}
              <div>
                <label className="block text-sm font-medium text-dark mb-2">
                  Total Followers <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  className="input"
                  placeholder="10000"
                  {...register('follower_count', {
                    required: 'Total followers is required',
                    min: { value: 0, message: 'Cannot be negative' }
                  })}
                />
                {errors.follower_count && (
                  <p className="mt-1 text-sm text-error">{errors.follower_count.message}</p>
                )}
              </div>
            </div>

            {/* Revision Settings */}
            <div className="card">
              <h2 className="text-xl font-bold text-dark mb-4">Revision Policy</h2>
              <p className="text-sm text-gray-600 mb-4">Set your revision policy for collaborations</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Free Revisions */}
                <div>
                  <label className="block text-sm font-medium text-dark mb-2">
                    Free Revisions Included
                  </label>
                  <input
                    type="number"
                    className="input"
                    placeholder="2"
                    {...register('free_revisions', {
                      min: { value: 0, message: 'Cannot be negative' },
                      max: { value: 10, message: 'Maximum 10 free revisions' }
                    })}
                  />
                  {errors.free_revisions && (
                    <p className="mt-1 text-sm text-error">{errors.free_revisions.message}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">Number of free revisions per collaboration</p>
                </div>

                {/* Revision Fee */}
                <div>
                  <label className="block text-sm font-medium text-dark mb-2">
                    Fee per Additional Revision ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="input"
                    placeholder="50.00"
                    {...register('revision_fee', {
                      min: { value: 0, message: 'Cannot be negative' }
                    })}
                  />
                  {errors.revision_fee && (
                    <p className="mt-1 text-sm text-error">{errors.revision_fee.message}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">Charge for revisions beyond free limit</p>
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
              <h2 className="text-xl font-bold text-dark mb-4">Categories <span className="text-red-500">*</span></h2>
              <p className="text-sm text-gray-600 mb-4">Select at least one category that best describes your content</p>

              {categories.length === 0 ? (
                <div className="text-center py-4 text-gray-500">Loading categories...</div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {categories.map((category) => (
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
              )}
            </div>

            {/* Platforms */}
            <div className="card">
              <h2 className="text-xl font-bold text-dark mb-4">Platforms <span className="text-red-500">*</span></h2>
              <p className="text-sm text-gray-600 mb-4">Select at least one platform you create content on</p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {PLATFORMS.map((platform) => (
                  <button
                    key={platform}
                    type="button"
                    onClick={() => togglePlatform(platform)}
                    className={`
                      px-4 py-2 rounded-full border-2 text-sm font-medium transition-all
                      ${selectedPlatforms.includes(platform)
                        ? 'border-primary bg-primary text-dark'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-primary'
                      }
                    `}
                  >
                    {platform}
                  </button>
                ))}
              </div>
            </div>

            {/* Languages */}
            <div className="card">
              <h2 className="text-xl font-bold text-dark mb-4">Languages</h2>
              <p className="text-sm text-gray-600 mb-4">Select languages you create content in</p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {ZIMBABWE_LANGUAGES.map((language) => (
                  <button
                    key={language}
                    type="button"
                    onClick={() => toggleLanguage(language)}
                    className={`
                      px-4 py-2 rounded-full border-2 text-sm font-medium transition-all
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

      {/* Image Crop Modal */}
      {showCropModal && imageToCrop && (
        <ImageCropModal
          image={imageToCrop}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
          aspectRatio={1}
          cropShape="round"
        />
      )}

      {/* Profile Preview Modal */}
      {showPreviewModal && (
        <ProfilePreviewModal
          profile={{
            username: watch('username') || profile?.username,
            bio: watch('bio') || profile?.bio,
            location: watch('location') || profile?.location,
            city: watch('city') || profile?.city,
            country: watch('country') || profile?.country,
            profile_picture: profilePicture,
            follower_count: watch('follower_count') || profile?.follower_count || 0,
            categories: watch('categories') || profile?.categories || [],
            languages: watch('languages') || profile?.languages || [],
            platforms: watch('platforms') || profile?.platforms || [],
            availability_status: watch('availability_status') || profile?.availability_status,
            social_links: {
              instagram: watch('instagram') || profile?.social_links?.instagram,
              tiktok: watch('tiktok') || profile?.social_links?.tiktok,
              youtube: watch('youtube') || profile?.social_links?.youtube,
              twitter: watch('twitter') || profile?.social_links?.twitter
            },
            is_verified: profile?.is_verified || false
          }}
          onClose={() => setShowPreviewModal(false)}
        />
      )}
    </div>
  );
};

export default CreatorProfileEdit;
