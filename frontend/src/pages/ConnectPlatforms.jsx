import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';

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
      icon: '📷',
      color: 'from-pink-500 to-purple-600',
      requiresToken: true
    },
    {
      id: 'tiktok',
      name: 'TikTok',
      icon: '🎵',
      color: 'from-black to-gray-800',
      requiresToken: false
    },
    {
      id: 'youtube',
      name: 'YouTube',
      icon: '▶️',
      color: 'from-red-500 to-red-700',
      requiresToken: false
    },
    {
      id: 'facebook',
      name: 'Facebook',
      icon: '👤',
      color: 'from-blue-500 to-blue-700',
      requiresToken: true
    },
    {
      id: 'twitter',
      name: 'Twitter/X',
      icon: '🐦',
      color: 'from-gray-800 to-black',
      requiresToken: false
    }
  ];

  useEffect(() => {
    if (user?.user_type !== 'creator') {
      navigate('/');
      return;
    }
    fetchPlatforms();
  }, [user]);

  const fetchPlatforms = async () => {
    try {
      setLoading(true);
      const response = await api.get('/creator/platforms');
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

      const response = await api.post('/creator/platforms/connect', payload);

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
      const response = await api.post(`/creator/platforms/${platformId}/sync`);

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
      const response = await api.delete(`/creator/platforms/${platformId}`);

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
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-dark mb-4">Connect Your Platforms</h1>
          <p className="text-lg text-gray-600 max-w-3xl">
            Connect your social media accounts to automatically sync your follower counts and enable analytics tracking.
          </p>
        </div>

        {/* Connected Platforms */}
        {platforms.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-dark mb-6">Connected Platforms</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {platforms.map((platform) => {
                const platformData = availablePlatforms.find(p => p.id === platform.platform);
                return (
                  <div key={platform.id} className="card hover:shadow-lg transition-shadow">
                    <div className={`w-full h-2 rounded-t-3xl bg-gradient-to-r ${platformData?.color || 'from-gray-400 to-gray-600'}`}></div>
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <span className="text-3xl">{platformData?.icon || '📱'}</span>
                          <div>
                            <h3 className="font-bold text-dark">{platformData?.name || platform.platform}</h3>
                            <p className="text-sm text-gray-600">{platform.account_name}</p>
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          platform.is_connected ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {platform.is_connected ? 'Connected' : 'Pending'}
                        </span>
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

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSyncPlatform(platform.id)}
                          disabled={syncing === platform.id}
                          className="flex-1 py-2 px-4 bg-primary hover:bg-primary-dark text-dark rounded-full font-medium transition-colors disabled:opacity-50 text-sm"
                        >
                          {syncing === platform.id ? 'Syncing...' : 'Sync Now'}
                        </button>
                        <button
                          onClick={() => handleDisconnectPlatform(platform.id, platformData?.name)}
                          className="py-2 px-4 bg-gray-200 hover:bg-gray-300 text-dark rounded-full font-medium transition-colors text-sm"
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
        <div>
          <h2 className="text-2xl font-bold text-dark mb-6">Available Platforms</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {availablePlatforms.map((platform) => {
              const connected = isConnected(platform.id);
              return (
                <div
                  key={platform.id}
                  className={`card hover:shadow-lg transition-shadow ${connected ? 'opacity-50' : ''}`}
                >
                  <div className={`w-full h-2 rounded-t-3xl bg-gradient-to-r ${platform.color}`}></div>
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-4xl">{platform.icon}</span>
                      <h3 className="text-xl font-bold text-dark">{platform.name}</h3>
                    </div>
                    <button
                      onClick={() => handleOpenConnectModal(platform.id)}
                      disabled={connected}
                      className={`w-full py-3 rounded-full font-medium transition-colors ${
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
          <div className="bg-white rounded-3xl max-w-md w-full p-8">
            <h2 className="text-2xl font-bold text-dark mb-4">
              Connect {availablePlatforms.find(p => p.id === selectedPlatform)?.name}
            </h2>

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
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:border-primary"
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
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:border-primary"
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
