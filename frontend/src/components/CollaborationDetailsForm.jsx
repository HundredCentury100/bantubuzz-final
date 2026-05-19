import { useState } from 'react';
import { FaTimes, FaInfoCircle, FaCheckCircle } from 'react-icons/fa';
import toast from 'react-hot-toast';

/**
 * CollaborationDetailsForm - Shown BEFORE payment
 *
 * User Story 4: As a brand manager I need to write my instructions, brief,
 * guidelines, rules, and expectations for the creator BEFORE paying so that
 * the creator knows exactly what is expected from the moment the collaboration activates.
 *
 * Acceptance Criteria:
 * - Appears before payment is processed
 * - What do you want the creator to do - free text, required
 * - Brief and Guidelines - key messages, tone, dos/don'ts, hashtags, tags, links, required
 * - Rules and Expectations - deadlines, format, dimensions, compliance, optional
 * - Additional Notes - anything else the creator should know, optional
 * - Cannot proceed to payment without completing required fields
 * - Details visible to creator from moment collaboration activates
 * - Details remain visible throughout full collaboration duration
 */
const CollaborationDetailsForm = ({
  isOpen,
  onClose,
  onSubmit,
  cartItemsCount = 1,
  requiresContentReview = true
}) => {
  const [formData, setFormData] = useState({
    brief: '',
    guidelines: '',
    rules: '',
    additional_notes: ''
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Required field: brief
    if (!formData.brief.trim()) {
      newErrors.brief = 'Please tell the creator what you want them to do';
    } else if (formData.brief.trim().length < 20) {
      newErrors.brief = 'Please provide at least 20 characters';
    }

    // Required field: guidelines
    if (!formData.guidelines.trim()) {
      newErrors.guidelines = 'Please provide guidelines for the creator';
    } else if (formData.guidelines.trim().length < 30) {
      newErrors.guidelines = 'Please provide more detailed guidelines (at least 30 characters)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error('Please complete all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      toast.success('Collaboration details saved! Proceeding to payment...');
    } catch (error) {
      console.error('Failed to save collaboration details:', error);
      toast.error('Failed to save details. Please try again.');
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    // Show warning that creator won't have clear instructions
    if (window.confirm(
      'Are you sure you want to skip? Without clear instructions, the creator may not know what to do, which could lead to miscommunication and delays.'
    )) {
      onSubmit(null); // Proceed with null details
    }
  };

  if (!isOpen) return null;

  const characterCount = {
    brief: formData.brief.length,
    guidelines: formData.guidelines.length,
    rules: formData.rules.length,
    additional_notes: formData.additional_notes.length
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 z-10">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Collaboration Details
              </h2>
              <p className="text-gray-600">
                Give the creator{cartItemsCount > 1 ? 's' : ''} clear instructions before paying.
                These details will be visible to the creator{cartItemsCount > 1 ? 's' : ''} immediately when the collaboration activates.
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0 ml-4"
            >
              <FaTimes className="text-gray-500" size={20} />
            </button>
          </div>

          {/* Content Review Info */}
          <div className={`mt-4 p-3 rounded-lg border-2 ${
            requiresContentReview
              ? 'bg-blue-50 border-blue-200'
              : 'bg-green-50 border-green-200'
          }`}>
            <div className="flex items-center gap-2 text-sm">
              <FaInfoCircle className={requiresContentReview ? 'text-blue-600' : 'text-green-600'} />
              <span className={`font-medium ${requiresContentReview ? 'text-blue-900' : 'text-green-900'}`}>
                {requiresContentReview
                  ? 'Content Review: YES - You will review content before it\'s posted live'
                  : 'Content Review: NO - Creator will post directly without pre-approval'
                }
              </span>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="p-6 space-y-6">
          {/* Field 1: What do you want the creator to do? (REQUIRED) */}
          <div>
            <label className="block mb-2">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold text-gray-900">
                  What do you want the creator to do?
                </span>
                <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded font-medium">
                  Required
                </span>
              </div>
              <p className="text-xs text-gray-600 mb-2">
                A clear, concise description of the deliverable(s) you're requesting
              </p>
            </label>
            <textarea
              value={formData.brief}
              onChange={(e) => handleChange('brief', e.target.value)}
              placeholder="Example: Create 3 Instagram posts showcasing our new product line. Each post should highlight a different product feature and include product photos we'll provide."
              rows={4}
              className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 transition-colors ${
                errors.brief
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                  : 'border-gray-300 focus:border-primary focus:ring-primary/20'
              }`}
            />
            <div className="flex justify-between items-center mt-1">
              {errors.brief ? (
                <p className="text-xs text-red-600">{errors.brief}</p>
              ) : (
                <p className="text-xs text-gray-500">
                  Be specific about what you want the creator to deliver
                </p>
              )}
              <span className={`text-xs ${characterCount.brief >= 20 ? 'text-green-600' : 'text-gray-400'}`}>
                {characterCount.brief} / 20 min
              </span>
            </div>
          </div>

          {/* Field 2: Brief and Guidelines (REQUIRED) */}
          <div>
            <label className="block mb-2">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold text-gray-900">
                  Brief & Guidelines
                </span>
                <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded font-medium">
                  Required
                </span>
              </div>
              <p className="text-xs text-gray-600 mb-2">
                Key messages, tone, dos and don'ts, hashtags, tags, links, brand guidelines
              </p>
            </label>
            <textarea
              value={formData.guidelines}
              onChange={(e) => handleChange('guidelines', e.target.value)}
              placeholder="Example:
- Use a bright, energetic tone that appeals to young professionals
- DO highlight the sustainability features of our products
- DON'T mention competitor brands
- Include hashtags: #EcoFriendly #SustainableLiving #GreenProducts
- Tag our account: @YourBrandName
- Caption should be 150-200 words
- Link to our website in bio: www.yourbrand.com/newcollection"
              rows={8}
              className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 transition-colors ${
                errors.guidelines
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                  : 'border-gray-300 focus:border-primary focus:ring-primary/20'
              }`}
            />
            <div className="flex justify-between items-center mt-1">
              {errors.guidelines ? (
                <p className="text-xs text-red-600">{errors.guidelines}</p>
              ) : (
                <p className="text-xs text-gray-500">
                  Include tone, messaging, hashtags, tags, and any brand guidelines
                </p>
              )}
              <span className={`text-xs ${characterCount.guidelines >= 30 ? 'text-green-600' : 'text-gray-400'}`}>
                {characterCount.guidelines} / 30 min
              </span>
            </div>
          </div>

          {/* Field 3: Rules and Expectations (OPTIONAL) */}
          <div>
            <label className="block mb-2">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold text-gray-900">
                  Rules & Expectations
                </span>
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-medium">
                  Optional
                </span>
              </div>
              <p className="text-xs text-gray-600 mb-2">
                Specific requirements, deadlines, format, dimensions, compliance rules
              </p>
            </label>
            <textarea
              value={formData.rules}
              onChange={(e) => handleChange('rules', e.target.value)}
              placeholder="Example:
- All posts must be published by [date]
- Images must be in 1080x1080 format for feed posts
- Stories must be 1080x1920 format
- No alcohol, tobacco, or political content
- Must comply with FTC disclosure guidelines
- Draft content must be submitted for approval 3 days before posting
- Maximum 2 rounds of revisions allowed"
              rows={6}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:border-primary focus:ring-primary/20 transition-colors"
            />
            <div className="flex justify-between items-center mt-1">
              <p className="text-xs text-gray-500">
                Include deadlines, format requirements, and compliance rules
              </p>
              <span className="text-xs text-gray-400">
                {characterCount.rules} characters
              </span>
            </div>
          </div>

          {/* Field 4: Additional Notes (OPTIONAL) */}
          <div>
            <label className="block mb-2">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold text-gray-900">
                  Additional Notes
                </span>
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-medium">
                  Optional
                </span>
              </div>
              <p className="text-xs text-gray-600 mb-2">
                Anything else the creator should know
              </p>
            </label>
            <textarea
              value={formData.additional_notes}
              onChange={(e) => handleChange('additional_notes', e.target.value)}
              placeholder="Example:
- We'll provide high-res product images via Google Drive link
- Please use the brand color palette (attached in project files)
- Feel free to add your personal style while staying on-brand
- We're excited to work with you!"
              rows={4}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:border-primary focus:ring-primary/20 transition-colors"
            />
            <div className="flex justify-between items-center mt-1">
              <p className="text-xs text-gray-500">
                Any extra context, resources, or encouragement for the creator
              </p>
              <span className="text-xs text-gray-400">
                {characterCount.additional_notes} characters
              </span>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4">
            <div className="flex gap-3">
              <FaInfoCircle className="text-yellow-600 flex-shrink-0 mt-0.5" size={20} />
              <div className="text-sm text-yellow-900">
                <p className="font-semibold mb-2">Why are these details important?</p>
                <ul className="space-y-1 text-yellow-800">
                  <li>• Clear instructions reduce back-and-forth and misunderstandings</li>
                  <li>• Creators will see these details immediately when the collaboration starts</li>
                  <li>• Better briefs lead to better results and fewer revisions</li>
                  <li>• These details remain visible throughout the entire collaboration</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-6">
          <div className="flex gap-3">
            <button
              onClick={handleSkip}
              disabled={isSubmitting}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors font-medium disabled:opacity-50"
            >
              Skip (Not Recommended)
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !formData.brief.trim() || !formData.guidelines.trim()}
              className="flex-1 px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Saving...
                </>
              ) : (
                <>
                  <FaCheckCircle size={20} />
                  Continue to Payment
                </>
              )}
            </button>
          </div>
          <p className="text-xs text-gray-600 text-center mt-3">
            You'll be able to add payment details on the next screen
          </p>
        </div>
      </div>
    </div>
  );
};

export default CollaborationDetailsForm;
