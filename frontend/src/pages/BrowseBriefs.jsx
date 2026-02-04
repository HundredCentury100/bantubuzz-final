import React, { useState, useEffect } from 'react';
import { briefsAPI } from '../services/api';
import BriefCard from '../components/BriefCard';
import Navbar from '../components/Navbar';
import { Search, Filter, Loader, Briefcase, AlertCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const BrowseBriefs = () => {
  const [briefs, setBriefs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('open');
  const { user } = useAuth();

  useEffect(() => {
    fetchBriefs();
  }, [statusFilter]);

  const fetchBriefs = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await briefsAPI.getBriefs({ status: statusFilter });
      setBriefs(response.data.briefs || []);
    } catch (err) {
      console.error('Error fetching briefs:', err);
      setError(err.response?.data?.error || 'Failed to load briefs');
    } finally {
      setLoading(false);
    }
  };

  const filteredBriefs = briefs.filter((brief) => {
    const matchesSearch =
      searchTerm === '' ||
      brief.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      brief.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      brief.goal?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  return (
    <div className="min-h-screen bg-light">
      <Navbar />
      <div className="container-custom section-padding">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Briefcase className="text-primary" size={32} />
            <h1 className="text-3xl font-bold text-gray-900">Browse Briefs</h1>
          </div>
          <p className="text-gray-600">
            Find projects that match your skills and submit proposals
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search briefs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-3">
              <Filter className="text-gray-400" size={20} />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="open">Open Briefs</option>
                <option value="all">All Briefs</option>
                <option value="closed">Closed Briefs</option>
              </select>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <Loader className="animate-spin text-primary" size={48} />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="text-red-600 flex-shrink-0" size={24} />
              <div>
                <h3 className="text-red-800 font-semibold">Error Loading Briefs</h3>
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            </div>
            <button
              onClick={fetchBriefs}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Briefs Grid */}
        {!loading && !error && (
          <>
            {filteredBriefs.length > 0 ? (
              <>
                <div className="mb-4 text-sm text-gray-600">
                  Showing {filteredBriefs.length} {filteredBriefs.length === 1 ? 'brief' : 'briefs'}
                  {searchTerm && ` matching "${searchTerm}"`}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredBriefs.map((brief) => (
                    <BriefCard key={brief.id} brief={brief} />
                  ))}
                </div>
              </>
            ) : (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <Briefcase className="mx-auto text-gray-400 mb-4" size={64} />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {searchTerm ? 'No briefs found' : 'No briefs available'}
                </h3>
                <p className="text-gray-600 mb-6">
                  {searchTerm
                    ? `No briefs match your search "${searchTerm}"`
                    : 'Check back later for new project opportunities'}
                </p>
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                  >
                    Clear Search
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {/* Info Box */}
        {!loading && !error && filteredBriefs.length > 0 && (
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              How to Apply to Briefs
            </h3>
            <ul className="space-y-2 text-blue-800 text-sm">
              <li className="flex items-start gap-2">
                <span className="font-semibold mt-0.5">1.</span>
                <span>Click on a brief to view full details and requirements</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold mt-0.5">2.</span>
                <span>Submit a proposal with your pricing and deliverables for each milestone</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold mt-0.5">3.</span>
                <span>If accepted, the brand will create a booking and proceed to payment</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold mt-0.5">4.</span>
                <span>Once paid, the collaboration starts and you can begin working on milestones</span>
              </li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default BrowseBriefs;
