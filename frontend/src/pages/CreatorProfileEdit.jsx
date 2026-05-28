import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { creatorsAPI, BASE_URL } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import Navbar from '../components/Navbar';
import toast from 'react-hot-toast';
import { PLATFORMS, ZIMBABWE_LANGUAGES, COUNTRIES, ZIMBABWE_CITIES } from '../constants/options';
import axios from 'axios';
import ImageCropModal from '../components/ImageCropModal';
import ProfilePreviewModal from '../components/ProfilePreviewModal';
import { createCroppedImage } from '../utils/cropImage';
import PortfolioGrid from '../components/PortfolioGrid';
import GalleryVideo from '../components/GalleryVideo';
import PortfolioFormModal from '../components/PortfolioFormModal';
import { portfolioAPI } from '../services/portfolioAPI';

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
  const [gallery, setGallery] = useState([]); // Store full gallery_images objects (with type, url, etc.)
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [deletingGalleryIndex, setDeletingGalleryIndex] = useState(null);
  const [categories, setCategories] = useState([]);
  const [showCropModal, setShowCropModal] = useState(false);
  const [imageToCrop, setImageToCrop] = useState(null);
  const [originalFileName, setOriginalFileName] = useState('');
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showPortfolioModal, setShowPortfolioModal] = useState(false);
  const [editingPortfolioItem, setEditingPortfolioItem] = useState(null);
  const [portfolioRefreshKey, setPortfolioRefreshKey] = useState(0);

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
  const selectedCity = watch('city') || '';

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

      // Store the full gallery_images structure (objects with type, url, etc.)
      // This allows us to differentiate between images and videos
      const galleryData = data.gallery_images || data.gallery || [];
      // Convert old string format to new object format if needed
      const galleryItems = galleryData.map(item => {
        if (typeof item === 'string') {
          // Old format: just a path string
          return {
            type: 'image',
            url: item,
            medium: item
          };
        }
        // New format: already an object with type field
        return item;
      });
      setGallery(galleryItems);

      // Set form values
      setValue('username', data.username || '');
      setValue('bio', data.bio || '');
      setValue('location', data.location || '');
      setValue('city', data.city || '');
      setValue('country', data.country || 'ZW');
      setValue('portfolio_url', data.portfolio_url || '');
      setValue('categories', data.categories || []);
      setValue('languages', data.languages || []);
      setValue('platforms', data.platforms || []);
      setValue('availability_status', data.availability_status || 'available');
      setValue('success_stories', data.success_stories || '');

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

      // Backend returns gallery_images (new format) with full objects
      const galleryImages = response.data.gallery_images || [];
      setGallery(galleryImages);

      toast.success('Portfolio image added successfully!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to upload portfolio image');
    } finally {
      setUploadingGallery(false);
      // Reset the file input
      e.target.value = '';
    }
  };

  const handleVideoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('video/')) {
      toast.error('Please select a video file (MP4, WebM, or MOV)');
      return;
    }

    // Validate file size (max 10MB)
    const MAX_VIDEO_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_VIDEO_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      toast.error(`Video too large (${sizeMB}MB). Maximum size is 10MB`);
      return;
    }

    // Count existing videos
    const videoCount = gallery.filter(item => item.type === 'video').length;
    if (videoCount >= 2) {
      toast.error('Maximum 2 videos allowed in gallery');
      return;
    }

    setUploadingVideo(true);
    try {
      const response = await creatorsAPI.uploadGalleryVideo(file);

      // Backend returns updated gallery_images
      const galleryImages = response.data.gallery_images || [];
      setGallery(galleryImages);

      toast.success('Portfolio video added successfully!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to upload portfolio video');
    } finally {
      setUploadingVideo(false);
      // Reset the file input
      e.target.value = '';
    }
  };

  const handleDeleteGalleryImage = async (index) => {
    setDeletingGalleryIndex(index);
    try {
      const response = await creatorsAPI.deleteGalleryImage(index);

      // Backend returns updated gallery_images
      const galleryImages = response.data.gallery_images || [];
      setGallery(galleryImages);

      toast.success('Gallery item removed successfully!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to remove gallery item');
    } finally {
      setDeletingGalleryIndex(null);
    }
  };

  const handleAddPortfolio = () => {
    setEditingPortfolioItem(null);
    setShowPortfolioModal(true);
  };

  const handleEditPortfolio = (item) => {
    setEditingPortfolioItem(item);
    setShowPortfolioModal(true);
  };

  const handleDeletePortfolio = async (item) => {
    if (!window.confirm('Are you sure you want to delete this portfolio item?')) {
      return;
    }

    try {
      await portfolioAPI.deletePortfolioItem(item.id);
      toast.success('Portfolio item deleted successfully');
      setPortfolioRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Error deleting portfolio item:', error);
      toast.error('Failed to delete portfolio item');
    }
  };

  const handlePortfolioSuccess = (item) => {
    setShowPortfolioModal(false);
    setEditingPortfolioItem(null);
    setPortfolioRefreshKey(prev => prev + 1);
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

      // Build update payload
      const payload = {
        username: data.username || null,
        bio: data.bio,
        location: data.location,
        city: data.city === 'Other' ? data.custom_city : data.city,
        country: data.country,
        portfolio_url: data.portfolio_url,
        categories: data.categories || [],
        languages: data.languages || [],
        platforms: data.platforms || [],
        availability_status: data.availability_status,
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
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-dark mb-1">Portfolio Gallery</h2>
                  <p className="text-sm text-gray-600">Upload images and videos to showcase your work</p>
                  <p className="text-xs text-gray-500 mt-1">Max 10 items • Max 2 videos • Videos: 10MB limit</p>
                </div>
              </div>

              {/* Info Box - Gallery Ordering */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-blue-900 mb-1">Featured Gallery Display</h3>
                    <p className="text-xs text-blue-800">
                      The <strong>first 3 items</strong> in your gallery will appear at the top of your profile in a large featured hero section that visitors see immediately.
                      Put your best work first! Videos will autoplay (muted) to grab attention.
                    </p>
                  </div>
                </div>
              </div>

              {/* Gallery Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
                {gallery.map((item, index) => {
                  const isVideo = item.type === 'video';
                  const itemUrl = item.url || item.medium || item.large;

                  return (
                    <div key={index} className="relative group aspect-square">
                      {isVideo ? (
                        <GalleryVideo
                          src={`${BASE_URL}${itemUrl}`}
                          type={item.mime_type || 'video/mp4'}
                          className="w-full h-full object-cover rounded-lg"
                          autoPlay={false}
                          badgeClassName="absolute top-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs flex items-center gap-1"
                          soundButtonClassName="absolute bottom-2 right-2 w-9 h-9 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black/85 transition-colors"
                        />
                      ) : (
                        <img
                          src={`${BASE_URL}${itemUrl}`}
                          alt={`Gallery ${index + 1}`}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      )}
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
                  );
                })}

                {/* Upload Image Button */}
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
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-xs text-gray-500 font-medium">Add Image</span>
                      </>
                    )}
                  </label>
                )}

                {/* Upload Video Button */}
                {gallery.length < 10 && gallery.filter(item => item.type === 'video').length < 2 && (
                  <label className="cursor-pointer aspect-square border-2 border-dashed border-blue-300 rounded-lg flex flex-col items-center justify-center hover:border-blue-500 transition-colors bg-blue-50/50">
                    <input
                      type="file"
                      accept="video/mp4,video/webm,video/quicktime"
                      onChange={handleVideoUpload}
                      className="hidden"
                      disabled={uploadingVideo}
                    />
                    {uploadingVideo ? (
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    ) : (
                      <>
                        <svg className="w-8 h-8 text-blue-500 mb-2" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                        </svg>
                        <span className="text-xs text-blue-600 font-medium">Add Video</span>
                        <span className="text-[10px] text-blue-500 mt-0.5">Max 10MB</span>
                      </>
                    )}
                  </label>
                )}
              </div>

              {gallery.length === 0 && (
                <p className="text-center text-gray-500 py-4">No gallery items yet. Upload images and videos to showcase your work!</p>
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
                  <select
                    className="input"
                    {...register('city', { required: 'City is required' })}
                  >
                    <option value="">Select city...</option>
                    {ZIMBABWE_CITIES.map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                  </select>
                  {errors.city && (
                    <p className="mt-1 text-sm text-error">{errors.city.message}</p>
                  )}

                  {/* Show custom input if "Other" is selected */}
                  {selectedCity === 'Other' && (
                    <input
                      type="text"
                      className="input mt-2"
                      placeholder="Enter your city/town"
                      {...register('custom_city', {
                        required: selectedCity === 'Other' ? 'Please enter your city' : false
                      })}
                    />
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

            {/* Connected Platforms */}
            <div className="card">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-bold text-dark mb-2">Connect Platforms</h2>
                  <p className="text-sm text-gray-600">
                    Connect Instagram, TikTok, YouTube and Facebook directly to BantuBuzz so brands see verified follower counts, engagement and audience analytics.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/creator/platforms')}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 font-medium text-dark transition-colors hover:bg-primary-dark"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  Connect Platforms
                </button>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
                {['Instagram', 'TikTok', 'YouTube', 'Facebook'].map((platform) => (
                  <div key={platform} className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-center text-sm font-medium text-gray-700">
                    {platform}
                  </div>
                ))}
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
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-dark">Success Stories</h2>
                  <p className="text-sm text-gray-600 mt-1">Showcase your best collaborations with detailed metrics and results</p>
                </div>
                <button
                  type="button"
                  onClick={handleAddPortfolio}
                  className="px-4 py-2 bg-primary hover:bg-primary-dark text-dark font-medium rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Success Story
                </button>
              </div>

              {/* Success Stories Grid */}
              <div className="mb-6" key={portfolioRefreshKey}>
                <PortfolioGrid
                  creatorId={profile?.id}
                  showActions={true}
                  onEdit={handleEditPortfolio}
                  onDelete={handleDeletePortfolio}
                />
              </div>

              {/* Info Banner */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-blue-900">Stand Out with Structured Success Stories</p>
                    <p className="text-xs text-blue-700 mt-1">
                      Add detailed success stories with metrics, images, client testimonials, and campaign results. This helps brands see your proven track record and makes your profile more professional.
                    </p>
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
            follower_count: profile?.follower_count || 0,
            categories: watch('categories') || profile?.categories || [],
            languages: watch('languages') || profile?.languages || [],
            platforms: watch('platforms') || profile?.platforms || [],
            availability_status: watch('availability_status') || profile?.availability_status,
            is_verified: profile?.is_verified || false
          }}
          onClose={() => setShowPreviewModal(false)}
        />
      )}

      {/* Portfolio Form Modal */}
      {showPortfolioModal && (
        <PortfolioFormModal
          item={editingPortfolioItem}
          onClose={() => {
            setShowPortfolioModal(false);
            setEditingPortfolioItem(null);
          }}
          onSuccess={handlePortfolioSuccess}
        />
      )}
    </div>
  );
};

export default CreatorProfileEdit;
