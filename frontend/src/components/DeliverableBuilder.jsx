import { useState } from 'react';
import { TrashIcon, PlusIcon } from '@heroicons/react/24/outline';

const DeliverableBuilder = ({ deliverables, onChange }) => {
  const platforms = ['Instagram', 'TikTok', 'YouTube', 'Facebook', 'Twitter', 'LinkedIn'];

  const contentTypes = {
    Instagram: ['Post', 'Reel', 'Story', 'IGTV'],
    TikTok: ['Video', 'Livestream'],
    YouTube: ['Video', 'Short', 'Livestream'],
    Facebook: ['Post', 'Video', 'Story', 'Livestream'],
    Twitter: ['Tweet', 'Thread'],
    LinkedIn: ['Post', 'Article', 'Video']
  };

  const addDeliverable = () => {
    onChange([...deliverables, { platform: '', content_type: '', quantity: 1 }]);
  };

  const updateDeliverable = (index, field, value) => {
    const updated = [...deliverables];
    updated[index][field] = value;

    // Reset content_type when platform changes
    if (field === 'platform') {
      updated[index].content_type = '';
    }

    onChange(updated);
  };

  const removeDeliverable = (index) => {
    onChange(deliverables.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      {deliverables.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
          <p className="text-gray-600 mb-4">No deliverables added yet</p>
          <button
            type="button"
            onClick={addDeliverable}
            className="inline-flex items-center gap-2 px-6 py-2 bg-primary hover:bg-primary-dark text-white font-medium rounded-lg transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
            Add First Deliverable
          </button>
        </div>
      ) : (
        <>
          {deliverables.map((deliverable, index) => (
            <div key={index} className="bg-gray-50 p-4 rounded-2xl border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-900">Deliverable {index + 1}</h4>
                <button
                  type="button"
                  onClick={() => removeDeliverable(index)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Remove deliverable"
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Platform */}
                <div>
                  <label className="block text-sm text-gray-700 mb-1">
                    Platform <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={deliverable.platform}
                    onChange={(e) => updateDeliverable(index, 'platform', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  >
                    <option value="">Select platform</option>
                    {platforms.map(platform => (
                      <option key={platform} value={platform}>{platform}</option>
                    ))}
                  </select>
                </div>

                {/* Content Type */}
                <div>
                  <label className="block text-sm text-gray-700 mb-1">
                    Content Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={deliverable.content_type}
                    onChange={(e) => updateDeliverable(index, 'content_type', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    disabled={!deliverable.platform}
                    required
                  >
                    <option value="">Select type</option>
                    {deliverable.platform && contentTypes[deliverable.platform]?.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                {/* Quantity */}
                <div>
                  <label className="block text-sm text-gray-700 mb-1">
                    Quantity <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={deliverable.quantity}
                    onChange={(e) => updateDeliverable(index, 'quantity', parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Qty"
                    required
                  />
                </div>
              </div>

              {/* Summary text */}
              {deliverable.platform && deliverable.content_type && (
                <div className="mt-3 p-2 bg-primary/5 rounded-lg">
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">{deliverable.quantity}</span> × <span className="font-medium">{deliverable.platform}</span> {deliverable.content_type}{deliverable.quantity > 1 ? 's' : ''}
                  </p>
                </div>
              )}
            </div>
          ))}

          <button
            type="button"
            onClick={addDeliverable}
            className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-primary hover:text-primary hover:bg-primary/5 transition-colors font-medium"
          >
            + Add Another Deliverable
          </button>

          {/* Overall summary */}
          <div className="bg-primary/10 p-4 rounded-2xl">
            <p className="font-medium text-gray-900 mb-2">Total Deliverables Summary</p>
            <div className="space-y-1">
              {deliverables.map((d, i) => (
                d.platform && d.content_type && (
                  <p key={i} className="text-sm text-gray-700">
                    • {d.quantity} × {d.platform} {d.content_type}{d.quantity > 1 ? 's' : ''}
                  </p>
                )
              ))}
            </div>
            <p className="text-sm text-gray-600 mt-2 pt-2 border-t border-primary/20">
              {deliverables.filter(d => d.platform && d.content_type).length} deliverable type{deliverables.filter(d => d.platform && d.content_type).length !== 1 ? 's' : ''} • {deliverables.reduce((sum, d) => sum + (d.quantity || 0), 0)} total pieces
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default DeliverableBuilder;
