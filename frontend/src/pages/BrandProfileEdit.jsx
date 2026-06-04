import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { brandsAPI, BASE_URL } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import Navbar from '../components/Navbar';
import toast from 'react-hot-toast';

const INDUSTRIES = [
  'Technology',
  'Fashion & Beauty',
  'Food & Beverage',
  'Health & Fitness',
  'Travel & Tourism',
  'Entertainment',
  'Finance',
  'Retail',
  'Real Estate',
  'Education',
  'Other'
];

const COMPANY_SIZES = ['1-10', '11-50', '51-200', '201-500', '500+'];

const ACCOUNT_TYPES = {
  brand: {
    title: 'Brand',
    description: 'For one company booking creators for its own campaigns.',
    countLabel: 'Number of Brands or Clients',
    countPlaceholder: '1',
  },
  agency: {
    title: 'Agency',
    description: 'For teams managing creator campaigns across multiple client brands.',
    countLabel: 'Number of Clients',
    countPlaceholder: '5',
  },
  enterprise: {
    title: 'Enterprise',
    description: 'For organisations managing campaigns across multiple brands or business units.',
    countLabel: 'Number of Brands',
    countPlaceholder: '10',
  },
};

const BrandProfileEdit = () => {
  const navigate = useNavigate();
  const { updateProfile: updateAuthProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingReportLogo, setUploadingReportLogo] = useState(false);
  const [logo, setLogo] = useState(null);
  const [reportLogo, setReportLogo] = useState(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm();
  const selectedAccountType = watch('account_type') || profile?.account_type || 'brand';
  const selectedAccountConfig = ACCOUNT_TYPES[selectedAccountType] || ACCOUNT_TYPES.brand;
  const reportColor = watch('report_brand_color') || '#B5E61D';
  const reportSecondaryColor = watch('report_secondary_color') || '#1F2937';

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await brandsAPI.getOwnProfile();
      const data = response.data;
      setProfile(data);
      setLogo(data.logo);
      setReportLogo(data.report_logo || data.logo);

      // Set form values
      setValue('company_name', data.company_name || '');
      setValue('description', data.description || '');
      setValue('website', data.website || '');
      setValue('industry', data.industry || '');
      setValue('company_size', data.company_size || '');
      setValue('location', data.location || '');
      setValue('account_type', data.account_type || 'brand');
      setValue('expected_workspace_count', data.expected_workspace_count || '');
      setValue('report_brand_color', data.report_brand_color || '#B5E61D');
      setValue('report_secondary_color', data.report_secondary_color || '#1F2937');
      setValue('report_sender_name', data.report_sender_name || data.company_name || '');
      setValue('report_reply_to_email', data.report_reply_to_email || data.user?.email || '');
      setValue('report_email_signature', data.report_email_signature || '');

      // Social links
      setValue('facebook', data.social_links?.facebook || '');
      setValue('twitter', data.social_links?.twitter || '');
      setValue('linkedin', data.social_links?.linkedin || '');
      setValue('instagram', data.social_links?.instagram || '');

    } catch (err) {
      setError('Failed to load profile');
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setUploadingLogo(true);
    try {
      const response = await brandsAPI.uploadLogo(file);
      setLogo(response.data.logo);
      toast.success('Logo uploaded successfully!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to upload logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleReportLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setUploadingReportLogo(true);
    try {
      const response = await brandsAPI.uploadReportLogo(file);
      setReportLogo(response.data.report_logo);
      toast.success('Report logo uploaded successfully');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to upload report logo');
    } finally {
      setUploadingReportLogo(false);
    }
  };

  const onSubmit = async (data) => {
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      // Build social links object
      const socialLinks = {
        facebook: data.facebook || '',
        twitter: data.twitter || '',
        linkedin: data.linkedin || '',
        instagram: data.instagram || ''
      };

      // Build update payload
      const payload = {
        company_name: data.company_name,
        description: data.description,
        website: data.website,
        industry: data.industry,
        company_size: data.company_size,
        location: data.location,
        account_type: data.account_type || 'brand',
        expected_workspace_count: data.expected_workspace_count || 0,
        report_brand_color: data.report_brand_color || '#B5E61D',
        report_secondary_color: data.report_secondary_color || '#1F2937',
        report_sender_name: data.report_sender_name || '',
        report_reply_to_email: data.report_reply_to_email || '',
        report_email_signature: data.report_email_signature || '',
        social_links: socialLinks
      };

      const response = await brandsAPI.updateProfile(payload);

      // Update the profile in auth context
      updateAuthProfile(response.data.brand);

      setSuccess(true);

      // Redirect immediately with success message
      navigate('/brand/dashboard', { state: { profileUpdated: true } });

    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  if (loadingProfile) {
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

      <div className="container-custom section-padding">
        <div className="max-w-4xl mx-auto">
          {/* Navigation */}
          <div className="mb-6">
            <Link
              to="/brand/dashboard"
              className="text-gray-600 hover:text-gray-900 flex items-center gap-2 w-fit"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Dashboard
            </Link>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-dark mb-2">Edit Brand Profile</h1>
            <p className="text-gray-600">Update your company information</p>
          </div>

          {/* Success Message */}
          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-primary rounded-lg">
              <p className="text-primary-dark font-medium">Profile updated successfully! Redirecting...</p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-error">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* Company Logo */}
            <div className="card">
              <h2 className="text-xl font-bold text-dark mb-4">Company Logo</h2>

              <div className="flex items-center gap-6">
                {/* Logo Preview */}
                <div className="relative">
                  {logo ? (
                    <img
                      src={`${BASE_URL}${logo}`}
                      alt="Company Logo"
                      className="w-32 h-32 rounded-lg object-cover border-4 border-gray-200"
                    />
                  ) : (
                    <div className="w-32 h-32 rounded-lg bg-gray-200 flex items-center justify-center">
                      <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                  )}
                  {uploadingLogo && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                    </div>
                  )}
                </div>

                {/* Upload Button */}
                <div className="flex-1">
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                      disabled={uploadingLogo}
                    />
                    <div className="px-6 py-3 bg-primary hover:bg-primary-dark text-dark font-medium rounded-lg transition-colors inline-block">
                      {uploadingLogo ? 'Uploading...' : 'Upload New Logo'}
                    </div>
                  </label>
                  <p className="text-sm text-gray-600 mt-2">
                    JPG, PNG or GIF (max. 5MB)
                  </p>
                </div>
              </div>
            </div>

            {/* Basic Info */}
            <div className="card">
              <h2 className="text-xl font-bold text-dark mb-4">Company Information</h2>

              {/* Company Name */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-dark mb-2">
                  Company Name *
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="Your Company Name"
                  {...register('company_name', {
                    required: 'Company name is required'
                  })}
                />
                {errors.company_name && (
                  <p className="mt-1 text-sm text-error">{errors.company_name.message}</p>
                )}
              </div>

              {/* Description */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-dark mb-2">
                  Company Description
                </label>
                <textarea
                  rows={4}
                  className="input"
                  placeholder="Tell creators about your company..."
                  {...register('description')}
                />
              </div>

              {/* Website */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-dark mb-2">
                  Website
                </label>
                <input
                  type="url"
                  className="input"
                  placeholder="https://yourcompany.com"
                  {...register('website')}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Industry */}
                <div>
                  <label className="block text-sm font-medium text-dark mb-2">
                    Industry
                  </label>
                  <select
                    className="input"
                    {...register('industry')}
                  >
                    <option value="">Select industry</option>
                    {INDUSTRIES.map((industry) => (
                      <option key={industry} value={industry}>
                        {industry}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Company Size */}
                <div>
                  <label className="block text-sm font-medium text-dark mb-2">
                    Company Size
                  </label>
                  <select
                    className="input"
                    {...register('company_size')}
                  >
                    <option value="">Select size</option>
                    {COMPANY_SIZES.map((size) => (
                      <option key={size} value={size}>
                        {size} employees
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Location */}
              <div className="mt-6">
                <label className="block text-sm font-medium text-dark mb-2">
                  Location
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="Harare, Zimbabwe"
                  {...register('location')}
                />
              </div>
            </div>

            {/* Account Type */}
            <div className="card">
              <h2 className="text-xl font-bold text-dark mb-4">Account Type</h2>
              <p className="text-sm text-gray-600 mb-5">
                Choose how BantuBuzz should structure your workspace. Agency and Enterprise accounts unlock separated workspaces with tailored language.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(ACCOUNT_TYPES).map(([value, option]) => (
                  <label
                    key={value}
                    className="relative cursor-pointer rounded-lg border border-gray-200 bg-white p-4 hover:border-primary transition-colors"
                  >
                    <input
                      type="radio"
                      value={value}
                      className="peer sr-only"
                      {...register('account_type')}
                    />
                    <div className="absolute right-3 top-3 h-4 w-4 rounded-full border border-gray-300 peer-checked:border-primary peer-checked:bg-primary"></div>
                    <div className="pr-6">
                      <h3 className="font-bold text-dark">{option.title}</h3>
                      <p className="text-sm text-gray-600 mt-2">{option.description}</p>
                    </div>
                    <div className="absolute inset-0 rounded-lg border-2 border-transparent peer-checked:border-primary pointer-events-none"></div>
                  </label>
                ))}
              </div>

              <div className="mt-6">
                <label className="block text-sm font-medium text-dark mb-2">
                  {selectedAccountConfig.countLabel}
                </label>
                <input
                  type="number"
                  min="0"
                  className="input"
                  placeholder={selectedAccountConfig.countPlaceholder}
                  {...register('expected_workspace_count', { valueAsNumber: true })}
                />
              </div>

              <div className="mt-6">
                <label className="block text-sm font-medium text-dark mb-2">
                  Report Accent Color
                </label>
                <div className="flex items-center gap-3">
                  <input type="hidden" {...register('report_brand_color')} />
                  <input
                    type="color"
                    value={reportColor}
                    onChange={(event) => setValue('report_brand_color', event.target.value)}
                    className="h-11 w-14 rounded-lg border border-gray-200 bg-white p-1"
                  />
                  <input
                    type="text"
                    value={reportColor}
                    onChange={(event) => setValue('report_brand_color', event.target.value)}
                    className="input max-w-xs"
                    placeholder="#B5E61D"
                  />
                </div>
                <p className="mt-2 text-sm text-gray-600">
                  Used on Agency and Enterprise workspace reports.
                </p>
              </div>

              {(selectedAccountType === 'agency' || selectedAccountType === 'enterprise') && (
                <div className="mt-8 rounded-lg border border-gray-200 bg-gray-50 p-5">
                  <h3 className="text-lg font-bold text-dark">White-Label Report Branding</h3>
                  <p className="mt-1 text-sm text-gray-600">
                    These details appear on client-facing PDF reports and report emails. Custom sender domains will be added later.
                  </p>

                  <div className="mt-5 flex flex-col gap-5 md:flex-row md:items-center">
                    <div className="relative">
                      {reportLogo ? (
                        <img
                          src={`${BASE_URL}${reportLogo}`}
                          alt="Report Logo"
                          className="h-24 w-40 rounded-lg border-4 border-white bg-white object-contain shadow-sm"
                        />
                      ) : (
                        <div className="flex h-24 w-40 items-center justify-center rounded-lg bg-white text-sm text-gray-500 shadow-sm">
                          Report logo
                        </div>
                      )}
                      {uploadingReportLogo && (
                        <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/40">
                          <div className="h-7 w-7 animate-spin rounded-full border-b-2 border-white"></div>
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleReportLogoUpload}
                          className="hidden"
                          disabled={uploadingReportLogo}
                        />
                        <span className="inline-block rounded-full bg-dark px-5 py-2 text-sm font-semibold text-white">
                          {uploadingReportLogo ? 'Uploading...' : 'Upload Report Logo'}
                        </span>
                      </label>
                      <p className="mt-2 text-sm text-gray-600">Used on PDF report headers. Falls back to company logo if empty.</p>
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-dark mb-2">
                        Primary Report Color
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={reportColor}
                          onChange={(event) => setValue('report_brand_color', event.target.value)}
                          className="h-11 w-14 rounded-lg border border-gray-200 bg-white p-1"
                        />
                        <input
                          type="text"
                          value={reportColor}
                          onChange={(event) => setValue('report_brand_color', event.target.value)}
                          className="input"
                          placeholder="#B5E61D"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-dark mb-2">
                        Secondary Report Color
                      </label>
                      <div className="flex items-center gap-3">
                        <input type="hidden" {...register('report_secondary_color')} />
                        <input
                          type="color"
                          value={reportSecondaryColor}
                          onChange={(event) => setValue('report_secondary_color', event.target.value)}
                          className="h-11 w-14 rounded-lg border border-gray-200 bg-white p-1"
                        />
                        <input
                          type="text"
                          value={reportSecondaryColor}
                          onChange={(event) => setValue('report_secondary_color', event.target.value)}
                          className="input"
                          placeholder="#1F2937"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-dark mb-2">
                        Report Sender Name
                      </label>
                      <input
                        type="text"
                        className="input"
                        placeholder="Rapportech Africa"
                        {...register('report_sender_name')}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-dark mb-2">
                        Reply-To Email
                      </label>
                      <input
                        type="email"
                        className="input"
                        placeholder="reports@youragency.com"
                        {...register('report_reply_to_email')}
                      />
                    </div>
                  </div>

                  <div className="mt-6">
                    <label className="block text-sm font-medium text-dark mb-2">
                      Custom Email Signature
                    </label>
                    <textarea
                      rows={4}
                      className="input"
                      placeholder={'Prepared by Rapportech Africa\nStrategy Team\nreports@rapportech.co.zw'}
                      {...register('report_email_signature')}
                    />
                    <p className="mt-2 text-sm text-gray-600">
                      Added to report emails and the final page of PDF reports.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Social Media */}
            <div className="card">
              <h2 className="text-xl font-bold text-dark mb-4">Social Media</h2>

              <div className="space-y-4">
                {/* Facebook */}
                <div>
                  <label className="block text-sm font-medium text-dark mb-2">
                    Facebook
                  </label>
                  <input
                    type="url"
                    className="input"
                    placeholder="https://facebook.com/yourcompany"
                    {...register('facebook')}
                  />
                </div>

                {/* Twitter */}
                <div>
                  <label className="block text-sm font-medium text-dark mb-2">
                    Twitter/X
                  </label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                      @
                    </span>
                    <input
                      type="text"
                      className="input rounded-l-none"
                      placeholder="username"
                      {...register('twitter')}
                    />
                  </div>
                </div>

                {/* LinkedIn */}
                <div>
                  <label className="block text-sm font-medium text-dark mb-2">
                    LinkedIn
                  </label>
                  <input
                    type="url"
                    className="input"
                    placeholder="https://linkedin.com/company/yourcompany"
                    {...register('linkedin')}
                  />
                </div>

                {/* Instagram */}
                <div>
                  <label className="block text-sm font-medium text-dark mb-2">
                    Instagram
                  </label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                      @
                    </span>
                    <input
                      type="text"
                      className="input rounded-l-none"
                      placeholder="username"
                      {...register('instagram')}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary flex-1"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-dark mr-2"></div>
                    Saving...
                  </div>
                ) : (
                  'Save Profile'
                )}
              </button>

              <button
                type="button"
                onClick={() => navigate('/brand/dashboard')}
                className="btn btn-secondary"
                disabled={loading}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BrandProfileEdit;
