import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../hooks/useAuth';
import Navbar from '../components/Navbar';
import SEO from '../components/SEO';

const GoogleProfileComplete = () => {
  const location = useLocation();
  const { googleCompleteProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const googleName = location.state?.googleName || '';
  const googleEmail = location.state?.googleEmail || '';

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      username: googleName.toLowerCase().replace(/[^a-zA-Z0-9_]/g, '_').replace(/^_+|_+$/g, '').slice(0, 30) || ''
    }
  });

  const password = watch('password');

  const onSubmit = async (data) => {
    setLoading(true);
    setError('');
    try {
      await googleCompleteProfile({
        username: data.username,
        password: data.password,
        phone_number: data.phone_number,
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to complete profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-light">
      <SEO
        title="Complete Your Creator Profile"
        description="Set up your BantuBuzz creator profile to get started."
      />
      <Navbar />

      <div className="container-custom section-padding">
        <div className="max-w-md mx-auto">
          <div className="card">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-100 mb-4">
                <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-dark mb-2">Almost there!</h1>
              <p className="text-gray-600">
                Google account connected{googleEmail ? ` (${googleEmail})` : ''}. <br />
                Just set your username, password and phone number.
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Error Message */}
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-800 text-sm">{error}</p>
                </div>
              )}

              {/* Username */}
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-dark mb-2">
                  Username <span className="text-red-500">*</span>
                </label>
                <input
                  id="username"
                  type="text"
                  className="input"
                  placeholder="your_creator_name"
                  {...register('username', {
                    required: 'Username is required',
                    minLength: {
                      value: 3,
                      message: 'Username must be at least 3 characters',
                    },
                    maxLength: {
                      value: 30,
                      message: 'Username must be less than 30 characters',
                    },
                    pattern: {
                      value: /^[a-zA-Z0-9_]+$/,
                      message: 'Username can only contain letters, numbers, and underscores',
                    },
                  })}
                />
                {errors.username && (
                  <p className="mt-1 text-sm text-error">{errors.username.message}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  This will be your public display name on BantuBuzz
                </p>
              </div>

              {/* Phone Number */}
              <div>
                <label htmlFor="phone_number" className="block text-sm font-medium text-dark mb-2">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  id="phone_number"
                  type="tel"
                  className="input"
                  placeholder="+263 77 123 4567"
                  {...register('phone_number', {
                    required: 'Phone number is required',
                    minLength: {
                      value: 7,
                      message: 'Please enter a valid phone number',
                    },
                  })}
                />
                {errors.phone_number && (
                  <p className="mt-1 text-sm text-error">{errors.phone_number.message}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-dark mb-2">
                  Set Password <span className="text-red-500">*</span>
                </label>
                <input
                  id="password"
                  type="password"
                  className="input"
                  placeholder="Create a strong password (min 8 chars)"
                  {...register('password', {
                    required: 'Password is required',
                    minLength: {
                      value: 8,
                      message: 'Password must be at least 8 characters',
                    },
                  })}
                />
                {errors.password && (
                  <p className="mt-1 text-sm text-error">{errors.password.message}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  You can also use this password to log in without Google
                </p>
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-dark mb-2">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  className="input"
                  placeholder="Re-enter your password"
                  {...register('confirmPassword', {
                    required: 'Please confirm your password',
                    validate: (value) => value === password || 'Passwords do not match',
                  })}
                />
                {errors.confirmPassword && (
                  <p className="mt-1 text-sm text-error">{errors.confirmPassword.message}</p>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary w-full mt-2"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-dark mr-2"></div>
                    Setting up your profile...
                  </div>
                ) : (
                  'Complete Setup & Start Creating'
                )}
              </button>
            </form>

            <div className="mt-4 text-center">
              <p className="text-xs text-gray-500">
                By continuing, you agree to our{' '}
                <Link to="/terms" className="text-primary hover:underline">Terms</Link>
                {' '}and{' '}
                <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GoogleProfileComplete;
