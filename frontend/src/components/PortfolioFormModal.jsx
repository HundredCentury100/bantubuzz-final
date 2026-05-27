import { useState, useEffect } from 'react';
import { portfolioAPI } from '../services/portfolioAPI';
import toast from 'react-hot-toast';

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

const PortfolioFormModal = ({ item = null, collaborationData = null, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    brand_name: '',
    platform: '',
    collaboration_type: '',
    campaign_objective: '',
    image_url: '',
    media_urls: [],
    post_url: '',
    views: '',
    likes: '',
    comments: '',
    shares: '',
    engagement_rate: '',
    reach: '',
    result_description: '',
    client_testimonial: '',
    project_date: '',
    is_visible: true
  });

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mediaFiles, setMediaFiles] = useState([]);
  const [isFromCollaboration, setIsFromCollaboration] = useState(false);

  useEffect(() => {
    if (item) {
      // Pre-fill form with existing item data
      setFormData({
        title: item.title || '',
        description: item.description || '',
        brand_name: item.brand_name || '',
        platform: item.platform || '',
        collaboration_type: item.collaboration_type || '',
        campaign_objective: item.campaign_objective || '',
        image_url: item.image_url || '',
        media_urls: item.media_urls || [],
        post_url: item.post_url || '',
        views: item.views !== null ? item.views : '',
        likes: item.likes !== null ? item.likes : '',
        comments: item.comments !== null ? item.comments : '',
        shares: item.shares !== null ? item.shares : '',
        engagement_rate: item.engagement_rate !== null ? (item.engagement_rate * 100).toFixed(2) : '',
        reach: item.reach !== null ? item.reach : '',
        result_description: item.result_description || '',
        client_testimonial: item.client_testimonial || '',
        project_date: item.project_date || '',
        is_visible: item.is_visible !== undefined ? item.is_visible : true
      });
    } else if (collaborationData) {
      // Pre-fill form with collaboration data
      setIsFromCollaboration(true);
      setFormData({
        title: collaborationData.title || '',
        description: collaborationData.description || '',
        brand_name: collaborationData.brand_name || '',
        platform: collaborationData.platform ? collaborationData.platform.toLowerCase() : '',
        collaboration_type: collaborationData.collaboration_type || '',
        campaign_objective: collaborationData.campaign_objective || '',
        image_url: '',
        media_urls: [],
        post_url: '',
        views: '',
        likes: '',
        comments: '',
        shares: '',
        engagement_rate: '',
        reach: '',
        result_description: '',
        client_testimonial: '',
        project_date: collaborationData.project_date || '',
        is_visible: true
      });
    }
  }, [item, collaborationData]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    try {
      setUploading(true);
      const response = await portfolioAPI.uploadPortfolioImage(file);

      if (response.data.success) {
        setFormData(prev => ({
          ...prev,
          image_url: response.data.file_path
        }));
        toast.success('Image uploaded successfully');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleMediaUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // Validate total media count
    if (formData.media_urls.length + files.length > 5) {
      toast.error('Maximum 5 additional media files allowed');
      return;
    }

    try {
      setUploading(true);
      const uploadPromises = files.map(file => portfolioAPI.uploadPortfolioImage(file));
      const responses = await Promise.all(uploadPromises);

      const newMediaUrls = responses
        .filter(res => res.data.success)
        .map(res => res.data.file_path);

      setFormData(prev => ({
        ...prev,
        media_urls: [...prev.media_urls, ...newMediaUrls]
      }));

      toast.success(`${newMediaUrls.length} media file(s) uploaded`);
    } catch (error) {
      console.error('Error uploading media:', error);
      toast.error('Failed to upload media files');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveMedia = (index) => {
    setFormData(prev => ({
      ...prev,
      media_urls: prev.media_urls.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    try {
      setSaving(true);

      // Prepare data - convert engagement_rate from percentage to decimal
      const submitData = {
        ...formData,
        engagement_rate: formData.engagement_rate ? parseFloat(formData.engagement_rate) / 100 : null,
        views: formData.views ? parseInt(formData.views) : null,
        likes: formData.likes ? parseInt(formData.likes) : null,
        comments: formData.comments ? parseInt(formData.comments) : null,
        shares: formData.shares ? parseInt(formData.shares) : null,
        reach: formData.reach ? parseInt(formData.reach) : null
      };

      let response;
      if (item) {
        response = await portfolioAPI.updatePortfolioItem(item.id, submitData);
        toast.success('Success Story updated successfully');
      } else if (isFromCollaboration && collaborationData?.collaboration_id) {
        // Create from collaboration using special endpoint
        response = await portfolioAPI.createFromCollaboration(
          collaborationData.collaboration_id,
          submitData
        );
        toast.success('Success Story created from collaboration!');
      } else {
        response = await portfolioAPI.createPortfolioItem(submitData);
        toast.success('Success Story created successfully');
      }

      onSuccess(response.data.portfolio_item);
    } catch (error) {
      console.error('Error saving portfolio item:', error);
      toast.error(error.response?.data?.error || 'Failed to save portfolio item');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between rounded-t-3xl z-10">
          <h2 className="text-2xl font-bold text-gray-900">
            {item ? 'Edit Success Story' : 'Add Success Story'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {/* Basic Information */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="e.g., Instagram Reel Campaign for TechBrand"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Brief description of the project..."
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Brand/Client Name</label>
                  <input
                    type="text"
                    name="brand_name"
                    value={formData.brand_name}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="e.g., Nike"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Platform</label>
                  <select
                    name="platform"
                    value={formData.platform}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="">Select platform</option>
                    <option value="instagram">Instagram</option>
                    <option value="tiktok">TikTok</option>
                    <option value="youtube">YouTube</option>
                    <option value="facebook">Facebook</option>
                    <option value="twitter">Twitter</option>
                  </select>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Collaboration Type</label>
                  <select
                    name="collaboration_type"
                    value={formData.collaboration_type}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="">Select collaboration type</option>
                    {COLLABORATION_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Campaign Objective</label>
                  <input
                    type="text"
                    name="campaign_objective"
                    value={formData.campaign_objective}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="e.g., Brand Awareness, Product Launch"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Project Date</label>
                <input
                  type="date"
                  name="project_date"
                  value={formData.project_date}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Media */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Media</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Featured Image</label>
                <div className="flex items-center gap-4">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="featured-image-upload"
                    disabled={uploading}
                  />
                  <label
                    htmlFor="featured-image-upload"
                    className="px-4 py-2 bg-primary text-white rounded-lg cursor-pointer hover:bg-primary-dark transition-colors disabled:opacity-50"
                  >
                    {uploading ? 'Uploading...' : 'Upload Image'}
                  </label>
                  {formData.image_url && (
                    <span className="text-sm text-green-600">✓ Image uploaded</span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Media (max 5)
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleMediaUpload}
                    className="hidden"
                    id="additional-media-upload"
                    disabled={uploading || formData.media_urls.length >= 5}
                  />
                  <label
                    htmlFor="additional-media-upload"
                    className={`px-4 py-2 bg-gray-100 text-gray-700 rounded-lg cursor-pointer hover:bg-gray-200 transition-colors ${
                      uploading || formData.media_urls.length >= 5 ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {uploading ? 'Uploading...' : 'Upload More'}
                  </label>
                  <span className="text-sm text-gray-600">
                    {formData.media_urls.length}/5 uploaded
                  </span>
                </div>
                {formData.media_urls.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {formData.media_urls.map((url, index) => (
                      <div key={index} className="relative">
                        <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden">
                          <img src={url} alt={`Media ${index + 1}`} className="w-full h-full object-cover" />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveMedia(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Post URL</label>
                <input
                  type="url"
                  name="post_url"
                  value={formData.post_url}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="https://..."
                />
              </div>
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h3>

            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Views</label>
                <input
                  type="number"
                  name="views"
                  value={formData.views}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="0"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Likes</label>
                <input
                  type="number"
                  name="likes"
                  value={formData.likes}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="0"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Comments</label>
                <input
                  type="number"
                  name="comments"
                  value={formData.comments}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="0"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Shares</label>
                <input
                  type="number"
                  name="shares"
                  value={formData.shares}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="0"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Engagement Rate (%)</label>
                <input
                  type="number"
                  name="engagement_rate"
                  value={formData.engagement_rate}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="0.00"
                  min="0"
                  max="100"
                  step="0.01"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Reach</label>
                <input
                  type="number"
                  name="reach"
                  value={formData.reach}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="0"
                  min="0"
                />
              </div>
            </div>
          </div>

          {/* Results & Testimonials */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Results & Impact</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Result Description</label>
                <textarea
                  name="result_description"
                  value={formData.result_description}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Describe the campaign results and impact..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Client Testimonial</label>
                <textarea
                  name="client_testimonial"
                  value={formData.client_testimonial}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Client feedback or testimonial..."
                />
              </div>
            </div>
          </div>

          {/* Visibility Setting */}
          <div className="mb-6">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                name="is_visible"
                checked={formData.is_visible}
                onChange={handleChange}
                className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
              />
              <div>
                <div className="font-medium text-gray-900">Show on Public Profile</div>
                <div className="text-sm text-gray-500">Make this portfolio item visible to brands viewing your profile</div>
              </div>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || uploading}
              className="flex-1 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : item ? 'Update Success Story' : 'Add Success Story'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PortfolioFormModal;
