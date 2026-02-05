import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { briefsAPI, proposalsAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';
import {
  DollarSign,
  Calendar,
  Target,
  Users,
  MapPin,
  Award,
  Clock,
  AlertCircle,
  Check,
  Plus,
  Trash2,
  Building2,
  X
} from 'lucide-react';

const BriefDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [brief, setBrief] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [existingProposal, setExistingProposal] = useState(null);

  const [proposalData, setProposalData] = useState({
    message: '',
    total_price: '',
    pricing_type: 'total',
    milestones: [],
  });

  useEffect(() => {
    fetchBrief();
  }, [id]);

  // Close modal on escape key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') setShowProposalModal(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const fetchBrief = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await briefsAPI.getBrief(id);
      setBrief(response.data);

      // Initialize proposal milestones based on brief milestones and set timeline from brief
      if (response.data.milestones) {
        const totalTimeline = response.data.milestones.reduce((sum, m) => sum + (m.duration_days || 0), 0);
        setProposalData((prev) => ({
          ...prev,
          timeline_days: response.data.timeline_days || totalTimeline || '',
          milestones: response.data.milestones.map((bm) => ({
            milestone_number: bm.milestone_number,
            title: bm.title,
            deliverables: bm.expected_deliverables || [''],
            duration_days: bm.duration_days,
            price: '',
            notes: '',
          })),
        }));
      } else if (response.data.timeline_days) {
        setProposalData((prev) => ({
          ...prev,
          timeline_days: response.data.timeline_days
        }));
      }

      // Check if user already has a proposal
      if (user?.user_type === 'creator') {
        try {
          const proposalsResponse = await proposalsAPI.getProposals({ brief_id: id });
          if (proposalsResponse.data.proposals && proposalsResponse.data.proposals.length > 0) {
            setExistingProposal(proposalsResponse.data.proposals[0]);
          }
        } catch (err) {
          // No existing proposal
        }
      }
    } catch (err) {
      console.error('Error fetching brief:', err);
      setError(err.response?.data?.error || 'Failed to load brief');
    } finally {
      setLoading(false);
    }
  };

  const handleProposalInputChange = (e) => {
    const { name, value } = e.target;
    setProposalData((prev) => ({ ...prev, [name]: value }));
  };

  const updateMilestoneField = (index, field, value) => {
    const updated = [...proposalData.milestones];
    updated[index][field] = value;

    // Auto-calculate total price if pricing is per_milestone
    if (field === 'price' && proposalData.pricing_type === 'per_milestone') {
      const totalPrice = updated.reduce((sum, m) => {
        const price = parseFloat(m.price) || 0;
        return sum + price;
      }, 0);
      setProposalData((prev) => ({
        ...prev,
        milestones: updated,
        total_price: totalPrice.toString()
      }));
    } else {
      setProposalData((prev) => ({ ...prev, milestones: updated }));
    }
  };

  const addMilestoneDeliverable = (milestoneIndex) => {
    const updated = [...proposalData.milestones];
    updated[milestoneIndex].deliverables.push('');
    setProposalData((prev) => ({ ...prev, milestones: updated }));
  };

  const updateMilestoneDeliverable = (milestoneIndex, deliverableIndex, value) => {
    const updated = [...proposalData.milestones];
    updated[milestoneIndex].deliverables[deliverableIndex] = value;
    setProposalData((prev) => ({ ...prev, milestones: updated }));
  };

  const removeMilestoneDeliverable = (milestoneIndex, deliverableIndex) => {
    const updated = [...proposalData.milestones];
    if (updated[milestoneIndex].deliverables.length > 1) {
      updated[milestoneIndex].deliverables.splice(deliverableIndex, 1);
      setProposalData((prev) => ({ ...prev, milestones: updated }));
    }
  };

  const validateProposal = () => {
    if (!proposalData.message.trim()) return 'Message is required';
    if (!proposalData.total_price || parseFloat(proposalData.total_price) <= 0) {
      return 'Total price must be greater than 0';
    }

    if (proposalData.pricing_type === 'per_milestone') {
      for (let i = 0; i < proposalData.milestones.length; i++) {
        const milestone = proposalData.milestones[i];
        if (!milestone.price || parseFloat(milestone.price) <= 0) {
          return `Milestone ${i + 1}: Price must be greater than 0`;
        }
      }
    }

    for (let i = 0; i < proposalData.milestones.length; i++) {
      const milestone = proposalData.milestones[i];
      if (!milestone.title.trim()) return `Milestone ${i + 1}: Title is required`;
      if (milestone.deliverables.some((d) => !d.trim())) {
        return `Milestone ${i + 1}: All deliverables must be filled`;
      }
    }

    return null;
  };

  const handleSubmitProposal = async (e) => {
    e.preventDefault();

    const validationError = validateProposal();
    if (validationError) {
      setError(validationError);
      toast.error(validationError);
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      const payload = {
        brief_id: parseInt(id),
        message: proposalData.message,
        total_price: parseFloat(proposalData.total_price),
        timeline_days: parseInt(proposalData.timeline_days || 0),
        pricing_type: proposalData.pricing_type,
        milestones: proposalData.milestones.map((m) => ({
          milestone_number: m.milestone_number,
          title: m.title,
          deliverables: m.deliverables.filter((d) => d.trim()),
          duration_days: parseInt(m.duration_days),
          price: proposalData.pricing_type === 'per_milestone' ? parseFloat(m.price) : null,
          notes: m.notes || '',
        })),
      };

      await proposalsAPI.createProposal(payload);
      toast.success('Proposal submitted successfully!');
      setShowProposalModal(false);
      navigate('/creator/proposals');
    } catch (err) {
      console.error('Error submitting proposal:', err);
      const errorMsg = err.response?.data?.error || 'Failed to submit proposal';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-light">
        <Navbar />
        <div className="container-custom section-padding flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (error && !brief) {
    return (
      <div className="min-h-screen bg-light">
        <Navbar />
        <div className="container-custom section-padding py-8">
          <div className="max-w-4xl mx-auto px-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="text-red-600" size={24} />
                <div>
                  <h3 className="text-red-800 font-semibold">Error Loading Brief</h3>
                  <p className="text-red-600">{error}</p>
                </div>
              </div>
              <button
                onClick={() => navigate(-1)}
                className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const formatBudget = (min, max) => {
    if (min && max) return `$${min} - $${max}`;
    if (min) return `From $${min}`;
    if (max) return `Up to $${max}`;
    return 'Negotiable';
  };

  const timeAgo = (date) => {
    const now = new Date();
    const posted = new Date(date);
    const diffInHours = Math.floor((now - posted) / (1000 * 60 * 60));
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return `${Math.floor(diffInDays / 7)}w ago`;
  };

  const isCreator = user?.user_type === 'creator';
  const isBrand = user?.user_type === 'brand';
  const meetsCriteria = brief.meets_criteria !== false; // Defaults to true if not set
  const canSubmitProposal = isCreator && brief.status === 'open' && !existingProposal && meetsCriteria;

  return (
    <div className="min-h-screen bg-light">
      <Navbar />
      <div className="container-custom section-padding py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Header */}
              <div className="bg-white rounded-xl shadow-sm p-4 md:p-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                  <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{brief.title}</h1>
                    <p className="text-sm text-gray-500">Posted {timeAgo(brief.created_at)}</p>
                  </div>
                  <span
                    className={`px-4 py-2 rounded-full text-sm font-medium w-fit ${
                      brief.status === 'open'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {brief.status.charAt(0).toUpperCase() + brief.status.slice(1)}
                  </span>
                </div>

                {/* Description */}
                <div className="mb-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
                  <p className="text-gray-700 whitespace-pre-line">{brief.description}</p>
                </div>

                {/* Goal */}
                {brief.goal && (
                  <div className="p-4 bg-primary-light rounded-lg">
                    <div className="flex items-start gap-2">
                      <Target className="text-primary mt-1 flex-shrink-0" size={20} />
                      <div>
                        <h3 className="font-semibold text-primary-dark mb-1">Project Goal</h3>
                        <p className="text-primary-dark">{brief.goal}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Milestones */}
              {brief.milestones && brief.milestones.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm p-4 md:p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Award size={24} className="text-primary" />
                    Milestones ({brief.milestones.length})
                  </h2>
                  <div className="space-y-4">
                    {brief.milestones.map((milestone, index) => (
                      <div key={index} className="p-4 border border-gray-200 rounded-lg">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              Milestone {milestone.milestone_number}: {milestone.title}
                            </h3>
                            <p className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                              <Calendar size={14} />
                              {milestone.duration_days} days
                            </p>
                          </div>
                          {milestone.price && (
                            <div className="text-left sm:text-right">
                              <p className="text-lg font-bold text-primary">${milestone.price}</p>
                            </div>
                          )}
                        </div>
                        {milestone.expected_deliverables && milestone.expected_deliverables.length > 0 && (
                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-2">Expected Deliverables:</p>
                            <ul className="list-disc list-inside space-y-1">
                              {milestone.expected_deliverables.map((deliverable, dIndex) => (
                                <li key={dIndex} className="text-sm text-gray-600">
                                  {deliverable}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Brand Info */}
              {brief.brand && (
                <div className="bg-white rounded-xl shadow-sm p-4 md:p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Building2 size={24} className="text-primary" />
                    About the Brand
                  </h2>
                  <div className="flex items-center gap-4">
                    {brief.brand.logo ? (
                      <img
                        src={`${import.meta.env.VITE_API_URL}${brief.brand.logo}`}
                        alt={brief.brand.company_name}
                        className="w-16 h-16 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-primary-light flex items-center justify-center flex-shrink-0">
                        <span className="text-primary font-semibold text-xl">
                          {brief.brand.company_name.charAt(0)}
                        </span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{brief.brand.company_name}</h3>
                      {brief.brand.industry && (
                        <p className="text-sm text-gray-600">{brief.brand.industry}</p>
                      )}
                      {brief.brand.location && (
                        <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                          <MapPin size={14} />
                          {brief.brand.location}
                        </p>
                      )}
                    </div>
                  </div>
                  {brief.brand.description && (
                    <p className="mt-4 text-gray-700">{brief.brand.description}</p>
                  )}
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Key Details */}
              <div className="bg-white rounded-xl shadow-sm p-4 md:p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Key Details</h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <DollarSign className="text-green-600 flex-shrink-0" size={20} />
                    <div>
                      <p className="text-sm text-gray-600">Budget</p>
                      <p className="font-semibold text-gray-900">
                        {formatBudget(brief.budget_min, brief.budget_max)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Calendar className="text-blue-600 flex-shrink-0" size={20} />
                    <div>
                      <p className="text-sm text-gray-600">Timeline</p>
                      <p className="font-semibold text-gray-900">{brief.timeline_days} days</p>
                    </div>
                  </div>

                  {brief.platform && (
                    <div className="flex items-start gap-3">
                      <Clock className="text-primary flex-shrink-0" size={20} />
                      <div>
                        <p className="text-sm text-gray-600">Platform</p>
                        <p className="font-semibold text-gray-900">{brief.platform}</p>
                      </div>
                    </div>
                  )}

                  {(brief.target_min_followers || brief.target_max_followers) && (
                    <div className="flex items-start gap-3">
                      <Users className="text-orange-600 flex-shrink-0" size={20} />
                      <div>
                        <p className="text-sm text-gray-600">Follower Range</p>
                        <p className="font-semibold text-gray-900">
                          {brief.target_min_followers && brief.target_max_followers
                            ? `${brief.target_min_followers.toLocaleString()} - ${brief.target_max_followers.toLocaleString()}`
                            : brief.target_min_followers
                            ? `${brief.target_min_followers.toLocaleString()}+`
                            : `Up to ${brief.target_max_followers.toLocaleString()}`}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Categories */}
              {brief.target_categories && brief.target_categories.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm p-4 md:p-6">
                  <h3 className="font-semibold text-gray-900 mb-3">Categories</h3>
                  <div className="flex flex-wrap gap-2">
                    {brief.target_categories.map((category, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-primary-light text-primary-dark rounded-full text-sm"
                      >
                        {category}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Locations */}
              {brief.target_locations && brief.target_locations.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm p-4 md:p-6">
                  <h3 className="font-semibold text-gray-900 mb-3">Target Locations</h3>
                  <div className="space-y-2">
                    {brief.target_locations.map((location, index) => (
                      <div key={index} className="flex items-center gap-2 text-gray-700">
                        <MapPin size={16} className="text-gray-400" />
                        <span>{location}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {canSubmitProposal && (
                <button
                  onClick={() => setShowProposalModal(true)}
                  className="w-full py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors font-semibold"
                >
                  Submit Proposal
                </button>
              )}

              {existingProposal && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Check className="text-blue-600" size={20} />
                    <h3 className="font-semibold text-blue-900">Proposal Submitted</h3>
                  </div>
                  <p className="text-sm text-blue-800 mb-3">
                    Status: <span className="font-semibold">{existingProposal.status}</span>
                  </p>
                  <button
                    onClick={() => navigate('/creator/proposals')}
                    className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    View Proposal
                  </button>
                </div>
              )}

              {isCreator && brief.status === 'open' && !existingProposal && !meetsCriteria && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="text-amber-600" size={20} />
                    <h3 className="font-semibold text-amber-900">Not Eligible</h3>
                  </div>
                  <p className="text-sm text-amber-800">
                    You don't meet the targeting criteria for this brief. You can view the details but cannot submit a proposal.
                  </p>
                </div>
              )}

              {!isCreator && !isBrand && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <AlertCircle className="text-amber-600 mb-2" size={20} />
                  <p className="text-sm text-amber-800">
                    Please log in as a creator to submit a proposal
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Proposal Modal */}
      {showProposalModal && canSubmitProposal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto my-8">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-xl">
              <h2 className="text-2xl font-bold text-gray-900">Submit Your Proposal</h2>
              <button
                onClick={() => setShowProposalModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {error && (
                <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="text-red-600 flex-shrink-0" size={24} />
                    <p className="text-red-800">{error}</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmitProposal}>
                <div className="space-y-6">
                  {/* Message */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cover Message *
                    </label>
                    <textarea
                      name="message"
                      value={proposalData.message}
                      onChange={handleProposalInputChange}
                      rows="4"
                      placeholder="Explain why you're the best fit for this project..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      required
                    />
                  </div>

                  {/* Pricing */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Total Price * {proposalData.pricing_type === 'per_milestone' && <span className="text-sm text-gray-500">(Auto-calculated from milestones)</span>}
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                      <input
                        type="number"
                        name="total_price"
                        value={proposalData.total_price}
                        onChange={handleProposalInputChange}
                        placeholder="0"
                        min="0"
                        step="1"
                        readOnly={proposalData.pricing_type === 'per_milestone'}
                        className={`w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${
                          proposalData.pricing_type === 'per_milestone' ? 'bg-gray-50 cursor-not-allowed' : ''
                        }`}
                        required
                      />
                    </div>
                  </div>

                  {/* Pricing Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Pricing Type
                    </label>
                    <select
                      name="pricing_type"
                      value={proposalData.pricing_type}
                      onChange={handleProposalInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="total">Divide Evenly Across Milestones</option>
                      <option value="per_milestone">Price Each Milestone Individually</option>
                    </select>
                  </div>

                  {/* Timeline */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Timeline (Days) * <span className="text-sm text-gray-500">(Based on brief: {brief.timeline_days} days)</span>
                    </label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                      <input
                        type="number"
                        name="timeline_days"
                        value={proposalData.timeline_days}
                        onChange={handleProposalInputChange}
                        placeholder={brief.timeline_days?.toString() || "0"}
                        min="1"
                        step="1"
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        required
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      You can adjust the timeline based on your needs
                    </p>
                  </div>

                  {/* Milestones */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Milestones</h3>
                    <div className="space-y-4">
                      {proposalData.milestones.map((milestone, index) => (
                        <div key={index} className="p-4 border border-gray-200 rounded-lg">
                          <h4 className="font-semibold text-gray-900 mb-3">
                            Milestone {milestone.milestone_number}
                          </h4>

                          <div className="space-y-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Title *
                              </label>
                              <input
                                type="text"
                                value={milestone.title}
                                onChange={(e) => updateMilestoneField(index, 'title', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                required
                              />
                            </div>

                            {proposalData.pricing_type === 'per_milestone' && (
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Price *
                                </label>
                                <input
                                  type="number"
                                  value={milestone.price}
                                  onChange={(e) => updateMilestoneField(index, 'price', e.target.value)}
                                  placeholder="0"
                                  min="0"
                                  step="1"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                  required
                                />
                              </div>
                            )}

                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-medium text-gray-700">
                                  Your Deliverables *
                                </label>
                                <button
                                  type="button"
                                  onClick={() => addMilestoneDeliverable(index)}
                                  className="text-sm text-primary hover:text-primary-dark"
                                >
                                  + Add
                                </button>
                              </div>
                              <div className="space-y-2">
                                {milestone.deliverables.map((deliverable, dIndex) => (
                                  <div key={dIndex} className="flex gap-2">
                                    <input
                                      type="text"
                                      value={deliverable}
                                      onChange={(e) =>
                                        updateMilestoneDeliverable(index, dIndex, e.target.value)
                                      }
                                      placeholder="Describe deliverable"
                                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                      required
                                    />
                                    {milestone.deliverables.length > 1 && (
                                      <button
                                        type="button"
                                        onClick={() => removeMilestoneDeliverable(index, dIndex)}
                                        className="text-red-600 hover:text-red-700"
                                      >
                                        <Trash2 size={20} />
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Notes (optional)
                              </label>
                              <textarea
                                value={milestone.notes}
                                onChange={(e) => updateMilestoneField(index, 'notes', e.target.value)}
                                rows="2"
                                placeholder="Any additional notes for this milestone..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Submit Buttons */}
                  <div className="flex gap-4 sticky bottom-0 bg-white pt-4 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => setShowProposalModal(false)}
                      disabled={submitting}
                      className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-semibold"
                    >
                      {submitting && (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      )}
                      {submitting ? 'Submitting...' : 'Submit Proposal'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BriefDetails;
