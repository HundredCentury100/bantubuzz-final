import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { LinkIcon, ArrowPathIcon, XMarkIcon, CheckCircleIcon, ClockIcon } from '@heroicons/react/24/outline';

const ConnectPlatforms = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [platforms, setPlatforms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(null);
  const [syncing, setSyncing] = useState(null);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accessToken, setAccessToken] = useState('');

  // Available platforms
  const availablePlatforms = [
    {
      id: 'instagram',
      name: 'Instagram',
      color: 'from-pink-600 to-purple-600',
      iconColor: 'text-pink-600',
      requiresToken: false,
      requiresOAuth: true,
      oauthNote: 'Instagram requires OAuth authentication. You\'ll need to connect this through ThunziAI\'s dashboard first.',
      icon: (
        <svg className="w-12 h-12" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
        </svg>
      )
    },
    {
      id: 'tiktok',
      name: 'TikTok',
      color: 'from-gray-900 to-black',
      iconColor: 'text-gray-900',
      requiresToken: false,
      icon: (
        <svg className="w-12 h-12" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
        </svg>
      )
    },
    {
      id: 'youtube',
      name: 'YouTube',
      color: 'from-red-600 to-red-700',
      iconColor: 'text-red-600',
      requiresToken: false,
      icon: (
        <svg className="w-12 h-12" viewBox="0 0 24 24" fill="currentColor">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
        </svg>
      )
    },
    {
      id: 'facebook',
      name: 'Facebook',
      color: 'from-blue-600 to-blue-700',
      iconColor: 'text-blue-600',
      requiresToken: false,
      requiresOAuth: true,
      oauthNote: 'Facebook requires OAuth authentication. You\'ll need to connect this through ThunziAI\'s dashboard first.',
      icon: (
        <svg className="w-12 h-12" viewBox="0 0 24 24" fill="currentColor">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      )
    },
    {
      id: 'twitter',
      name: 'X (Twitter)',
      color: 'from-gray-900 to-black',
      iconColor: 'text-gray-900',
      requiresToken: false,
      icon: (
        <svg className="w-12 h-12" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      )
    }
  ];

  useEffect(() => {
    if (user?.user_type !== 'brand') {
      navigate('/');
      return;
    }
    fetchPlatforms();
  }, [user]);

  const fetchPlatforms = async () => {
    try{
      setLoading(true);
      const response = await api.get('/brand/platforms');
      if (response.data.success) {
        setPlatforms(response.data.platforms);
      }
    } catch (error) {
      console.error('Error fetching platforms:', error);
      toast.error('Failed to load connected platforms');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenConnectModal = (platformId) => {
    setSelectedPlatform(platformId);
    setAccountName('');
    setAccessToken('');
    setShowConnectModal(true);
  };

  const handleConnectPlatform = async (e) => {
    e.preventDefault();

    if (!accountName) {
      toast.error('Please enter your account username');
      return;
    }

    const platform = availablePlatforms.find(p => p.id === selectedPlatform);
    if (platform?.requiresToken && !accessToken) {
      toast.error('Access token is required for this platform');
      return;
    }

    try {
      setConnecting(selectedPlatform);
      const payload = {
        platform: selectedPlatform,
        accountName: accountName
      };

      if (accessToken) {
        payload.accessToken = accessToken;
      }

      const response = await api.post('/brand/platforms/connect', payload);

      if (response.data.success) {
        toast.success(response.data.message);
        setShowConnectModal(false);
        fetchPlatforms();
      }
    } catch (error) {
      console.error('Error connecting platform:', error);
      toast.error(error.response?.data?.error || 'Failed to connect platform');
    } finally {
      setConnecting(null);
    }
  };

  const handleSyncPlatform = async (platformId) => {
    try {
      setSyncing(platformId);
      const response = await api.post(`/brand/platforms/${platformId}/sync`);

      if (response.data.success) {
        toast.success('Sync completed successfully');
        fetchPlatforms();
      }
    } catch (error) {
      console.error('Error syncing platform:', error);
      toast.error(error.response?.data?.error || 'Failed to sync platform');
    } finally {
      setSyncing(null);
    }
  };

  const handleDisconnectPlatform = async (platformId, platformName) => {
    if (!confirm(`Are you sure you want to disconnect ${platformName}?`)) {
      return;
    }

    try {
      const response = await api.delete(`/brand/platforms/${platformId}`);

      if (response.data.success) {
        toast.success('Platform disconnected successfully');
        fetchPlatforms();
      }
    } catch (error) {
      console.error('Error disconnecting platform:', error);
      toast.error(error.response?.data?.error || 'Failed to disconnect platform');
    }
  };

  const isConnected = (platformId) => {
    return platforms.some(p => p.platform === platformId);
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
    <div className="min-h-screen bg-light flex flex-col">
      <Navbar />

      <div className="flex-1 container-custom section-padding">
        {/* Header */}
        <div className="max-w-4xl mx-auto mb-8 md:mb-12">
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <button
              onClick={() => navigate('/brand/dashboard')}
              className="inline-flex items-center gap-1 md:gap-2 px-3 md:px-4 py-2 text-primary hover:text-primary-dark transition-colors"
            >
              <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-sm md:text-base font-medium">Back to Dashboard</span>
            </button>
          </div>
          <div className="text-center px-4">
            <div className="inline-flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 bg-primary/10 rounded-full mb-3 md:mb-4">
              <LinkIcon className="h-4 w-4 md:h-5 md:w-5 text-primary" />
              <span className="text-xs md:text-sm font-medium text-primary">Platform Connections</span>
            </div>
            <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold text-dark mb-3 md:mb-4 leading-tight">
              Connect Your Platforms
            </h1>
            <p className="text-sm md:text-lg text-gray-600 leading-relaxed max-w-2xl mx-auto">
              Connect your social media accounts to automatically sync your follower counts and enable analytics tracking.
            </p>
          </div>
        </div>

        {/* Connected Platforms */}
        {platforms.length > 0 && (
          <div className="mb-8 md:mb-12 px-4 md:px-0">
            <h2 className="text-xl md:text-2xl font-bold text-dark mb-4 md:mb-6">Connected Platforms</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {platforms.map((platform) => {
                const platformData = availablePlatforms.find(p => p.id === platform.platform);
                return (
                  <div key={platform.id} className="card hover:shadow-lg transition-shadow overflow-hidden">
                    <div className={`w-full h-2 bg-gradient-to-r ${platformData?.color || 'from-gray-400 to-gray-600'}`}></div>
                    <div className="p-4 md:p-6">
                      <div className="flex items-start justify-between mb-4 gap-2">
                        <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                          <div className={`${platformData?.iconColor || 'text-gray-600'} flex-shrink-0`}>
                            <div className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center">
                              {platformData?.icon || (
                                <LinkIcon className="w-10 h-10 md:w-12 md:h-12" />
                              )}
                            </div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-bold text-dark text-sm md:text-base truncate">{platformData?.name || platform.platform}</h3>
                            <p className="text-xs md:text-sm text-gray-600 truncate">{platform.account_name}</p>
                          </div>
                        </div>
                        {platform.is_connected ? (
                          <span className="px-2 md:px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 flex items-center gap-1 flex-shrink-0">
                            <CheckCircleIcon className="w-3 h-3 md:w-4 md:h-4" />
                            <span className="hidden sm:inline">Connected</span>
                          </span>
                        ) : (
                          <span className="px-2 md:px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 flex items-center gap-1 flex-shrink-0">
                            <ClockIcon className="w-3 h-3 md:w-4 md:h-4" />
                            <span className="hidden sm:inline">Pending</span>
                          </span>
                        )}
                      </div>

                      <div className="space-y-3 mb-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Followers:</span>
                          <span className="font-bold text-dark">{platform.followers?.toLocaleString() || 0}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Posts:</span>
                          <span className="font-bold text-dark">{platform.posts?.toLocaleString() || 0}</span>
                        </div>
                        {platform.last_synced_at && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Last Synced:</span>
                            <span className="text-xs text-gray-500">
                              {new Date(platform.last_synced_at).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2">
                        <button
                          onClick={() => handleSyncPlatform(platform.id)}
                          disabled={syncing === platform.id}
                          className="flex-1 py-2.5 md:py-2 px-4 bg-primary hover:bg-primary-dark text-dark rounded-full font-medium transition-colors disabled:opacity-50 text-xs md:text-sm"
                        >
                          {syncing === platform.id ? 'Syncing...' : 'Sync Now'}
                        </button>
                        <button
                          onClick={() => handleDisconnectPlatform(platform.id, platformData?.name)}
                          className="py-2.5 md:py-2 px-4 bg-gray-200 hover:bg-gray-300 text-dark rounded-full font-medium transition-colors text-xs md:text-sm"
                        >
                          Disconnect
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Available Platforms */}
        <div className="px-4 md:px-0">
          <h2 className="text-xl md:text-2xl font-bold text-dark mb-4 md:mb-6">Available Platforms</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {availablePlatforms.map((platform) => {
              const connected = isConnected(platform.id);
              return (
                <div
                  key={platform.id}
                  className={`card hover:shadow-lg transition-shadow overflow-hidden ${connected ? 'opacity-50' : ''}`}
                >
                  <div className={`w-full h-2 bg-gradient-to-r ${platform.color}`}></div>
                  <div className="p-4 md:p-6">
                    <div className="flex items-center gap-2 md:gap-3 mb-4">
                      <div className={`${platform.iconColor} flex-shrink-0`}>
                        <div className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center">
                          {platform.icon}
                        </div>
                      </div>
                      <h3 className="text-lg md:text-xl font-bold text-dark">{platform.name}</h3>
                    </div>
                    <button
                      onClick={() => handleOpenConnectModal(platform.id)}
                      disabled={connected}
                      className={`w-full py-2.5 md:py-3 rounded-full font-medium transition-colors text-sm md:text-base ${
                        connected
                          ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                          : 'bg-dark text-white hover:bg-gray-800'
                      }`}
                    >
                      {connected ? 'Already Connected' : 'Connect'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Connect Modal */}
      {showConnectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl md:rounded-3xl max-w-md w-full p-6 md:p-8 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl md:text-2xl font-bold text-dark mb-4">
              Connect {availablePlatforms.find(p => p.id === selectedPlatform)?.name}
            </h2>

            {availablePlatforms.find(p => p.id === selectedPlatform)?.requiresOAuth && (
              <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-2xl">
                <p className="text-sm text-yellow-800">
                  {availablePlatforms.find(p => p.id === selectedPlatform)?.oauthNote}
                </p>
                <p className="text-xs text-yellow-700 mt-2">
                  Visit <a href="https://app.thunzi.co" target="_blank" rel="noopener noreferrer" className="underline font-medium">app.thunzi.co</a> to connect this platform first.
                </p>
              </div>
            )}

            <form onSubmit={handleConnectPlatform}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Username/Handle
                </label>
                <input
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="@username"
                  className="w-full px-4 py-3 rounded-2xl border border-gray-300 focus:outline-none focus:border-primary"
                  required
                />
              </div>

              {availablePlatforms.find(p => p.id === selectedPlatform)?.requiresToken && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Access Token
                  </label>
                  <textarea
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
                    placeholder="Paste your access token here"
                    rows="3"
                    className="w-full px-4 py-3 rounded-2xl border border-gray-300 focus:outline-none focus:border-primary"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    You can get your access token from the platform's developer portal
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowConnectModal(false)}
                  className="flex-1 py-3 rounded-full border-2 border-gray-300 text-dark font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={connecting}
                  className="flex-1 py-3 rounded-full bg-primary hover:bg-primary-dark text-dark font-medium transition-colors disabled:opacity-50"
                >
                  {connecting ? 'Connecting...' : 'Connect'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default ConnectPlatforms;
