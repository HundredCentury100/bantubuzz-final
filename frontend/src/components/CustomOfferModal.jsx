import { useState } from 'react';
import { customPackagesAPI } from '../services/api';
import toast from 'react-hot-toast';

const CustomOfferModal = ({ requestId, requestData, onClose, onSuccess }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deliverables, setDeliverables] = useState(requestData?.expected_deliverables || ['']);
  const [price, setPrice] = useState(requestData?.budget || '');
  const [deliveryTime, setDeliveryTime] = useState('7');
  const [revisions, setRevisions] = useState('2');
  const [submitting, setSubmitting] = useState(false);

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

    if (!title.trim()) {
      toast.error('Please enter an offer title');
      return;
    }

    if (!description.trim()) {
      toast.error('Please enter a description');
      return;
    }

    if (!price || parseFloat(price) <= 0) {
      toast.error('Please enter a valid price');
      return;
    }

    if (!deliveryTime || parseInt(deliveryTime) <= 0) {
      toast.error('Please enter a valid delivery time');
      return;
    }

    try {
      setSubmitting(true);

      const response = await customPackagesAPI.createOffer({
        request_id: requestId,
        title: title.trim(),
        description: description.trim(),
        deliverables: validDeliverables,
        price: parseFloat(price),
        delivery_time_days: parseInt(deliveryTime),
        revisions_allowed: parseInt(revisions)
      });

      if (response.data.success) {
        toast.success('Custom package offer sent successfully!');
        onSuccess && onSuccess(response.data.offer);
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
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-dark">Create Custom Offer</h2>
              <p className="text-sm text-gray-600 mt-1">
                Respond to {requestData?.brand?.company_name}'s request
              </p>
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

          <form onSubmit={handleSubmit}>
            {/* Package Title */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Package Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Instagram Content Creation Package"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              />
            </div>

            {/* Description */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
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
            <div className="mb-6">
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
                      placeholder="e.g., 3 Instagram posts with product photos"
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

            {/* Price and Delivery Time Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
              {/* Price */}
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

              {/* Delivery Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Delivery Time (Days) *
                </label>
                <input
                  type="number"
                  value={deliveryTime}
                  onChange={(e) => setDeliveryTime(e.target.value)}
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
                Revisions Allowed
              </label>
              <input
                type="number"
                value={revisions}
                onChange={(e) => setRevisions(e.target.value)}
                placeholder="2"
                min="0"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
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
                {submitting ? 'Sending...' : 'Send Offer'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CustomOfferModal;
