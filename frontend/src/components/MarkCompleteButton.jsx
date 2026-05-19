import { useState } from 'react';
import { FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import { collaborationsAPI } from '../services/api';
import toast from 'react-hot-toast';

/**
 * MarkCompleteButton - Allows brand to mark collaboration as complete
 *
 * User Stories 10 & 12: As a brand manager I need to mark the collaboration
 * as complete after reviewing the live posts so that payment is released to the creator.
 *
 * Acceptance Criteria:
 * - Visible after creator submits live post URLs
 * - Shows confirmation modal before marking complete
 * - Releases escrow payment to creator wallet
 * - Sends notifications to both parties
 * - Shows review prompt after completion (future)
 */
const MarkCompleteButton = ({
  collaborationId,
  collaborationTitle,
  creatorName,
  amount,
  onSuccess,
  className = ''
}) => {
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleMarkComplete = async () => {
    try {
      setIsSubmitting(true);

      const response = await collaborationsAPI.markComplete(collaborationId);

      if (response.data.success) {
        toast.success('Collaboration marked as complete! Payment released to creator.');
        setShowModal(false);

        // Call onSuccess callback
        if (onSuccess) {
          onSuccess(response.data);
        }
      }
    } catch (error) {
      console.error('Failed to mark collaboration complete:', error);
      toast.error(error.response?.data?.error || 'Failed to mark collaboration complete');
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={`px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-colors flex items-center gap-2 ${className}`}
      >
        <FaCheckCircle size={20} />
        Mark This Collaboration As Complete
      </button>

      {/* Confirmation Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg">
            {/* Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-green-100 rounded-full">
                  <FaCheckCircle className="text-green-600" size={24} />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Mark Collaboration Complete?
                </h2>
              </div>
              <p className="text-gray-600 ml-11">
                {collaborationTitle}
              </p>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                <p className="text-sm text-blue-900 font-medium mb-2">
                  What happens when you mark this complete:
                </p>
                <ul className="space-y-2 text-sm text-blue-800">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>
                      <strong>${parseFloat(amount).toFixed(2)}</strong> will be released from escrow to{' '}
                      <strong>{creatorName}'s</strong> wallet immediately
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>
                      Both you and the creator will receive completion notifications
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>
                      The collaboration status will change to "Completed"
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>
                      You'll be able to leave a review for the creator (optional)
                    </span>
                  </li>
                </ul>
              </div>

              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4">
                <div className="flex gap-3">
                  <FaExclamationTriangle className="text-yellow-600 flex-shrink-0 mt-0.5" size={20} />
                  <div className="text-sm text-yellow-900">
                    <p className="font-semibold mb-1">This action cannot be undone</p>
                    <p className="text-yellow-800">
                      Once you mark this collaboration complete, the payment will be released immediately
                      and you will not be able to request revisions.
                    </p>
                  </div>
                </div>
              </div>

              <div className="text-sm text-gray-600">
                <p>
                  <strong>Have concerns?</strong> If you're not satisfied with the deliverables,
                  please contact the creator through the messaging system before marking this complete.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
              <div className="flex gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  disabled={isSubmitting}
                  className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors font-medium disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleMarkComplete}
                  disabled={isSubmitting}
                  className="flex-1 px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Completing...
                    </>
                  ) : (
                    <>
                      <FaCheckCircle size={20} />
                      Yes, Mark Complete & Release Payment
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MarkCompleteButton;
