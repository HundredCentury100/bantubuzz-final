import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { campaignsAPI, categoriesAPI } from '../services/api';
import Navbar from '../components/Navbar';
import toast from 'react-hot-toast';

const CampaignForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;

  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    objectives: '',
    budget: '',
    start_date: '',
    end_date: '',
    category: '',
    status: 'draft',
    requirements: {}
  });

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
        objectives: campaign.objectives || '',
        budget: campaign.budget,
        start_date: campaign.start_date.split('T')[0],
        end_date: campaign.end_date.split('T')[0],
        category: campaign.category,
        status: campaign.status,
        requirements: campaign.requirements || {}
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
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      // Validate dates
      if (new Date(formData.start_date) > new Date(formData.end_date)) {
        toast.error('End date must be after start date');
        return;
      }

      const payload = {
        ...formData,
        budget: parseFloat(formData.budget),
        start_date: new Date(formData.start_date).toISOString(),
        end_date: new Date(formData.end_date).toISOString()
      };

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

  if (loading && isEditMode) {
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

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
            {isEditMode ? 'Update your campaign details' : 'Create a campaign to attract creators'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
          {/* Title */}
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

          {/* Category and Budget */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              <label htmlFor="budget" className="block text-sm font-medium text-gray-700 mb-2">
                Budget ($) *
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
            </div>
          </div>

          {/* Start and End Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-2">
                Start Date *
              </label>
              <input
                type="date"
                id="start_date"
                name="start_date"
                value={formData.start_date}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            <div>
              <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 mb-2">
                End Date *
              </label>
              <input
                type="date"
                id="end_date"
                name="end_date"
                value={formData.end_date}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Description *
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Describe your campaign, target audience, and goals..."
            />
          </div>

          {/* Objectives */}
          <div>
            <label htmlFor="objectives" className="block text-sm font-medium text-gray-700 mb-2">
              Campaign Objectives
            </label>
            <textarea
              id="objectives"
              name="objectives"
              value={formData.objectives}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="What do you want to achieve? (e.g., increase brand awareness, drive sales)"
            />
          </div>

          {/* Status */}
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
            <p className="text-sm text-gray-500 mt-1">
              Set to "Active" to allow creators to apply
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-primary hover:bg-primary-dark text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : (isEditMode ? 'Update Campaign' : 'Create Campaign')}
            </button>
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
