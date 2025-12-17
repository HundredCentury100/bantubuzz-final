import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  getFeaturedCreators,
  getEligibleCreators,
  featureCreator,
  unfeatureCreator,
} from '../../services/adminAPI';
import AdminLayout from '../../components/admin/AdminLayout';
import { StarIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';
import { BASE_URL } from '../../services/api';

export default function AdminFeaturedCreators() {
  const [featuredCreators, setFeaturedCreators] = useState([]);
  const [eligibleCreators, setEligibleCreators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [featuredTypeFilter, setFeaturedTypeFilter] = useState('all'); // 'all', 'general', 'tiktok', 'instagram'
  const [platformFilter, setPlatformFilter] = useState('all'); // 'all', 'tiktok', 'instagram'
  const [showFeatureModal, setShowFeatureModal] = useState(false);
  const [selectedCreator, setSelectedCreator] = useState(null);
  const [selectedFeaturedType, setSelectedFeaturedType] = useState('general');

  useEffect(() => {
    fetchData();
  }, [featuredTypeFilter, platformFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [featuredRes, eligibleRes] = await Promise.all([
        getFeaturedCreators(featuredTypeFilter !== 'all' ? { featured_type: featuredTypeFilter } : {}),
        getEligibleCreators({
          per_page: 50,
          platform: platformFilter !== 'all' ? platformFilter : undefined
        }),
      ]);
      setFeaturedCreators(featuredRes.data.data.featured_creators || []);
      setEligibleCreators(eligibleRes.data.data.creators || []);
    } catch (error) {
      console.error('Error fetching creators:', error);
      toast.error('Failed to load creators');
    } finally {
      setLoading(false);
    }
  };

  const openFeatureModal = (creator) => {
    setSelectedCreator(creator);
    setSelectedFeaturedType('general');
    setShowFeatureModal(true);
  };

  const handleFeature = async () => {
    if (!selectedCreator) return;

    try {
      setActionLoading(selectedCreator.id);
      await featureCreator(selectedCreator.id, {
        featured_order: featuredCreators.length,
        featured_type: selectedFeaturedType
      });
      toast.success(`Creator featured as ${selectedFeaturedType} successfully`);
      setShowFeatureModal(false);
      setSelectedCreator(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to feature creator');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnfeature = async (creatorId) => {
    if (!confirm('Remove this creator from featured?')) return;
    try {
      setActionLoading(creatorId);
      await unfeatureCreator(creatorId);
      toast.success('Creator removed from featured');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to unfeature creator');
    } finally {
      setActionLoading(null);
    }
  };

  const CreatorCard = ({ creator, featured = false }) => {
    // Get platforms creator has
    const platforms = creator.social_links ? Object.keys(creator.social_links) : [];
    const featuredTypeBadge = creator.featured_info?.featured_type || creator.featured_type;

    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start space-x-4">
          {creator.profile_picture ? (
            <img
              src={`${BASE_URL}${creator.profile_picture}`}
              alt={creator.username}
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : (
            <UserCircleIcon className="h-16 w-16 text-gray-400" />
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">{creator.username || creator.user?.email}</h3>
            <p className="text-sm text-gray-600">{creator.follower_count?.toLocaleString()} followers</p>
            {featured && featuredTypeBadge && (
              <span className="inline-block mt-1 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
                {featuredTypeBadge.charAt(0).toUpperCase() + featuredTypeBadge.slice(1)} Featured
              </span>
            )}
            <div className="flex flex-wrap gap-1 mt-2">
              {creator.categories?.slice(0, 2).map((cat, i) => (
                <span key={i} className="px-2 py-1 bg-gray-100 text-xs text-gray-700 rounded-full">
                  {cat}
                </span>
              ))}
              {platforms.length > 0 && (
                <span className="px-2 py-1 bg-primary/10 text-primary-dark text-xs rounded-full">
                  {platforms.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(', ')}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => featured ? handleUnfeature(creator.id) : openFeatureModal(creator)}
            disabled={actionLoading === creator.id}
            className={`p-2 rounded-lg disabled:opacity-50 ${
              featured
                ? 'text-yellow-600 hover:bg-yellow-50'
                : 'text-gray-400 hover:bg-gray-50'
            }`}
            title={featured ? 'Remove from Featured' : 'Add to Featured'}
          >
            {featured ? (
              <StarSolidIcon className="h-6 w-6" />
            ) : (
              <StarIcon className="h-6 w-6" />
            )}
          </button>
        </div>
      </div>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 leading-tight">Featured Creators</h1>
          <p className="text-gray-600 leading-relaxed mt-1">Manage creators featured on the homepage</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Featured Type Filter</label>
              <select
                value={featuredTypeFilter}
                onChange={(e) => setFeaturedTypeFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Featured</option>
                <option value="general">General Featured</option>
                <option value="tiktok">TikTok Featured</option>
                <option value="instagram">Instagram Featured</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Platform Filter (Eligible)</label>
              <select
                value={platformFilter}
                onChange={(e) => setPlatformFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Platforms</option>
                <option value="tiktok">TikTok Creators Only</option>
                <option value="instagram">Instagram Creators Only</option>
              </select>
            </div>
          </div>
        </div>

        {/* Currently Featured */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Currently Featured ({featuredCreators.length})
          </h2>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-gray-200 rounded-lg h-32 animate-pulse" />
              ))}
            </div>
          ) : featuredCreators.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
              No featured creators yet
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {featuredCreators.map((creator) => (
                <CreatorCard key={creator.id} creator={creator} featured />
              ))}
            </div>
          )}
        </div>

        {/* Eligible Creators */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Eligible Creators (Verified & Active)
          </h2>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-gray-200 rounded-lg h-32 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {eligibleCreators.filter(c => !c.is_featured).map((creator) => (
                <CreatorCard key={creator.id} creator={creator} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Feature Creator Modal */}
      {showFeatureModal && selectedCreator && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Feature {selectedCreator.username || selectedCreator.user?.email}
            </h3>
            <p className="text-gray-600 mb-4">Select the type of featured status for this creator:</p>

            <div className="space-y-3 mb-6">
              <label className="flex items-center p-3 border-2 border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="featured_type"
                  value="general"
                  checked={selectedFeaturedType === 'general'}
                  onChange={(e) => setSelectedFeaturedType(e.target.value)}
                  className="mr-3"
                />
                <div>
                  <div className="font-semibold text-gray-900">General Featured</div>
                  <div className="text-sm text-gray-600">Appears on homepage for all visitors</div>
                </div>
              </label>

              <label className="flex items-center p-3 border-2 border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="featured_type"
                  value="tiktok"
                  checked={selectedFeaturedType === 'tiktok'}
                  onChange={(e) => setSelectedFeaturedType(e.target.value)}
                  className="mr-3"
                  disabled={!selectedCreator.social_links?.tiktok}
                />
                <div>
                  <div className="font-semibold text-gray-900">TikTok Featured</div>
                  <div className="text-sm text-gray-600">
                    {selectedCreator.social_links?.tiktok
                      ? 'Featured in TikTok creators section'
                      : 'Creator has no TikTok account'}
                  </div>
                </div>
              </label>

              <label className="flex items-center p-3 border-2 border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="featured_type"
                  value="instagram"
                  checked={selectedFeaturedType === 'instagram'}
                  onChange={(e) => setSelectedFeaturedType(e.target.value)}
                  className="mr-3"
                  disabled={!selectedCreator.social_links?.instagram}
                />
                <div>
                  <div className="font-semibold text-gray-900">Instagram Featured</div>
                  <div className="text-sm text-gray-600">
                    {selectedCreator.social_links?.instagram
                      ? 'Featured in Instagram creators section'
                      : 'Creator has no Instagram account'}
                  </div>
                </div>
              </label>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowFeatureModal(false);
                  setSelectedCreator(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleFeature}
                disabled={actionLoading}
                className="px-4 py-2 bg-primary text-dark rounded-lg hover:bg-primary-dark hover:text-white disabled:opacity-50 transition-colors"
              >
                {actionLoading ? 'Featuring...' : 'Feature Creator'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
