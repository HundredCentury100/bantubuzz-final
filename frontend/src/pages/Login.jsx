import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../hooks/useAuth';
import { GoogleLogin } from '@react-oauth/google';
import Navbar from '../components/Navbar';
import SEO from '../components/SEO';

const Login = () => {
  const { login, googleLoginCreator } = useAuth();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await login(data);
    } catch (error) {
      // Error handled by useAuth
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-light">
      <SEO
        title="Login"
        description="Sign in to your BantuBuzz account to manage collaborations, campaigns, and connect with creators or brands."
        keywords="login, sign in, account access"
      />
      <Navbar />

      <div className="container-custom section-padding">
        <div className="max-w-md mx-auto">
          <div className="card">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-dark mb-2">Welcome Back</h1>
              <p className="text-gray-600">Login to your BantuBuzz account</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
                    placeholder="Enter your password"
                    {...register('password', {
                      required: 'Password is required',
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

              {/* Forgot Password */}
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <Link to="/forgot-password" className="text-primary hover:text-primary-dark">
                    Forgot password?
                  </Link>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary w-full"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-dark mr-2"></div>
                    Logging in...
                  </div>
                ) : (
                  'Login'
                )}
              </button>
            </form>

            {/* Google Sign In for Creators */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-center text-sm text-gray-500 mb-4">
                Creator? Sign in with Google
              </p>
              <div className="flex justify-center">
                {googleLoading ? (
                  <div className="flex items-center justify-center py-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary mr-2"></div>
                    <span className="text-sm text-gray-600">Signing in...</span>
                  </div>
                ) : (
                  <GoogleLogin
                    onSuccess={async (credentialResponse) => {
                      setGoogleLoading(true);
                      try {
                        await googleLoginCreator(credentialResponse.credential);
                      } finally {
                        setGoogleLoading(false);
                      }
                    }}
                    onError={() => {
                      setGoogleLoading(false);
                    }}
                    useOneTap={false}
                    text="signin_with"
                    shape="rectangular"
                    theme="outline"
                    width="300"
                  />
                )}
              </div>
            </div>

            {/* Sign Up Links */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-center text-sm text-gray-600 mb-4">
                Don't have an account?
              </p>
              <div className="grid grid-cols-2 gap-4">
                <Link to="/register/creator" className="btn btn-outline text-sm">
                  Sign Up as Creator
                </Link>
                <Link to="/register/brand" className="btn btn-outline text-sm">
                  Sign Up as Brand
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
