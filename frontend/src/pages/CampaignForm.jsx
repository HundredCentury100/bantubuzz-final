import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { campaignsAPI, categoriesAPI } from '../services/api';
import Navbar from '../components/Navbar';
import toast from 'react-hot-toast';

const CampaignForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!id;

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);

  const [formData, setFormData] = useState({
    // Step 1: Basic Details
    title: '',
    description: '',

    // Step 2: Campaign Brief
    campaign_objective: 'Brand Awareness',
    target_audience: '',
    deliverables: [], // [{platform, content_type, quantity}]
    content_guidelines: '', // Additional notes

    // Step 3: Campaign Setup
    budget: '',
    start_date: '',
    end_date: '',
    milestones: [], // [{deliverable_index, due_date, name}]

    // Step 4: Participation
    participation_mode: 'proposals', // 'packages', 'proposals', 'both'
    budget_min: '',
    budget_max: '',
    target_categories: [],
    target_locations: [],
    target_min_followers: '',
    target_max_followers: '',
    application_deadline: '',

    status: 'draft'
  });

  const objectives = [
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

  const locations = ['Zimbabwe', 'South Africa', 'Kenya', 'Nigeria', 'Ghana', 'Global'];

  useEffect(() => {
    fetchCategories();
    if (isEditMode) {
      fetchCampaign();
    }
  }, [id]);

  const fetchCategories = async () => {
    try {
      const response = await categoriesAPI.getCategories();
      setCategories(response.data.categories.map(cat => cat.name));
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchCampaign = async () => {
    try {
      setLoading(true);
      const response = await campaignsAPI.getCampaign(id);
      const campaign = response.data;

      // Parse deliverables from milestones
      const deliverables = [];
      if (campaign.milestones && campaign.milestones.length > 0) {
        campaign.milestones.forEach(milestone => {
          if (milestone.deliverables && Array.isArray(milestone.deliverables)) {
            milestone.deliverables.forEach(d => {
              if (!deliverables.find(del =>
                del.platform === d.platform &&
                del.content_type === d.content_type
              )) {
                deliverables.push(d);
              }
            });
          }
        });
      }

      setFormData({
        title: campaign.title,
        description: campaign.description,
        campaign_objective: campaign.campaign_objective || 'Brand Awareness',
        target_audience: campaign.target_audience || '',
        deliverables: deliverables,
        content_guidelines: campaign.content_guidelines || '',
        budget: campaign.budget || '',
        start_date: campaign.start_date ? campaign.start_date.split('T')[0] : '',
        end_date: campaign.end_date ? campaign.end_date.split('T')[0] : '',
        milestones: (campaign.milestones || []).map((m, idx) => ({
          deliverable_index: 0, // Will need to match
          due_date: m.due_date ? m.due_date.split('T')[0] : '',
          name: m.name
        })),
        participation_mode: campaign.participation_mode || 'proposals',
        budget_min: campaign.budget_min || '',
        budget_max: campaign.budget_max || '',
        target_categories: campaign.target_categories || [],
        target_locations: campaign.target_locations || [],
        target_min_followers: campaign.target_min_followers || '',
        target_max_followers: campaign.target_max_followers || '',
        application_deadline: campaign.application_deadline ? campaign.application_deadline.split('T')[0] : '',
        status: campaign.status || 'draft'
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

  // Step 2: Deliverable Management
  const addDeliverable = () => {
    setFormData(prev => ({
      ...prev,
      deliverables: [
        ...prev.deliverables,
        { platform: 'Instagram', content_type: 'Post', quantity: 1 }
      ]
    }));
  };

  const updateDeliverable = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      deliverables: prev.deliverables.map((d, i) =>
        i === index ? { ...d, [field]: value } : d
      )
    }));
  };

  const removeDeliverable = (index) => {
    setFormData(prev => ({
      ...prev,
      deliverables: prev.deliverables.filter((_, i) => i !== index),
      // Remove milestones referencing this deliverable
      milestones: prev.milestones.filter(m => m.deliverable_index !== index).map(m => ({
        ...m,
        deliverable_index: m.deliverable_index > index ? m.deliverable_index - 1 : m.deliverable_index
      }))
    }));
  };

  // Step 3: Milestone Management
  const addMilestone = () => {
    setFormData(prev => ({
      ...prev,
      milestones: [
        ...prev.milestones,
        { deliverable_index: 0, due_date: '', name: '' }
      ]
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

  const removeMilestone = (index) => {
    setFormData(prev => ({
      ...prev,
      milestones: prev.milestones.filter((_, i) => i !== index)
    }));
  };

  // Step 4: Category Management
  const toggleCategory = (category) => {
    setFormData(prev => ({
      ...prev,
      target_categories: prev.target_categories.includes(category)
        ? prev.target_categories.filter(c => c !== category)
        : [...prev.target_categories, category]
    }));
  };

  const toggleLocation = (location) => {
    setFormData(prev => ({
      ...prev,
      target_locations: prev.target_locations.includes(location)
        ? prev.target_locations.filter(l => l !== location)
        : [...prev.target_locations, location]
    }));
  };

  const validateStep = (step) => {
    switch (step) {
      case 1:
        if (!formData.title.trim()) {
          toast.error('Campaign title is required');
          return false;
        }
        if (!formData.description.trim()) {
          toast.error('Campaign description is required');
          return false;
        }
        return true;

      case 2:
        if (!formData.campaign_objective) {
          toast.error('Campaign objective is required');
          return false;
        }
        if (formData.deliverables.length === 0) {
          toast.error('Please add at least one deliverable');
          return false;
        }
        return true;

      case 3:
        if (!formData.budget || parseFloat(formData.budget) <= 0) {
          toast.error('Valid budget is required');
          return false;
        }
        if (!formData.start_date) {
          toast.error('Start date is required');
          return false;
        }
        if (!formData.end_date) {
          toast.error('End date is required');
          return false;
        }
        if (new Date(formData.start_date) >= new Date(formData.end_date)) {
          toast.error('End date must be after start date');
          return false;
        }
        if (formData.milestones.length === 0) {
          toast.error('Please add at least one milestone');
          return false;
        }
        // Check all deliverables have milestones
        const deliverableIndices = new Set(formData.milestones.map(m => m.deliverable_index));
        for (let i = 0; i < formData.deliverables.length; i++) {
          if (!deliverableIndices.has(i)) {
            toast.error(`Deliverable ${i + 1} must have at least one milestone`);
            return false;
          }
        }
        return true;

      case 4:
        if (!formData.participation_mode) {
          toast.error('Please select a participation mode');
          return false;
        }
        if (formData.participation_mode === 'proposals' || formData.participation_mode === 'both') {
          if (!formData.budget_min || parseFloat(formData.budget_min) <= 0) {
            toast.error('Minimum budget is required');
            return false;
          }
          if (!formData.budget_max || parseFloat(formData.budget_max) <= 0) {
            toast.error('Maximum budget is required');
            return false;
          }
          if (parseFloat(formData.budget_min) > parseFloat(formData.budget_max)) {
            toast.error('Minimum budget cannot exceed maximum budget');
            return false;
          }
          if (!formData.application_deadline) {
            toast.error('Application deadline is required');
            return false;
          }
        }
        return true;

      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      // If moving from step 3 to step 4, show warning about budget fields for proposals/both
      if (currentStep === 3 && (formData.participation_mode === 'proposals' || formData.participation_mode === 'both')) {
        toast('Please set budget range in the next step', {
          icon: 'ℹ️',
          duration: 4000,
        });
      }
      setCurrentStep(prev => Math.min(prev + 1, 4));
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

      // Build milestones with deliverables embedded
      const milestonesGrouped = {};
      formData.milestones.forEach((milestone, idx) => {
        const key = milestone.deliverable_index;
        if (!milestonesGrouped[key]) {
          milestonesGrouped[key] = [];
        }
        milestonesGrouped[key].push({
          milestone_number: idx + 1,
          name: milestone.name || `Milestone ${idx + 1}`,
          due_date: milestone.due_date,
          deliverables: [formData.deliverables[milestone.deliverable_index]]
        });
      });

      const finalMilestones = Object.values(milestonesGrouped).flat().map((m, idx) => ({
        ...m,
        milestone_number: idx + 1
      }));

      // Prepare payload
      const payload = {
        title: formData.title,
        description: formData.description,
        campaign_objective: formData.campaign_objective,
        target_audience: formData.target_audience,
        content_guidelines: formData.content_guidelines,
        participation_mode: formData.participation_mode,
        requires_milestones: true,

        // CRITICAL: Send budget as strings, handle based on participation_mode
        budget: formData.participation_mode === 'packages' || formData.participation_mode === 'both'
          ? String(formData.budget)
          : null,
        budget_min: formData.participation_mode === 'proposals' || formData.participation_mode === 'both'
          ? String(formData.budget_min)
          : null,
        budget_max: formData.participation_mode === 'proposals' || formData.participation_mode === 'both'
          ? String(formData.budget_max)
          : null,

        start_date: formData.start_date,
        end_date: formData.end_date,
        application_deadline: formData.participation_mode !== 'packages' ? formData.application_deadline : null,

        // CRITICAL: Convert empty strings to null for integer fields
        target_min_followers: formData.target_min_followers === '' ? null : formData.target_min_followers,
        target_max_followers: formData.target_max_followers === '' ? null : formData.target_max_followers,
        timeline_days: null,

        target_categories: formData.target_categories,
        target_locations: formData.target_locations,
        milestones: finalMilestones,
        status: formData.status
      };

      if (isEditMode) {
        await campaignsAPI.updateCampaign(id, payload);
        toast.success('Campaign updated successfully');
      } else {
        await campaignsAPI.createCampaign(payload);
        toast.success('Campaign created successfully');
      }

      navigate('/brand/campaigns');
    } catch (error) {
      console.error('Error saving campaign:', error);
      toast.error(error.response?.data?.error || 'Failed to save campaign');
    } finally {
      setLoading(false);
    }
  };

  const stepTitles = ['Basic Details', 'Campaign Brief', 'Campaign Setup', 'Participation'];

  if (loading && isEditMode) {
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

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {isEditMode ? 'Edit Campaign' : 'Create Campaign'}
          </h1>
          <p className="text-gray-600 mt-2">
            Step {currentStep} of 4: {stepTitles[currentStep - 1]}
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors ${
                      currentStep >= step
                        ? 'bg-primary text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {step}
                  </div>
                  <span className={`text-xs mt-2 text-center ${currentStep >= step ? 'text-primary font-medium' : 'text-gray-600'}`}>
                    {stepTitles[step - 1]}
                  </span>
                </div>
                {step < 4 && (
                  <div
                    className={`h-1 flex-1 mx-2 ${
                      currentStep > step ? 'bg-primary' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-xl p-8">

          {/* STEP 1: BASIC DETAILS */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Basic Details</h2>
                <p className="text-gray-600 text-sm mt-1">Define your campaign identity</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Campaign Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="e.g., EcoCash Mobile Payment Launch"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Campaign Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Provide a detailed description of your campaign, including objectives, target audience, key messages, and any specific requirements for creators"
                  maxLength={1000}
                />
                <p className="text-xs text-gray-500 mt-1">{formData.description.length}/1000 characters</p>
              </div>
            </div>
          )}

          {/* STEP 2: CAMPAIGN BRIEF */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Campaign Brief</h2>
                <p className="text-gray-600 text-sm mt-1">Define how the campaign should be executed</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Objective <span className="text-red-500">*</span>
                </label>
                <select
                  name="campaign_objective"
                  value={formData.campaign_objective}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  {objectives.map(obj => (
                    <option key={obj} value={obj}>{obj}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Audience <span className="text-gray-500">(Optional)</span>
                </label>
                <textarea
                  name="target_audience"
                  value={formData.target_audience}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Young professionals aged 18-35 in Zimbabwe who regularly use mobile payments"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Deliverables <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={addDeliverable}
                    className="px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors text-sm"
                  >
                    + Add Deliverable
                  </button>
                </div>

                {formData.deliverables.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-xl">
                    <p className="text-gray-600 mb-3">No deliverables added yet</p>
                    <button
                      type="button"
                      onClick={addDeliverable}
                      className="px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors text-sm"
                    >
                      Add First Deliverable
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {formData.deliverables.map((deliverable, index) => (
                      <div key={index} className="flex gap-3 items-start p-4 bg-gray-50 rounded-xl">
                        <div className="flex-1">
                          <label className="block text-xs text-gray-600 mb-1">Platform</label>
                          <select
                            value={deliverable.platform}
                            onChange={(e) => updateDeliverable(index, 'platform', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                          >
                            {platforms.map(p => (
                              <option key={p} value={p}>{p}</option>
                            ))}
                          </select>
                        </div>

                        <div className="flex-1">
                          <label className="block text-xs text-gray-600 mb-1">Content Type</label>
                          <select
                            value={deliverable.content_type}
                            onChange={(e) => updateDeliverable(index, 'content_type', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                          >
                            {contentTypes[deliverable.platform]?.map(ct => (
                              <option key={ct} value={ct}>{ct}</option>
                            ))}
                          </select>
                        </div>

                        <div className="w-24">
                          <label className="block text-xs text-gray-600 mb-1">Quantity</label>
                          <input
                            type="number"
                            value={deliverable.quantity}
                            onChange={(e) => updateDeliverable(index, 'quantity', parseInt(e.target.value) || 1)}
                            min="1"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => removeDeliverable(index)}
                          className="mt-6 text-red-600 hover:text-red-700 font-medium"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {formData.deliverables.length > 0 && (
                  <p className="text-sm text-gray-600 mt-2">
                    {formData.deliverables.length} deliverable{formData.deliverables.length !== 1 ? 's' : ''} added
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Notes <span className="text-gray-500">(Optional)</span>
                </label>
                <textarea
                  name="content_guidelines"
                  value={formData.content_guidelines}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Tag @EcoCash, Use hashtag #PayInstantly, Avoid mentioning competing apps"
                />
              </div>
            </div>
          )}

          {/* STEP 3: CAMPAIGN SETUP */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Campaign Setup</h2>
                <p className="text-gray-600 text-sm mt-1">Define budget, timeline, and milestones</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Total Campaign Budget ($) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  pattern="[0-9]*\.?[0-9]*"
                  name="budget"
                  value={formData.budget}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="1500"
                />
                <p className="text-xs text-gray-500 mt-1">Enter amount without currency symbol</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="start_date"
                    value={formData.start_date}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="end_date"
                    value={formData.end_date}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Milestones <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={addMilestone}
                    className="px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors text-sm"
                  >
                    + Add Milestone
                  </button>
                </div>

                {formData.deliverables.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-xl">
                    <p className="text-gray-600">Please add deliverables in Step 2 first</p>
                  </div>
                ) : formData.milestones.length === 0 ? (
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
                  <div className="space-y-3">
                    {formData.milestones.map((milestone, index) => (
                      <div key={index} className="p-4 bg-gray-50 rounded-xl">
                        <div className="flex justify-between items-start mb-3">
                          <h4 className="font-semibold text-gray-900">Milestone {index + 1}</h4>
                          <button
                            type="button"
                            onClick={() => removeMilestone(index)}
                            className="text-red-600 hover:text-red-700 text-sm font-medium"
                          >
                            Remove
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Deliverable</label>
                            <select
                              value={milestone.deliverable_index}
                              onChange={(e) => updateMilestone(index, 'deliverable_index', parseInt(e.target.value))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                            >
                              {formData.deliverables.map((d, idx) => (
                                <option key={idx} value={idx}>
                                  {d.platform} {d.content_type} (x{d.quantity})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Due Date</label>
                            <input
                              type="date"
                              value={milestone.due_date}
                              onChange={(e) => updateMilestone(index, 'due_date', e.target.value)}
                              min={formData.start_date}
                              max={formData.end_date}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {formData.milestones.length > 0 && (
                  <p className="text-sm text-gray-600 mt-2">
                    {formData.milestones.length} milestone{formData.milestones.length !== 1 ? 's' : ''} added
                  </p>
                )}
              </div>
            </div>
          )}

          {/* STEP 4: PARTICIPATION */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Participation</h2>
                <p className="text-gray-600 text-sm mt-1">Choose how creators can participate</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  How do creators participate? <span className="text-red-500">*</span>
                </label>
                <div className="space-y-3">
                  <label className="flex items-start p-4 border-2 rounded-xl cursor-pointer hover:border-primary transition-colors">
                    <input
                      type="radio"
                      name="participation_mode"
                      value="packages"
                      checked={formData.participation_mode === 'packages'}
                      onChange={handleChange}
                      className="mt-1 mr-3"
                    />
                    <div>
                      <div className="font-semibold text-gray-900">Add Creator Packages</div>
                      <div className="text-sm text-gray-600">You manually select from creator packages</div>
                    </div>
                  </label>

                  <label className="flex items-start p-4 border-2 rounded-xl cursor-pointer hover:border-primary transition-colors">
                    <input
                      type="radio"
                      name="participation_mode"
                      value="proposals"
                      checked={formData.participation_mode === 'proposals'}
                      onChange={handleChange}
                      className="mt-1 mr-3"
                    />
                    <div>
                      <div className="font-semibold text-gray-900">Allow Creators to Apply</div>
                      <div className="text-sm text-gray-600">Creators submit custom proposals</div>
                    </div>
                  </label>

                  <label className="flex items-start p-4 border-2 rounded-xl cursor-pointer hover:border-primary transition-colors">
                    <input
                      type="radio"
                      name="participation_mode"
                      value="both"
                      checked={formData.participation_mode === 'both'}
                      onChange={handleChange}
                      className="mt-1 mr-3"
                    />
                    <div>
                      <div className="font-semibold text-gray-900">Both</div>
                      <div className="text-sm text-gray-600">Allow both custom proposals and package selection</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Show targeting fields for proposals and both modes */}
              {(formData.participation_mode === 'proposals' || formData.participation_mode === 'both') && (
                <>
                  <div className="pt-4 border-t border-gray-200">
                    <h3 className="font-semibold text-gray-900 mb-4">Targeting & Application Setup</h3>

                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Min Budget ($) <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            inputMode="decimal"
                            pattern="[0-9]*\.?[0-9]*"
                            name="budget_min"
                            value={formData.budget_min}
                            onChange={handleChange}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                            placeholder="500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Max Budget ($) <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            inputMode="decimal"
                            pattern="[0-9]*\.?[0-9]*"
                            name="budget_max"
                            value={formData.budget_max}
                            onChange={handleChange}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                            placeholder="2000"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Target Locations
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {locations.map(location => (
                            <button
                              key={location}
                              type="button"
                              onClick={() => toggleLocation(location)}
                              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                                formData.target_locations.includes(location)
                                  ? 'bg-primary text-white'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                            >
                              {location}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Target Categories
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {categories.map(cat => (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => toggleCategory(cat)}
                              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                                formData.target_categories.includes(cat)
                                  ? 'bg-primary text-white'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                            >
                              {cat}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Min Followers
                          </label>
                          <input
                            type="number"
                            name="target_min_followers"
                            value={formData.target_min_followers}
                            onChange={handleChange}
                            min="0"
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                            placeholder="1000"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Max Followers
                          </label>
                          <input
                            type="number"
                            name="target_max_followers"
                            value={formData.target_max_followers}
                            onChange={handleChange}
                            min="0"
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                            placeholder="100000"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Application Deadline <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          name="application_deadline"
                          value={formData.application_deadline}
                          onChange={handleChange}
                          min={new Date().toISOString().split('T')[0]}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Campaign Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="draft">Draft (Not visible to creators)</option>
                  <option value="active">Active (Visible to creators)</option>
                </select>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={prevStep}
              disabled={currentStep === 1}
              className={`px-6 py-3 rounded-xl font-medium transition-colors ${
                currentStep === 1
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Previous
            </button>

            <div className="flex gap-3">
              {currentStep < 4 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors font-medium"
                >
                  Next Step
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Saving...' : (isEditMode ? 'Update Campaign' : 'Create Campaign')}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CampaignForm;
