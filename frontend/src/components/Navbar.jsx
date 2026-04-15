import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Fragment, useState, useEffect } from 'react';
import { Menu, Transition } from '@headlessui/react';
import {
  Bars3Icon,
  XMarkIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  Cog6ToothIcon,
  QuestionMarkCircleIcon,
  LifebuoyIcon,
  CurrencyDollarIcon,
  ChatBubbleLeftRightIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import NotificationBell from './NotificationBell';
import { messagingService } from '../services/messagingAPI';
import { creatorsAPI, brandsAPI } from '../services/api';
import Avatar from './Avatar';
import api from '../services/api';

const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [userProfile, setUserProfile] = useState(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [creatorEarnings, setCreatorEarnings] = useState(0);

  // Helper function to check if a link is active
  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  // Fetch user profile for avatar
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (isAuthenticated && user) {
        try {
          if (user.user_type === 'creator') {
            const response = await creatorsAPI.getOwnProfile();
            setUserProfile(response.data);
          } else if (user.user_type === 'brand') {
            const response = await brandsAPI.getOwnProfile();
            setUserProfile(response.data);
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
        }
      }
    };

    fetchUserProfile();
  }, [isAuthenticated, user]);

  // Fetch unread message count
  useEffect(() => {
    const fetchUnreadCount = async () => {
      if (isAuthenticated) {
        try {
          const response = await messagingService.getConversations();
          const conversations = response.data.conversations || [];
          const totalUnread = conversations.reduce((sum, conv) => sum + (conv.unread_count || 0), 0);
          setUnreadMessageCount(totalUnread);
        } catch (error) {
          console.error('Error fetching unread message count:', error);
        }
      }
    };

    fetchUnreadCount();
    // Refresh every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // Fetch brand wallet balance
  useEffect(() => {
    const fetchWalletBalance = async () => {
      if (isAuthenticated && user?.user_type === 'brand') {
        try {
          const response = await api.get('/brand/wallet/balance');
          if (response.data.success) {
            setWalletBalance(response.data.wallet.available_balance || 0);
          }
        } catch (error) {
          console.error('Error fetching wallet balance:', error);
        }
      }
    };

    fetchWalletBalance();
    // Refresh every 60 seconds
    const interval = setInterval(fetchWalletBalance, 60000);
    return () => clearInterval(interval);
  }, [isAuthenticated, user]);

  // Fetch creator earnings balance
  useEffect(() => {
    const fetchCreatorEarnings = async () => {
      if (isAuthenticated && user?.user_type === 'creator') {
        try {
          const response = await api.get('/wallet/balance');
          if (response.data.success) {
            setCreatorEarnings(response.data.wallet.available_balance || 0);
          }
        } catch (error) {
          console.error('Error fetching creator earnings:', error);
        }
      }
    };

    fetchCreatorEarnings();
    // Refresh every 60 seconds
    const interval = setInterval(fetchCreatorEarnings, 60000);
    return () => clearInterval(interval);
  }, [isAuthenticated, user]);

  const handleLogout = () => {
    logout();
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <img
              src="/bantubuzz-logo-with-text.png"
              alt="BantuBuzz Logo"
              className="h-12 w-auto"
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-10">
            {/* Show Search only for non-creators or unauthenticated users */}
            {(!isAuthenticated || user?.user_type !== 'creator') && (
              <Link
                to="/browse/creators"
                className="text-gray-700 hover:text-gray-900 transition-colors text-sm font-medium"
              >
                Search
              </Link>
            )}

            {isAuthenticated ? (
              <div className="flex items-center space-x-6">
                {/* Dashboard Link - First and prominent */}
                <Link
                  to={`/${user?.user_type}/dashboard`}
                  className={`text-gray-700 hover:text-gray-900 transition-colors text-sm font-bold ${
                    isActive(`/${user?.user_type}/dashboard`) ? 'border-b-2 border-primary pb-1' : ''
                  }`}
                >
                  Dashboard
                </Link>
                {user?.user_type === 'brand' && (
                  <>
                    <Link
                      to="/brand/analytics"
                      className={`text-gray-700 hover:text-gray-900 transition-colors text-sm font-medium ${
                        isActive('/brand/analytics') ? 'border-b-2 border-primary pb-1' : ''
                      }`}
                    >
                      Analytics
                    </Link>
                    <Link
                      to="/brand/campaigns"
                      className={`text-gray-700 hover:text-gray-900 transition-colors text-sm font-medium ${
                        isActive('/brand/campaigns') ? 'border-b-2 border-primary pb-1' : ''
                      }`}
                    >
                      Campaigns
                    </Link>
                  </>
                )}
                {user?.user_type === 'creator' && (
                  <Link
                    to="/creator/campaigns"
                    className={`text-gray-700 hover:text-gray-900 transition-colors text-sm font-medium ${
                      isActive('/creator/campaigns') || isActive('/creator/opportunities') ? 'border-b-2 border-primary pb-1' : ''
                    }`}
                  >
                    Opportunities
                  </Link>
                )}
                <Link
                  to={`/${user?.user_type}/collaborations`}
                  className={`text-gray-700 hover:text-gray-900 transition-colors text-sm font-medium ${
                    isActive(`/${user?.user_type}/collaborations`) ? 'border-b-2 border-primary pb-1' : ''
                  }`}
                >
                  Collaborations
                </Link>
                <Link
                  to="/messages"
                  className={`text-gray-700 hover:text-gray-900 transition-colors relative p-2 ${
                    isActive('/messages') ? 'border-b-2 border-primary pb-1' : ''
                  }`}
                  title="Messages"
                >
                  <ChatBubbleLeftRightIcon className="w-6 h-6" />
                  {unreadMessageCount > 0 && (
                    <span className="absolute -top-1 -right-1 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-primary rounded-full">
                      {unreadMessageCount > 9 ? '9+' : unreadMessageCount}
                    </span>
                  )}
                </Link>

                {/* Notification Bell */}
                <NotificationBell />

                {/* Wallet Links - Moved to end after notifications */}
                {user?.user_type === 'creator' && (
                  <Link
                    to="/wallet"
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors ${
                      isActive('/wallet') ? 'border-b-2 border-primary' : ''
                    }`}
                    title="Earnings Balance"
                  >
                    <CurrencyDollarIcon className="w-5 h-5 text-primary" />
                    <span className="font-semibold text-primary">
                      ${creatorEarnings.toFixed(2)}
                    </span>
                  </Link>
                )}
                {user?.user_type === 'brand' && (
                  <Link
                    to="/brand/wallet"
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors ${
                      isActive('/brand/wallet') ? 'border-b-2 border-primary' : ''
                    }`}
                    title="Wallet Balance"
                  >
                    <CurrencyDollarIcon className="w-5 h-5 text-primary" />
                    <span className="font-semibold text-primary">
                      ${walletBalance.toFixed(2)}
                    </span>
                  </Link>
                )}

                {/* User Menu - Cleaner with avatar */}
                <Menu as="div" className="relative ml-3">
                  <Menu.Button className="flex items-center p-1 rounded-full hover:ring-2 hover:ring-primary/20 transition-all">
                    <Avatar
                      src={userProfile?.profile_picture || userProfile?.logo}
                      alt={
                        userProfile?.display_name ||
                        userProfile?.username ||
                        userProfile?.company_name ||
                        user?.email
                      }
                      size="sm"
                      type={user?.user_type === 'brand' ? 'brand' : 'user'}
                    />
                  </Menu.Button>

                  <Transition
                    as={Fragment}
                    enter="transition ease-out duration-100"
                    enterFrom="transform opacity-0 scale-95"
                    enterTo="transform opacity-100 scale-100"
                    leave="transition ease-in duration-75"
                    leaveFrom="transform opacity-100 scale-100"
                    leaveTo="transform opacity-0 scale-95"
                  >
                    <Menu.Items className="absolute right-0 mt-2 w-56 origin-top-right bg-white rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none divide-y divide-gray-100">
                      {/* User Info Section */}
                      <div className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900 truncate">{user?.email}</p>
                        <p className="text-xs text-gray-500 mt-0.5 capitalize">{user?.user_type} Account</p>
                      </div>

                      {/* Menu Items */}
                      <div className="py-1">
                        <Menu.Item>
                          {({ active }) => (
                            <Link
                              to={user?.user_type === 'creator' ? '/creator/subscriptions' : '/subscription/manage'}
                              className={`${
                                active ? 'bg-gray-50' : ''
                              } flex items-center px-4 py-2 text-sm text-gray-700`}
                            >
                              <SparklesIcon className="h-5 w-5 mr-3 text-gray-400" />
                              Manage Subscriptions
                            </Link>
                          )}
                        </Menu.Item>
                        <Menu.Item>
                          {({ active }) => (
                            <Link
                              to="/how-it-works"
                              className={`${
                                active ? 'bg-gray-50' : ''
                              } flex items-center px-4 py-2 text-sm text-gray-700`}
                            >
                              <QuestionMarkCircleIcon className="h-5 w-5 mr-3 text-gray-400" />
                              How It Works
                            </Link>
                          )}
                        </Menu.Item>
                        <Menu.Item>
                          {({ active }) => (
                            <Link
                              to="/my-tickets"
                              className={`${
                                active ? 'bg-gray-50' : ''
                              } flex items-center px-4 py-2 text-sm text-gray-700`}
                            >
                              <LifebuoyIcon className="h-5 w-5 mr-3 text-gray-400" />
                              Support
                            </Link>
                          )}
                        </Menu.Item>
                        {(!user || user?.user_type !== 'creator') && (
                          <Menu.Item>
                            {({ active }) => (
                              <Link
                                to="/pricing"
                                className={`${
                                  active ? 'bg-gray-50' : ''
                                } flex items-center px-4 py-2 text-sm text-gray-700`}
                              >
                                <CurrencyDollarIcon className="h-5 w-5 mr-3 text-gray-400" />
                                Pricing
                              </Link>
                            )}
                          </Menu.Item>
                        )}
                      </div>

                      {/* Logout Section */}
                      <div className="py-1">
                        <Menu.Item>
                          {({ active }) => (
                            <button
                              onClick={handleLogout}
                              className={`${
                                active ? 'bg-gray-50' : ''
                              } flex items-center w-full px-4 py-2 text-sm text-red-600`}
                            >
                              <ArrowRightOnRectangleIcon className="h-5 w-5 mr-3" />
                              Logout
                            </button>
                          )}
                        </Menu.Item>
                      </div>
                    </Menu.Items>
                  </Transition>
                </Menu>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Link to="/login" className="text-gray-700 hover:text-gray-900 text-sm font-medium px-4 py-2">
                  Login
                </Link>
                <Link
                  to="/register/creator"
                  className="bg-primary text-dark px-5 py-2 rounded-full text-sm font-bold hover:bg-primary-light transition-all"
                >
                  Join as Creator
                </Link>
                <Link
                  to="/register/brand"
                  className="bg-dark text-white px-5 py-2 rounded-full text-sm font-semibold hover:bg-gray-800 transition-colors"
                >
                  Join as Brand
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Menu as="div" className="relative">
              <Menu.Button className="p-2">
                <Bars3Icon className="h-6 w-6 text-gray-700" />
              </Menu.Button>

              <Transition
                as={Fragment}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
              >
                <Menu.Items className="absolute right-0 mt-2 w-56 origin-top-right bg-white rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                  <div className="p-2">
                    {/* Show Search only for non-creators or unauthenticated users */}
                    {(!isAuthenticated || user?.user_type !== 'creator') && (
                      <Menu.Item>
                        {({ active }) => (
                          <Link
                            to="/browse/creators"
                            className={`${
                              active ? 'bg-light' : ''
                            } block px-4 py-2 text-sm text-gray-700 rounded-lg`}
                          >
                            Search
                          </Link>
                        )}
                      </Menu.Item>
                    )}

                    {isAuthenticated ? (
                      <>
                        {/* Dashboard Link - First and prominent in mobile too */}
                        <Menu.Item>
                          {({ active }) => (
                            <Link
                              to={`/${user?.user_type}/dashboard`}
                              className={`${
                                active || isActive(`/${user?.user_type}/dashboard`) ? 'bg-light' : ''
                              } block px-4 py-2 text-sm text-gray-900 font-bold rounded-lg`}
                            >
                              Dashboard
                            </Link>
                          )}
                        </Menu.Item>
                        {user?.user_type === 'brand' && (
                          <Menu.Item>
                            {({ active }) => (
                              <Link
                                to="/brand/analytics"
                                className={`${
                                  active || isActive('/brand/analytics') ? 'bg-light' : ''
                                } block px-4 py-2 text-sm text-gray-700 rounded-lg`}
                              >
                                Analytics
                              </Link>
                            )}
                          </Menu.Item>
                        )}
                        {user?.user_type === 'brand' && (
                          <Menu.Item>
                            {({ active }) => (
                              <Link
                                to="/brand/campaigns"
                                className={`${
                                  active || isActive('/brand/campaigns') ? 'bg-light' : ''
                                } block px-4 py-2 text-sm text-gray-700 rounded-lg`}
                              >
                                Campaigns
                              </Link>
                            )}
                          </Menu.Item>
                        )}
                        {user?.user_type === 'creator' && (
                          <Menu.Item>
                            {({ active }) => (
                              <Link
                                to="/creator/campaigns"
                                className={`${
                                  active || isActive('/creator/campaigns') || isActive('/creator/opportunities') ? 'bg-light' : ''
                                } block px-4 py-2 text-sm text-gray-700 rounded-lg`}
                              >
                                Opportunities
                              </Link>
                            )}
                          </Menu.Item>
                        )}
                        <Menu.Item>
                          {({ active }) => (
                            <Link
                              to={`/${user?.user_type}/collaborations`}
                              className={`${
                                active || isActive(`/${user?.user_type}/collaborations`) ? 'bg-light' : ''
                              } block px-4 py-2 text-sm text-gray-700 rounded-lg`}
                            >
                              Collaborations
                            </Link>
                          )}
                        </Menu.Item>
                        <Menu.Item>
                          {({ active }) => (
                            <Link
                              to="/messages"
                              className={`${
                                active || isActive('/messages') ? 'bg-light' : ''
                              } block px-4 py-2 text-sm text-gray-700 rounded-lg relative`}
                            >
                              <span className="flex items-center justify-between">
                                Messages
                                {unreadMessageCount > 0 && (
                                  <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-primary rounded-full ml-2">
                                    {unreadMessageCount > 9 ? '9+' : unreadMessageCount}
                                  </span>
                                )}
                              </span>
                            </Link>
                          )}
                        </Menu.Item>
                        {user?.user_type === 'creator' && (
                          <Menu.Item>
                            {({ active }) => (
                              <Link
                                to="/wallet"
                                className={`${
                                  active || isActive('/wallet') ? 'bg-light' : ''
                                } flex items-center justify-between px-4 py-2 text-sm text-gray-700 rounded-lg`}
                              >
                                <span>Earnings</span>
                                <span className="font-semibold text-primary">
                                  ${creatorEarnings.toFixed(2)}
                                </span>
                              </Link>
                            )}
                          </Menu.Item>
                        )}
                        {user?.user_type === 'brand' && (
                          <Menu.Item>
                            {({ active }) => (
                              <Link
                                to="/brand/wallet"
                                className={`${
                                  active || isActive('/brand/wallet') ? 'bg-light' : ''
                                } flex items-center justify-between px-4 py-2 text-sm text-gray-700 rounded-lg`}
                              >
                                <span>Wallet</span>
                                <span className="font-semibold text-primary">
                                  ${walletBalance.toFixed(2)}
                                </span>
                              </Link>
                            )}
                          </Menu.Item>
                        )}
                        <Menu.Item>
                          {({ active }) => (
                            <Link
                              to={user?.user_type === 'creator' ? '/creator/subscriptions' : '/subscription/manage'}
                              className={`${
                                active ? 'bg-light' : ''
                              } block px-4 py-2 text-sm text-gray-700 rounded-lg`}
                            >
                              Manage Subscriptions
                            </Link>
                          )}
                        </Menu.Item>
                        <Menu.Item>
                          {({ active }) => (
                            <Link
                              to="/my-tickets"
                              className={`${
                                active ? 'bg-light' : ''
                              } block px-4 py-2 text-sm text-gray-700 rounded-lg`}
                            >
                              Support
                            </Link>
                          )}
                        </Menu.Item>
                        {(!user || user?.user_type !== 'creator') && (
                          <Menu.Item>
                            {({ active }) => (
                              <Link
                                to="/pricing"
                                className={`${
                                  active ? 'bg-light' : ''
                                } block px-4 py-2 text-sm text-gray-700 rounded-lg`}
                              >
                                Pricing
                              </Link>
                            )}
                          </Menu.Item>
                        )}
                        <Menu.Item>
                          {({ active }) => (
                            <button
                              onClick={handleLogout}
                              className={`${
                                active ? 'bg-light' : ''
                              } block w-full text-left px-4 py-2 text-sm text-gray-700 rounded-lg`}
                            >
                              Logout
                            </button>
                          )}
                        </Menu.Item>
                      </>
                    ) : (
                      <>
                        <Menu.Item>
                          {({ active }) => (
                            <Link
                              to="/login"
                              className={`${
                                active ? 'bg-light' : ''
                              } block px-4 py-2 text-sm text-gray-700 rounded-lg`}
                            >
                              Login
                            </Link>
                          )}
                        </Menu.Item>
                        <Menu.Item>
                          {({ active }) => (
                            <Link
                              to="/register/creator"
                              className="bg-primary text-dark px-4 py-2 rounded-full text-sm font-bold hover:bg-primary-light transition-all text-center block my-2"
                            >
                              Join as Creator
                            </Link>
                          )}
                        </Menu.Item>
                        <Menu.Item>
                          {({ active }) => (
                            <Link
                              to="/register/brand"
                              className="bg-dark text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-gray-800 transition-colors text-center block my-2"
                            >
                              Join as Brand
                            </Link>
                          )}
                        </Menu.Item>
                      </>
                    )}
                  </div>
                </Menu.Items>
              </Transition>
            </Menu>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
