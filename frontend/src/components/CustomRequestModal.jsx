import { useState } from 'react';
import { customPackagesAPI } from '../services/api';
import toast from 'react-hot-toast';

const CustomRequestModal = ({ onClose, onSuccess, creatorId }) => {
  const [formData, setFormData] = useState({
    expected_deliverables: [''],
    budget: '',
    additional_notes: ''
  });
  const [loading, setLoading] = useState(false);

  const handleAddDeliverable = () => {
    setFormData({
      ...formData,
      expected_deliverables: [...formData.expected_deliverables, '']
    });
  };

  const handleRemoveDeliverable = (index) => {
    const newDeliverables = formData.expected_deliverables.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      expected_deliverables: newDeliverables.length > 0 ? newDeliverables : ['']
    });
  };

  const handleDeliverableChange = (index, value) => {
    const newDeliverables = [...formData.expected_deliverables];
    newDeliverables[index] = value;
    setFormData({
      ...formData,
      expected_deliverables: newDeliverables
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    const validDeliverables = formData.expected_deliverables.filter(d => d.trim());
    if (validDeliverables.length === 0) {
      toast.error('Please add at least one deliverable');
      return;
    }

    if (!formData.budget || parseFloat(formData.budget) <= 0) {
      toast.error('Please enter a valid budget');
      return;
    }

    try {
      setLoading(true);
      const response = await customPackagesAPI.createRequest({
        creator_id: creatorId,
        expected_deliverables: validDeliverables,
        budget: parseFloat(formData.budget),
        additional_notes: formData.additional_notes
      });

      if (response.data.success) {
        toast.success('Custom package request sent successfully!');
        onSuccess();
      }
    } catch (error) {
      console.error('Error creating request:', error);
      toast.error(error.response?.data?.error || 'Failed to send request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-2xl w-full p-6 my-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-dark">Create Custom Package Request</h2>
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
          {/* Budget */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Budget (USD) *
            </label>
            <div className="relative">
              <span className="absolute left-4 top-3 text-gray-500">$</span>
              <input
                type="number"
                step="0.01"
                value={formData.budget}
                onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                placeholder="Enter your budget"
                className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              />
            </div>
          </div>

          {/* Expected Deliverables */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Expected Deliverables *
            </label>
            <div className="space-y-3">
              {formData.expected_deliverables.map((deliverable, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={deliverable}
                    onChange={(e) => handleDeliverableChange(index, e.target.value)}
                    placeholder={`Deliverable ${index + 1}`}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                  {formData.expected_deliverables.length > 1 && (
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

          {/* Additional Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Notes (Optional)
            </label>
            <textarea
              value={formData.additional_notes}
              onChange={(e) => setFormData({ ...formData, additional_notes: e.target.value })}
              placeholder="Any specific requirements or details..."
              rows="4"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
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
              {loading ? 'Sending...' : 'Send Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CustomRequestModal;
