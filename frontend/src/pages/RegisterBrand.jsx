import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { authAPI } from '../services/api';
import Navbar from '../components/Navbar';
import SEO from '../components/SEO';

const RegisterBrand = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [accountType, setAccountType] = useState(null);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm();

  const password = watch('password');
  const accountCopy = {
    brand: {
      title: 'Create Brand Account',
      subtitle: 'Find and book creators for your business campaigns',
      nameLabel: 'Company Name',
      namePlaceholder: 'Your company name',
      countLabel: null,
      button: 'Create Brand Account',
      otpType: 'brand',
    },
    agency: {
      title: 'Create Agency Account',
      subtitle: 'Manage all your clients from one place',
      nameLabel: 'Agency Name',
      namePlaceholder: 'Rapportech Africa',
      countLabel: 'Number of Clients',
      countPlaceholder: '5 - 10 clients',
      button: 'Create Agency Account',
      otpType: 'agency',
    },
    enterprise: {
      title: 'Create Enterprise Account',
      subtitle: 'One platform for all your brands',
      nameLabel: 'Organisation Name',
      namePlaceholder: 'Econet Group',
      countLabel: 'Number of Brands',
      countPlaceholder: 'More than 10',
      button: 'Create Enterprise Account',
      otpType: 'enterprise',
    },
  };
  const currentCopy = accountCopy[accountType] || accountCopy.brand;

  const parseWorkspaceCount = (value) => {
    const counts = {
      '1-2': 2,
      '3-5': 5,
      '5-10': 10,
      'more-than-10': 11,
    };
    return counts[value] || null;
  };

  const onSubmit = async (data) => {
    setLoading(true);
    setError('');
    try {
      const response = await authAPI.registerBrand({
        email: data.email,
        password: data.password,
        company_name: data.company_name,
        account_type: accountType || 'brand',
        expected_workspace_count: parseWorkspaceCount(data.expected_workspace_count),
      });

      // Navigate to OTP verification page
      navigate('/verify-otp', {
        state: {
          email: data.email,
          userType: currentCopy.otpType
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
        title="Register as Brand"
        description="Join BantuBuzz as a brand. Find and collaborate with top African creators to amplify your marketing campaigns."
        keywords="brand registration, business signup, advertiser account"
      />
      <Navbar />

      <div className="container-custom section-padding">
        <div className="max-w-md mx-auto">
          <div className="card">
            {!accountType ? (
              <>
                <div className="text-center mb-8">
                  <h1 className="text-3xl font-bold text-dark mb-2">Join BantuBuzz</h1>
                  <p className="text-gray-600">Tell us who you are to get started</p>
                </div>
                <div className="space-y-3">
                  {[
                    ['brand', 'A Brand', 'I want to find and book creators for my business campaigns'],
                    ['agency', 'An Agency', 'I manage influencer campaigns for multiple client brands'],
                    ['enterprise', 'Enterprise', 'Large organisation with multiple brands and team members'],
                  ].map(([type, title, description]) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setAccountType(type)}
                      className="w-full rounded-2xl border border-gray-200 bg-white p-4 text-left transition-colors hover:border-primary hover:bg-primary/5"
                    >
                      <p className="font-bold text-dark">{title}</p>
                      <p className="mt-1 text-sm text-gray-600">{description}</p>
                    </button>
                  ))}
                </div>
                <div className="mt-6 text-center">
                  <p className="text-sm text-gray-600">
                    Already have an account?{' '}
                    <Link to="/login" className="text-primary hover:text-primary-dark font-medium">
                      Login
                    </Link>
                  </p>
                </div>
              </>
            ) : (
              <>
            <button
              type="button"
              onClick={() => setAccountType(null)}
              className="mb-6 text-sm font-medium text-gray-600 hover:text-dark"
            >
              Back to account type
            </button>
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-dark mb-2">{currentCopy.title}</h1>
              <p className="text-gray-600">{currentCopy.subtitle}</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Error Message */}
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-800 text-sm">{error}</p>
                </div>
              )}

              {/* Company Name */}
              <div>
                <label htmlFor="company_name" className="block text-sm font-medium text-dark mb-2">
                  {currentCopy.nameLabel}
                </label>
                <input
                  id="company_name"
                  type="text"
                  className="input"
                  placeholder={currentCopy.namePlaceholder}
                  {...register('company_name', {
                    required: `${currentCopy.nameLabel} is required`,
                  })}
                />
                {errors.company_name && (
                  <p className="mt-1 text-sm text-error">{errors.company_name.message}</p>
                )}
              </div>

              {currentCopy.countLabel && (
                <div>
                  <label htmlFor="expected_workspace_count" className="block text-sm font-medium text-dark mb-2">
                    {currentCopy.countLabel}
                  </label>
                  <select
                    id="expected_workspace_count"
                    className="input"
                    defaultValue=""
                    {...register('expected_workspace_count')}
                  >
                    <option value="" disabled>{currentCopy.countPlaceholder}</option>
                    <option value="1-2">1 - 2</option>
                    <option value="3-5">3 - 5</option>
                    <option value="5-10">5 - 10</option>
                    <option value="more-than-10">More than 10</option>
                  </select>
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
                  placeholder="you@company.com"
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
                  currentCopy.button
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
              </>
            )}
          </div>

          {/* Why Join */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-primary font-bold text-lg mb-1">Access Talent</div>
              <p className="text-sm text-gray-600">Thousands of verified African creators</p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-primary font-bold text-lg mb-1">Easy Campaigns</div>
              <p className="text-sm text-gray-600">Launch and manage campaigns effortlessly</p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-primary font-bold text-lg mb-1">Track Results</div>
              <p className="text-sm text-gray-600">Monitor performance in real-time</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterBrand;
