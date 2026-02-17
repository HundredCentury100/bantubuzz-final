import { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is logged in on mount
    const storedUser = localStorage.getItem('user');
    const storedProfile = localStorage.getItem('profile');
    const token = localStorage.getItem('access_token');

    if (storedUser && token) {
      try {
        const parsedUser = JSON.parse(storedUser);
        const parsedProfile = storedProfile ? JSON.parse(storedProfile) : null;

        setUser(parsedUser);
        setProfile(parsedProfile);
        setLoading(false);

        // Verify token in background (non-blocking)
        authAPI.getCurrentUser()
          .then((response) => {
            setUser(response.data.user);
            setProfile(response.data.profile);
            localStorage.setItem('user', JSON.stringify(response.data.user));
            localStorage.setItem('profile', JSON.stringify(response.data.profile));
          })
          .catch((error) => {
            // Only logout if it's truly an auth error (401/403)
            if (error.response && (error.response.status === 401 || error.response.status === 403)) {
              // Token invalid, clear auth
              localStorage.removeItem('access_token');
              localStorage.removeItem('refresh_token');
              localStorage.removeItem('user');
              localStorage.removeItem('profile');
              setUser(null);
              setProfile(null);
            }
            // Otherwise, keep user logged in with cached data
          });
      } catch (error) {
        console.error('Error parsing stored user data:', error);
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (credentials) => {
    try {
      const response = await authAPI.login(credentials);
      const { access_token, refresh_token, user: userData, profile: profileData } = response.data;

      // Store tokens and user data
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('profile', JSON.stringify(profileData));

      setUser(userData);
      setProfile(profileData);

      toast.success('Login successful!');

      // Redirect based on user type
      if (userData.user_type === 'creator') {
        navigate('/creator/dashboard');
      } else {
        navigate('/brand/dashboard');
      }

      return response.data;
    } catch (error) {
      const message = error.response?.data?.error || 'Login failed';
      toast.error(message);
      throw error;
    }
  };

  const registerCreator = async (data) => {
    try {
      const response = await authAPI.registerCreator(data);
      toast.success('Account created! Please check your email to verify your account.');
      navigate('/login');
      return response.data;
    } catch (error) {
      const message = error.response?.data?.error || 'Registration failed';
      toast.error(message);
      throw error;
    }
  };

  const registerBrand = async (data) => {
    try {
      const response = await authAPI.registerBrand(data);
      toast.success('Account created! Please check your email to verify your account.');
      navigate('/login');
      return response.data;
    } catch (error) {
      const message = error.response?.data?.error || 'Registration failed';
      toast.error(message);
      throw error;
    }
  };

  const googleLoginCreator = async (credential) => {
    try {
      const response = await authAPI.googleCreatorAuth(credential);
      const data = response.data;

      if (data.needs_profile_completion) {
        // New Google user - store temp token and redirect to profile completion
        localStorage.setItem('access_token', data.temp_token);
        localStorage.setItem('google_signup_pending', 'true');
        localStorage.setItem('user', JSON.stringify(data.user));
        setUser(data.user);
        navigate('/register/creator/complete-profile', {
          state: {
            googleName: data.google_name,
            googleEmail: data.google_email
          }
        });
      } else {
        // Existing user - full login
        const { access_token, refresh_token, user: userData, profile: profileData } = data;
        localStorage.setItem('access_token', access_token);
        localStorage.setItem('refresh_token', refresh_token);
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('profile', JSON.stringify(profileData));
        localStorage.removeItem('google_signup_pending');
        setUser(userData);
        setProfile(profileData);
        toast.success('Signed in with Google!');
        navigate('/creator/dashboard');
      }
      return data;
    } catch (error) {
      const message = error.response?.data?.error || 'Google sign-in failed';
      toast.error(message);
      throw error;
    }
  };

  const googleCompleteProfile = async (formData) => {
    try {
      const response = await authAPI.googleCompleteProfile(formData);
      const { access_token, refresh_token, user: userData, profile: profileData } = response.data;

      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('profile', JSON.stringify(profileData));
      localStorage.removeItem('google_signup_pending');

      setUser(userData);
      setProfile(profileData);
      toast.success('Profile created successfully! Welcome to BantuBuzz!');
      navigate('/creator/dashboard');
      return response.data;
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to complete profile';
      toast.error(message);
      throw error;
    }
  };

  const logout = () => {
    authAPI.logout().catch(() => {
      // Ignore errors on logout
    });

    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    localStorage.removeItem('profile');

    setUser(null);
    setProfile(null);

    toast.success('Logged out successfully');
    navigate('/');
  };

  const updateProfile = (newProfile) => {
    setProfile(newProfile);
    localStorage.setItem('profile', JSON.stringify(newProfile));
  };

  const value = {
    user,
    profile,
    loading,
    login,
    logout,
    registerCreator,
    registerBrand,
    updateProfile,
    googleLoginCreator,
    googleCompleteProfile,
    isAuthenticated: !!user,
    isCreator: user?.user_type === 'creator',
    isBrand: user?.user_type === 'brand',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default useAuth;
