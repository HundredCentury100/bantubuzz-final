import { useState } from 'react';

const SafetyWarningModal = ({ isOpen, onClose, warningType, message, detectedPatterns, onEdit, onSendAnyway }) => {
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const warningConfig = {
    harmful_language: {
      title: 'This message may violate community standards',
      icon: '⚠️',
      color: 'red',
      description: 'Your message contains language that could be harmful or abusive. Our community guidelines prohibit harassment and threats.',
      examples: detectedPatterns?.length > 0
        ? `Detected: ${detectedPatterns.join(', ')}`
        : null
    },
    contact_sharing: {
      title: 'For your safety, keep communication on BantuBuzz',
      icon: '🛡️',
      color: 'yellow',
      description: 'Sharing contact details or moving conversations off-platform may remove payment protection and void dispute support.',
      examples: 'Your message appears to contain contact information like phone numbers or email addresses.'
    }
  };

  const config = warningConfig[warningType] || warningConfig.harmful_language;

  const handleSendAnyway = async () => {
    setLoading(true);
    try {
      // Log warning to backend
      const token = localStorage.getItem('token');
      await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/messaging/safety/log-warning`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          conversation_id: 'temp_conv', // Will be set by parent
          warning_type: warningType,
          message_content: message,
          detected_patterns: detectedPatterns,
          user_action: 'sent_anyway'
        })
      });
    } catch (error) {
      console.error('Error logging warning:', error);
    } finally {
      setLoading(false);
      onSendAnyway?.();
    }
  };

  const handleEdit = () => {
    // Log that user chose to edit
    const token = localStorage.getItem('token');
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/messaging/safety/log-warning`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        conversation_id: 'temp_conv',
        warning_type: warningType,
        message_content: message,
        detected_patterns: detectedPatterns,
        user_action: 'edited'
      })
    }).catch(err => console.error('Error logging warning:', err));

    onEdit?.();
  };

  const handleCancel = () => {
    // Log that user cancelled
    const token = localStorage.getItem('token');
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/messaging/safety/log-warning`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        conversation_id: 'temp_conv',
        warning_type: warningType,
        message_content: message,
        detected_patterns: detectedPatterns,
        user_action: 'cancelled'
      })
    }).catch(err => console.error('Error logging warning:', err));

    onClose?.();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-lg max-w-md w-full p-6">
        {/* Icon and Title */}
        <div className="text-center mb-6">
          <div className={`w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center ${
            config.color === 'red' ? 'bg-red-100' : 'bg-yellow-100'
          }`}>
            <span className="text-4xl">{config.icon}</span>
          </div>
          <h3 className="text-xl font-bold text-dark mb-2">{config.title}</h3>
          <p className="text-gray-600 text-sm">
            {config.description}
          </p>
        </div>

        {/* Message Preview */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Your Message:
          </label>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-700">{message}</p>
          </div>
          {config.examples && (
            <p className="text-xs text-gray-500 mt-2 italic">
              {config.examples}
            </p>
          )}
        </div>

        {/* Warning Box */}
        <div className={`border-2 rounded-lg p-4 mb-6 ${
          config.color === 'red'
            ? 'bg-red-50 border-red-200'
            : 'bg-yellow-50 border-yellow-200'
        }`}>
          <p className={`text-sm font-medium mb-2 ${
            config.color === 'red' ? 'text-red-800' : 'text-yellow-800'
          }`}>
            Would you like to review it before sending?
          </p>
          <ul className={`text-sm space-y-1 ml-4 list-disc ${
            config.color === 'red' ? 'text-red-700' : 'text-yellow-700'
          }`}>
            <li>Edit your message to be more respectful</li>
            <li>Cancel and think about your approach</li>
            <li>Or proceed if you believe this is appropriate</li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <button
            onClick={handleEdit}
            className="w-full px-6 py-3 bg-primary text-dark rounded-full font-medium hover:bg-primary/90 transition-colors"
          >
            Edit Message
          </button>
          <div className="flex gap-3">
            <button
              onClick={handleCancel}
              className="flex-1 px-6 py-3 bg-gray-100 text-dark rounded-full font-medium hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSendAnyway}
              disabled={loading}
              className="flex-1 px-6 py-3 bg-gray-700 text-white rounded-full font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send Anyway'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SafetyWarningModal;
