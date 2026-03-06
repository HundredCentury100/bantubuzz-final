import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { authAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { GoogleLogin } from '@react-oauth/google';
import Navbar from '../components/Navbar';
import SEO from '../components/SEO';

const RegisterCreator = () => {
  const navigate = useNavigate();
  const { googleLoginCreator } = useAuth();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm();

  const password = watch('password');

  const onSubmit = async (data) => {
    setLoading(true);
    setError('');
    try {
      const response = await authAPI.registerCreator({
        email: data.email,
        password: data.password,
        username: data.username,
        phone_number: data.phone_number,
      });

      // Navigate to OTP verification page
      navigate('/verify-otp', {
        state: {
          email: data.email,
          userType: 'creator'
        }
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-light">
      <SEO
        title="Register as Creator"
        description="Join BantuBuzz as a content creator. Showcase your work, connect with brands, and grow your influence across Africa."
        keywords="creator registration, influencer signup, content creator account"
      />
      <Navbar />

      <div className="container-custom section-padding">
        <div className="max-w-md mx-auto">
          <div className="card">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-dark mb-2">Join as a Creator</h1>
              <p className="text-gray-600">Start earning from your influence</p>
            </div>

            {/* Google Sign Up - Quick Option */}
            <div className="mb-6">
              <p className="text-center text-sm text-gray-500 mb-3">Sign up quickly with Google</p>
              <div className="flex justify-center">
                {googleLoading ? (
                  <div className="flex items-center justify-center py-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary mr-2"></div>
                    <span className="text-sm text-gray-600">Connecting to Google...</span>
                  </div>
                ) : (
                  <GoogleLogin
                    onSuccess={async (credentialResponse) => {
                      setGoogleLoading(true);
                      setError('');
                      try {
                        await googleLoginCreator(credentialResponse.credential);
                      } catch (err) {
                        setError(err.response?.data?.error || 'Google sign-up failed');
                      } finally {
                        setGoogleLoading(false);
                      }
                    }}
                    onError={() => {
                      setGoogleLoading(false);
                      setError('Google sign-up failed. Please try again.');
                    }}
                    useOneTap={false}
                    text="signup_with"
                    shape="rectangular"
                    theme="outline"
                    width="300"
                  />
                )}
              </div>
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-3 bg-white text-gray-500">Or sign up with email</span>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Error Message */}
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-800 text-sm">{error}</p>
                </div>
              )}

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-dark mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  className="input"
                  placeholder="you@example.com"
                  {...register('email', {
                    required: 'Email is required',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Invalid email address',
                    },
                  })}
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-error">{errors.email.message}</p>
                )}
              </div>

              {/* Username */}
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-dark mb-2">
                  Username
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
                  This will be your public display name
                </p>
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-dark mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    className="input pr-10"
                    placeholder="Create a strong password"
                    {...register('password', {
                      required: 'Password is required',
                      minLength: {
                        value: 8,
                        message: 'Password must be at least 8 characters',
                      },
                    })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-sm text-error">{errors.password.message}</p>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-dark mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    className="input pr-10"
                    placeholder="Re-enter your password"
                    {...register('confirmPassword', {
                      required: 'Please confirm your password',
                      validate: (value) => value === password || 'Passwords do not match',
                    })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                  >
                    {showConfirmPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="mt-1 text-sm text-error">{errors.confirmPassword.message}</p>
                )}
              </div>

              {/* Phone Number */}
              <div>
                <label htmlFor="phone_number" className="block text-sm font-medium text-dark mb-2">
                  Phone Number
                </label>
                <input
                  id="phone_number"
                  type="tel"
                  className="input"
                  placeholder="+263771234567"
                  {...register('phone_number', {
                    required: 'Phone number is required',
                    pattern: {
                      value: /^\+?[0-9\s\-()]{7,20}$/,
                      message: 'Please enter a valid phone number',
                    },
                  })}
                />
                {errors.phone_number && (
                  <p className="mt-1 text-sm text-error">{errors.phone_number.message}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Include country code (e.g. +263 for Zimbabwe)
                </p>
              </div>

              {/* Terms */}
              <div className="flex items-start">
                <input
                  id="terms"
                  type="checkbox"
                  className="mt-1 h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                  {...register('terms', {
                    required: 'You must accept the terms and conditions',
                  })}
                />
                <label htmlFor="terms" className="ml-2 block text-sm text-gray-600">
                  I agree to the{' '}
                  <Link to="/terms" className="text-primary hover:text-primary-dark">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link to="/privacy" className="text-primary hover:text-primary-dark">
                    Privacy Policy
                  </Link>
                </label>
              </div>
              {errors.terms && (
                <p className="mt-1 text-sm text-error">{errors.terms.message}</p>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary w-full"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-dark mr-2"></div>
                    Creating account...
                  </div>
                ) : (
                  'Create Creator Account'
                )}
              </button>
            </form>

            {/* Login Link */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <Link to="/login" className="text-primary hover:text-primary-dark font-medium">
                  Login
                </Link>
              </p>
            </div>
          </div>

          {/* Why Join */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-primary font-bold text-lg mb-1">Get Discovered</div>
              <p className="text-sm text-gray-600">Brands find you through our platform</p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-primary font-bold text-lg mb-1">Set Your Rates</div>
              <p className="text-sm text-gray-600">You control your pricing and packages</p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-primary font-bold text-lg mb-1">Get Paid Fast</div>
              <p className="text-sm text-gray-600">Direct payments via Paynow</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterCreator;
