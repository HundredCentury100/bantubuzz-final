import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { briefsAPI, categoriesAPI } from '../services/api';
import Navbar from '../components/Navbar';

const CreateBrief = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [categories, setCategories] = useState([]);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    goal: '',
    platform: '',
    budget_min: '',
    budget_max: '',
    timeline_days: '',
    target_categories: [],
    target_min_followers: '',
    target_max_followers: '',
    target_locations: [],
    status: 'draft',
  });

  const [milestones, setMilestones] = useState([
    {
      title: '',
      expected_deliverables: [''],
      duration_days: '',
      price: '',
    },
  ]);

  const [locationInput, setLocationInput] = useState('');

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await categoriesAPI.getCategories();
      // Extract just the category names from the category objects
      const categoryNames = (response.data.categories || []).map(cat => cat.name);
      setCategories(categoryNames);
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCategoryToggle = (category) => {
    setFormData((prev) => ({
      ...prev,
      target_categories: prev.target_categories.includes(category)
        ? prev.target_categories.filter((c) => c !== category)
        : [...prev.target_categories, category],
    }));
  };

  const addLocation = () => {
    if (locationInput.trim() && !formData.target_locations.includes(locationInput.trim())) {
      setFormData((prev) => ({
        ...prev,
        target_locations: [...prev.target_locations, locationInput.trim()],
      }));
      setLocationInput('');
    }
  };

  const removeLocation = (location) => {
    setFormData((prev) => ({
      ...prev,
      target_locations: prev.target_locations.filter((l) => l !== location),
    }));
  };

  const addMilestone = () => {
    setMilestones([
      ...milestones,
      {
        title: '',
        expected_deliverables: [''],
        duration_days: '',
        price: '',
      },
    ]);
  };

  const removeMilestone = (index) => {
    if (milestones.length > 1) {
      setMilestones(milestones.filter((_, i) => i !== index));
    }
  };

  const updateMilestone = (index, field, value) => {
    const updated = [...milestones];
    updated[index][field] = value;
    setMilestones(updated);
  };

  const addDeliverable = (milestoneIndex) => {
    const updated = [...milestones];
    updated[milestoneIndex].expected_deliverables.push('');
    setMilestones(updated);
  };

  const updateDeliverable = (milestoneIndex, deliverableIndex, value) => {
    const updated = [...milestones];
    updated[milestoneIndex].expected_deliverables[deliverableIndex] = value;
    setMilestones(updated);
  };

  const removeDeliverable = (milestoneIndex, deliverableIndex) => {
    const updated = [...milestones];
    if (updated[milestoneIndex].expected_deliverables.length > 1) {
      updated[milestoneIndex].expected_deliverables.splice(deliverableIndex, 1);
      setMilestones(updated);
    }
  };

  const validateForm = () => {
    if (!formData.title.trim()) return 'Title is required';
    if (!formData.description.trim()) return 'Description is required';
    if (!formData.timeline_days || formData.timeline_days < 1) return 'Timeline must be at least 1 day';

    if (formData.timeline_days > 10 && milestones.length < 1) {
      return 'Briefs longer than 10 days must have at least one milestone';
    }

    for (let i = 0; i < milestones.length; i++) {
      const milestone = milestones[i];
      if (!milestone.title.trim()) return `Milestone ${i + 1}: Title is required`;
      if (!milestone.duration_days || milestone.duration_days < 1) {
        return `Milestone ${i + 1}: Duration must be at least 1 day`;
      }
      if (milestone.expected_deliverables.some((d) => !d.trim())) {
        return `Milestone ${i + 1}: All deliverables must be filled`;
      }
    }

    const totalMilestoneDays = milestones.reduce((sum, m) => sum + parseInt(m.duration_days || 0), 0);
    if (totalMilestoneDays !== parseInt(formData.timeline_days)) {
      return `Total milestone duration (${totalMilestoneDays} days) must match brief timeline (${formData.timeline_days} days)`;
    }

    return null;
  };

  const handleSubmit = async (e, publishNow = false) => {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setLoading(true);
      setError('');

      const payload = {
        ...formData,
        budget_min: formData.budget_min ? parseFloat(formData.budget_min) : null,
        budget_max: formData.budget_max ? parseFloat(formData.budget_max) : null,
        timeline_days: parseInt(formData.timeline_days),
        target_min_followers: formData.target_min_followers ? parseInt(formData.target_min_followers) : null,
        target_max_followers: formData.target_max_followers ? parseInt(formData.target_max_followers) : null,
        milestones: milestones.map((m) => ({
          ...m,
          duration_days: parseInt(m.duration_days),
          price: m.price ? parseFloat(m.price) : null,
          expected_deliverables: m.expected_deliverables.filter((d) => d.trim()),
        })),
      };

      const response = await briefsAPI.createBrief(payload);
      const briefId = response.data.brief.id;

      if (publishNow) {
        await briefsAPI.publishBrief(briefId);
        setSuccess('Brief created and published successfully!');
      } else {
        setSuccess('Brief saved as draft!');
      }

      setTimeout(() => {
        navigate('/brand/briefs');
      }, 1500);
    } catch (err) {
      console.error('Error creating brief:', err);
      setError(err.response?.data?.error || 'Failed to create brief');
    } finally {
      setLoading(false);
    }
  };

  const platforms = ['Instagram', 'TikTok', 'YouTube', 'Twitter', 'Facebook', 'LinkedIn', 'Other'];

  return (
    <div className="min-h-screen bg-light">
      <Navbar />

      <div className="container-custom section-padding">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-dark mb-2">Create Brief</h1>
            <p className="text-gray-600">Create a project brief and find the perfect creator</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-error/10 border border-error/30 rounded-lg">
              <p className="text-error font-medium">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="mb-6 p-4 bg-success/10 border border-success/30 rounded-lg">
              <p className="text-success font-medium">{success}</p>
            </div>
          )}

          <form onSubmit={(e) => handleSubmit(e, false)}>
            {/* Basic Info */}
            <div className="card mb-6">
              <h2 className="text-2xl font-bold text-dark mb-6">Basic Information</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Brief Title *
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder="e.g., Instagram Reel Series for Product Launch"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description *
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows="4"
                    placeholder="Describe your project in detail..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Project Goal
                  </label>
                  <textarea
                    name="goal"
                    value={formData.goal}
                    onChange={handleInputChange}
                    rows="3"
                    placeholder="What do you hope to achieve with this project?"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Platform</label>
                  <select
                    name="platform"
                    value={formData.platform}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="">Select platform</option>
                    {platforms.map((platform) => (
                      <option key={platform} value={platform}>
                        {platform}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Min Budget ($)
                    </label>
                    <input
                      type="number"
                      name="budget_min"
                      value={formData.budget_min}
                      onChange={handleInputChange}
                      placeholder="0"
                      min="0"
                      step="0.01"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max Budget ($)
                    </label>
                    <input
                      type="number"
                      name="budget_max"
                      value={formData.budget_max}
                      onChange={handleInputChange}
                      placeholder="0"
                      min="0"
                      step="0.01"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Timeline (days) *
                  </label>
                  <input
                    type="number"
                    name="timeline_days"
                    value={formData.timeline_days}
                    onChange={handleInputChange}
                    placeholder="30"
                    min="1"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  />
                  {formData.timeline_days > 10 && (
                    <p className="mt-2 text-sm text-warning">
                      Projects longer than 10 days require at least one milestone
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Targeting Criteria */}
            <div className="card mb-6">
              <h2 className="text-2xl font-bold text-dark mb-2">Targeting Criteria</h2>
              <p className="text-sm text-gray-600 mb-6">
                Specify which creators can see and apply to this brief
              </p>

              <div className="space-y-4">
                {/* Categories */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Creator Categories
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((category) => (
                      <button
                        key={category}
                        type="button"
                        onClick={() => handleCategoryToggle(category)}
                        className={`px-4 py-2 rounded-lg border transition-colors ${
                          formData.target_categories.includes(category)
                            ? 'bg-primary text-dark border-primary'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-primary'
                        }`}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Follower Range */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Min Followers
                    </label>
                    <input
                      type="number"
                      name="target_min_followers"
                      value={formData.target_min_followers}
                      onChange={handleInputChange}
                      placeholder="e.g., 10000"
                      min="0"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
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
                      onChange={handleInputChange}
                      placeholder="e.g., 100000"
                      min="0"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Locations */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Target Locations
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={locationInput}
                      onChange={(e) => setLocationInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addLocation())}
                      placeholder="Enter location and press Enter"
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={addLocation}
                      className="btn btn-primary"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.target_locations.map((location, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                      >
                        {location}
                        <button
                          type="button"
                          onClick={() => removeLocation(location)}
                          className="text-error hover:text-error"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Milestones */}
            <div className="card mb-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-dark">Milestones</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Break your project into manageable milestones
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addMilestone}
                  className="btn btn-primary"
                >
                  + Add Milestone
                </button>
              </div>

              <div className="space-y-4">
                {milestones.map((milestone, index) => (
                  <div key={index} className="p-4 border border-gray-200 rounded-lg bg-light">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-dark">Milestone {index + 1}</h3>
                      {milestones.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeMilestone(index)}
                          className="text-error hover:text-error/80"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Title *
                        </label>
                        <input
                          type="text"
                          value={milestone.title}
                          onChange={(e) => updateMilestone(index, 'title', e.target.value)}
                          placeholder="e.g., Content Creation"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Duration (days) *
                          </label>
                          <input
                            type="number"
                            value={milestone.duration_days}
                            onChange={(e) => updateMilestone(index, 'duration_days', e.target.value)}
                            placeholder="7"
                            min="1"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Price (optional)
                          </label>
                          <input
                            type="number"
                            value={milestone.price}
                            onChange={(e) => updateMilestone(index, 'price', e.target.value)}
                            placeholder="0.00"
                            min="0"
                            step="0.01"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Expected Deliverables *
                          </label>
                          <button
                            type="button"
                            onClick={() => addDeliverable(index)}
                            className="text-sm text-primary hover:text-primary-dark"
                          >
                            + Add Deliverable
                          </button>
                        </div>
                        <div className="space-y-2">
                          {milestone.expected_deliverables.map((deliverable, dIndex) => (
                            <div key={dIndex} className="flex gap-2">
                              <input
                                type="text"
                                value={deliverable}
                                onChange={(e) => updateDeliverable(index, dIndex, e.target.value)}
                                placeholder="e.g., 3 Instagram Reels"
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
                                required
                              />
                              {milestone.expected_deliverables.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeDeliverable(index, dIndex)}
                                  className="text-error hover:text-error/80"
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Milestone Summary */}
              {milestones.length > 0 && (
                <div className="mt-4 p-3 bg-primary/10 rounded-lg border border-primary/20">
                  <p className="text-sm text-dark">
                    <strong>Total milestone duration:</strong>{' '}
                    {milestones.reduce((sum, m) => sum + parseInt(m.duration_days || 0), 0)} days
                    {formData.timeline_days && (
                      <span className="ml-2">
                        {milestones.reduce((sum, m) => sum + parseInt(m.duration_days || 0), 0) ===
                        parseInt(formData.timeline_days) ? (
                          <span className="text-success">✓ Matches timeline</span>
                        ) : (
                          <span className="text-warning">
                            ⚠ Should match timeline ({formData.timeline_days} days)
                          </span>
                        )}
                      </span>
                    )}
                  </p>
                </div>
              )}
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 btn bg-gray-600 text-white hover:bg-gray-700 disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save as Draft'}
              </button>
              <button
                type="button"
                onClick={(e) => handleSubmit(e, true)}
                disabled={loading}
                className="flex-1 btn btn-primary disabled:opacity-50"
              >
                {loading ? 'Publishing...' : 'Publish Brief'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateBrief;
