import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { campaignsAPI, categoriesAPI } from '../services/api';
import Navbar from '../components/Navbar';
import DeliverableBuilder from '../components/DeliverableBuilder';
import toast from 'react-hot-toast';

const CampaignFormNew = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  const [formData, setFormData] = useState({
    // Step 1: Basic Details
    title: '',
    description: '',

    // Step 2: Campaign Brief
    objective: 'Brand Awareness', // Dropdown value
    target_audience: '', // Optional text
    deliverables: [], // Structured: [{platform, content_type, quantity}]
    additional_notes: '', // Content guidelines, hashtags, etc.

    // Step 3: Campaign Setup
    budget: '', // Single total budget
    start_date: '',
    end_date: '',
    milestones: [], // [{name, deliverable_index, due_date}]

    // Step 4: Participation
    participation_type: 'proposals', // 'packages', 'proposals', or 'both'

    // Conditional fields for proposals/both
    target_location: '',
    target_categories: [],
    target_min_followers: '',
    target_max_followers: '',
    application_deadline: '',

    // System fields
    status: 'draft',
    category: '', // Will be set from Step 2 objective mapping or targeting

    // Legacy fields for backward compatibility
    campaign_objective: '',
    key_message: '',
    required_mentions: { hashtags: [], mentions: [], links: [] },
    content_guidelines: '',
    timeline_days: '',
    target_locations: []
  });

  const objectiveOptions = [
    'Brand Awareness',
    'Engagement',
    'Product Promotion',
    'App Installs / Signups',
    'Sales / Conversions',
    'Content Creation',
    'Other'
  ];

  const steps = [
    { number: 1, title: 'Basic Details', description: 'Campaign title and description' },
    { number: 2, title: 'Campaign Brief', description: 'Objective and deliverables' },
    { number: 3, title: 'Campaign Setup', description: 'Budget, timeline, and milestones' },
    { number: 4, title: 'Participation', description: 'How creators participate' }
  ];

  useEffect(() => {
    fetchCategories();
    if (isEditMode) {
      fetchCampaign();
    }
  }, [id]);

  const fetchCategories = async () => {
    try {
      setCategoriesLoading(true);
      const response = await categoriesAPI.getCategories();
      setCategories(response.data.categories.map(cat => cat.name));
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to load categories');
    } finally {
      setCategoriesLoading(false);
    }
  };

  const fetchCampaign = async () => {
    try {
      setLoading(true);
      const response = await campaignsAPI.getCampaign(id);
      const campaign = response.data;

      // Map old structure to new structure
      setFormData({
        title: campaign.title,
        description: campaign.description,

        objective: campaign.objective || 'Brand Awareness',
        target_audience: campaign.target_audience_text || '',
        deliverables: campaign.deliverables || [],
        additional_notes: campaign.content_guidelines || '',

        budget: campaign.budget || '',
        start_date: campaign.start_date ? campaign.start_date.split('T')[0] : '',
        end_date: campaign.end_date ? campaign.end_date.split('T')[0] : '',
        milestones: campaign.milestones || [],

        participation_type: campaign.allows_packages ? 'both' : campaign.participation_mode || 'proposals',
        target_location: campaign.target_locations?.[0] || '',
        target_categories: campaign.target_categories || [],
        target_min_followers: campaign.target_min_followers || '',
        target_max_followers: campaign.target_max_followers || '',
        application_deadline: campaign.application_deadline ? campaign.application_deadline.split('T')[0] : '',

        status: campaign.status,
        category: campaign.category,

        // Legacy fields
        campaign_objective: campaign.campaign_objective || '',
        key_message: campaign.key_message || '',
        required_mentions: campaign.required_mentions || { hashtags: [], mentions: [], links: [] },
        content_guidelines: campaign.content_guidelines || '',
        timeline_days: campaign.timeline_days || '',
        target_locations: campaign.target_locations || []
      });
    } catch (error) {
      console.error('Error fetching campaign:', error);
      toast.error('Failed to load campaign');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const toggleTargetCategory = (category) => {
    setFormData(prev => ({
      ...prev,
      target_categories: prev.target_categories.includes(category)
        ? prev.target_categories.filter(c => c !== category)
        : [...prev.target_categories, category]
    }));
  };

  const addMilestone = () => {
    setFormData(prev => ({
      ...prev,
      milestones: [
        ...prev.milestones,
        {
          name: '',
          deliverable_index: null,
          due_date: ''
        }
      ]
    }));
  };

  const removeMilestone = (index) => {
    setFormData(prev => ({
      ...prev,
      milestones: prev.milestones.filter((_, i) => i !== index)
    }));
  };

  const updateMilestone = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      milestones: prev.milestones.map((m, i) =>
        i === index ? { ...m, [field]: value } : m
      )
    }));
  };

  const validateStep = (step) => {
    switch (step) {
      case 1:
        if (!formData.title || !formData.description) {
          toast.error('Please fill in title and description');
          return false;
        }
        return true;

      case 2:
        if (!formData.objective) {
          toast.error('Please select an objective');
          return false;
        }
        if (formData.deliverables.length === 0) {
          toast.error('Please add at least one deliverable');
          return false;
        }
        // Validate all deliverables are complete
        const incompleteDeliverable = formData.deliverables.find(
          d => !d.platform || !d.content_type || !d.quantity
        );
        if (incompleteDeliverable) {
          toast.error('Please complete all deliverable fields');
          return false;
        }
        return true;

      case 3:
        if (!formData.budget) {
          toast.error('Budget is required');
          return false;
        }
        if (!formData.start_date || !formData.end_date) {
          toast.error('Start and end dates are required');
          return false;
        }
        if (new Date(formData.start_date) > new Date(formData.end_date)) {
          toast.error('End date must be after start date');
          return false;
        }
        if (formData.milestones.length === 0) {
          toast.error('Please add at least one milestone');
          return false;
        }
        // Validate all milestones are complete
        const incompleteMilestone = formData.milestones.find(
          m => !m.name || m.deliverable_index === null || !m.due_date
        );
        if (incompleteMilestone) {
          toast.error('Please complete all milestone fields');
          return false;
        }
        return true;

      case 4:
        if (!formData.participation_type) {
          toast.error('Please select a participation type');
          return false;
        }
        // If proposals or both, application_deadline is required
        if ((formData.participation_type === 'proposals' || formData.participation_type === 'both') && !formData.application_deadline) {
          toast.error('Application deadline is required for proposals');
          return false;
        }
        return true;

      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, steps.length));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateStep(currentStep)) {
      return;
    }

    try {
      setLoading(true);

      // Map new structure to API format
      const payload = {
        title: formData.title,
        description: formData.description,
        category: formData.category || formData.target_categories[0] || 'General',
        status: formData.status,

        // Campaign Brief - store objective and structured deliverables
        campaign_objective: formData.objective,
        content_guidelines: formData.additional_notes,

        // Budget
        budget: parseFloat(formData.budget),

        // Timeline
        start_date: new Date(formData.start_date).toISOString(),
        end_date: new Date(formData.end_date).toISOString(),
        application_deadline: formData.application_deadline ? new Date(formData.application_deadline).toISOString() : undefined,

        // Participation
        participation_mode: formData.participation_type === 'both' ? 'proposals' : formData.participation_type,
        allows_packages: formData.participation_type === 'both' || formData.participation_type === 'packages',
        allows_applications: formData.participation_type === 'proposals' || formData.participation_type === 'both',

        // Targeting
        target_categories: formData.target_categories,
        target_min_followers: formData.target_min_followers ? parseInt(formData.target_min_followers) : undefined,
        target_max_followers: formData.target_max_followers ? parseInt(formData.target_max_followers) : undefined,
        target_locations: formData.target_location ? [formData.target_location] : [],

        // Advanced
        requires_milestones: true,

        // Milestones - map to backend structure
        milestones: formData.milestones.map((m, idx) => {
          const deliverable = formData.deliverables[m.deliverable_index];
          return {
            name: m.name,
            description: `${deliverable.platform} ${deliverable.content_type} (${deliverable.quantity}×)`,
            deliverables: [deliverable], // Store structured deliverable
            due_date: new Date(m.due_date).toISOString()
          };
        })
      };

      if (isEditMode) {
        await campaignsAPI.updateCampaign(id, payload);
        toast.success('Campaign updated successfully!');
      } else {
        const response = await campaignsAPI.createCampaign(payload);
        toast.success('Campaign created successfully!');

        // If participation type is "packages", navigate to package browser
        if (formData.participation_type === 'packages') {
          navigate(`/campaigns/${response.data.campaign.id}/browse-packages`);
          return;
        }

        // If "both", show option
        if (formData.participation_type === 'both') {
          // TODO: Show modal with options
          navigate('/brand/campaigns');
          return;
        }
      }

      navigate('/brand/campaigns');
    } catch (error) {
      console.error('Error saving campaign:', error);
      toast.error(error.response?.data?.error || 'Failed to save campaign');
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEditMode && !formData.title) {
    return (
      <div className="min-h-screen bg-light">
        <Navbar />
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-light">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/brand/campaigns"
            className="text-gray-600 hover:text-gray-900 flex items-center gap-2 mb-4"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Campaigns
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">
            {isEditMode ? 'Edit Campaign' : 'Create New Campaign'}
          </h1>
          <p className="text-gray-600 mt-1">
            Step {currentStep} of {steps.length}: {steps[currentStep - 1].title}
          </p>
        </div>

        {/* Step Indicator */}
        <div className="bg-white rounded-3xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                    currentStep === step.number
                      ? 'bg-primary text-white'
                      : currentStep > step.number
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {currentStep > step.number ? '✓' : step.number}
                  </div>
                  <div className="text-xs mt-2 text-center">
                    <div className="font-medium">{step.title}</div>
                    <div className="text-gray-500 text-[10px]">{step.description}</div>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div className={`h-1 flex-1 mx-2 ${currentStep > step.number ? 'bg-green-500' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
          </div>

          {/* Progress counters */}
          {currentStep >= 2 && (
            <div className="text-sm text-gray-600 mt-4 pt-4 border-t flex items-center gap-4">
              <span>{formData.deliverables.filter(d => d.platform && d.content_type).length} Deliverable{formData.deliverables.filter(d => d.platform && d.content_type).length !== 1 ? 's' : ''}</span>
              {currentStep >= 3 && (
                <span>{formData.milestones.length} Milestone{formData.milestones.length !== 1 ? 's' : ''}</span>
              )}
            </div>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-sm p-6">
          {/* Step 1: Basic Details */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Basic Campaign Information</h2>

              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                  Campaign Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="e.g., EcoCash Mobile Payment Launch"
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                  Campaign Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  required
                  rows={4}
                  maxLength={150}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Short summary of your campaign (max 150 characters recommended)"
                />
                <p className="text-xs text-gray-500 mt-1">{formData.description.length}/150 characters</p>
              </div>
            </div>
          )}

          {/* Step 2: Campaign Brief */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">Campaign Brief</h2>
                <p className="text-sm text-gray-600 mb-4">
                  Define your campaign objectives and deliverables
                </p>
              </div>

              {/* Objective Dropdown */}
              <div>
                <label htmlFor="objective" className="block text-sm font-medium text-gray-700 mb-2">
                  Campaign Objective <span className="text-red-500">*</span>
                </label>
                <select
                  id="objective"
                  name="objective"
                  value={formData.objective}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  {objectiveOptions.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>

              {/* Target Audience */}
              <div>
                <label htmlFor="target_audience" className="block text-sm font-medium text-gray-700 mb-2">
                  Target Audience (Optional)
                </label>
                <textarea
                  id="target_audience"
                  name="target_audience"
                  value={formData.target_audience}
                  onChange={handleChange}
                  rows={2}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="e.g., Young professionals aged 18-35 in Zimbabwe"
                />
              </div>

              {/* Deliverables Builder */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Deliverables <span className="text-red-500">*</span>
                </label>
                <DeliverableBuilder
                  deliverables={formData.deliverables}
                  onChange={(deliverables) => setFormData(prev => ({ ...prev, deliverables }))}
                />
              </div>

              {/* Additional Notes */}
              <div>
                <label htmlFor="additional_notes" className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Notes (Optional)
                </label>
                <textarea
                  id="additional_notes"
                  name="additional_notes"
                  value={formData.additional_notes}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Content guidelines, required hashtags, mentions, tone/style requirements, etc."
                />
              </div>
            </div>
          )}

          {/* Step 3: Campaign Setup */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Campaign Setup</h2>

              {/* Budget */}
              <div>
                <label htmlFor="budget" className="block text-sm font-medium text-gray-700 mb-2">
                  Total Campaign Budget ($) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="budget"
                  name="budget"
                  value={formData.budget}
                  onChange={handleChange}
                  required
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="1500.00"
                />
              </div>

              {/* Timeline */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    id="start_date"
                    name="start_date"
                    value={formData.start_date}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 mb-2">
                    End Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    id="end_date"
                    name="end_date"
                    value={formData.end_date}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>

              {/* Milestones */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Campaign Milestones <span className="text-red-500">*</span>
                  </label>
                  <p className="text-xs text-gray-500">Link deliverables to milestones</p>
                </div>

                {formData.deliverables.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-2xl bg-gray-50">
                    <p className="text-gray-600">Please add deliverables in Step 2 first</p>
                  </div>
                ) : formData.milestones.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-2xl">
                    <p className="text-gray-600 mb-4">No milestones added yet</p>
                    <button
                      type="button"
                      onClick={addMilestone}
                      className="px-6 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors"
                    >
                      + Add First Milestone
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {formData.milestones.map((milestone, index) => (
                      <div key={index} className="bg-gray-50 p-4 rounded-2xl border border-gray-200">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="font-medium text-gray-900">Milestone {index + 1}</h4>
                          <button
                            type="button"
                            onClick={() => removeMilestone(index)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            Remove
                          </button>
                        </div>

                        <div className="space-y-3">
                          <input
                            type="text"
                            placeholder="Milestone name"
                            value={milestone.name}
                            onChange={(e) => updateMilestone(index, 'name', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                            required
                          />

                          <div className="grid grid-cols-2 gap-3">
                            <select
                              value={milestone.deliverable_index !== null ? milestone.deliverable_index : ''}
                              onChange={(e) => updateMilestone(index, 'deliverable_index', parseInt(e.target.value))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                              required
                            >
                              <option value="">Select Deliverable</option>
                              {formData.deliverables.map((d, i) => (
                                d.platform && d.content_type && (
                                  <option key={i} value={i}>
                                    {d.platform} {d.content_type} (×{d.quantity})
                                  </option>
                                )
                              ))}
                            </select>

                            <input
                              type="date"
                              placeholder="Due date"
                              value={milestone.due_date}
                              onChange={(e) => updateMilestone(index, 'due_date', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                              required
                            />
                          </div>
                        </div>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={addMilestone}
                      className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-primary hover:text-primary transition-colors"
                    >
                      + Add Another Milestone
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Participation */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">How do creators participate?</h2>
                <p className="text-sm text-gray-600 mb-4">
                  Choose how creators can join your campaign
                </p>
              </div>

              {/* Participation Type Radio */}
              <div className="space-y-3">
                <label className="flex items-start p-4 border-2 border-gray-200 rounded-xl cursor-pointer hover:border-primary transition-all">
                  <input
                    type="radio"
                    name="participation_type"
                    value="packages"
                    checked={formData.participation_type === 'packages'}
                    onChange={handleChange}
                    className="mt-1 mr-3"
                  />
                  <div>
                    <div className="font-semibold text-gray-900">Add Creator Packages</div>
                    <div className="text-sm text-gray-600">You browse and select creator packages with fixed pricing</div>
                  </div>
                </label>

                <label className="flex items-start p-4 border-2 border-gray-200 rounded-xl cursor-pointer hover:border-primary transition-all">
                  <input
                    type="radio"
                    name="participation_type"
                    value="proposals"
                    checked={formData.participation_type === 'proposals'}
                    onChange={handleChange}
                    className="mt-1 mr-3"
                  />
                  <div>
                    <div className="font-semibold text-gray-900">Allow Creators to Apply</div>
                    <div className="text-sm text-gray-600">Creators submit custom proposals with their own pricing</div>
                  </div>
                </label>

                <label className="flex items-start p-4 border-2 border-gray-200 rounded-xl cursor-pointer hover:border-primary transition-all">
                  <input
                    type="radio"
                    name="participation_type"
                    value="both"
                    checked={formData.participation_type === 'both'}
                    onChange={handleChange}
                    className="mt-1 mr-3"
                  />
                  <div>
                    <div className="font-semibold text-gray-900">Both</div>
                    <div className="text-sm text-gray-600">Combine both approaches - accept proposals and browse packages</div>
                  </div>
                </label>
              </div>

              {/* Conditional: Targeting for Proposals/Both */}
              {(formData.participation_type === 'proposals' || formData.participation_type === 'both') && (
                <div className="space-y-6 pt-6 border-t">
                  <h3 className="font-semibold text-gray-900">Creator Targeting & Application Settings</h3>

                  {/* Application Deadline */}
                  <div>
                    <label htmlFor="application_deadline" className="block text-sm font-medium text-gray-700 mb-2">
                      Application Deadline <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      id="application_deadline"
                      name="application_deadline"
                      value={formData.application_deadline}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>

                  {/* Location */}
                  <div>
                    <label htmlFor="target_location" className="block text-sm font-medium text-gray-700 mb-2">
                      Target Location (Optional)
                    </label>
                    <select
                      id="target_location"
                      name="target_location"
                      value={formData.target_location}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="">Any Location</option>
                      <option value="Zimbabwe">Zimbabwe</option>
                      <option value="South Africa">South Africa</option>
                      <option value="Nigeria">Nigeria</option>
                      <option value="Kenya">Kenya</option>
                      <option value="Ghana">Ghana</option>
                      <option value="Global">Global</option>
                    </select>
                  </div>

                  {/* Target Categories */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Target Categories (Optional)
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {categories.map(category => (
                        <button
                          key={category}
                          type="button"
                          onClick={() => toggleTargetCategory(category)}
                          className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                            formData.target_categories.includes(category)
                              ? 'border-primary bg-primary text-white'
                              : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                          }`}
                        >
                          {category}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Follower Range */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="target_min_followers" className="block text-sm font-medium text-gray-700 mb-2">
                        Minimum Followers (Optional)
                      </label>
                      <input
                        type="number"
                        id="target_min_followers"
                        name="target_min_followers"
                        value={formData.target_min_followers}
                        onChange={handleChange}
                        min="0"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="1000"
                      />
                    </div>

                    <div>
                      <label htmlFor="target_max_followers" className="block text-sm font-medium text-gray-700 mb-2">
                        Maximum Followers (Optional)
                      </label>
                      <input
                        type="number"
                        id="target_max_followers"
                        name="target_max_followers"
                        value={formData.target_max_followers}
                        onChange={handleChange}
                        min="0"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="100000"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-4 pt-6 mt-6 border-t">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={prevStep}
                className="px-6 py-3 border-2 border-gray-300 hover:border-gray-400 text-gray-700 font-medium rounded-xl transition-colors"
              >
                Previous
              </button>
            )}

            {currentStep < steps.length ? (
              <button
                type="button"
                onClick={nextStep}
                className="flex-1 bg-primary hover:bg-primary-dark text-white font-medium py-3 rounded-xl transition-colors"
              >
                Next Step
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-primary hover:bg-primary-dark text-white font-medium py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving...' : (isEditMode ? 'Update Campaign' : 'Create Campaign')}
              </button>
            )}

            <Link
              to="/brand/campaigns"
              className="px-6 py-3 border-2 border-gray-300 hover:border-gray-400 text-gray-700 font-medium rounded-xl transition-colors text-center"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CampaignFormNew;
