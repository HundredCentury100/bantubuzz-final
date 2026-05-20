import { useState } from 'react';
import { Link2, Instagram, Facebook, Youtube, Twitter, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { collaborationsAPI } from '../services/api';
import toast from 'react-hot-toast';

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
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showInput, setShowInput] = useState(!deliverable?.post_url_validated);

  // Platform icons mapping
  const getPlatformIcon = (platform) => {
    const icons = {
      instagram: Instagram,
      facebook: Facebook,
      youtube: Youtube,
      twitter: Twitter,
      tiktok: Link2 // Using generic link icon for TikTok since lucide doesn't have TikTok
    };
    const IconComponent = icons[platform?.toLowerCase()] || Link2;
    return <IconComponent size={20} className="text-primary" />;
  };

  // Client-side URL validation
  const validateURL = (url) => {
    if (!url) return 'URL is required';

    const patterns = [
      /instagram\.com\/(p|reel|tv)\//i,
      /facebook\.com\/(.*\/)?(posts|photo\.php|permalink\.php|watch)/i,
      /fb\.watch\//i,
      /(youtube\.com\/watch|youtu\.be\/|youtube\.com\/shorts)/i,
      /tiktok\.com\/@.*\/video\//i,
      /vm\.tiktok\.com\//i,
      /(twitter\.com|x\.com)\/.*\/status\//i
    ];

    const isValid = patterns.some(pattern => pattern.test(url));
    if (!isValid) {
      return 'Please enter a valid URL from Instagram, Facebook, YouTube, TikTok, or Twitter/X';
    }

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Client-side validation
    const validationError = validateURL(postUrl);
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
          { post_url: postUrl }
        );
      } else {
        // Package-based collaboration
        response = await collaborationsAPI.submitPackageDeliverableURL(
          collaborationId,
          deliverableId,
          { post_url: postUrl }
        );
      }

      if (response.data.success) {
        toast.success('Post URL submitted successfully!');
        setShowInput(false);

        // Call parent callback to refresh data
        if (onSuccess) {
          onSuccess(response.data.deliverable);
        }
      } else {
        setError(response.data.error || 'Failed to submit URL');
        toast.error(response.data.error || 'Failed to submit URL');
      }
    } catch (err) {
      console.error('Error submitting post URL:', err);
      const errorMsg = err.response?.data?.error || err.response?.data?.message || 'Failed to submit post URL';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  // If URL already validated and submitted, show success state
  if (!showInput && deliverable?.post_url_validated) {
    return (
      <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle size={20} className="text-green-600" />
          <span className="font-medium text-green-900">Post URL Submitted</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-green-800">
          {getPlatformIcon(deliverable.post_platform)}
          <span className="font-mono text-xs bg-green-100 px-2 py-1 rounded">
            {deliverable.post_platform?.toUpperCase()} - {deliverable.post_id}
          </span>
        </div>
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
        <button
          onClick={() => setShowInput(true)}
          className="mt-2 text-xs text-green-700 hover:text-green-900 underline"
        >
          Update URL
        </button>
      </div>
    );
  }

  // Show input form
  return (
    <div className="mt-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex items-start gap-2 mb-3">
        <Link2 size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-medium text-blue-900">Submit Post URL</h4>
          <p className="text-xs text-blue-700 mt-1">
            Paste the URL of your published social media post for analytics tracking
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <input
            type="url"
            value={postUrl}
            onChange={(e) => {
              setPostUrl(e.target.value);
              setError('');
            }}
            placeholder="https://instagram.com/p/ABC123/ or https://youtube.com/watch?v=..."
            className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${
              error ? 'border-red-300 bg-red-50' : 'border-gray-300'
            }`}
            disabled={submitting}
            required
          />
          {error && (
            <div className="flex items-center gap-1 mt-2 text-xs text-red-700">
              <AlertCircle size={14} />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={submitting || !postUrl}
            className="flex-1 px-4 py-2 bg-primary hover:bg-primary-dark text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            {submitting ? 'Submitting...' : 'Submit URL'}
          </button>
          {deliverable?.url && (
            <button
              type="button"
              onClick={() => setShowInput(false)}
              disabled={submitting}
              className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="mt-3 pt-3 border-t border-blue-200">
        <p className="text-xs text-blue-600 font-medium mb-1">Supported Platforms:</p>
        <div className="flex flex-wrap gap-2">
          {['Instagram', 'Facebook', 'YouTube', 'TikTok', 'Twitter/X'].map((platform) => (
            <span key={platform} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
              {platform}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DeliverableURLInput;
