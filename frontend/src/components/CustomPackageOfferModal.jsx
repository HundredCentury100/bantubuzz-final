import { useState, useEffect } from 'react';
import { customPackagesAPI } from '../services/api';
import toast from 'react-hot-toast';

const CustomPackageOfferModal = ({ request, onClose, onSuccess }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deliverables, setDeliverables] = useState(['']);
  const [price, setPrice] = useState('');
  const [deliveryTimeDays, setDeliveryTimeDays] = useState('');
  const [revisionsAllowed, setRevisionsAllowed] = useState(2);
  const [submitting, setSubmitting] = useState(false);

  // Pre-fill from request
  useEffect(() => {
    if (request) {
      setDeliverables(request.expected_deliverables || ['']);
      setPrice(request.budget?.toString() || '');
    }
  }, [request]);

  const addDeliverable = () => {
    setDeliverables([...deliverables, '']);
  };

  const removeDeliverable = (index) => {
    if (deliverables.length > 1) {
      setDeliverables(deliverables.filter((_, i) => i !== index));
    }
  };

  const updateDeliverable = (index, value) => {
    const newDeliverables = [...deliverables];
    newDeliverables[index] = value;
    setDeliverables(newDeliverables);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    const validDeliverables = deliverables.filter(d => d.trim());
    if (validDeliverables.length === 0) {
      toast.error('Please add at least one deliverable');
      return;
    }

    if (!price || parseFloat(price) <= 0) {
      toast.error('Please enter a valid price');
      return;
    }

    if (!deliveryTimeDays || parseInt(deliveryTimeDays) <= 0) {
      toast.error('Please enter a valid delivery time');
      return;
    }

    try {
      setSubmitting(true);

      const response = await customPackagesAPI.createOffer({
        request_id: request.id,
        title,
        description,
        deliverables: validDeliverables,
        price: parseFloat(price),
        delivery_time_days: parseInt(deliveryTimeDays),
        revisions_allowed: parseInt(revisionsAllowed)
      });

      if (response.data.success) {
        toast.success('Custom package offer sent successfully!');
        onSuccess && onSuccess(response.data.offer);
        onClose();
      }
    } catch (error) {
      console.error('Error creating offer:', error);
      toast.error(error.response?.data?.error || 'Failed to send custom package offer');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-dark">Create Custom Package Offer</h2>
              <p className="text-sm text-gray-600 mt-1">Send your proposal to {request?.brand?.company_name}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Show Original Request */}
          {request && (
            <div className="mb-6 p-4 bg-light rounded-lg border border-gray-200">
              <h3 className="font-semibold text-dark mb-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Brand's Request
              </h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Budget:</span>
                  <span className="ml-2 text-primary font-semibold">${request.budget}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Expected Deliverables:</span>
                  <ul className="list-disc list-inside text-gray-600 ml-2 mt-1">
                    {request.expected_deliverables?.map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                </div>
                {request.additional_notes && (
                  <div>
                    <span className="font-medium text-gray-700">Additional Notes:</span>
                    <p className="text-gray-600 mt-1">{request.additional_notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Package Title */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Package Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Custom Instagram Campaign Package"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              />
            </div>

            {/* Description */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Package Description *
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this package includes and how you'll deliver value..."
                rows="4"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              />
            </div>

            {/* Deliverables */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Deliverables *
                </label>
                <button
                  type="button"
                  onClick={addDeliverable}
                  className="text-sm text-primary hover:text-primary-dark transition-colors"
                >
                  + Add Deliverable
                </button>
              </div>
              <div className="space-y-2">
                {deliverables.map((deliverable, index) => (
                  <div key={index} className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={deliverable}
                      onChange={(e) => updateDeliverable(index, e.target.value)}
                      placeholder="e.g., 3 Instagram posts with carousel design"
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      required
                    />
                    {deliverables.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeDeliverable(index)}
                        className="px-4 py-3 w-full sm:w-auto border border-error/30 text-error rounded-lg hover:bg-error/10 transition-colors"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Price and Delivery Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Price (USD) *
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="500"
                    min="1"
                    step="0.01"
                    className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Delivery Time (Days) *
                </label>
                <input
                  type="number"
                  value={deliveryTimeDays}
                  onChange={(e) => setDeliveryTimeDays(e.target.value)}
                  placeholder="7"
                  min="1"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                />
              </div>
            </div>

            {/* Revisions */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Revisions Allowed *
              </label>
              <input
                type="number"
                value={revisionsAllowed}
                onChange={(e) => setRevisionsAllowed(e.target.value)}
                min="0"
                max="10"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              />
              <p className="mt-1 text-sm text-gray-500">
                Number of free revisions included in this package
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 btn btn-primary"
                disabled={submitting}
              >
                {submitting ? 'Sending Offer...' : 'Send Offer'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CustomPackageOfferModal;
