import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { collaborationsAPI, paymentsAPI, BASE_URL } from '../services/api';
import { useAuth } from '../hooks/useAuth';

const RevisionPayment = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [revisionData, setRevisionData] = useState(null);
  const [collaboration, setCollaboration] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('paynow');
  const [processing, setProcessing] = useState(false);
  const [proofFile, setProofFile] = useState(null);

  useEffect(() => {
    // Get revision data from localStorage
    const storedData = localStorage.getItem('pending_revision_request');
    if (!storedData) {
      toast.error('No pending revision request found');
      navigate(-1);
      return;
    }

    const data = JSON.parse(storedData);
    if (data.booking_id !== parseInt(bookingId)) {
      toast.error('Invalid revision request');
      navigate(-1);
      return;
    }

    setRevisionData(data);
    fetchCollaboration(data.collaboration_id);
  }, [bookingId]);

  const fetchCollaboration = async (collabId) => {
    try {
      const response = await collaborationsAPI.getCollaboration(collabId);
      setCollaboration(response.data);
    } catch (error) {
      console.error('Error fetching collaboration:', error);
      toast.error('Failed to load collaboration details');
    } finally {
      setLoading(false);
    }
  };

  const handleProofUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only PDF, JPG, PNG, GIF files are allowed');
      return;
    }

    setProofFile(file);
    toast.success('File selected. Click Pay to submit.');
  };

  const handlePayment = async () => {
    if (paymentMethod === 'bank_transfer' && !proofFile) {
      toast.error('Please upload proof of payment');
      return;
    }

    setProcessing(true);

    try {
      if (paymentMethod === 'paynow') {
        // Create revision payment for Paynow
        const paymentResponse = await paymentsAPI.createRevisionPayment({
          collaboration_id: revisionData.collaboration_id,
          deliverable_id: revisionData.deliverable_id,
          amount: revisionData.fee,
          payment_method: paymentMethod,
          notes: revisionData.notes
        });

        if (paymentResponse.data.payment_url) {
          // Redirect to Paynow
          window.location.href = paymentResponse.data.payment_url;
        } else {
          throw new Error('Payment URL not received');
        }
      } else {
        // Bank transfer - upload POP
        const formData = new FormData();
        formData.append('file', proofFile);
        formData.append('deliverable_id', revisionData.deliverable_id);
        formData.append('notes', revisionData.notes);
        formData.append('fee', revisionData.fee);

        // Upload proof of payment
        const response = await fetch(
          `${BASE_URL}/api/payments/revision/${revisionData.collaboration_id}/upload-pop`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: formData
          }
        );

        if (!response.ok) {
          let errorMessage = 'Upload failed';
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
          } catch (e) {
            // If response isn't JSON, use status text
            errorMessage = `Upload failed: ${response.statusText || response.status}`;
          }
          throw new Error(errorMessage);
        }

        // Clear localStorage
        localStorage.removeItem('pending_revision_request');

        toast.success('Proof of payment uploaded! Awaiting admin verification.');
        navigate(`/brand/collaborations/${revisionData.collaboration_id}`);
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      toast.error(error.response?.data?.error || error.message || 'Payment failed');
    } finally {
      setProcessing(false);
    }
  };

  if (loading || !revisionData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-3xl shadow-sm p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Pay for Revision Request</h1>

          {/* Revision Details */}
          <div className="bg-blue-50 border border-blue-200 rounded-3xl p-4 mb-6">
            <h2 className="font-semibold text-blue-900 mb-2">Revision Details</h2>
            <div className="space-y-1 text-sm text-blue-800">
              <p><span className="font-medium">Deliverable:</span> {revisionData.deliverable_title}</p>
              <p><span className="font-medium">Revision Fee:</span> ${revisionData.fee}</p>
              <p className="text-xs mt-2 text-blue-600">
                This is a paid revision beyond the free revisions included in your collaboration.
              </p>
            </div>
          </div>

          {/* Payment Method Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Select Payment Method
            </label>
            <div className="space-y-3">
              <label className="flex items-center p-4 border-2 rounded-3xl cursor-pointer hover:border-primary transition-colors"
                     style={{ borderColor: paymentMethod === 'paynow' ? '#F15A29' : '#e5e7eb' }}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="paynow"
                  checked={paymentMethod === 'paynow'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="h-4 w-4 text-primary focus:ring-primary"
                />
                <div className="ml-3 flex-1">
                  <p className="font-medium text-gray-900">Paynow (Instant)</p>
                  <p className="text-sm text-gray-500">Pay instantly using <strong>EcoCash</strong>, <strong>Innbucks</strong>, <strong>OneMoney</strong>, <strong>Omari</strong>, <strong>Visa</strong>, or <strong>Mastercard</strong> via Paynow</p>
                </div>
              </label>

              <label className="flex items-center p-4 border-2 rounded-3xl cursor-pointer hover:border-primary transition-colors"
                     style={{ borderColor: paymentMethod === 'bank_transfer' ? '#F15A29' : '#e5e7eb' }}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="bank_transfer"
                  checked={paymentMethod === 'bank_transfer'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="h-4 w-4 text-primary focus:ring-primary"
                />
                <div className="ml-3 flex-1">
                  <p className="font-medium text-gray-900">Direct Bank Transfer</p>
                  <p className="text-sm text-gray-500">Manual verification (1-2 business days)</p>
                </div>
              </label>
            </div>
          </div>

          {/* Bank Transfer Instructions */}
          {paymentMethod === 'bank_transfer' && (
            <div className="mb-6 bg-gray-50 border border-gray-200 rounded-3xl p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Bank Transfer Instructions</h3>
              <div className="text-sm text-gray-700 space-y-2">
                <p><span className="font-medium">Bank:</span> ZB Bank</p>
                <p><span className="font-medium">Account Name:</span> BantuBuzz Platform</p>
                <p><span className="font-medium">Account Number:</span> 4107123456789</p>
                <p><span className="font-medium">Amount:</span> ${revisionData.fee}</p>
                <p>
                  <span className="font-medium">Reference:</span>{' '}
                  <span className="font-mono bg-gray-200 px-2 py-0.5 rounded text-gray-800">
                    REV-{revisionData.collaboration_id}-{revisionData.deliverable_id}
                  </span>
                </p>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Proof of Payment <span className="text-red-500">*</span>
                </label>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleProofUpload}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary-dark"
                />
                {proofFile && (
                  <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-3xl">
                    <p className="text-sm text-green-700">✓ File selected: {proofFile.name}</p>
                    <p className="text-xs text-green-600">Click "Pay" button below to submit</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={handlePayment}
              disabled={processing || (paymentMethod === 'bank_transfer' && !proofFile)}
              className="flex-1 px-6 py-3 bg-primary hover:bg-primary-dark text-white font-medium rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing ? 'Processing...' : `Pay $${revisionData.fee}`}
            </button>
            <button
              onClick={() => {
                localStorage.removeItem('pending_revision_request');
                navigate(`/brand/collaborations/${revisionData.collaboration_id}`);
              }}
              disabled={processing}
              className="px-6 py-3 border-2 border-gray-300 hover:border-gray-400 text-gray-700 font-medium rounded-full transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RevisionPayment;
