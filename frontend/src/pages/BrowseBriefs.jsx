import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { briefsAPI } from '../services/api';
import BriefCard from '../components/BriefCard';
import Navbar from '../components/Navbar';
import { Search, Filter, X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const BrowseBriefs = () => {
  const navigate = useNavigate();
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
        {/* Navigation */}
        <div className="mb-6 flex items-center gap-4 flex-wrap">
          <Link
            to="/creator/dashboard"
            className="text-gray-600 hover:text-gray-900 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </Link>
          <button
            onClick={() => navigate(-1)}
            className="text-gray-600 hover:text-gray-900 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back
          </button>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-dark mb-2">Browse Briefs</h1>
          <p className="text-gray-600">Find projects that match your skills and submit proposals</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-4 md:p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search briefs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent appearance-none bg-white"
              >
                <option value="open">Open Briefs</option>
                <option value="all">All Briefs</option>
                <option value="closed">Closed Briefs</option>
              </select>
            </div>
          </div>

          {/* Clear Search */}
          {searchTerm && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setSearchTerm('')}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <X size={16} />
                Clear Search
              </button>
            </div>
          )}
        </div>

        {/* Results Count */}
        {!loading && !error && (
          <div className="mb-6">
            <p className="text-gray-600">
              Showing {filteredBriefs.length} {filteredBriefs.length === 1 ? 'brief' : 'briefs'}
              {searchTerm && ` matching "${searchTerm}"`}
            </p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <h3 className="text-red-800 font-semibold mb-1">Error Loading Briefs</h3>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredBriefs.map((brief) => (
                  <BriefCard key={brief.id} brief={brief} />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
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

            {/* Info Box */}
            {filteredBriefs.length > 0 && (
              <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-blue-900 mb-3">
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
          </>
        )}
      </div>
    </div>
  );
};

export default BrowseBriefs;
