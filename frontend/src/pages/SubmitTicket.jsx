import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import api from '../services/api';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

const SubmitTicket = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);

  const [formData, setFormData] = useState({
    category: searchParams.get('category') || '',
    subject: '',
    description: '',
    priority: 'normal'
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/support/categories');
      if (response.data.success) {
        setCategories(response.data.categories);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.category) {
      toast.error('Please select a category');
      return;
    }
    if (!formData.subject.trim()) {
      toast.error('Please enter a subject');
      return;
    }
    if (!formData.description.trim() || formData.description.trim().length < 20) {
      toast.error('Please provide a detailed description (minimum 20 characters)');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/support/tickets', formData);

      if (response.data.success) {
        toast.success('Support ticket submitted successfully!');
        navigate(`/tickets/${response.data.ticket.id}`);
      } else {
        toast.error(response.data.error || 'Failed to submit ticket');
      }
    } catch (error) {
      console.error('Error submitting ticket:', error);
      toast.error(error.response?.data?.error || 'Failed to submit ticket');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-light">
      <Navbar />

      <div className="flex-1 py-8 px-6 lg:px-12 xl:px-20">
        <div className="w-full max-w-3xl mx-auto">
          {/* Back Button */}
          <Link
            to="/help-center"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-dark mb-6 transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5" />
            <span>Back to Help Center</span>
          </Link>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-dark mb-2">Submit a Support Ticket</h1>
            <p className="text-lg text-gray-600">
              Tell us about your issue and we'll get back to you as soon as possible.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-sm p-8">
            {/* Category */}
            <div className="mb-6">
              <label className="block text-sm font-bold text-dark mb-2">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              >
                <option value="">Select a category</option>
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-2">
                Choose the category that best describes your issue
              </p>
            </div>

            {/* Priority */}
            <div className="mb-6">
              <label className="block text-sm font-bold text-dark mb-2">
                Priority
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { value: 'low', label: 'Low', desc: 'General question' },
                  { value: 'normal', label: 'Normal', desc: 'Standard issue' },
                  { value: 'high', label: 'High', desc: 'Urgent issue' },
                  { value: 'emergency', label: 'Emergency', desc: 'Critical issue' }
                ].map((priority) => (
                  <button
                    key={priority.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, priority: priority.value })}
                    className={`p-3 border-2 rounded-2xl text-left transition-all ${
                      formData.priority === priority.value
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-bold text-sm text-dark">{priority.label}</div>
                    <div className="text-xs text-gray-600 mt-1">{priority.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Subject */}
            <div className="mb-6">
              <label className="block text-sm font-bold text-dark mb-2">
                Subject <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                required
                maxLength={200}
                placeholder="Brief summary of your issue"
                className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
              <p className="text-xs text-gray-500 mt-2">
                {formData.subject.length}/200 characters
              </p>
            </div>

            {/* Description */}
            <div className="mb-6">
              <label className="block text-sm font-bold text-dark mb-2">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
                minLength={20}
                rows={6}
                placeholder="Please provide as much detail as possible about your issue. Include any error messages, steps to reproduce the problem, or relevant information that will help us assist you."
                className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-none"
              />
              <p className="text-xs text-gray-500 mt-2">
                {formData.description.length} characters (minimum 20 required)
              </p>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6">
              <div className="flex gap-3">
                <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-sm text-blue-900">
                  <p className="font-medium mb-1">What happens next?</p>
                  <ul className="space-y-1 text-blue-800">
                    <li>• Our support team will review your ticket within 24 hours</li>
                    <li>• You'll receive email notifications when we respond</li>
                    <li>• You can view and reply to your ticket anytime in "My Tickets"</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                type="button"
                onClick={() => navigate('/help-center')}
                disabled={loading}
                className="flex-1 px-8 py-3 bg-gray-100 text-dark rounded-full font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-8 py-3 bg-primary text-dark rounded-full font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Submitting...' : 'Submit Ticket'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default SubmitTicket;
