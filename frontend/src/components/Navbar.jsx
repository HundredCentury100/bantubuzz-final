import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Fragment } from 'react';
import { Menu, Transition } from '@headlessui/react';
import {
  Bars3Icon,
  XMarkIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';

const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
  };

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="container-custom">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="text-2xl font-black">
              <span className="text-primary">Bantu</span>
              <span className="text-dark">Buzz</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link
              to="/creators"
              className="text-dark hover:text-primary transition-colors font-medium"
            >
              Find Creators
            </Link>
            <Link
              to="/packages"
              className="text-dark hover:text-primary transition-colors font-medium"
            >
              Browse Packages
            </Link>

            {isAuthenticated ? (
              <div className="flex items-center space-x-4">
                {user?.user_type === 'brand' && (
                  <Link
                    to="/brand/campaigns"
                    className="text-dark hover:text-primary transition-colors font-medium"
                  >
                    Campaigns
                  </Link>
                )}
                {user?.user_type === 'creator' && (
                  <Link
                    to="/creator/campaigns"
                    className="text-dark hover:text-primary transition-colors font-medium"
                  >
                    Campaigns
                  </Link>
                )}
                <Link
                  to={`/${user?.user_type}/collaborations`}
                  className="text-dark hover:text-primary transition-colors font-medium"
                >
                  Collaborations
                </Link>
                <Link
                  to="/messages"
                  className="text-dark hover:text-primary transition-colors font-medium"
                >
                  Messages
                </Link>

                {/* User Menu */}
                <Menu as="div" className="relative">
                  <Menu.Button className="flex items-center space-x-2 p-2 rounded-lg hover:bg-light transition-colors">
                    <UserCircleIcon className="h-6 w-6 text-dark" />
                    <span className="text-dark font-medium">{user?.email}</span>
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
                    <Menu.Items className="absolute right-0 mt-2 w-48 origin-top-right bg-white rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                      <div className="p-1">
                        <Menu.Item>
                          {({ active }) => (
                            <Link
                              to={`/${user?.user_type}/dashboard`}
                              className={`${
                                active ? 'bg-light' : ''
                              } flex items-center space-x-2 px-4 py-2 text-sm text-dark rounded-lg`}
                            >
                              <Cog6ToothIcon className="h-5 w-5" />
                              <span>Dashboard</span>
                            </Link>
                          )}
                        </Menu.Item>
                        <Menu.Item>
                          {({ active }) => (
                            <button
                              onClick={handleLogout}
                              className={`${
                                active ? 'bg-light' : ''
                              } flex items-center space-x-2 w-full px-4 py-2 text-sm text-dark rounded-lg`}
                            >
                              <ArrowRightOnRectangleIcon className="h-5 w-5" />
                              <span>Logout</span>
                            </button>
                          )}
                        </Menu.Item>
                      </div>
                    </Menu.Items>
                  </Transition>
                </Menu>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link to="/login" className="btn btn-outline">
                  Login
                </Link>
                <Link to="/register/creator" className="btn btn-primary">
                  Get Started
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Menu as="div" className="relative">
              <Menu.Button className="p-2">
                <Bars3Icon className="h-6 w-6 text-dark" />
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
                    <Menu.Item>
                      {({ active }) => (
                        <Link
                          to="/creators"
                          className={`${
                            active ? 'bg-light' : ''
                          } block px-4 py-2 text-sm text-dark rounded-lg`}
                        >
                          Find Creators
                        </Link>
                      )}
                    </Menu.Item>
                    <Menu.Item>
                      {({ active }) => (
                        <Link
                          to="/packages"
                          className={`${
                            active ? 'bg-light' : ''
                          } block px-4 py-2 text-sm text-dark rounded-lg`}
                        >
                          Browse Packages
                        </Link>
                      )}
                    </Menu.Item>

                    {isAuthenticated ? (
                      <>
                        <Menu.Item>
                          {({ active }) => (
                            <Link
                              to={`/${user?.user_type}/campaigns`}
                              className={`${
                                active ? 'bg-light' : ''
                              } block px-4 py-2 text-sm text-dark rounded-lg`}
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
                              } block px-4 py-2 text-sm text-dark rounded-lg`}
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
                              } block px-4 py-2 text-sm text-dark rounded-lg`}
                            >
                              Messages
                            </Link>
                          )}
                        </Menu.Item>
                        <Menu.Item>
                          {({ active }) => (
                            <Link
                              to={`/${user?.user_type}/dashboard`}
                              className={`${
                                active ? 'bg-light' : ''
                              } block px-4 py-2 text-sm text-dark rounded-lg`}
                            >
                              Dashboard
                            </Link>
                          )}
                        </Menu.Item>
                        <Menu.Item>
                          {({ active }) => (
                            <button
                              onClick={handleLogout}
                              className={`${
                                active ? 'bg-light' : ''
                              } block w-full text-left px-4 py-2 text-sm text-dark rounded-lg`}
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
                              } block px-4 py-2 text-sm text-dark rounded-lg`}
                            >
                              Login
                            </Link>
                          )}
                        </Menu.Item>
                        <Menu.Item>
                          {({ active }) => (
                            <Link
                              to="/register/creator"
                              className={`${
                                active ? 'bg-light' : ''
                              } block px-4 py-2 text-sm text-dark rounded-lg`}
                            >
                              Get Started
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
