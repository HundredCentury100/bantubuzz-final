import { useState } from 'react';
import { customPackagesAPI } from '../services/api';
import toast from 'react-hot-toast';

/**
 * Modal for creators to send custom offers directly to brands (without an existing request)
 * This creates a request first, then immediately creates an offer for it
 */
const CreateOfferDirectModal = ({ onClose, onSuccess, brandId }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    deliverables: [''],
    price: '',
    delivery_time_days: '7',
    revisions_allowed: '2'
  });
  const [loading, setLoading] = useState(false);

  const handleAddDeliverable = () => {
    setFormData({
      ...formData,
      deliverables: [...formData.deliverables, '']
    });
  };

  const handleRemoveDeliverable = (index) => {
    const newDeliverables = formData.deliverables.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      deliverables: newDeliverables.length > 0 ? newDeliverables : ['']
    });
  };

  const handleDeliverableChange = (index, value) => {
    const newDeliverables = [...formData.deliverables];
    newDeliverables[index] = value;
    setFormData({
      ...formData,
      deliverables: newDeliverables
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.title.trim()) {
      toast.error('Please enter a package title');
      return;
    }

    if (!formData.description.trim()) {
      toast.error('Please enter a description');
      return;
    }

    const validDeliverables = formData.deliverables.filter(d => d.trim());
    if (validDeliverables.length === 0) {
      toast.error('Please add at least one deliverable');
      return;
    }

    if (!formData.price || parseFloat(formData.price) <= 0) {
      toast.error('Please enter a valid price');
      return;
    }

    if (!formData.delivery_time_days || parseInt(formData.delivery_time_days) <= 0) {
      toast.error('Please enter a valid delivery time');
      return;
    }

    try {
      setLoading(true);

      // First, create a request on behalf of the brand (as placeholder)
      const requestResponse = await customPackagesAPI.createRequest({
        creator_id: brandId, // This will be swapped server-side to use the current user as creator
        expected_deliverables: validDeliverables,
        budget: parseFloat(formData.price),
        additional_notes: 'Direct offer from creator'
      });

      if (!requestResponse.data.success) {
        throw new Error('Failed to create request');
      }

      const requestId = requestResponse.data.request.id;

      // Then create the offer
      const offerResponse = await customPackagesAPI.createOffer({
        request_id: requestId,
        title: formData.title.trim(),
        description: formData.description.trim(),
        deliverables: validDeliverables,
        price: parseFloat(formData.price),
        delivery_time_days: parseInt(formData.delivery_time_days),
        revisions_allowed: parseInt(formData.revisions_allowed)
      });

      if (offerResponse.data.success) {
        toast.success('Custom package offer sent successfully!');
        onSuccess();
      }
    } catch (error) {
      console.error('Error creating offer:', error);
      toast.error(error.response?.data?.error || 'Failed to send offer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-2xl w-full p-6 my-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-dark">Create Custom Package Offer</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Package Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Instagram Reel + Story Package"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe what you'll deliver and any important details..."
              rows="4"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              required
            />
          </div>

          {/* Price and Delivery Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Price (USD) *
              </label>
              <div className="relative">
                <span className="absolute left-4 top-3 text-gray-500">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="0.00"
                  className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Delivery Time (days) *
              </label>
              <input
                type="number"
                value={formData.delivery_time_days}
                onChange={(e) => setFormData({ ...formData, delivery_time_days: e.target.value })}
                placeholder="7"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              />
            </div>
          </div>

          {/* Deliverables */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Deliverables *
            </label>
            <div className="space-y-3">
              {formData.deliverables.map((deliverable, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={deliverable}
                    onChange={(e) => handleDeliverableChange(index, e.target.value)}
                    placeholder={`Deliverable ${index + 1}`}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                  {formData.deliverables.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveDeliverable(index)}
                      className="px-3 py-2 text-error hover:bg-error/10 rounded-lg transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={handleAddDeliverable}
              className="mt-3 text-primary hover:text-primary-dark font-medium text-sm flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Another Deliverable
            </button>
          </div>

          {/* Revisions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Revisions Allowed
            </label>
            <select
              value={formData.revisions_allowed}
              onChange={(e) => setFormData({ ...formData, revisions_allowed: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="0">No revisions</option>
              <option value="1">1 revision</option>
              <option value="2">2 revisions</option>
              <option value="3">3 revisions</option>
              <option value="5">5 revisions</option>
              <option value="999">Unlimited</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-primary hover:bg-primary-dark text-white font-bold py-3 rounded-lg disabled:opacity-50 transition-colors"
            >
              {loading ? 'Sending...' : 'Send Offer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateOfferDirectModal;
