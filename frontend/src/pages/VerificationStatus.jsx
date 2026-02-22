import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../services/api';
import { CheckBadgeIcon, ClockIcon, XCircleIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

const VerificationStatus = () => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await api.get('/creator/verification/status');
      setStatus(response.data);
    } catch (error) {
      console.error('Error fetching status:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-light">
        <Navbar />
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-light">
      <Navbar />

      <div className="container-custom section-padding">
        <div className="max-w-3xl mx-auto">
          {/* Verified */}
          {status?.is_verified && (
            <div className="card text-center">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckBadgeIcon className="h-12 w-12 text-primary" />
              </div>
              <h1 className="text-3xl font-bold text-dark mb-3">You're Verified!</h1>
              <p className="text-gray-600 mb-6">
                Congratulations! Your profile now has the verified badge.
              </p>
              <Link to="/creator/dashboard" className="btn btn-primary inline-block">
                Go to Dashboard
              </Link>
            </div>
          )}

          {/* Pending Application */}
          {!status?.is_verified && status?.has_application && status?.application?.status === 'pending' && (
            <div className="card">
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <ClockIcon className="h-12 w-12 text-yellow-600" />
                </div>
                <h1 className="text-3xl font-bold text-dark mb-3">Application Under Review</h1>
                <p className="text-gray-600">
                  We're reviewing your verification application. This usually takes 1-3 business days.
                </p>
              </div>

              <div className="bg-gray-50 rounded-2xl p-6">
                <h2 className="font-bold text-dark mb-4">Application Details</h2>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Submitted:</span>
                    <span className="font-medium text-dark">
                      {new Date(status.application.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Name:</span>
                    <span className="font-medium text-dark">{status.application.real_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">ID Type:</span>
                    <span className="font-medium text-dark capitalize">{status.application.id_type.replace('_', ' ')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold">
                      Pending Review
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 text-center">
                <Link to="/creator/dashboard" className="text-primary hover:text-primary-dark font-medium">
                  Return to Dashboard
                </Link>
              </div>
            </div>
          )}

          {/* Rejected Application */}
          {!status?.is_verified && status?.has_application && status?.application?.status === 'rejected' && (
            <div className="card">
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <XCircleIcon className="h-12 w-12 text-red-600" />
                </div>
                <h1 className="text-3xl font-bold text-dark mb-3">Application Not Approved</h1>
                <p className="text-gray-600">
                  Unfortunately, your verification application was not approved.
                </p>
              </div>

              {status.application.rejection_reason && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-6 mb-6">
                  <h3 className="font-bold text-red-900 mb-2">Reason:</h3>
                  <p className="text-red-800">{status.application.rejection_reason}</p>
                </div>
              )}

              <div className="text-center">
                <Link
                  to="/creator/verification/apply"
                  className="btn btn-primary inline-block"
                >
                  Submit New Application
                </Link>
              </div>
            </div>
          )}

          {/* No Application */}
          {!status?.has_application && !status?.is_verified && (
            <div className="card text-center">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <DocumentTextIcon className="h-12 w-12 text-gray-400" />
              </div>
              <h1 className="text-3xl font-bold text-dark mb-3">No Application Found</h1>
              <p className="text-gray-600 mb-6">
                You haven't submitted a verification application yet.
              </p>
              <Link to="/creator/subscriptions" className="btn btn-primary inline-block">
                View Verification Plans
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerificationStatus;
