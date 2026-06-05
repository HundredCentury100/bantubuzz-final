import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { campaignsAPI } from '../services/api';
import CampaignCartItem from './CampaignCartItem';
import CampaignCartPaymentModal from './CampaignCartPaymentModal';
import CollaborationDetailsForm from './CollaborationDetailsForm';
import toast from 'react-hot-toast';

const CampaignCart = ({ campaignId, onPaymentComplete }) => {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [totalAmount, setTotalAmount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [detailsFormOpen, setDetailsFormOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentMode, setPaymentMode] = useState(null); // 'all', 'selected', or specific item_id
  const [collaborationDetails, setCollaborationDetails] = useState(null);
  const [requiresContentReview, setRequiresContentReview] = useState(true);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [invoiceSelection, setInvoiceSelection] = useState(new Set());
  const [generatingInvoice, setGeneratingInvoice] = useState(false);

  useEffect(() => {
    fetchCartItems();
  }, [campaignId]);

  const fetchCartItems = async () => {
    try {
      setLoading(true);
      const response = await campaignsAPI.getCart(campaignId);
      setCartItems(response.data.cart_items || []);
      setTotalAmount(response.data.total_amount || 0);
      setPendingCount(response.data.pending_count || 0);
    } catch (error) {
      console.error('Error fetching cart:', error);
      toast.error('Failed to load cart');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSelect = (itemId, isSelected) => {
    const newSelected = new Set(selectedItems);
    if (isSelected) {
      newSelected.add(itemId);
    } else {
      newSelected.delete(itemId);
    }
    setSelectedItems(newSelected);
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      const allIds = new Set(cartItems.map(item => item.id));
      setSelectedItems(allIds);
    } else {
      setSelectedItems(new Set());
    }
  };

  const openInvoiceModal = () => {
    setInvoiceSelection(new Set(cartItems.map(item => item.id)));
    setInvoiceModalOpen(true);
  };

  const toggleInvoiceItem = (itemId, checked) => {
    const nextSelection = new Set(invoiceSelection);
    if (checked) {
      nextSelection.add(itemId);
    } else {
      nextSelection.delete(itemId);
    }
    setInvoiceSelection(nextSelection);
  };

  const generateInvoice = async () => {
    if (invoiceSelection.size === 0) {
      toast.error('Select at least one creator for the invoice');
      return;
    }

    try {
      setGeneratingInvoice(true);
      const ids = Array.from(invoiceSelection);
      const response = await campaignsAPI.downloadCartProformaInvoice(campaignId, ids);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `campaign-${campaignId}-pro-forma-invoice.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setSelectedItems(new Set(ids));
      setInvoiceModalOpen(false);
      toast.success('Pro forma invoice downloaded');
    } catch (error) {
      console.error('Invoice generation failed:', error);
      toast.error(error.response?.data?.error || 'Failed to generate invoice');
    } finally {
      setGeneratingInvoice(false);
    }
  };

  const handleRemove = async (itemId) => {
    try {
      await campaignsAPI.removeFromCart(campaignId, itemId);
      // Remove from selected if it was selected
      const newSelected = new Set(selectedItems);
      newSelected.delete(itemId);
      setSelectedItems(newSelected);
      // Refresh cart
      fetchCartItems();
    } catch (error) {
      throw error;
    }
  };

  const handlePayIndividual = async (itemId) => {
    setPaymentMode(itemId);
    setDetailsFormOpen(true);
  };

  const handlePaySelected = () => {
    if (selectedItems.size === 0) {
      toast.error('Please select at least one item to pay for');
      return;
    }
    setPaymentMode('selected');
    setDetailsFormOpen(true);
  };

  const handlePayAll = () => {
    if (cartItems.length === 0) {
      toast.error('Cart is empty');
      return;
    }
    setPaymentMode('all');
    setDetailsFormOpen(true);
  };

  const handleDetailsSubmit = async (details) => {
    setCollaborationDetails(details);
    setDetailsFormOpen(false);
    setPaymentModalOpen(true);
  };

  const calculateSelectedTotal = () => {
    return cartItems
      .filter(item => selectedItems.has(item.id))
      .reduce((sum, item) => sum + parseFloat(item.amount), 0);
  };

  const allSelected = cartItems.length > 0 && selectedItems.size === cartItems.length;
  const someSelected = selectedItems.size > 0 && selectedItems.size < cartItems.length;
  const selectedTotal = calculateSelectedTotal();
  const invoiceTotal = cartItems
    .filter(item => invoiceSelection.has(item.id))
    .reduce((sum, item) => sum + parseFloat(item.amount), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-12 text-center">
        <svg className="w-24 h-24 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Campaign Cart is Empty</h3>
        <p className="text-gray-600 mb-6">
          Start adding creators to your campaign by inviting them, accepting applications, or adding their packages.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => navigate(`/brand/campaigns/${campaignId}/invite-creators`)}
            className="px-6 py-3 bg-primary hover:bg-primary-dark text-white font-medium rounded-lg transition-colors"
          >
            Invite Creators
          </button>
          <button
            onClick={() => navigate(`/brand/campaigns/${campaignId}/browse-packages`)}
            className="px-6 py-3 border-2 border-primary text-primary hover:bg-primary hover:text-white font-medium rounded-lg transition-colors"
          >
            Browse Packages
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Summary */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Campaign Cart</h2>
            <p className="text-gray-600 mt-1">
              {pendingCount} {pendingCount === 1 ? 'item' : 'items'} pending payment
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600 mb-1">Total Amount</div>
            <div className="text-3xl font-bold text-primary">
              ${totalAmount.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Bulk Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={allSelected}
                ref={input => {
                  if (input) {
                    input.indeterminate = someSelected;
                  }
                }}
                onChange={(e) => handleSelectAll(e.target.checked)}
                className="w-5 h-5 text-primary border-gray-300 rounded focus:ring-primary"
              />
              <span className="text-sm font-medium text-gray-700">
                {allSelected ? 'Deselect All' : someSelected ? `${selectedItems.size} Selected` : 'Select All'}
              </span>
            </label>

            {selectedItems.size > 0 && (
              <div className="text-sm text-gray-600">
                Selected Total: <span className="font-bold text-primary">${selectedTotal.toFixed(2)}</span>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={openInvoiceModal}
              className="px-6 py-2 border border-gray-300 text-gray-800 hover:bg-gray-50 font-medium rounded-lg transition-colors"
            >
              Download Invoice
            </button>
            {selectedItems.size > 0 && (
              <button
                onClick={handlePaySelected}
                className="px-6 py-2 bg-primary hover:bg-primary-dark text-white font-medium rounded-lg transition-colors"
              >
                Pay Selected ({selectedItems.size})
              </button>
            )}
            <button
              onClick={handlePayAll}
              className="px-6 py-2 bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-lg transition-colors"
            >
              Pay All Items
            </button>
          </div>
        </div>
      </div>

      {/* Cart Items List */}
      <div className="space-y-4">
        {cartItems.map(item => (
          <CampaignCartItem
            key={item.id}
            cartItem={item}
            isSelected={selectedItems.has(item.id)}
            onToggleSelect={handleToggleSelect}
            onRemove={handleRemove}
            onPay={handlePayIndividual}
            showCheckbox={true}
          />
        ))}
      </div>

      {/* Content Review Selection */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-3">Content Review Preference</h3>
        <p className="text-sm text-gray-600 mb-4">
          Would you like to review content before it's posted live?
        </p>

        <div className="space-y-3">
          <label className={`flex items-start gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all ${
            requiresContentReview
              ? 'border-primary bg-primary/5'
              : 'border-gray-200 hover:border-gray-300'
          }`}>
            <input
              type="radio"
              name="contentReview"
              checked={requiresContentReview}
              onChange={() => setRequiresContentReview(true)}
              className="mt-1 w-5 h-5 text-primary focus:ring-primary"
            />
            <div className="flex-1">
              <div className="font-semibold text-gray-900">YES - I want to review content before it goes live</div>
              <p className="text-sm text-gray-600 mt-1">
                Creators will submit drafts for your approval before posting. You can request revisions if needed.
              </p>
            </div>
          </label>

          <label className={`flex items-start gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all ${
            !requiresContentReview
              ? 'border-primary bg-primary/5'
              : 'border-gray-200 hover:border-gray-300'
          }`}>
            <input
              type="radio"
              name="contentReview"
              checked={!requiresContentReview}
              onChange={() => setRequiresContentReview(false)}
              className="mt-1 w-5 h-5 text-primary focus:ring-primary"
            />
            <div className="flex-1">
              <div className="font-semibold text-gray-900">NO - I trust this creator to follow the brief and guidelines</div>
              <p className="text-sm text-gray-600 mt-1">
                Creator will post directly without pre-approval. You'll have 3 days to review after posting.
              </p>
            </div>
          </label>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-4">
          <p className="text-xs text-yellow-800">
            <strong>Note:</strong> This setting will be locked once collaborations are created.
            {requiresContentReview
              ? ' You will review all content before it goes live.'
              : ' Creator will post directly and you can review within 3 days.'}
          </p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex gap-3">
          <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">How Cart Payment Works</p>
            <ul className="list-disc list-inside space-y-1 text-blue-700">
              <li>You can pay for all items at once, selected items in a batch, or one at a time</li>
              <li>Creators will only be notified AFTER payment is complete</li>
              <li>Collaborations will be created automatically upon successful payment</li>
              <li>You can remove items from cart before paying (refund policies still apply after payment)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Collaboration Details Form */}
      <CollaborationDetailsForm
        isOpen={detailsFormOpen}
        onClose={() => {
          setDetailsFormOpen(false);
          setPaymentMode(null);
        }}
        onSubmit={handleDetailsSubmit}
        cartItemsCount={
          typeof paymentMode === 'number'
            ? 1
            : paymentMode === 'selected'
            ? selectedItems.size
            : cartItems.length
        }
        requiresContentReview={requiresContentReview}
      />

      {/* Payment Modal */}
      <CampaignCartPaymentModal
        isOpen={paymentModalOpen}
        onClose={() => {
          setPaymentModalOpen(false);
          setPaymentMode(null);
          setCollaborationDetails(null);
        }}
        campaignId={campaignId}
        paymentMode={typeof paymentMode === 'number' ? 'individual' : paymentMode}
        cartItemIds={
          typeof paymentMode === 'number'
            ? [paymentMode]
            : paymentMode === 'selected'
            ? Array.from(selectedItems)
            : []
        }
        totalAmount={
          typeof paymentMode === 'number'
            ? parseFloat(cartItems.find(item => item.id === paymentMode)?.amount || 0)
            : paymentMode === 'selected'
            ? selectedTotal
            : totalAmount
        }
        collaborationDetails={collaborationDetails}
        requiresContentReview={requiresContentReview}
        onPaymentSuccess={() => {
          fetchCartItems();
          setSelectedItems(new Set());
          setCollaborationDetails(null);
          if (onPaymentComplete) onPaymentComplete();
        }}
      />

      {invoiceModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Generate Pro Forma Invoice</h3>
                <p className="text-sm text-gray-600 mt-1">Select the creators to include. Selected items will stay selected for checkout.</p>
              </div>
              <button
                onClick={() => setInvoiceModalOpen(false)}
                className="p-2 rounded-full hover:bg-gray-100"
              >
                <span className="sr-only">Close</span>
                &times;
              </button>
            </div>

            <div className="p-6 space-y-3">
              {cartItems.map(item => {
                const creatorName = item.creator?.display_name || item.creator?.username || 'Creator';
                const itemTitle = item.package?.title || item.proposal?.pitch || 'Campaign proposal';
                return (
                  <label key={item.id} className="flex items-start gap-4 p-4 border border-gray-200 rounded-xl cursor-pointer hover:border-primary">
                    <input
                      type="checkbox"
                      checked={invoiceSelection.has(item.id)}
                      onChange={(event) => toggleInvoiceItem(item.id, event.target.checked)}
                      className="mt-1 w-5 h-5 text-primary border-gray-300 rounded focus:ring-primary"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900">{creatorName}</div>
                      <div className="text-sm text-gray-600 truncate">{itemTitle}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {item.package?.platform_type || item.package?.platforms?.join(', ') || 'Campaign'}
                      </div>
                    </div>
                    <div className="font-bold text-gray-900">${parseFloat(item.amount).toFixed(2)}</div>
                  </label>
                );
              })}
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="text-sm text-gray-600">Running total</div>
                <div className="text-2xl font-bold text-primary">${invoiceTotal.toFixed(2)}</div>
              </div>
              <button
                onClick={generateInvoice}
                disabled={generatingInvoice || invoiceSelection.size === 0}
                className="px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors font-medium disabled:opacity-50"
              >
                {generatingInvoice ? 'Generating...' : 'Generate Invoice PDF'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CampaignCart;
