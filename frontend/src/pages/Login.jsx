import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../hooks/useAuth';
import { GoogleLogin } from '@react-oauth/google';
import Navbar from '../components/Navbar';
import SEO from '../components/SEO';
import { isNativeAppRuntime, openLiveAppRoute } from '../utils/nativeApp';

const Login = () => {
  const { login, verifyLogin2FA, googleLoginCreator } = useAuth();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [twoFactorEmail, setTwoFactorEmail] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const isNativeApp = isNativeAppRuntime();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const result = await login(data);
      if (result?.requires_2fa) {
        setTwoFactorEmail(result.email || data.email);
      }
    } catch (error) {
      // Error handled by useAuth
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async (event) => {
    event.preventDefault();
    if (!twoFactorCode || twoFactorCode.length < 6) return;
    setLoading(true);
    try {
      await verifyLogin2FA({ email: twoFactorEmail, code: twoFactorCode });
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

            {twoFactorEmail ? (
            <form onSubmit={handleVerify2FA} className="space-y-6">
              <div className="rounded-lg border border-primary/30 bg-primary/10 p-4 text-sm text-dark">
                We sent a login verification code to {twoFactorEmail}.
              </div>
              <div>
                <label htmlFor="two_factor_code" className="block text-sm font-medium text-dark mb-2">
                  Verification Code
                </label>
                <input
                  id="two_factor_code"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  className="input text-center text-2xl tracking-[0.35em]"
                  placeholder="000000"
                  value={twoFactorCode}
                  onChange={(event) => setTwoFactorCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                />
              </div>
              <button
                type="submit"
                disabled={loading || twoFactorCode.length !== 6}
                className="btn btn-primary w-full"
              >
                {loading ? 'Verifying...' : 'Verify and Login'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setTwoFactorEmail('');
                  setTwoFactorCode('');
                }}
                className="btn btn-secondary w-full"
                disabled={loading}
              >
                Back to Login
              </button>
            </form>
            ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-dark mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  autoComplete="username email"
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
                    name="password"
                    autoComplete="current-password"
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
            )}

            {/* Google Sign In for Creators */}
            {!twoFactorEmail && (
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
                ) : isNativeApp ? (
                  <button
                    type="button"
                    onClick={() => openLiveAppRoute('/login')}
                    className="flex w-[300px] max-w-full items-center justify-center gap-3 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
                  >
                    <svg className="h-5 w-5" viewBox="0 0 48 48" aria-hidden="true">
                      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
                      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.2 4 9.4 8.5 6.3 14.7z" />
                      <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.5-5.2l-6.2-5.2C29.3 35.1 26.8 36 24 36c-5.2 0-9.6-3.3-11.3-7.8l-6.5 5C9.3 39.6 16.1 44 24 44z" />
                      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.6l6.2 5.2C36.9 39.4 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
                    </svg>
                    Continue with Google
                  </button>
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
            )}

            {/* Sign Up Links */}
            {!twoFactorEmail && (
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
