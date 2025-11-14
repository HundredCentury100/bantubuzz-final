import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authAPI } from '../services/api';
import OTPInput from '../components/OTPInput';
import Navbar from '../components/Navbar';

const VerifyOTP = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email;
  const userType = location.state?.userType;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (!email) {
      navigate('/');
    }
  }, [email, navigate]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleOTPComplete = async (otp) => {
    setLoading(true);
    setError('');

    try {
      await authAPI.verifyOTP({ email, code: otp });
      setSuccess(true);

      setTimeout(() => {
        navigate('/login', {
          state: { message: 'Email verified successfully! Please login.' }
        });
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid verification code. Please try again.');
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError('');

    try {
      await authAPI.resendOTP({ email });
      setResendCooldown(60); // 60 second cooldown
      setError('');
      alert('New verification code sent to your email!');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to resend code. Please try again.');
    } finally {
      setResending(false);
    }
  };

  if (!email) return null;

  return (
    <div className="min-h-screen bg-light">
      <Navbar />

      <div className="container-custom section-padding">
        <div className="max-w-md mx-auto">
          <div className="card">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-dark mb-2">Verify Your Email</h1>
              <p className="text-gray-600">
                We've sent a 6-digit code to
                <br />
                <span className="font-medium text-dark">{email}</span>
              </p>
            </div>

            {/* Success Message */}
            {success && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <p className="text-green-800 font-medium">Email verified successfully! Redirecting...</p>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            {/* OTP Input */}
            <div className="mb-8">
              <label className="block text-sm font-medium text-dark mb-4 text-center">
                Enter Verification Code
              </label>
              <OTPInput
                length={6}
                onComplete={handleOTPComplete}
                disabled={loading || success}
              />
              <p className="text-xs text-gray-500 text-center mt-3">
                The code will expire in 10 minutes
              </p>
            </div>

            {/* Resend Button */}
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-3">
                Didn't receive the code?
              </p>
              <button
                onClick={handleResend}
                disabled={resending || resendCooldown > 0 || loading || success}
                className="text-primary hover:text-primary-dark font-medium disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {resending ? (
                  <span className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                    Sending...
                  </span>
                ) : resendCooldown > 0 ? (
                  `Resend code in ${resendCooldown}s`
                ) : (
                  'Resend Code'
                )}
              </button>
            </div>

            {/* Back to Register */}
            <div className="mt-8 pt-6 border-t border-gray-200 text-center">
              <button
                onClick={() => navigate(-1)}
                className="text-sm text-gray-600 hover:text-dark transition-colors"
              >
                ← Back to registration
              </button>
            </div>
          </div>

          {/* Help Text */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">Having trouble?</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Check your spam/junk folder</li>
              <li>• Make sure you entered the correct email</li>
              <li>• Wait a few minutes for the email to arrive</li>
              <li>• Try resending the code</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyOTP;
