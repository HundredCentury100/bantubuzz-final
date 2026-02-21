import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';

const SubscriptionPaymentReturn = () => {
  const [searchParams] = useSearchParams();
  const [pageData, setPageData] = useState({
    status: 'pending',
    title: 'Payment Pending',
    message: 'Thank you! We are confirming your subscription payment.'
  });

  useEffect(() => {
    // Log all URL parameters for debugging
    const allParams = {};
    searchParams.forEach((value, key) => {
      allParams[key] = value;
    });
    console.log('SubscriptionPaymentReturn - All URL params:', allParams);

    // Check URL parameters from Paynow
    const reference = searchParams.get('reference');
    const status = searchParams.get('status');

    // Check localStorage for subscription ID
    const lastSubscriptionId = localStorage.getItem('lastSubscriptionId');
    console.log('LastSubscriptionId from localStorage:', lastSubscriptionId);

    // Determine what to display
    if (reference && status) {
      // We have parameters from Paynow
      console.log('Has Paynow params - reference:', reference, 'status:', status);

      if (status === 'Paid' || status === 'Delivered') {
        setPageData({
          status: 'success',
          title: 'Payment Successful!',
          message: 'Your subscription payment has been confirmed. Your subscription is now active!'
        });
      } else if (status === 'Cancelled') {
        setPageData({
          status: 'cancelled',
          title: 'Payment Cancelled',
          message: 'Your payment was cancelled. No charges were made.'
        });
      } else if (status === 'Failed') {
        setPageData({
          status: 'failed',
          title: 'Payment Failed',
          message: 'Your payment could not be processed. Please try again.'
        });
      } else {
        setPageData({
          status: 'pending',
          title: 'Payment Pending',
          message: 'Your payment is being processed. Check your subscription page for updates.'
        });
      }
    } else if (lastSubscriptionId) {
      // We have a subscription ID from localStorage
      console.log('Using localStorage subscription ID');
      setPageData({
        status: 'pending',
        title: 'Payment Submitted',
        message: 'Thank you! We are confirming your subscription payment. This may take a few moments.'
      });
      localStorage.removeItem('lastSubscriptionId');
    } else {
      // No parameters at all
      console.log('No params found');
      setPageData({
        status: 'pending',
        title: 'Payment Return',
        message: 'Please check your subscription page for payment status.'
      });
    }
  }, [searchParams]);

  // Render status icon
  const renderIcon = () => {
    if (pageData.status === 'success') {
      return (
        <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-12 h-12 text-primary-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      );
    } else if (pageData.status === 'failed' || pageData.status === 'cancelled') {
      return (
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
      );
    } else {
      return (
        <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-12 h-12 text-primary-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen bg-light">
      <Navbar />

      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          {/* Icon */}
          {renderIcon()}

          {/* Title */}
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            {pageData.title}
          </h1>

          {/* Message */}
          <p className="text-gray-600 text-lg mb-8">
            {pageData.message}
          </p>

          {/* Action Button */}
          <Link
            to="/subscription/manage"
            className="inline-block px-8 py-3 bg-primary hover:bg-primary-dark text-white font-medium rounded-lg transition-colors"
          >
            View Subscription
          </Link>

          {/* Transaction Reference */}
          {searchParams.get('reference') && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-600 mb-2">Transaction Reference</p>
              <p className="font-mono text-sm text-gray-900 bg-gray-100 px-4 py-2 rounded inline-block">
                {searchParams.get('reference')}
              </p>
            </div>
          )}

          {searchParams.get('paynowreference') && (
            <div className="mt-4">
              <p className="text-sm text-gray-600 mb-2">Paynow Reference</p>
              <p className="font-mono text-sm text-gray-900 bg-gray-100 px-4 py-2 rounded inline-block">
                {searchParams.get('paynowreference')}
              </p>
            </div>
          )}
        </div>

        {/* Help Info */}
        <div className="mt-6 bg-primary/10 border border-primary rounded-lg p-4">
          <div className="flex">
            <svg className="w-5 h-5 text-primary-dark mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div>
              <h3 className="font-medium text-primary-dark mb-1">Payment Processing</h3>
              <p className="text-sm text-primary-dark">
                Subscription payment confirmations may take a few minutes. Check your subscription page to see your status.
                If you have any issues, please contact support.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionPaymentReturn;
