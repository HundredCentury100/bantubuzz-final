import { Link, useNavigate } from 'react-router-dom';
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
} from '@heroicons/react/24/outline';
import NotificationBell from './NotificationBell';
import { messagingService } from '../services/messagingAPI';
import { creatorsAPI, brandsAPI } from '../services/api';
import Avatar from './Avatar';

const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [userProfile, setUserProfile] = useState(null);

  // Fetch user profile for avatar
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (isAuthenticated && user) {
        try {
          if (user.user_type === 'creator') {
            const response = await creatorsAPI.getMyProfile();
            setUserProfile(response.data);
          } else if (user.user_type === 'brand') {
            const response = await brandsAPI.getMyProfile();
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
            {/* Show Search and How It Works only for non-creators or unauthenticated users */}
            {(!isAuthenticated || user?.user_type !== 'creator') && (
              <>
                <Link
                  to="/browse/creators"
                  className="text-gray-700 hover:text-gray-900 transition-colors text-sm font-medium"
                >
                  Search
                </Link>
                <Link
                  to="/how-it-works"
                  className="text-gray-700 hover:text-gray-900 transition-colors text-sm font-medium"
                >
                  How It Works
                </Link>
              </>
            )}
            {/* Hide Pricing from creators */}
            {(!isAuthenticated || user?.user_type !== 'creator') && (
              <Link
                to="/pricing"
                className="text-gray-700 hover:text-gray-900 transition-colors text-sm font-medium"
              >
                Pricing
              </Link>
            )}

            {isAuthenticated ? (
              <div className="flex items-center space-x-6">
                {/* Dashboard Link - First and prominent */}
                <Link
                  to={`/${user?.user_type}/dashboard`}
                  className="text-primary hover:text-primary-dark transition-colors text-sm font-bold"
                >
                  Dashboard
                </Link>
                {user?.user_type === 'brand' && (
                  <Link
                    to="/brand/campaigns"
                    className="text-gray-700 hover:text-gray-900 transition-colors text-sm font-medium"
                  >
                    Campaigns
                  </Link>
                )}
                {user?.user_type === 'creator' && (
                  <Link
                    to="/creator/campaigns"
                    className="text-gray-700 hover:text-gray-900 transition-colors text-sm font-medium"
                  >
                    Opportunities
                  </Link>
                )}
                <Link
                  to={`/${user?.user_type}/collaborations`}
                  className="text-gray-700 hover:text-gray-900 transition-colors text-sm font-medium"
                >
                  Collaborations
                </Link>
                <Link
                  to="/messages"
                  className="text-gray-700 hover:text-gray-900 transition-colors text-sm font-medium relative"
                >
                  Messages
                  {unreadMessageCount > 0 && (
                    <span className="absolute -top-2 -right-3 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-primary rounded-full">
                      {unreadMessageCount > 9 ? '9+' : unreadMessageCount}
                    </span>
                  )}
                </Link>
                {user?.user_type === 'creator' && (
                  <Link
                    to="/wallet"
                    className="text-gray-700 hover:text-gray-900 transition-colors text-sm font-medium"
                  >
                    Wallet
                  </Link>
                )}

                {/* Notification Bell */}
                <NotificationBell />

                {/* User Menu - Cleaner with avatar */}
                <Menu as="div" className="relative ml-3">
                  <Menu.Button className="flex items-center p-1 rounded-full hover:ring-2 hover:ring-primary/20 transition-all">
                    <Avatar
                      name={
                        userProfile?.display_name ||
                        userProfile?.username ||
                        userProfile?.company_name ||
                        user?.email
                      }
                      size="sm"
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
                    {/* Show Search and How It Works only for non-creators or unauthenticated users */}
                    {(!isAuthenticated || user?.user_type !== 'creator') && (
                      <>
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
                        <Menu.Item>
                          {({ active }) => (
                            <Link
                              to="/how-it-works"
                              className={`${
                                active ? 'bg-light' : ''
                              } block px-4 py-2 text-sm text-gray-700 rounded-lg`}
                            >
                              How It Works
                            </Link>
                          )}
                        </Menu.Item>
                      </>
                    )}
                    {/* Hide Pricing from creators */}
                    {(!isAuthenticated || user?.user_type !== 'creator') && (
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

                    {isAuthenticated ? (
                      <>
                        {/* Dashboard Link - First and prominent in mobile too */}
                        <Menu.Item>
                          {({ active }) => (
                            <Link
                              to={`/${user?.user_type}/dashboard`}
                              className={`${
                                active ? 'bg-primary/10' : ''
                              } block px-4 py-2 text-sm text-primary font-bold rounded-lg`}
                            >
                              Dashboard
                            </Link>
                          )}
                        </Menu.Item>
                        <Menu.Item>
                          {({ active }) => (
                            <Link
                              to={`/${user?.user_type}/campaigns`}
                              className={`${
                                active ? 'bg-light' : ''
                              } block px-4 py-2 text-sm text-gray-700 rounded-lg`}
                            >
                              Campaigns
                            </Link>
                          )}
                        </Menu.Item>
                        <Menu.Item>
                          {({ active }) => (
                            <Link
                              to={`/${user?.user_type}/collaborations`}
                              className={`${
                                active ? 'bg-light' : ''
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
                                active ? 'bg-light' : ''
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
                                  active ? 'bg-light' : ''
                                } block px-4 py-2 text-sm text-gray-700 rounded-lg`}
                              >
                                Wallet
                              </Link>
                            )}
                          </Menu.Item>
                        )}
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
