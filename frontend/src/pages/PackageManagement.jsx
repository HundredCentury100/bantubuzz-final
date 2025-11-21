import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { packagesAPI } from '../services/api';

const PackageManagement = () => {
  const navigate = useNavigate();
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, active, inactive
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    try {
      setLoading(true);
      const response = await packagesAPI.getMyPackages();
      setPackages(response.data.packages || []);
    } catch (error) {
      console.error('Error fetching packages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (packageId, currentStatus) => {
    try {
      await packagesAPI.updatePackage(packageId, { is_active: !currentStatus });
      await fetchPackages();
    } catch (error) {
      console.error('Error updating package status:', error);
      alert('Failed to update package status');
    }
  };

  const handleDelete = async (packageId) => {
    try {
      await packagesAPI.deletePackage(packageId);
      setDeleteConfirm(null);
      await fetchPackages();
    } catch (error) {
      console.error('Error deleting package:', error);
      alert('Failed to delete package');
    }
  };

  const filteredPackages = packages.filter(pkg => {
    if (filter === 'active') return pkg.is_active;
    if (filter === 'inactive') return !pkg.is_active;
    return true;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-light">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-light">
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          to="/creator/dashboard"
          className="text-gray-600 hover:text-gray-900 mb-4 flex items-center gap-2 inline-flex"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </Link>
        <div className="flex justify-between items-center mt-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Packages</h1>
            <p className="text-gray-600 mt-1">Manage your service packages</p>
          </div>
          <Link
            to="/creator/packages/create"
            className="bg-primary hover:bg-primary/90 text-gray-900 px-6 py-3 rounded-lg font-semibold transition duration-200"
          >
            Create New Package
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-4">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            filter === 'all'
              ? 'bg-primary text-gray-900'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All ({packages.length})
        </button>
        <button
          onClick={() => setFilter('active')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            filter === 'active'
              ? 'bg-primary text-gray-900'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Active ({packages.filter(p => p.is_active).length})
        </button>
        <button
          onClick={() => setFilter('inactive')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            filter === 'inactive'
              ? 'bg-primary text-gray-900'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Inactive ({packages.filter(p => !p.is_active).length})
        </button>
      </div>

      {/* Packages Grid */}
      {filteredPackages.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <div className="text-gray-400 mb-4">
            <svg
              className="mx-auto h-16 w-16"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {filter === 'all' ? 'No packages yet' : `No ${filter} packages`}
          </h3>
          <p className="text-gray-600 mb-6">
            {filter === 'all'
              ? 'Create your first package to start getting bookings from brands'
              : `You don't have any ${filter} packages`}
          </p>
          {filter === 'all' && (
            <Link
              to="/creator/packages/create"
              className="inline-block bg-primary hover:bg-primary/90 text-gray-900 px-6 py-3 rounded-lg font-semibold transition duration-200"
            >
              Create Your First Package
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPackages.map((pkg) => (
            <div
              key={pkg.id}
              className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-6 relative"
            >
              {/* Status Badge */}
              <div className="absolute top-4 right-4">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    pkg.is_active
                      ? 'bg-primary/10 text-primary-dark'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {pkg.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>

              {/* Category */}
              <div className="text-sm text-gray-500 mb-2">{pkg.category}</div>

              {/* Title */}
              <h3 className="text-xl font-bold text-gray-900 mb-3 pr-20">
                {pkg.title}
              </h3>

              {/* Description */}
              <p className="text-gray-600 mb-4 line-clamp-3">
                {pkg.description}
              </p>

              {/* Price and Duration */}
              <div className="flex items-center gap-4 mb-4 pb-4 border-b">
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    ${pkg.price}
                  </div>
                  <div className="text-xs text-gray-500">Price</div>
                </div>
                <div className="h-8 w-px bg-gray-200"></div>
                <div>
                  <div className="text-lg font-semibold text-gray-900">
                    {pkg.duration_days} days
                  </div>
                  <div className="text-xs text-gray-500">Duration</div>
                </div>
              </div>

              {/* Deliverables */}
              {pkg.deliverables && pkg.deliverables.length > 0 && (
                <div className="mb-4">
                  <div className="text-sm font-semibold text-gray-700 mb-2">
                    Deliverables:
                  </div>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {pkg.deliverables.slice(0, 3).map((item, idx) => (
                      <li key={idx} className="flex items-start">
                        <span className="text-primary mr-2">✓</span>
                        <span className="line-clamp-1">{item}</span>
                      </li>
                    ))}
                    {pkg.deliverables.length > 3 && (
                      <li className="text-gray-500 text-xs">
                        +{pkg.deliverables.length - 3} more
                      </li>
                    )}
                  </ul>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => navigate(`/creator/packages/edit/${pkg.id}`)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-900 px-4 py-2 rounded-lg font-medium transition"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleToggleStatus(pkg.id, pkg.is_active)}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition ${
                    pkg.is_active
                      ? 'bg-primary/20 hover:bg-primary/20 text-primary-dark'
                      : 'bg-primary/10 hover:bg-primary/10 text-primary-dark'
                  }`}
                >
                  {pkg.is_active ? 'Deactivate' : 'Activate'}
                </button>
                <button
                  onClick={() => setDeleteConfirm(pkg.id)}
                  className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-900 rounded-lg font-medium transition"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Delete Package?
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this package? This action cannot
              be undone. All associated bookings will remain but won't accept new
              bookings for this package.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-900 px-4 py-2 rounded-lg font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
};

export default PackageManagement;
