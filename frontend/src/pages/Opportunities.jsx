import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { opportunitiesAPI } from '../services/api';
import Navbar from '../components/Navbar';
import toast from 'react-hot-toast';

const Opportunities = () => {
  const navigate = useNavigate();
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    category: '',
    min_budget: '',
    max_budget: '',
    location: ''
  });

  useEffect(() => {
    fetchOpportunities();
  }, []);

  const fetchOpportunities = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.category) params.category = filters.category;
      if (filters.min_budget) params.min_budget = filters.min_budget;
      if (filters.max_budget) params.max_budget = filters.max_budget;
      if (filters.location) params.location = filters.location;

      const response = await opportunitiesAPI.browseOpportunities(params);
      setOpportunities(response.data.campaigns || []);
    } catch (error) {
      console.error('Error fetching opportunities:', error);
      toast.error('Failed to load opportunities');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value
    });
  };

  const handleApplyFilters = () => {
    fetchOpportunities();
  };

  const handleClearFilters = () => {
    setFilters({
      category: '',
      min_budget: '',
      max_budget: '',
      location: ''
    });
    setTimeout(() => fetchOpportunities(), 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Browse Opportunities</h1>
          <p className="text-gray-600">Discover brand collaborations and start earning</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-3xl shadow-lg p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Filter Opportunities</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <input
                type="text"
                name="category"
                value={filters.category}
                onChange={handleFilterChange}
                placeholder="e.g., Fashion, Tech"
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Min Budget
              </label>
              <input
                type="number"
                name="min_budget"
                value={filters.min_budget}
                onChange={handleFilterChange}
                placeholder="500"
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Budget
              </label>
              <input
                type="number"
                name="max_budget"
                value={filters.max_budget}
                onChange={handleFilterChange}
                placeholder="5000"
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location
              </label>
              <input
                type="text"
                name="location"
                value={filters.location}
                onChange={handleFilterChange}
                placeholder="e.g., Singapore"
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleApplyFilters}
              className="px-6 py-2 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors"
            >
              Apply Filters
            </button>
            <button
              onClick={handleClearFilters}
              className="px-6 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Opportunities List */}
        {opportunities.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-lg p-12 text-center">
            <div className="text-gray-400 text-6xl mb-4">🎯</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No opportunities available</h3>
            <p className="text-gray-600 mb-6">
              Check back later or adjust your filters to see more opportunities
            </p>
            <button
              onClick={handleClearFilters}
              className="inline-block px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div>
            <div className="flex justify-between items-center mb-4">
              <p className="text-gray-600">
                {opportunities.length} {opportunities.length === 1 ? 'opportunity' : 'opportunities'} found
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {opportunities.map((opportunity) => (
                <div
                  key={opportunity.id}
                  className="bg-white rounded-3xl shadow-lg hover:shadow-xl transition-shadow overflow-hidden"
                >
                  {/* Opportunity Header */}
                  <div className="p-6 border-b border-gray-100">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="text-lg font-bold text-gray-900 line-clamp-2">
                        {opportunity.title}
                      </h3>
                      {opportunity.category && (
                        <span className="px-2 py-1 bg-primary bg-opacity-10 text-primary rounded text-xs font-medium ml-2">
                          {opportunity.category}
                        </span>
                      )}
                    </div>

                    <p className="text-gray-600 text-sm line-clamp-2 mb-4">
                      {opportunity.description}
                    </p>

                    {/* Budget Display */}
                    <div className="mb-4">
                      <p className="text-xs text-gray-500 mb-1">Budget</p>
                      <p className="text-xl font-bold text-primary">
                        {/* CRITICAL: NO toFixed() */}
                        {opportunity.participation_mode === 'proposals' || opportunity.participation_mode === 'both'
                          ? `$${opportunity.budget_min} - $${opportunity.budget_max}`
                          : `$${opportunity.budget}`}
                      </p>
                    </div>

                    {/* Brand Info */}
                    {opportunity.brand && (
                      <div className="flex items-center gap-2 mb-4">
                        {opportunity.brand.logo && (
                          <img
                            src={opportunity.brand.logo}
                            alt={opportunity.brand.company_name}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        )}
                        <p className="text-sm text-gray-700 font-medium">
                          {opportunity.brand.company_name}
                        </p>
                      </div>
                    )}

                    {/* Timeline */}
                    <div className="flex items-center text-xs text-gray-500">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>
                        {new Date(opportunity.start_date).toLocaleDateString()} -{' '}
                        {new Date(opportunity.end_date).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Application Deadline */}
                    {opportunity.application_deadline && (
                      <div className="mt-2 flex items-center text-xs text-red-600">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>
                          Apply by: {new Date(opportunity.application_deadline).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Milestones Preview */}
                  {opportunity.milestones && opportunity.milestones.length > 0 && (
                    <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
                      <p className="text-xs font-medium text-gray-700 mb-2">
                        {opportunity.milestones.length} {opportunity.milestones.length === 1 ? 'Milestone' : 'Milestones'}
                      </p>
                      <div className="space-y-1">
                        {opportunity.milestones.slice(0, 2).map((milestone, idx) => (
                          <div key={idx} className="flex items-start gap-2">
                            <span className="flex-shrink-0 w-5 h-5 bg-primary text-white rounded-full flex items-center justify-center text-xs">
                              {milestone.milestone_number}
                            </span>
                            <p className="text-xs text-gray-600 line-clamp-1">{milestone.name}</p>
                          </div>
                        ))}
                        {opportunity.milestones.length > 2 && (
                          <p className="text-xs text-gray-500 ml-7">
                            +{opportunity.milestones.length - 2} more
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Action Button */}
                  <div className="p-4 bg-gray-50">
                    <Link
                      to={`/creator/opportunities/${opportunity.id}`}
                      className="block w-full px-4 py-3 bg-primary text-white text-center rounded-xl hover:bg-primary-dark transition-colors font-medium"
                    >
                      View Details & Apply
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Opportunities;
