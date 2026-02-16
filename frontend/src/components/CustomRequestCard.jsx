import { useState, useEffect } from 'react';
import { customPackagesAPI } from '../services/api';

const CustomRequestCard = ({ message, isOwnMessage }) => {
  const [requestData, setRequestData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (message.custom_request_id) {
      loadRequestData();
    }
  }, [message.custom_request_id]);

  const loadRequestData = async () => {
    try {
      const response = await customPackagesAPI.getRequest(message.custom_request_id);
      setRequestData(response.data.request);
    } catch (error) {
      console.error('Error loading request data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`max-w-[85%] ${isOwnMessage ? 'ml-auto' : 'mr-auto'}`}>
        <div className="bg-white border-2 border-primary/30 rounded-lg p-4 shadow-sm">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!requestData) {
    return null;
  }

  return (
    <div className={`max-w-[85%] ${isOwnMessage ? 'ml-auto' : 'mr-auto'}`}>
      <div className="bg-white border-2 border-primary rounded-lg shadow-md overflow-hidden">
        {/* Header */}
        <div className="bg-primary/10 px-4 py-3 border-b border-primary/20">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="font-bold text-primary text-lg">Custom Package Request</h3>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 py-4 space-y-3">
          {/* Budget */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm font-medium text-gray-600">Budget</span>
            <span className="text-xl font-bold text-primary">${parseFloat(requestData.budget).toFixed(2)}</span>
          </div>

          {/* Deliverables */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Expected Deliverables:</h4>
            <ul className="space-y-1.5">
              {requestData.expected_deliverables.map((deliverable, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                  <svg className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>{deliverable}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Additional Notes */}
          {requestData.additional_notes && (
            <div className="border-t pt-3">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Additional Notes:</h4>
              <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg whitespace-pre-wrap">
                {requestData.additional_notes}
              </p>
            </div>
          )}

          {/* Status Badge */}
          <div className="flex items-center justify-between pt-2">
            <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
              requestData.status === 'pending'
                ? 'bg-yellow-100 text-yellow-800'
                : requestData.status === 'offer_sent'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-gray-100 text-gray-800'
            }`}>
              {requestData.status === 'pending' ? 'Awaiting Offer' :
               requestData.status === 'offer_sent' ? 'Offer Sent' :
               requestData.status}
            </span>
            <span className="text-xs text-gray-500">
              {new Date(requestData.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomRequestCard;
