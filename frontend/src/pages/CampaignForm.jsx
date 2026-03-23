import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { campaignsAPI, categoriesAPI } from '../services/api';
import Navbar from '../components/Navbar';
import toast from 'react-hot-toast';

const CampaignForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  const [formData, setFormData] = useState({
    // Step 1: Basic Info
    title: '',
    description: '',
    category: '',
    participation_mode: 'proposals', // 'packages' or 'proposals'
    status: 'draft',

    // Step 2: Campaign Brief (STRUCTURED FIELDS - not a single text area!)
    campaign_objective: '',
    target_audience: {
      age_range: '',
      locations: [],
      interests: [],
      customer_type: ''
    },
    key_message: '',
    required_mentions: {
      hashtags: [],
      mentions: [],
      links: []
    },
    content_guidelines: '',

    // Step 3: Budget & Timeline
    budget: '', // For packages mode
    budget_min: '', // For proposals mode
    budget_max: '', // For proposals mode
    start_date: '',
    end_date: '',
    timeline_days: '',

    // Step 4: Targeting
    target_categories: [],
    target_min_followers: '',
    target_max_followers: '',
    target_locations: [],

    // Step 5: Milestones
    milestones: []
  });

  // Temporary input states for array fields
  const [hashtagInput, setHashtagInput] = useState('');
  const [mentionInput, setMentionInput] = useState('');
  const [linkInput, setLinkInput] = useState('');
  const [interestInput, setInterestInput] = useState('');
  const [targetLocationInput, setTargetLocationInput] = useState('');

  const steps = [
    { number: 1, title: 'Basic Info', description: 'Campaign title and type' },
    { number: 2, title: 'Campaign Brief', description: 'Detailed campaign information' },
    { number: 3, title: 'Budget & Timeline', description: 'Budget and dates' },
    { number: 4, title: 'Targeting', description: 'Creator targeting criteria' },
    { number: 5, title: 'Milestones', description: 'Deliverables timeline' }
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
        category: campaign.category,
        participation_mode: campaign.participation_mode || 'proposals',
        status: campaign.status,

        campaign_objective: campaign.campaign_objective || '',
        target_audience: campaign.target_audience || { age_range: '', locations: [], interests: [], customer_type: '' },
        key_message: campaign.key_message || '',
        required_mentions: campaign.required_mentions || { hashtags: [], mentions: [], links: [] },
        content_guidelines: campaign.content_guidelines || '',

        budget: campaign.budget || '',
        budget_min: campaign.budget_min || '',
        budget_max: campaign.budget_max || '',
        start_date: campaign.start_date ? campaign.start_date.split('T')[0] : '',
        end_date: campaign.end_date ? campaign.end_date.split('T')[0] : '',
        timeline_days: campaign.timeline_days || '',

        target_categories: campaign.target_categories || [],
        target_min_followers: campaign.target_min_followers || '',
        target_max_followers: campaign.target_max_followers || '',
        target_locations: campaign.target_locations || [],

        milestones: campaign.milestones || []
      });
    } catch (error) {
      console.error('Error fetching campaign:', error);
      toast.error('Failed to load campaign');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleNestedChange = (parent, field, value) => {
    setFormData(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent],
        [field]: value
      }
    }));
  };

  // Array field handlers
  const addHashtag = () => {
    if (hashtagInput.trim()) {
      const tag = hashtagInput.trim().startsWith('#') ? hashtagInput.trim() : `#${hashtagInput.trim()}`;
      setFormData(prev => ({
        ...prev,
        required_mentions: {
          ...prev.required_mentions,
          hashtags: [...prev.required_mentions.hashtags, tag]
        }
      }));
      setHashtagInput('');
    }
  };

  const removeHashtag = (index) => {
    setFormData(prev => ({
      ...prev,
      required_mentions: {
        ...prev.required_mentions,
        hashtags: prev.required_mentions.hashtags.filter((_, i) => i !== index)
      }
    }));
  };

  const addMention = () => {
    if (mentionInput.trim()) {
      const mention = mentionInput.trim().startsWith('@') ? mentionInput.trim() : `@${mentionInput.trim()}`;
      setFormData(prev => ({
        ...prev,
        required_mentions: {
          ...prev.required_mentions,
          mentions: [...prev.required_mentions.mentions, mention]
        }
      }));
      setMentionInput('');
    }
  };

  const removeMention = (index) => {
    setFormData(prev => ({
      ...prev,
      required_mentions: {
        ...prev.required_mentions,
        mentions: prev.required_mentions.mentions.filter((_, i) => i !== index)
      }
    }));
  };

  const addLink = () => {
    if (linkInput.trim()) {
      setFormData(prev => ({
        ...prev,
        required_mentions: {
          ...prev.required_mentions,
          links: [...prev.required_mentions.links, linkInput.trim()]
        }
      }));
      setLinkInput('');
    }
  };

  const removeLink = (index) => {
    setFormData(prev => ({
      ...prev,
      required_mentions: {
        ...prev.required_mentions,
        links: prev.required_mentions.links.filter((_, i) => i !== index)
      }
    }));
  };

  const addInterest = () => {
    if (interestInput.trim() && !formData.target_audience.interests.includes(interestInput.trim())) {
      handleNestedChange('target_audience', 'interests', [...formData.target_audience.interests, interestInput.trim()]);
      setInterestInput('');
    }
  };

  const removeInterest = (index) => {
    handleNestedChange('target_audience', 'interests', formData.target_audience.interests.filter((_, i) => i !== index));
  };

  const addTargetLocation = () => {
    if (targetLocationInput.trim() && !formData.target_locations.includes(targetLocationInput.trim())) {
      setFormData(prev => ({
        ...prev,
        target_locations: [...prev.target_locations, targetLocationInput.trim()]
      }));
      setTargetLocationInput('');
    }
  };

  const removeTargetLocation = (index) => {
    setFormData(prev => ({
      ...prev,
      target_locations: prev.target_locations.filter((_, i) => i !== index)
    }));
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
          description: '',
          deliverables: [],
          duration_days: '',
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
        if (!formData.title || !formData.category || !formData.participation_mode) {
          toast.error('Please fill in all required fields');
          return false;
        }
        return true;
      case 2:
        // Campaign brief - all fields are optional but encouraged
        return true;
      case 3:
        if (formData.participation_mode === 'packages' && !formData.budget) {
          toast.error('Budget is required for packages mode');
          return false;
        }
        if (formData.participation_mode === 'proposals' && (!formData.budget_min || !formData.budget_max)) {
          toast.error('Budget range is required for proposals mode');
          return false;
        }
        return true;
      case 4:
        // Targeting is optional
        return true;
      case 5:
        // Milestones are optional
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

      // Validate dates if provided
      if (formData.start_date && formData.end_date && new Date(formData.start_date) > new Date(formData.end_date)) {
        toast.error('End date must be after start date');
        return;
      }

      const payload = {
        ...formData,
        start_date: formData.start_date ? new Date(formData.start_date).toISOString() : undefined,
        end_date: formData.end_date ? new Date(formData.end_date).toISOString() : undefined,
        timeline_days: formData.timeline_days ? parseInt(formData.timeline_days) : undefined,
        target_min_followers: formData.target_min_followers ? parseInt(formData.target_min_followers) : undefined,
        target_max_followers: formData.target_max_followers ? parseInt(formData.target_max_followers) : undefined
      };

      // Set budget based on participation mode
      if (formData.participation_mode === 'packages') {
        payload.budget = parseFloat(formData.budget);
        delete payload.budget_min;
        delete payload.budget_max;
      } else {
        payload.budget_min = parseFloat(formData.budget_min);
        payload.budget_max = parseFloat(formData.budget_max);
        delete payload.budget;
      }

      // Process milestones
      payload.milestones = formData.milestones.map(m => ({
        name: m.name,
        description: m.description,
        deliverables: Array.isArray(m.deliverables) ? m.deliverables : [],
        duration_days: m.duration_days ? parseInt(m.duration_days) : undefined,
        due_date: m.due_date ? new Date(m.due_date).toISOString() : undefined
      }));

      if (isEditMode) {
        await campaignsAPI.updateCampaign(id, payload);
        toast.success('Campaign updated successfully!');
      } else {
        await campaignsAPI.createCampaign(payload);
        toast.success('Campaign created successfully!');
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
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
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
            {isEditMode ? 'Update your campaign details' : 'Fill out the Campaign Brief to attract the right creators'}
          </p>
        </div>

        {/* Step Indicator */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
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
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6">
          {/* Step 1: Basic Info */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Basic Campaign Information</h2>

              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                  Campaign Title *
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="e.g., Summer Product Launch Campaign"
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                  Short Description *
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  required
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Brief overview of your campaign..."
                />
                <p className="text-xs text-gray-500 mt-1">This is a quick summary. You'll provide detailed information in the Campaign Brief section.</p>
              </div>

              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                  Category *
                </label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">Select a category</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Participation Mode *
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, participation_mode: 'packages' }))}
                    className={`p-4 border-2 rounded-lg text-left transition-all ${
                      formData.participation_mode === 'packages'
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-semibold text-gray-900 mb-1">Packages Mode</div>
                    <div className="text-sm text-gray-600">You select creators and their packages (fixed pricing)</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, participation_mode: 'proposals' }))}
                    className={`p-4 border-2 rounded-lg text-left transition-all ${
                      formData.participation_mode === 'proposals'
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-semibold text-gray-900 mb-1">Proposals Mode</div>
                    <div className="text-sm text-gray-600">Creators submit custom proposals with their pricing</div>
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                  Campaign Status
                </label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="draft">Draft (not visible to creators)</option>
                  <option value="active">Active (accepting applications)</option>
                  <option value="paused">Paused</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>
          )}

          {/* Step 2: Campaign Brief - STRUCTURED FIELDS */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">Campaign Brief</h2>
                <p className="text-sm text-gray-600 mb-4">
                  Provide detailed information to help creators understand your campaign goals
                </p>
              </div>

              {/* Campaign Objective */}
              <div>
                <label htmlFor="campaign_objective" className="block text-sm font-medium text-gray-700 mb-2">
                  Campaign Objective
                </label>
                <textarea
                  id="campaign_objective"
                  name="campaign_objective"
                  value={formData.campaign_objective}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="What do you want to achieve? (e.g., increase brand awareness, drive sales, launch new product)"
                />
              </div>

              {/* Target Audience */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3">Target Audience</h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Age Range</label>
                    <input
                      type="text"
                      value={formData.target_audience.age_range}
                      onChange={(e) => handleNestedChange('target_audience', 'age_range', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="e.g., 18-35"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Interests</label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={interestInput}
                        onChange={(e) => setInterestInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addInterest())}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="Add interest and press Enter"
                      />
                      <button
                        type="button"
                        onClick={addInterest}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium"
                      >
                        Add
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {formData.target_audience.interests.map((interest, index) => (
                        <span key={index} className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
                          {interest}
                          <button
                            type="button"
                            onClick={() => removeInterest(index)}
                            className="hover:text-primary-dark"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Customer Type</label>
                    <input
                      type="text"
                      value={formData.target_audience.customer_type}
                      onChange={(e) => handleNestedChange('target_audience', 'customer_type', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="e.g., Young professionals, Students, Parents"
                    />
                  </div>
                </div>
              </div>

              {/* Key Message */}
              <div>
                <label htmlFor="key_message" className="block text-sm font-medium text-gray-700 mb-2">
                  Key Message
                </label>
                <textarea
                  id="key_message"
                  name="key_message"
                  value={formData.key_message}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Main message you want creators to communicate..."
                />
              </div>

              {/* Required Mentions */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3">Required Mentions</h3>

                <div className="space-y-4">
                  {/* Hashtags */}
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Hashtags</label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={hashtagInput}
                        onChange={(e) => setHashtagInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addHashtag())}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="Add hashtag (# is optional)"
                      />
                      <button
                        type="button"
                        onClick={addHashtag}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium"
                      >
                        Add
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {formData.required_mentions.hashtags.map((tag, index) => (
                        <span key={index} className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                          {tag}
                          <button
                            type="button"
                            onClick={() => removeHashtag(index)}
                            className="hover:text-blue-900"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Mentions */}
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">@ Mentions</label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={mentionInput}
                        onChange={(e) => setMentionInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addMention())}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="Add mention (@ is optional)"
                      />
                      <button
                        type="button"
                        onClick={addMention}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium"
                      >
                        Add
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {formData.required_mentions.mentions.map((mention, index) => (
                        <span key={index} className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                          {mention}
                          <button
                            type="button"
                            onClick={() => removeMention(index)}
                            className="hover:text-purple-900"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Links */}
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Links to Include</label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="url"
                        value={linkInput}
                        onChange={(e) => setLinkInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addLink())}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="https://example.com"
                      />
                      <button
                        type="button"
                        onClick={addLink}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium"
                      >
                        Add
                      </button>
                    </div>
                    <div className="space-y-1">
                      {formData.required_mentions.links.map((link, index) => (
                        <div key={index} className="flex items-center gap-2 px-3 py-2 bg-green-50 text-green-700 rounded-lg text-sm">
                          <span className="flex-1 truncate">{link}</span>
                          <button
                            type="button"
                            onClick={() => removeLink(index)}
                            className="hover:text-green-900 font-bold"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Content Guidelines */}
              <div>
                <label htmlFor="content_guidelines" className="block text-sm font-medium text-gray-700 mb-2">
                  Content Guidelines
                </label>
                <textarea
                  id="content_guidelines"
                  name="content_guidelines"
                  value={formData.content_guidelines}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Tone, style, format guidelines... (e.g., Professional tone, High-quality images, 30-60 second videos)"
                />
              </div>
            </div>
          )}

          {/* Step 3: Budget & Timeline */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Budget & Timeline</h2>

              {/* Budget based on participation mode */}
              {formData.participation_mode === 'packages' ? (
                <div>
                  <label htmlFor="budget" className="block text-sm font-medium text-gray-700 mb-2">
                    Campaign Budget ($) *
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="1000.00"
                  />
                  <p className="text-xs text-gray-500 mt-1">Total budget for this campaign</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="budget_min" className="block text-sm font-medium text-gray-700 mb-2">
                      Minimum Budget ($) *
                    </label>
                    <input
                      type="number"
                      id="budget_min"
                      name="budget_min"
                      value={formData.budget_min}
                      onChange={handleChange}
                      required
                      min="0"
                      step="0.01"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="500.00"
                    />
                  </div>
                  <div>
                    <label htmlFor="budget_max" className="block text-sm font-medium text-gray-700 mb-2">
                      Maximum Budget ($) *
                    </label>
                    <input
                      type="number"
                      id="budget_max"
                      name="budget_max"
                      value={formData.budget_max}
                      onChange={handleChange}
                      required
                      min="0"
                      step="0.01"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="2000.00"
                    />
                  </div>
                  <p className="text-xs text-gray-500 col-span-2">
                    Creators will submit proposals within this budget range
                  </p>
                </div>
              )}

              {/* Timeline */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    id="start_date"
                    name="start_date"
                    value={formData.start_date}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    id="end_date"
                    name="end_date"
                    value={formData.end_date}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="timeline_days" className="block text-sm font-medium text-gray-700 mb-2">
                  Delivery Timeline (Days)
                </label>
                <input
                  type="number"
                  id="timeline_days"
                  name="timeline_days"
                  value={formData.timeline_days}
                  onChange={handleChange}
                  min="1"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="30"
                />
                <p className="text-xs text-gray-500 mt-1">How many days creators have to deliver all content</p>
              </div>
            </div>
          )}

          {/* Step 4: Targeting */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">Creator Targeting</h2>
                <p className="text-sm text-gray-600 mb-4">
                  Optional: Filter which creators see this campaign
                </p>
              </div>

              {/* Target Categories */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Target Categories
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
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
                <p className="text-xs text-gray-500 mt-2">
                  Leave empty to show to all categories
                </p>
              </div>

              {/* Follower Range */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="target_min_followers" className="block text-sm font-medium text-gray-700 mb-2">
                    Minimum Followers
                  </label>
                  <input
                    type="number"
                    id="target_min_followers"
                    name="target_min_followers"
                    value={formData.target_min_followers}
                    onChange={handleChange}
                    min="0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="1000"
                  />
                </div>

                <div>
                  <label htmlFor="target_max_followers" className="block text-sm font-medium text-gray-700 mb-2">
                    Maximum Followers
                  </label>
                  <input
                    type="number"
                    id="target_max_followers"
                    name="target_max_followers"
                    value={formData.target_max_followers}
                    onChange={handleChange}
                    min="0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="100000"
                  />
                </div>
              </div>

              {/* Target Locations */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Locations
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={targetLocationInput}
                    onChange={(e) => setTargetLocationInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTargetLocation())}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="e.g., Zimbabwe, South Africa"
                  />
                  <button
                    type="button"
                    onClick={addTargetLocation}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.target_locations.map((location, index) => (
                    <span key={index} className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
                      {location}
                      <button
                        type="button"
                        onClick={() => removeTargetLocation(index)}
                        className="hover:text-primary-dark"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Milestones */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">Campaign Milestones</h2>
                <p className="text-sm text-gray-600 mb-4">
                  Optional: Break down deliverables into milestones for better tracking
                </p>
              </div>

              {formData.milestones.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
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
                    <div key={index} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
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
                        />

                        <textarea
                          placeholder="Description (optional)"
                          value={milestone.description}
                          onChange={(e) => updateMilestone(index, 'description', e.target.value)}
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        />

                        <div className="grid grid-cols-2 gap-3">
                          <input
                            type="number"
                            placeholder="Duration (days)"
                            value={milestone.duration_days}
                            onChange={(e) => updateMilestone(index, 'duration_days', e.target.value)}
                            min="1"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                          />

                          <input
                            type="date"
                            placeholder="Due date"
                            value={milestone.due_date}
                            onChange={(e) => updateMilestone(index, 'due_date', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
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
          )}

          {/* Navigation */}
          <div className="flex gap-4 pt-6 mt-6 border-t">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={prevStep}
                className="px-6 py-3 border-2 border-gray-300 hover:border-gray-400 text-gray-700 font-medium rounded-lg transition-colors"
              >
                Previous
              </button>
            )}

            {currentStep < steps.length ? (
              <button
                type="button"
                onClick={nextStep}
                className="flex-1 bg-primary hover:bg-primary-dark text-white font-medium py-3 rounded-lg transition-colors"
              >
                Next Step
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-primary hover:bg-primary-dark text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving...' : (isEditMode ? 'Update Campaign' : 'Create Campaign')}
              </button>
            )}

            <Link
              to="/brand/campaigns"
              className="px-6 py-3 border-2 border-gray-300 hover:border-gray-400 text-gray-700 font-medium rounded-lg transition-colors text-center"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CampaignForm;
