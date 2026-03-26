import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { opportunitiesAPI } from '../services/api';
import Navbar from '../components/Navbar';
import toast from 'react-hot-toast';

const OpportunityDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [opportunity, setOpportunity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [applicationForm, setApplicationForm] = useState({
    proposed_price: '',
    proposal_message: '',
    deliverables: '',
    delivery_timeline_days: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchOpportunityDetails();
  }, [id]);

  const fetchOpportunityDetails = async () => {
    try {
      setLoading(true);
      const response = await opportunitiesAPI.getOpportunity(id);
      setOpportunity(response.data);
    } catch (error) {
      console.error('Error fetching opportunity:', error);
      toast.error('Failed to load opportunity details');
    } finally {
      setLoading(false);
    }
  };

  const handleApplicationChange = (e) => {
    setApplicationForm({
      ...applicationForm,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmitApplication = async (e) => {
    e.preventDefault();

    // Validation
    if (!applicationForm.proposed_price) {
      toast.error('Please enter your proposed price');
      return;
    }

    if (opportunity.participation_mode === 'proposals' || opportunity.participation_mode === 'both') {
      const proposedPrice = parseFloat(applicationForm.proposed_price);
      const minBudget = parseFloat(opportunity.budget_min);
      const maxBudget = parseFloat(opportunity.budget_max);

      if (proposedPrice < minBudget || proposedPrice > maxBudget) {
        toast.error(`Proposed price must be between $${opportunity.budget_min} and $${opportunity.budget_max}`);
        return;
      }
    }

    try {
      setSubmitting(true);

      // CRITICAL: Send proposed_price as string to avoid rounding
      const payload = {
        proposed_price: String(applicationForm.proposed_price),
        proposal_message: applicationForm.proposal_message,
        deliverables: applicationForm.deliverables,
        delivery_timeline_days: applicationForm.delivery_timeline_days ? parseInt(applicationForm.delivery_timeline_days) : null
      };

      await opportunitiesAPI.applyToOpportunity(id, payload);
      toast.success('Application submitted successfully!');
      setShowApplicationModal(false);
      setApplicationForm({
        proposed_price: '',
        proposal_message: '',
        deliverables: '',
        delivery_timeline_days: ''
      });

      // Redirect to My Applications page
      setTimeout(() => {
        navigate('/creator/applications');
      }, 1500);
    } catch (error) {
      console.error('Error submitting application:', error);
      toast.error(error.response?.data?.error || 'Failed to submit application');
    } finally {
      setSubmitting(false);
    }
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

  if (!opportunity) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="bg-white rounded-3xl shadow-lg p-12 text-center">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Opportunity not found</h3>
            <Link to="/creator/opportunities" className="text-primary hover:underline">
              Back to Opportunities
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            to="/creator/opportunities"
            className="text-primary hover:underline mb-4 inline-block"
          >
            ← Back to Opportunities
          </Link>
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900">{opportunity.title}</h1>
                {opportunity.category && (
                  <span className="px-3 py-1 bg-primary bg-opacity-10 text-primary rounded-full text-sm font-medium">
                    {opportunity.category}
                  </span>
                )}
              </div>
              <p className="text-gray-600">{opportunity.description}</p>
            </div>
            <button
              onClick={() => setShowApplicationModal(true)}
              className="px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors font-medium"
            >
              Apply Now
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Campaign Objective */}
            {opportunity.campaign_objective && (
              <div className="bg-white rounded-3xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-2">Objective</h2>
                <p className="text-gray-700">{opportunity.campaign_objective}</p>
              </div>
            )}

            {/* Target Audience */}
            {opportunity.target_audience && (
              <div className="bg-white rounded-3xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-2">Target Audience</h2>
                <p className="text-gray-700">{opportunity.target_audience}</p>
              </div>
            )}

            {/* Content Guidelines */}
            {opportunity.content_guidelines && (
              <div className="bg-white rounded-3xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-2">Content Guidelines</h2>
                <p className="text-gray-700">{opportunity.content_guidelines}</p>
              </div>
            )}

            {/* Milestones & Deliverables */}
            {opportunity.milestones && opportunity.milestones.length > 0 && (
              <div className="bg-white rounded-3xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">What You'll Deliver</h2>
                <div className="space-y-4">
                  {opportunity.milestones.map((milestone) => (
                    <div key={milestone.id} className="border border-gray-200 rounded-xl p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-gray-900">
                          {milestone.milestone_number}. {milestone.name}
                        </h3>
                        {milestone.budget_allocation && (
                          <span className="text-primary font-semibold">
                            {/* CRITICAL: NO toFixed() */}
                            ${milestone.budget_allocation}
                          </span>
                        )}
                      </div>
                      {milestone.description && (
                        <p className="text-gray-600 text-sm mb-2">{milestone.description}</p>
                      )}
                      {milestone.deliverables && milestone.deliverables.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-gray-500 mb-1">Deliverables:</p>
                          <div className="flex flex-wrap gap-2">
                            {milestone.deliverables.map((deliverable, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-1 bg-primary bg-opacity-10 text-primary rounded text-xs"
                              >
                                {deliverable.quantity}x {deliverable.content_type} on{' '}
                                {deliverable.platform}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {milestone.duration_days && (
                        <p className="text-xs text-gray-500 mt-2">
                          Duration: {milestone.duration_days} days
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Budget Card */}
            <div className="bg-white rounded-3xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Budget</h3>
              <div className="bg-primary bg-opacity-10 rounded-xl p-4 mb-4">
                <p className="text-2xl font-bold text-primary">
                  {/* CRITICAL: NO toFixed() */}
                  {opportunity.participation_mode === 'proposals' || opportunity.participation_mode === 'both'
                    ? `$${opportunity.budget_min} - $${opportunity.budget_max}`
                    : `$${opportunity.budget}`}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  {opportunity.participation_mode === 'proposals'
                    ? 'Submit your proposal within this range'
                    : 'Fixed budget'}
                </p>
              </div>
            </div>

            {/* Timeline Card */}
            <div className="bg-white rounded-3xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Timeline</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Campaign Period</p>
                  <p className="text-sm text-gray-900 font-medium">
                    {new Date(opportunity.start_date).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-gray-500">to</p>
                  <p className="text-sm text-gray-900 font-medium">
                    {new Date(opportunity.end_date).toLocaleDateString()}
                  </p>
                </div>
                {opportunity.application_deadline && (
                  <div className="pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-500 mb-1">Application Deadline</p>
                    <p className="text-sm text-red-600 font-medium">
                      {new Date(opportunity.application_deadline).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Brand Card */}
            {opportunity.brand && (
              <div className="bg-white rounded-3xl shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">About the Brand</h3>
                <div className="flex items-center gap-3 mb-3">
                  {opportunity.brand.logo && (
                    <img
                      src={opportunity.brand.logo}
                      alt={opportunity.brand.company_name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  )}
                  <div>
                    <p className="text-gray-900 font-semibold">{opportunity.brand.company_name}</p>
                    {opportunity.brand.industry && (
                      <p className="text-xs text-gray-600">{opportunity.brand.industry}</p>
                    )}
                  </div>
                </div>
                {opportunity.brand.location && (
                  <p className="text-sm text-gray-600">{opportunity.brand.location}</p>
                )}
              </div>
            )}

            {/* Targeting */}
            {(opportunity.target_categories?.length > 0 || opportunity.target_locations?.length > 0) && (
              <div className="bg-white rounded-3xl shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Requirements</h3>
                {opportunity.target_categories?.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-gray-500 mb-2">Preferred Categories</p>
                    <div className="flex flex-wrap gap-2">
                      {opportunity.target_categories.map((category, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                        >
                          {category}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {opportunity.target_locations?.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-gray-500 mb-2">Target Locations</p>
                    <div className="flex flex-wrap gap-2">
                      {opportunity.target_locations.map((location, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                        >
                          {location}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {(opportunity.target_min_followers || opportunity.target_max_followers) && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Follower Range</p>
                    <p className="text-sm text-gray-900">
                      {opportunity.target_min_followers?.toLocaleString() || '0'} -{' '}
                      {opportunity.target_max_followers?.toLocaleString() || 'Unlimited'}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Apply Button */}
            <button
              onClick={() => setShowApplicationModal(true)}
              className="w-full px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors font-medium"
            >
              Apply to This Opportunity
            </button>
          </div>
        </div>
      </div>

      {/* Application Modal */}
      {showApplicationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Apply to Opportunity</h3>
              <button
                onClick={() => setShowApplicationModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmitApplication}>
              <div className="space-y-4">
                {/* Proposed Price */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Proposed Price *
                  </label>
                  {(opportunity.participation_mode === 'proposals' || opportunity.participation_mode === 'both') && (
                    <p className="text-xs text-gray-600 mb-2">
                      Budget range: ${opportunity.budget_min} - ${opportunity.budget_max}
                    </p>
                  )}
                  <input
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*\.?[0-9]*"
                    name="proposed_price"
                    value={applicationForm.proposed_price}
                    onChange={handleApplicationChange}
                    required
                    placeholder="1500"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>

                {/* Proposal Message */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cover Letter / Proposal Message
                  </label>
                  <textarea
                    name="proposal_message"
                    value={applicationForm.proposal_message}
                    onChange={handleApplicationChange}
                    rows="4"
                    placeholder="Tell the brand why you're the perfect fit for this opportunity..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>

                {/* Deliverables */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    What You'll Deliver
                  </label>
                  <textarea
                    name="deliverables"
                    value={applicationForm.deliverables}
                    onChange={handleApplicationChange}
                    rows="3"
                    placeholder="List what you'll deliver (e.g., 2 Instagram reels, 1 TikTok video...)"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>

                {/* Delivery Timeline */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Delivery Timeline (Days)
                  </label>
                  <input
                    type="number"
                    name="delivery_timeline_days"
                    value={applicationForm.delivery_timeline_days}
                    onChange={handleApplicationChange}
                    min="1"
                    placeholder="14"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowApplicationModal(false)}
                  className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors font-medium disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OpportunityDetails;
