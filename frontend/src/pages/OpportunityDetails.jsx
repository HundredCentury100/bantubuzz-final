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
  const [pricingMode, setPricingMode] = useState('total'); // 'total' or 'per_milestone'
  const [applicationForm, setApplicationForm] = useState({
    proposal_message: '',
    total_price: '',
    milestones: [], // Will be prepopulated from opportunity.milestones
    delivery_timeline_days: ''
  });
  const [submitting, setSubmitting] = useState(false);

  // Platform and content type options
  const platforms = ['Instagram', 'TikTok', 'YouTube', 'Facebook', 'Twitter', 'LinkedIn'];
  const contentTypes = {
    Instagram: ['Post', 'Reel', 'Story', 'IGTV'],
    TikTok: ['Video', 'Livestream'],
    YouTube: ['Video', 'Short', 'Livestream'],
    Facebook: ['Post', 'Video', 'Story', 'Livestream'],
    Twitter: ['Tweet', 'Thread'],
    LinkedIn: ['Post', 'Article', 'Video']
  };

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

  // When modal opens, prepopulate milestones from opportunity
  const openApplicationModal = () => {
    if (opportunity && opportunity.milestones) {
      // Prepopulate milestones with deliverables from campaign
      const prepopulatedMilestones = opportunity.milestones.map((milestone, idx) => ({
        id: idx,
        name: milestone.name,
        due_date: milestone.due_date ? milestone.due_date.split('T')[0] : '',
        deliverables: milestone.deliverables || [],
        price: '' // Creator can set price per milestone
      }));

      setApplicationForm({
        ...applicationForm,
        milestones: prepopulatedMilestones
      });
    }
    setShowApplicationModal(true);
  };

  // Handle milestone changes
  const updateMilestone = (index, field, value) => {
    setApplicationForm(prev => ({
      ...prev,
      milestones: prev.milestones.map((m, i) =>
        i === index ? { ...m, [field]: value } : m
      )
    }));
  };

  // Add new milestone
  const addMilestone = () => {
    setApplicationForm(prev => ({
      ...prev,
      milestones: [
        ...prev.milestones,
        {
          id: prev.milestones.length,
          name: '',
          due_date: '',
          deliverables: [],
          price: ''
        }
      ]
    }));
  };

  // Remove milestone
  const removeMilestone = (index) => {
    setApplicationForm(prev => ({
      ...prev,
      milestones: prev.milestones.filter((_, i) => i !== index)
    }));
  };

  // Add deliverable to milestone
  const addDeliverableToMilestone = (milestoneIndex) => {
    setApplicationForm(prev => ({
      ...prev,
      milestones: prev.milestones.map((m, i) =>
        i === milestoneIndex
          ? {
              ...m,
              deliverables: [
                ...m.deliverables,
                { platform: 'Instagram', content_type: 'Post', quantity: 1 }
              ]
            }
          : m
      )
    }));
  };

  // Update deliverable in milestone
  const updateDeliverableInMilestone = (milestoneIndex, deliverableIndex, field, value) => {
    setApplicationForm(prev => ({
      ...prev,
      milestones: prev.milestones.map((m, i) =>
        i === milestoneIndex
          ? {
              ...m,
              deliverables: m.deliverables.map((d, j) =>
                j === deliverableIndex ? { ...d, [field]: value } : d
              )
            }
          : m
      )
    }));
  };

  // Remove deliverable from milestone
  const removeDeliverableFromMilestone = (milestoneIndex, deliverableIndex) => {
    setApplicationForm(prev => ({
      ...prev,
      milestones: prev.milestones.map((m, i) =>
        i === milestoneIndex
          ? {
              ...m,
              deliverables: m.deliverables.filter((_, j) => j !== deliverableIndex)
            }
          : m
      )
    }));
  };

  const handleSubmitApplication = async (e) => {
    e.preventDefault();

    // Validation
    if (pricingMode === 'total') {
      if (!applicationForm.total_price || parseFloat(applicationForm.total_price) <= 0) {
        toast.error('Please enter a total price');
        return;
      }

      if (opportunity.participation_mode === 'proposals' || opportunity.participation_mode === 'both') {
        const proposedPrice = parseFloat(applicationForm.total_price);
        const minBudget = parseFloat(opportunity.budget_min);
        const maxBudget = parseFloat(opportunity.budget_max);

        if (proposedPrice < minBudget || proposedPrice > maxBudget) {
          toast.error(`Total price must be between $${opportunity.budget_min} and $${opportunity.budget_max}`);
          return;
        }
      }
    } else {
      // Per-milestone pricing - validate all milestones have prices
      const milestonesWithoutPrice = applicationForm.milestones.filter(m => !m.price || parseFloat(m.price) <= 0);
      if (milestonesWithoutPrice.length > 0) {
        toast.error('Please set prices for all milestones');
        return;
      }

      // Calculate total from milestones
      const calculatedTotal = applicationForm.milestones.reduce((sum, m) => sum + parseFloat(m.price || 0), 0);

      if (opportunity.participation_mode === 'proposals' || opportunity.participation_mode === 'both') {
        const minBudget = parseFloat(opportunity.budget_min);
        const maxBudget = parseFloat(opportunity.budget_max);

        if (calculatedTotal < minBudget || calculatedTotal > maxBudget) {
          toast.error(`Total of milestone prices ($${calculatedTotal}) must be between $${opportunity.budget_min} and $${opportunity.budget_max}`);
          return;
        }
      }
    }

    // Validate milestones
    if (applicationForm.milestones.length === 0) {
      toast.error('Please add at least one milestone');
      return;
    }

    // Validate each milestone has deliverables
    const milestonesWithoutDeliverables = applicationForm.milestones.filter(m => !m.deliverables || m.deliverables.length === 0);
    if (milestonesWithoutDeliverables.length > 0) {
      toast.error('All milestones must have at least one deliverable');
      return;
    }

    try {
      setSubmitting(true);

      // Calculate total price based on pricing mode
      let finalTotalPrice;
      if (pricingMode === 'total') {
        finalTotalPrice = String(applicationForm.total_price);
      } else {
        // Sum all milestone prices
        finalTotalPrice = String(
          applicationForm.milestones.reduce((sum, m) => sum + parseFloat(m.price || 0), 0)
        );
      }

      // Prepare payload
      const payload = {
        proposed_price: finalTotalPrice,
        proposal_message: applicationForm.proposal_message,
        pricing_mode: pricingMode,
        milestones: applicationForm.milestones.map((m, idx) => ({
          milestone_number: idx + 1,
          name: m.name,
          due_date: m.due_date,
          deliverables: m.deliverables,
          price: pricingMode === 'per_milestone' ? String(m.price) : null
        })),
        delivery_timeline_days: applicationForm.delivery_timeline_days ? parseInt(applicationForm.delivery_timeline_days) : null
      };

      await opportunitiesAPI.applyToOpportunity(id, payload);
      toast.success('Application submitted successfully!');
      setShowApplicationModal(false);

      // Reset form
      setApplicationForm({
        proposal_message: '',
        total_price: '',
        milestones: [],
        delivery_timeline_days: ''
      });
      setPricingMode('total');

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
              onClick={openApplicationModal}
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
              onClick={openApplicationModal}
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
          <div className="bg-white rounded-3xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
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
              <div className="space-y-6">
                {/* Proposal Message */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cover Letter / Proposal Message
                  </label>
                  <textarea
                    name="proposal_message"
                    value={applicationForm.proposal_message}
                    onChange={(e) => setApplicationForm({ ...applicationForm, proposal_message: e.target.value })}
                    rows="4"
                    placeholder="Tell the brand why you're the perfect fit for this opportunity..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>

                {/* Pricing Mode Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Pricing Structure <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        value="total"
                        checked={pricingMode === 'total'}
                        onChange={(e) => setPricingMode(e.target.value)}
                        className="mr-2"
                      />
                      <span className="text-sm">Total Price</span>
                    </label>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        value="per_milestone"
                        checked={pricingMode === 'per_milestone'}
                        onChange={(e) => setPricingMode(e.target.value)}
                        className="mr-2"
                      />
                      <span className="text-sm">Price Per Milestone</span>
                    </label>
                  </div>
                </div>

                {/* Total Price (if pricing_mode = 'total') */}
                {pricingMode === 'total' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Total Price ($) <span className="text-red-500">*</span>
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
                      name="total_price"
                      value={applicationForm.total_price}
                      onChange={(e) => setApplicationForm({ ...applicationForm, total_price: e.target.value })}
                      placeholder="1500"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                )}

                {/* Milestones & Deliverables */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Milestones & Deliverables <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={addMilestone}
                      className="px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors text-sm"
                    >
                      + Add Milestone
                    </button>
                  </div>

                  <p className="text-xs text-gray-600 mb-4">
                    Review and edit the milestones from the campaign. You can add more deliverables or milestones as needed.
                  </p>

                  {applicationForm.milestones.length === 0 ? (
                    <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-xl">
                      <p className="text-gray-600 mb-3">No milestones added yet</p>
                      <button
                        type="button"
                        onClick={addMilestone}
                        className="px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors text-sm"
                      >
                        Add First Milestone
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {applicationForm.milestones.map((milestone, mIdx) => (
                        <div key={mIdx} className="border-2 border-gray-200 rounded-xl p-4 bg-gray-50">
                          <div className="flex justify-between items-start mb-3">
                            <h4 className="font-semibold text-gray-900">Milestone {mIdx + 1}</h4>
                            <button
                              type="button"
                              onClick={() => removeMilestone(mIdx)}
                              className="text-red-600 hover:text-red-700 text-sm font-medium"
                            >
                              Remove
                            </button>
                          </div>

                          {/* Milestone Name */}
                          <div className="mb-3">
                            <label className="block text-xs text-gray-600 mb-1">Name</label>
                            <input
                              type="text"
                              value={milestone.name}
                              onChange={(e) => updateMilestone(mIdx, 'name', e.target.value)}
                              placeholder="e.g., Content Creation & Posting"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3 mb-3">
                            {/* Due Date */}
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">Due Date</label>
                              <input
                                type="date"
                                value={milestone.due_date}
                                onChange={(e) => updateMilestone(mIdx, 'due_date', e.target.value)}
                                min={opportunity.start_date ? opportunity.start_date.split('T')[0] : ''}
                                max={opportunity.end_date ? opportunity.end_date.split('T')[0] : ''}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                              />
                            </div>

                            {/* Price (if per_milestone mode) */}
                            {pricingMode === 'per_milestone' && (
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">Price ($)</label>
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  pattern="[0-9]*\.?[0-9]*"
                                  value={milestone.price}
                                  onChange={(e) => updateMilestone(mIdx, 'price', e.target.value)}
                                  placeholder="500"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                />
                              </div>
                            )}
                          </div>

                          {/* Deliverables */}
                          <div>
                            <div className="flex justify-between items-center mb-2">
                              <label className="block text-xs text-gray-600">Deliverables</label>
                              <button
                                type="button"
                                onClick={() => addDeliverableToMilestone(mIdx)}
                                className="text-xs text-primary hover:text-primary-dark font-medium"
                              >
                                + Add Deliverable
                              </button>
                            </div>

                            {milestone.deliverables.length === 0 ? (
                              <div className="text-center py-3 border border-dashed border-gray-300 rounded-lg bg-white">
                                <p className="text-xs text-gray-500 mb-2">No deliverables</p>
                                <button
                                  type="button"
                                  onClick={() => addDeliverableToMilestone(mIdx)}
                                  className="text-xs text-primary hover:text-primary-dark font-medium"
                                >
                                  Add Deliverable
                                </button>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {milestone.deliverables.map((deliverable, dIdx) => (
                                  <div key={dIdx} className="flex gap-2 items-start bg-white p-3 rounded-lg border border-gray-200">
                                    <div className="flex-1 grid grid-cols-3 gap-2">
                                      <div>
                                        <label className="block text-xs text-gray-500 mb-1">Platform</label>
                                        <select
                                          value={deliverable.platform}
                                          onChange={(e) => updateDeliverableInMilestone(mIdx, dIdx, 'platform', e.target.value)}
                                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-primary focus:border-transparent"
                                        >
                                          {platforms.map(p => (
                                            <option key={p} value={p}>{p}</option>
                                          ))}
                                        </select>
                                      </div>

                                      <div>
                                        <label className="block text-xs text-gray-500 mb-1">Type</label>
                                        <select
                                          value={deliverable.content_type}
                                          onChange={(e) => updateDeliverableInMilestone(mIdx, dIdx, 'content_type', e.target.value)}
                                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-primary focus:border-transparent"
                                        >
                                          {contentTypes[deliverable.platform]?.map(ct => (
                                            <option key={ct} value={ct}>{ct}</option>
                                          ))}
                                        </select>
                                      </div>

                                      <div>
                                        <label className="block text-xs text-gray-500 mb-1">Qty</label>
                                        <input
                                          type="number"
                                          value={deliverable.quantity}
                                          onChange={(e) => updateDeliverableInMilestone(mIdx, dIdx, 'quantity', parseInt(e.target.value) || 1)}
                                          min="1"
                                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-primary focus:border-transparent"
                                        />
                                      </div>
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() => removeDeliverableFromMilestone(mIdx, dIdx)}
                                      className="mt-5 text-red-600 hover:text-red-700 text-xs font-medium"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Total Summary for per_milestone mode */}
                  {pricingMode === 'per_milestone' && applicationForm.milestones.length > 0 && (
                    <div className="mt-4 p-4 bg-primary bg-opacity-10 rounded-xl">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-gray-900">Total Price (All Milestones):</span>
                        <span className="text-xl font-bold text-primary">
                          ${applicationForm.milestones.reduce((sum, m) => sum + parseFloat(m.price || 0), 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Delivery Timeline (Optional) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Delivery Timeline (Days) <span className="text-gray-500 text-xs">(Optional)</span>
                  </label>
                  <input
                    type="number"
                    name="delivery_timeline_days"
                    value={applicationForm.delivery_timeline_days}
                    onChange={(e) => setApplicationForm({ ...applicationForm, delivery_timeline_days: e.target.value })}
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
