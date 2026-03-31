import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { campaignsAPI, categoriesAPI } from '../services/api';
import Navbar from '../components/Navbar';
import CampaignSuccessModal from '../components/CampaignSuccessModal';
import toast from 'react-hot-toast';

const CampaignFormNew = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdCampaignId, setCreatedCampaignId] = useState(null);

  const [formData, setFormData] = useState({
    // Step 1: Basic Details
    title: '',
    description: '',

    // Step 2: Campaign Brief & Milestones (NEW STRUCTURE)
    objective: 'Brand Awareness',
    target_audience: '',
    additional_notes: '',
    milestones: [], // [{name, deliverables: [{platform, content_type, quantity}], due_date, budget_allocation}]

    // Step 3: Campaign Setup
    budget: '',
    start_date: '',
    end_date: '',

    // Step 4: Participation
    participation_type: 'proposals',
    target_location: '',
    target_categories: [],
    target_min_followers: '',
    target_max_followers: '',
    application_deadline: '',

    // System fields
    status: 'draft',
    category: ''
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

  const platforms = ['Instagram', 'TikTok', 'YouTube', 'Facebook', 'Twitter', 'LinkedIn'];

  const contentTypes = {
    Instagram: ['Post', 'Reel', 'Story', 'IGTV'],
    TikTok: ['Video', 'Livestream'],
    YouTube: ['Video', 'Short', 'Livestream'],
    Facebook: ['Post', 'Video', 'Story', 'Livestream'],
    Twitter: ['Tweet', 'Thread'],
    LinkedIn: ['Post', 'Article', 'Video']
  };

  const steps = [
    { number: 1, title: 'Basic Details', description: 'Campaign title and description' },
    { number: 2, title: 'Milestones & Deliverables', description: 'What creators will create' },
    { number: 3, title: 'Budget & Timeline', description: 'Budget and dates' },
    { number: 4, title: 'Participation', description: 'How creators participate' },
    { number: 5, title: 'Review', description: 'Review and publish' }
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

      setFormData({
        title: campaign.title,
        description: campaign.description,
        objective: campaign.campaign_objective || 'Brand Awareness',
        target_audience: campaign.target_audience || '',
        additional_notes: campaign.content_guidelines || '',
        milestones: campaign.milestones || [],
        budget: campaign.budget || campaign.budget_min || '',
        start_date: campaign.start_date ? campaign.start_date.split('T')[0] : '',
        end_date: campaign.end_date ? campaign.end_date.split('T')[0] : '',
        participation_type: campaign.allows_packages && campaign.allows_applications ? 'both' : (campaign.participation_mode || 'proposals'),
        target_location: campaign.target_locations?.[0] || '',
        target_categories: campaign.target_categories || [],
        target_min_followers: campaign.target_min_followers || '',
        target_max_followers: campaign.target_max_followers || '',
        application_deadline: campaign.application_deadline ? campaign.application_deadline.split('T')[0] : '',
        status: campaign.status,
        category: campaign.category
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

  // Milestone management
  const addMilestone = () => {
    setFormData(prev => ({
      ...prev,
      milestones: [
        ...prev.milestones,
        {
          name: '',
          deliverables: [],
          due_date: '',
          budget_allocation: ''
        }
      ]
    }));
  };

  const removeMilestone = (milestoneIndex) => {
    setFormData(prev => ({
      ...prev,
      milestones: prev.milestones.filter((_, i) => i !== milestoneIndex)
    }));
  };

  const updateMilestone = (milestoneIndex, field, value) => {
    setFormData(prev => ({
      ...prev,
      milestones: prev.milestones.map((m, i) =>
        i === milestoneIndex ? { ...m, [field]: value } : m
      )
    }));
  };

  // Deliverable management within milestone
  const addDeliverableToMilestone = (milestoneIndex) => {
    setFormData(prev => ({
      ...prev,
      milestones: prev.milestones.map((m, i) =>
        i === milestoneIndex
          ? { ...m, deliverables: [...m.deliverables, { platform: '', content_type: '', quantity: 1 }] }
          : m
      )
    }));
  };

  const removeDeliverableFromMilestone = (milestoneIndex, deliverableIndex) => {
    setFormData(prev => ({
      ...prev,
      milestones: prev.milestones.map((m, i) =>
        i === milestoneIndex
          ? { ...m, deliverables: m.deliverables.filter((_, j) => j !== deliverableIndex) }
          : m
      )
    }));
  };

  const updateDeliverable = (milestoneIndex, deliverableIndex, field, value) => {
    setFormData(prev => ({
      ...prev,
      milestones: prev.milestones.map((m, i) =>
        i === milestoneIndex
          ? {
              ...m,
              deliverables: m.deliverables.map((d, j) =>
                j === deliverableIndex
                  ? { ...d, [field]: value, ...(field === 'platform' ? { content_type: '' } : {}) }
                  : d
              )
            }
          : m
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
        if (formData.milestones.length === 0) {
          toast.error('Please add at least one milestone');
          return false;
        }
        // Validate each milestone
        for (let i = 0; i < formData.milestones.length; i++) {
          const milestone = formData.milestones[i];
          if (!milestone.name) {
            toast.error(`Milestone ${i + 1}: Please enter a name`);
            return false;
          }
          if (milestone.deliverables.length === 0) {
            toast.error(`Milestone ${i + 1}: Please add at least one deliverable`);
            return false;
          }
          // Validate deliverables
          for (let j = 0; j < milestone.deliverables.length; j++) {
            const deliverable = milestone.deliverables[j];
            if (!deliverable.platform || !deliverable.content_type || !deliverable.quantity) {
              toast.error(`Milestone ${i + 1}, Deliverable ${j + 1}: Please complete all fields`);
              return false;
            }
          }
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
        // Validate milestone due dates
        for (let i = 0; i < formData.milestones.length; i++) {
          if (!formData.milestones[i].due_date) {
            toast.error(`Milestone ${i + 1}: Please set a due date`);
            return false;
          }
        }
        return true;

      case 4:
        if (!formData.participation_type) {
          toast.error('Please select a participation type');
          return false;
        }
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

  const handleSaveOrPublish = async (publishNow = false) => {
    try {
      setLoading(true);

      // Determine status based on publish action and participation type
      let status = 'draft';
      if (publishNow) {
        // Auto-determine visibility based on participation settings
        if (formData.participation_type === 'proposals' || formData.participation_type === 'both') {
          status = 'active'; // Public - creators can see and apply
        } else {
          status = 'draft'; // Private - only accessible to selected/invited creators
        }
      }

      const payload = {
        title: formData.title,
        description: formData.description,
        category: formData.category || formData.target_categories[0] || 'General',
        status: status,

        campaign_objective: formData.objective,
        content_guidelines: formData.additional_notes,
        target_audience: formData.target_audience,

        start_date: new Date(formData.start_date).toISOString(),
        end_date: new Date(formData.end_date).toISOString(),
        application_deadline: formData.application_deadline ? new Date(formData.application_deadline).toISOString() : undefined,

        participation_mode: formData.participation_type === 'both' ? 'proposals' : formData.participation_type,
        allows_packages: formData.participation_type === 'both' || formData.participation_type === 'packages',
        allows_applications: formData.participation_type === 'proposals' || formData.participation_type === 'both',

        // Budget - conditional based on participation mode
        ...(formData.participation_type === 'packages' ? {
          budget: parseFloat(formData.budget)
        } : {
          budget_min: parseFloat(formData.budget),
          budget_max: parseFloat(formData.budget)
        }),

        target_categories: formData.target_categories,
        target_min_followers: formData.target_min_followers ? parseInt(formData.target_min_followers) : undefined,
        target_max_followers: formData.target_max_followers ? parseInt(formData.target_max_followers) : undefined,
        target_locations: formData.target_location ? [formData.target_location] : [],

        requires_milestones: true,

        // Milestones with nested deliverables
        milestones: formData.milestones.map(m => ({
          name: m.name,
          description: m.deliverables.map(d => `${d.quantity}× ${d.platform} ${d.content_type}`).join(', '),
          deliverables: m.deliverables,
          due_date: new Date(m.due_date).toISOString(),
          budget_allocation: m.budget_allocation ? parseFloat(m.budget_allocation) : null
        }))
      };

      if (isEditMode) {
        await campaignsAPI.updateCampaign(id, payload);
        toast.success('Campaign updated successfully!');
        navigate('/brand/campaigns');
      } else {
        const response = await campaignsAPI.createCampaign(payload);
        const campaignId = response.data.campaign.id;

        if (publishNow) {
          toast.success('Campaign published successfully!');
        } else {
          toast.success('Campaign saved as draft!');
        }

        if (publishNow && formData.participation_type === 'packages') {
          navigate(`/brand/campaigns/${campaignId}/browse-packages`);
          return;
        }

        if (publishNow && formData.participation_type === 'both') {
          setCreatedCampaignId(campaignId);
          setShowSuccessModal(true);
          return;
        }

        navigate('/brand/campaigns');
      }
    } catch (error) {
      console.error('Error saving campaign:', error);
      toast.error(error.response?.data?.error || 'Failed to save campaign');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep(currentStep)) {
      return;
    }
    // If not on review step, just move to next step
    if (currentStep < 5) {
      nextStep();
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
          {isEditMode && (
            <p className="text-sm text-primary mt-2 flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Click on any step below to jump directly to that section
            </p>
          )}
        </div>

        {/* Step Indicator */}
        <div className="bg-white rounded-3xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <button
                    type="button"
                    onClick={() => isEditMode && setCurrentStep(step.number)}
                    disabled={!isEditMode}
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                      currentStep === step.number
                        ? 'bg-primary text-white'
                        : currentStep > step.number
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 text-gray-600'
                    } ${isEditMode ? 'cursor-pointer hover:scale-110' : 'cursor-default'}`}
                    title={isEditMode ? `Jump to ${step.title}` : ''}
                  >
                    {currentStep > step.number ? '✓' : step.number}
                  </button>
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
              <span>{formData.milestones.length} Milestone{formData.milestones.length !== 1 ? 's' : ''}</span>
              <span>
                {formData.milestones.reduce((sum, m) => sum + m.deliverables.length, 0)} Total Deliverable{formData.milestones.reduce((sum, m) => sum + m.deliverables.length, 0) !== 1 ? 's' : ''}
              </span>
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
                  rows={6}
                  maxLength={1000}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Provide a detailed description of your campaign, including objectives, target audience, key messages, and any specific requirements for creators"
                />
                <p className="text-xs text-gray-500 mt-1">{formData.description.length}/1000 characters</p>
              </div>
            </div>
          )}

          {/* Step 2: Milestones & Deliverables (NEW UX) */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">Campaign Brief & Milestones</h2>
                <p className="text-sm text-gray-600 mb-4">
                  Create milestones and add deliverables to each one
                </p>
              </div>

              {/* Objective */}
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

              {/* Milestones */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Campaign Milestones <span className="text-red-500">*</span>
                  </label>
                  <p className="text-xs text-gray-500">Add milestones with deliverables inside</p>
                </div>

                {formData.milestones.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-2xl bg-gray-50">
                    <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <p className="text-gray-600 mb-4">No milestones added yet</p>
                    <button
                      type="button"
                      onClick={addMilestone}
                      className="px-6 py-3 bg-primary hover:bg-primary-dark text-white font-medium rounded-2xl transition-colors"
                    >
                      + Add First Milestone
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {formData.milestones.map((milestone, milestoneIndex) => (
                      <div key={milestoneIndex} className="bg-primary/5 p-6 rounded-3xl border-2 border-primary/20">
                        {/* Milestone Header */}
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <span className="bg-primary text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">
                              {milestoneIndex + 1}
                            </span>
                            <h3 className="font-bold text-gray-900 text-lg">Milestone {milestoneIndex + 1}</h3>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeMilestone(milestoneIndex)}
                            className="text-red-600 hover:text-red-800 text-sm font-medium px-3 py-1 rounded-lg hover:bg-red-50"
                          >
                            Remove Milestone
                          </button>
                        </div>

                        {/* Milestone Name */}
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Milestone Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            placeholder="e.g., Content Creation Phase, Product Launch Week"
                            value={milestone.name}
                            onChange={(e) => updateMilestone(milestoneIndex, 'name', e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
                            required
                          />
                        </div>

                        {/* Deliverables */}
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-3">
                            Deliverables for this Milestone <span className="text-red-500">*</span>
                          </label>

                          {milestone.deliverables.length === 0 ? (
                            <div className="text-center py-6 border-2 border-dashed border-gray-300 rounded-xl bg-white">
                              <p className="text-gray-600 text-sm mb-3">No deliverables added to this milestone</p>
                              <button
                                type="button"
                                onClick={() => addDeliverableToMilestone(milestoneIndex)}
                                className="px-4 py-2 bg-white hover:bg-gray-50 text-primary border-2 border-primary font-medium rounded-lg transition-colors text-sm"
                              >
                                + Add Deliverable
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {milestone.deliverables.map((deliverable, deliverableIndex) => (
                                <div key={deliverableIndex} className="bg-white p-4 rounded-xl border border-gray-200">
                                  <div className="flex items-start gap-3">
                                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                                      {/* Platform */}
                                      <select
                                        value={deliverable.platform}
                                        onChange={(e) => updateDeliverable(milestoneIndex, deliverableIndex, 'platform', e.target.value)}
                                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                                        required
                                      >
                                        <option value="">Select Platform</option>
                                        {platforms.map(p => (
                                          <option key={p} value={p}>{p}</option>
                                        ))}
                                      </select>

                                      {/* Content Type */}
                                      <select
                                        value={deliverable.content_type}
                                        onChange={(e) => updateDeliverable(milestoneIndex, deliverableIndex, 'content_type', e.target.value)}
                                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                                        required
                                        disabled={!deliverable.platform}
                                      >
                                        <option value="">Content Type</option>
                                        {deliverable.platform && contentTypes[deliverable.platform]?.map(ct => (
                                          <option key={ct} value={ct}>{ct}</option>
                                        ))}
                                      </select>

                                      {/* Quantity */}
                                      <input
                                        type="number"
                                        placeholder="Quantity"
                                        value={deliverable.quantity}
                                        onChange={(e) => updateDeliverable(milestoneIndex, deliverableIndex, 'quantity', parseInt(e.target.value) || 1)}
                                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                                        min="1"
                                        required
                                      />
                                    </div>

                                    {/* Remove Button */}
                                    <button
                                      type="button"
                                      onClick={() => removeDeliverableFromMilestone(milestoneIndex, deliverableIndex)}
                                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                      title="Remove deliverable"
                                    >
                                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                    </button>
                                  </div>

                                  {/* Preview */}
                                  {deliverable.platform && deliverable.content_type && (
                                    <div className="mt-2 text-xs text-gray-600 bg-gray-50 px-3 py-1 rounded">
                                      Preview: {deliverable.quantity}× {deliverable.platform} {deliverable.content_type}
                                    </div>
                                  )}
                                </div>
                              ))}

                              {/* Add More Deliverables */}
                              <button
                                type="button"
                                onClick={() => addDeliverableToMilestone(milestoneIndex)}
                                className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-primary hover:text-primary transition-colors text-sm"
                              >
                                + Add Another Deliverable
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Deliverables Summary */}
                        {milestone.deliverables.length > 0 && (
                          <div className="bg-white p-3 rounded-xl border border-gray-200">
                            <p className="text-xs font-medium text-gray-700 mb-1">Milestone Summary:</p>
                            <p className="text-sm text-gray-900">
                              {milestone.deliverables.filter(d => d.platform && d.content_type).map(d =>
                                `${d.quantity}× ${d.platform} ${d.content_type}`
                              ).join(' • ')}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Add More Milestones */}
                    <button
                      type="button"
                      onClick={addMilestone}
                      className="w-full py-3 border-2 border-dashed border-primary/30 rounded-2xl text-primary hover:border-primary hover:bg-primary/5 transition-colors font-medium"
                    >
                      + Add Another Milestone
                    </button>
                  </div>
                )}
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

          {/* Step 3: Budget & Timeline */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Budget & Timeline</h2>

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
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="1500"
                />
              </div>

              {/* Campaign Timeline */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-2">
                    Campaign Start Date <span className="text-red-500">*</span>
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
                    Campaign End Date <span className="text-red-500">*</span>
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

              {/* Milestone Due Dates & Budget Allocation */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Milestone Due Dates & Budget Allocation <span className="text-red-500">*</span>
                </label>

                <div className="space-y-4">
                  {formData.milestones.map((milestone, index) => (
                    <div key={index} className="bg-primary/5 p-4 rounded-2xl border border-primary/20">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="bg-primary text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
                          {index + 1}
                        </span>
                        <h4 className="font-semibold text-gray-900">{milestone.name}</h4>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Due Date <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="date"
                            value={milestone.due_date}
                            onChange={(e) => updateMilestone(index, 'due_date', e.target.value)}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Budget Allocation ($) <span className="text-gray-500">(Optional)</span>
                          </label>
                          <input
                            type="number"
                            placeholder="e.g., 500"
                            value={milestone.budget_allocation}
                            onChange={(e) => updateMilestone(index, 'budget_allocation', e.target.value)}
                            min="0"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Budget Summary */}
                {formData.budget && formData.milestones.some(m => m.budget_allocation) && (
                  <div className="bg-primary/10 p-4 rounded-2xl mt-4 border border-primary/20">
                    <h4 className="font-medium text-gray-900 mb-2">Budget Allocation Summary</h4>
                    {(() => {
                      const totalAllocated = formData.milestones.reduce((sum, m) => sum + (parseFloat(m.budget_allocation) || 0), 0);
                      const remaining = parseFloat(formData.budget) - totalAllocated;
                      const percentAllocated = (totalAllocated / parseFloat(formData.budget)) * 100;

                      return (
                        <>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-700">Total Budget:</span>
                              <span className="font-semibold">${formData.budget}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-700">Allocated to Milestones:</span>
                              <span className="font-semibold">${totalAllocated}</span>
                            </div>
                            <div className="flex justify-between pt-1 border-t border-primary/20">
                              <span className={`font-semibold ${remaining < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {remaining < 0 ? 'Over Budget:' : 'Remaining:'}
                              </span>
                              <span className={`font-bold ${remaining < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                ${Math.abs(remaining)}
                              </span>
                            </div>
                          </div>
                          <div className="mt-3">
                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all ${percentAllocated > 100 ? 'bg-red-500' : 'bg-green-500'}`}
                                style={{ width: `${Math.min(percentAllocated, 100)}%` }}
              />
                            </div>
                            <p className="text-xs text-gray-600 mt-1">
                              {percentAllocated}% allocated
                            </p>
                          </div>
                          {remaining < 0 && (
                            <p className="text-xs text-red-600 mt-2">
                              ⚠️ Total milestone budgets exceed campaign budget
                            </p>
                          )}
                        </>
                      );
                    })()}
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

          {/* Step 5: Review */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Review Your Campaign</h2>
                <p className="text-gray-600">Review all details before saving or publishing</p>
              </div>

              {/* Basic Details */}
              <div className="border border-gray-200 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Basic Details</h3>
                  <button type="button" onClick={() => setCurrentStep(1)} className="text-primary text-sm font-medium hover:underline">Edit</button>
                </div>
                <div className="space-y-2 text-sm">
                  <div><span className="font-medium text-gray-700">Title:</span> <span className="text-gray-900">{formData.title}</span></div>
                  <div><span className="font-medium text-gray-700">Description:</span> <span className="text-gray-900">{formData.description}</span></div>
                </div>
              </div>

              {/* Campaign Brief */}
              <div className="border border-gray-200 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Campaign Brief & Milestones</h3>
                  <button type="button" onClick={() => setCurrentStep(2)} className="text-primary text-sm font-medium hover:underline">Edit</button>
                </div>
                <div className="space-y-3 text-sm">
                  <div><span className="font-medium text-gray-700">Objective:</span> <span className="text-gray-900">{formData.objective}</span></div>
                  {formData.target_audience && <div><span className="font-medium text-gray-700">Target Audience:</span> <span className="text-gray-900">{formData.target_audience}</span></div>}
                  <div className="pt-3 border-t">
                    <p className="font-medium text-gray-700 mb-2">Milestones ({formData.milestones.length}):</p>
                    {formData.milestones.map((m, i) => (
                      <div key={i} className="ml-4 mb-2">
                        <p className="font-medium text-gray-900">{i + 1}. {m.name}</p>
                        <p className="text-gray-600 text-xs">{m.deliverables.map(d => `${d.quantity}× ${d.platform} ${d.content_type}`).join(', ')}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Budget & Timeline */}
              <div className="border border-gray-200 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Budget & Timeline</h3>
                  <button type="button" onClick={() => setCurrentStep(3)} className="text-primary text-sm font-medium hover:underline">Edit</button>
                </div>
                <div className="space-y-2 text-sm">
                  <div><span className="font-medium text-gray-700">Budget:</span> <span className="text-gray-900">${formData.budget}</span></div>
                  <div><span className="font-medium text-gray-700">Duration:</span> <span className="text-gray-900">{formData.start_date} to {formData.end_date}</span></div>
                </div>
              </div>

              {/* Participation */}
              <div className="border border-gray-200 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Participation</h3>
                  <button type="button" onClick={() => setCurrentStep(4)} className="text-primary text-sm font-medium hover:underline">Edit</button>
                </div>
                <div className="space-y-2 text-sm">
                  <div><span className="font-medium text-gray-700">Mode:</span> <span className="text-gray-900 capitalize">{formData.participation_type === 'both' ? 'Packages & Proposals' : formData.participation_type}</span></div>
                  {formData.target_categories.length > 0 && <div><span className="font-medium text-gray-700">Categories:</span> <span className="text-gray-900">{formData.target_categories.join(', ')}</span></div>}
                </div>
              </div>

              {/* Visibility Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                <p className="text-sm text-blue-900">
                  <strong>Campaign Visibility:</strong> {formData.participation_type === 'proposals' || formData.participation_type === 'both' ? 'When published, this campaign will be visible to creators who can apply.' : 'This campaign will remain private. Only invited or selected creators will have access.'}
                </p>
              </div>
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

            {currentStep === 5 ? (
              /* Review Step - Show Save/Publish buttons */
              <>
                <button
                  type="button"
                  onClick={() => handleSaveOrPublish(false)}
                  disabled={loading}
                  className="flex-1 bg-white border-2 border-primary text-primary hover:bg-primary hover:text-white font-medium py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Saving...' : 'Save as Draft'}
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveOrPublish(true)}
                  disabled={loading}
                  className="flex-1 bg-primary hover:bg-primary-dark text-white font-medium py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Publishing...' : 'Publish Campaign'}
                </button>
              </>
            ) : currentStep < steps.length ? (
              <button
                type="submit"
                className="flex-1 bg-primary hover:bg-primary-dark text-white font-medium py-3 rounded-xl transition-colors"
              >
                Next Step
              </button>
            ) : null}

            <Link
              to="/brand/campaigns"
              className="px-6 py-3 border-2 border-gray-300 hover:border-gray-400 text-gray-700 font-medium rounded-xl transition-colors text-center"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>

      {/* Success Modal for "Both" mode */}
      <CampaignSuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        campaignId={createdCampaignId}
        campaignTitle={formData.title}
      />
    </div>
  );
};

export default CampaignFormNew;
