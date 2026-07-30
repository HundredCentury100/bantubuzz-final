import { useState } from 'react';
import { Link2, Instagram, Facebook, Youtube, Twitter, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { collaborationsAPI } from '../services/api';
import toast from 'react-hot-toast';

const PLATFORM_OPTIONS = [
  { value: 'instagram', label: 'Instagram', mode: 'url' },
  { value: 'tiktok', label: 'TikTok', mode: 'url' },
  { value: 'youtube', label: 'YouTube', mode: 'url' },
  { value: 'facebook', label: 'Facebook', mode: 'id' },
  { value: 'twitter', label: 'Twitter/X', mode: 'url' }
];

const normalizePlatformValue = (platform) => {
  if (!platform) return '';
  if (typeof platform === 'string') return platform;
  if (typeof platform === 'object') {
    return String(platform.value || platform.platform || platform.name || platform.label || '');
  }
  return String(platform);
};

/**
 * DeliverableURLInput Component
 *
 * Allows creators to submit social media post URLs for milestone deliverables.
 * Part of Brand Analytics Implementation - Phase 1.
 *
 * Features:
 * - Text input for social media URLs
 * - Real-time client-side validation
 * - Platform icon display after successful submission
 * - Success/error states
 * - Loading states
 *
 * Supports: Instagram, Facebook, YouTube, TikTok, Twitter/X
 */
const DeliverableURLInput = ({
  collaborationId,
  milestoneId, // Optional - only for milestone-based collaborations (briefs/campaigns)
  deliverableId,
  deliverable,
  onSuccess
}) => {
  const [postUrl, setPostUrl] = useState(deliverable?.post_url || '');
  const [selectedPlatform, setSelectedPlatform] = useState(normalizePlatformValue(deliverable?.post_platform));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showInput, setShowInput] = useState(!deliverable?.post_url_validated);
  const isFacebook = selectedPlatform === 'facebook';
  const referenceLabel = isFacebook ? 'Facebook Post ID' : 'Post URL';
  const referencePlaceholder = isFacebook
    ? 'Paste the numeric/original Facebook Post ID'
    : 'Paste the public post URL';
  const helperText = isFacebook
    ? 'Facebook tracking uses the numeric/original Post ID from ThunziAI. Public Facebook URLs may not match.'
    : 'For Instagram, TikTok, YouTube, and Twitter/X, paste the public URL of the live post.';

  // Platform icons mapping
  const getPlatformIcon = (platform) => {
    const icons = {
      instagram: Instagram,
      facebook: Facebook,
      youtube: Youtube,
      twitter: Twitter,
      tiktok: Link2 // Using generic link icon for TikTok since lucide doesn't have TikTok
    };
    const IconComponent = icons[normalizePlatformValue(platform).toLowerCase()] || Link2;
    return <IconComponent size={20} className="text-primary" />;
  };

  const validatePostReference = (reference) => {
    if (!selectedPlatform) return 'Select the platform first';
    if (!reference) return `${referenceLabel} is required`;

    if (isFacebook && !/^https?:\/\//i.test(reference)) {
      return null;
    }

    const patterns = [
      { platform: 'instagram', pattern: /instagram\.com\/(p|reel|tv)\//i },
      { platform: 'facebook', pattern: /(facebook\.com\/(.*\/)?(posts|photo\.php|permalink\.php|watch)|fb\.watch\/)/i },
      { platform: 'youtube', pattern: /(youtube\.com\/watch|youtu\.be\/|youtube\.com\/shorts)/i },
      { platform: 'tiktok', pattern: /(tiktok\.com\/@.*\/video\/|vm\.tiktok\.com\/)/i },
      { platform: 'twitter', pattern: /(twitter\.com|x\.com)\/.*\/status\//i }
    ];

    const platformPattern = patterns.find(item => item.platform === selectedPlatform);
    const isValid = platformPattern?.pattern.test(reference);
    if (!isValid) {
      return isFacebook
        ? 'Paste the Facebook numeric/original Post ID, or a supported Facebook URL'
        : `Please enter a valid ${PLATFORM_OPTIONS.find(option => option.value === selectedPlatform)?.label || 'platform'} post URL`;
    }

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Client-side validation
    const validationError = validatePostReference(postUrl.trim());
    if (validationError) {
      setError(validationError);
      toast.error(validationError);
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      // Call appropriate API method based on collaboration type
      let response;
      if (milestoneId) {
        // Milestone-based collaboration (briefs/campaigns)
        response = await collaborationsAPI.submitMilestoneDeliverableURL(
          collaborationId,
          milestoneId,
          deliverableId,
          { post_url: postUrl.trim(), post_platform: selectedPlatform }
        );
      } else {
        // Package-based collaboration
        response = await collaborationsAPI.submitPackageDeliverableURL(
          collaborationId,
          deliverableId,
          { post_url: postUrl.trim(), post_platform: selectedPlatform }
        );
      }

      if (response.data.success) {
        toast.success('Post reference submitted successfully!');
        setShowInput(false);

        // Call parent callback to refresh data
        if (onSuccess) {
          onSuccess(response.data.deliverable);
        }
      } else {
        setError(response.data.message || response.data.error || 'Failed to submit post reference');
        toast.error(response.data.message || response.data.error || 'Failed to submit post reference');
      }
    } catch (err) {
      console.error('Error submitting post URL:', err);
      const errorMsg = err.response?.data?.message || err.response?.data?.error || 'Failed to submit post reference';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  // If URL already validated and submitted, show success state
  if (!showInput && deliverable?.post_url_validated) {
    return (
      <div className="mt-3 p-4 bg-green-50 border border-green-200 rounded-2xl">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle size={20} className="text-green-600" />
          <span className="font-medium text-green-900">Post Reference Submitted</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-green-800">
          {getPlatformIcon(deliverable.post_platform)}
          <span className="font-mono text-xs bg-green-100 px-2 py-1 rounded">
            {normalizePlatformValue(deliverable.post_platform).toUpperCase() || 'POST'} - {deliverable.post_id}
          </span>
        </div>
        {deliverable.url?.startsWith('http') && (
          <div className="mt-2">
            <a
              href={deliverable.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-green-700 hover:text-green-900 underline flex items-center gap-1"
            >
              View Post
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        )}
        <button
          onClick={() => setShowInput(true)}
          className="mt-3 px-4 py-2 bg-white text-green-800 border border-green-200 rounded-full text-xs font-medium hover:bg-green-100 transition-colors"
        >
          Update Reference
        </button>
      </div>
    );
  }

  // Show input form
  return (
    <div className="mt-3 p-4 bg-primary/10 border border-primary/30 rounded-2xl">
      <div className="flex items-start gap-2 mb-3">
        <Link2 size={20} className="text-primary flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-medium text-dark">Submit URL / Post ID / Delivery</h4>
          <p className="text-xs text-gray-700 mt-1">
            Select the platform, then paste the live URL or Facebook Post ID needed for delivery tracking and analytics.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="mb-3 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Platform</label>
            <select
              value={selectedPlatform}
              onChange={(e) => {
                setSelectedPlatform(e.target.value);
                setError('');
              }}
              className="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
              disabled={submitting}
              required
            >
              <option value="">Choose platform</option>
              {PLATFORM_OPTIONS.map((platform) => (
                <option key={platform.value} value={platform.value}>
                  {platform.label} {platform.mode === 'id' ? '- Post ID' : '- URL'}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">{referenceLabel}</label>
            <input
              type="text"
              value={postUrl}
              onChange={(e) => {
                setPostUrl(e.target.value);
                setError('');
              }}
              placeholder={referencePlaceholder}
              className={`w-full px-4 py-3 text-sm border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent ${
                error ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              disabled={submitting}
              required
            />
            <p className="mt-2 rounded-2xl bg-white px-3 py-2 text-xs text-gray-700">
              {helperText}
            </p>
            {error && (
              <div className="flex items-center gap-1 mt-2 text-xs text-red-700">
                <AlertCircle size={14} />
                <span>{error}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={submitting || !postUrl || !selectedPlatform}
            className="flex-1 px-4 py-2 bg-primary hover:bg-primary/90 text-dark text-sm font-medium rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            {submitting ? 'Submitting...' : 'Submit Reference'}
          </button>
          {deliverable?.post_url_validated && (
            <button
              type="button"
              onClick={() => setShowInput(false)}
              disabled={submitting}
              className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-full hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="mt-3 pt-3 border-t border-primary/20">
        <p className="text-xs text-gray-700 font-medium mb-1">Supported Delivery References:</p>
        <div className="flex flex-wrap gap-2">
          {['Instagram', 'Facebook', 'YouTube', 'TikTok', 'Twitter/X'].map((platform) => (
            <span key={platform} className="text-xs bg-white text-dark px-2 py-1 rounded-full">
              {platform}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DeliverableURLInput;
