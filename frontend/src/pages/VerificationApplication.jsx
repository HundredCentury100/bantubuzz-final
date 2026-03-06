import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../services/api';
import toast from 'react-hot-toast';
import { CheckBadgeIcon, DocumentTextIcon, PhotoIcon, ArrowLeftIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

const VerificationApplication = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState({});
  const [checkingSubscription, setCheckingSubscription] = useState(true);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [formData, setFormData] = useState({
    real_name: '',
    id_type: 'national_id',
    id_number: '',
    reason: '',
    id_document_front: '',
    selfie_with_id: '',
    instagram_verified: false,
    instagram_username: '',
    instagram_followers: 0,
    tiktok_verified: false,
    tiktok_username: '',
    tiktok_followers: 0,
    facebook_verified: false,
    facebook_username: '',
    facebook_followers: 0
  });

  // Check for active verification subscription on mount
  useEffect(() => {
    checkVerificationSubscription();
  }, []);

  const checkVerificationSubscription = async () => {
    try {
      setCheckingSubscription(true);
      const response = await api.get('/creator/subscriptions/my-subscription');

      if (response.data.success) {
        const data = response.data.data;
        const subscription = data.subscription || data.plan; // Handle both subscription and free plan

        // Check if user has active verification subscription
        if (data.has_subscription && subscription &&
            subscription.plan?.subscription_type === 'verification' &&
            subscription.status === 'active' && subscription.payment_verified) {
          setHasActiveSubscription(true);
        } else if (data.is_free) {
          // User is on free plan - cannot apply for verification
          setHasActiveSubscription(false);
          toast.error('You need an active verification subscription to apply. Redirecting to subscriptions...');
          setTimeout(() => navigate('/creator/subscriptions'), 2000);
        } else {
          setHasActiveSubscription(false);
          toast.error('You need an active verification subscription to apply. Redirecting to subscriptions...');
          setTimeout(() => navigate('/creator/subscriptions'), 2000);
        }
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
      toast.error('Failed to check subscription status');
      navigate('/creator/subscriptions');
    } finally {
      setCheckingSubscription(false);
    }
  };

  // Get document type label
  const getDocumentLabel = () => {
    switch (formData.id_type) {
      case 'national_id':
        return 'ID';
      case 'passport':
        return 'Passport';
      case 'drivers_license':
        return "Driver's License";
      default:
        return 'ID';
    }
  };

  const steps = [
    { id: 1, name: 'Personal Info', icon: DocumentTextIcon },
    { id: 2, name: 'ID Documents', icon: PhotoIcon },
    { id: 3, name: 'Social Media', icon: CheckBadgeIcon }
  ];

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleFileUpload = async (e, documentType) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only PNG, JPG, JPEG, and PDF files are allowed');
      return;
    }

    setUploading(prev => ({ ...prev, [documentType]: true }));

    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_type', documentType);

    try {
      const response = await api.post('/creator/verification/upload-document', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setFormData(prev => ({
        ...prev,
        [documentType === 'id_front' ? 'id_document_front' : 'selfie_with_id']: response.data.file_path
      }));

      toast.success('Document uploaded successfully');
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error(error.response?.data?.error || 'Failed to upload document');
    } finally {
      setUploading(prev => ({ ...prev, [documentType]: false }));
    }
  };

  const validateStep = (step) => {
    if (step === 1) {
      if (!formData.real_name || !formData.id_type || !formData.id_number) {
        toast.error('Please fill in all personal information fields');
        return false;
      }
    } else if (step === 2) {
      if (!formData.id_document_front || !formData.selfie_with_id) {
        toast.error('Please upload both required documents (Front and Selfie)');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, steps.length));
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateStep(currentStep)) return;

    setLoading(true);

    try {
      const response = await api.post('/creator/verification/apply', formData);
      toast.success('Verification application submitted successfully!');
      navigate('/creator/verification/status');
    } catch (error) {
      console.error('Error submitting application:', error);
      toast.error(error.response?.data?.error || 'Failed to submit application');
    } finally {
      setLoading(false);
    }
  };

  // Show loading screen while checking subscription
  if (checkingSubscription) {
    return (
      <div className="min-h-screen bg-light">
        <Navbar />
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Checking subscription status...</p>
          </div>
        </div>
      </div>
    );
  }

  // Don't render form if no active subscription (will redirect)
  if (!hasActiveSubscription) {
    return (
      <div className="min-h-screen bg-light">
        <Navbar />
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <p className="text-gray-600">Redirecting to subscriptions...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-light">
      <Navbar />

      <div className="container-custom section-padding">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full mb-4">
              <CheckBadgeIcon className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium text-primary">Creator Verification</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-dark mb-4 leading-tight">Apply for Verification</h1>
            <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Get the verified badge and build trust with brands. Complete the application below.
            </p>
          </div>

          {/* Progress Steps */}
          <div className="mb-10">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-all ${
                      currentStep >= step.id
                        ? 'bg-primary text-dark shadow-sm'
                        : 'bg-light text-gray-500'
                    }`}>
                      <step.icon className="h-6 w-6" />
                    </div>
                    <span className={`text-sm font-medium ${
                      currentStep >= step.id ? 'text-primary' : 'text-gray-500'
                    }`}>
                      {step.name}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`h-1 flex-1 mx-4 rounded-full transition-all ${
                      currentStep > step.id ? 'bg-primary' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="card">
              {/* Step 1: Personal Information */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-dark mb-2">Personal Information</h2>
                    <p className="text-gray-600">Provide your legal identification details</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Legal Name *
                    </label>
                    <input
                      type="text"
                      name="real_name"
                      value={formData.real_name}
                      onChange={handleInputChange}
                      className="input"
                      placeholder="Enter your full name as it appears on your ID"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        ID Type *
                      </label>
                      <select
                        name="id_type"
                        value={formData.id_type}
                        onChange={handleInputChange}
                        className="input"
                        required
                      >
                        <option value="national_id">National ID</option>
                        <option value="passport">Passport</option>
                        <option value="drivers_license">Driver's License</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        ID Number *
                      </label>
                      <input
                        type="text"
                        name="id_number"
                        value={formData.id_number}
                        onChange={handleInputChange}
                        className="input"
                        placeholder="Enter your ID number"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Why do you want to be verified? (Optional)
                    </label>
                    <textarea
                      name="reason"
                      value={formData.reason}
                      onChange={handleInputChange}
                      className="input"
                      rows="4"
                      placeholder="Tell us why verification is important for your creator journey..."
                    />
                  </div>
                </div>
              )}

              {/* Step 2: ID Documents */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-dark mb-2">Upload {getDocumentLabel()} Documents</h2>
                    <p className="text-gray-600">Upload a clear photo of your {getDocumentLabel().toLowerCase()} and a selfie holding it</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Document Front */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        {getDocumentLabel()} (Front) *
                      </label>
                      <div className="relative">
                        <input
                          type="file"
                          id="id_front"
                          accept="image/*,application/pdf"
                          onChange={(e) => handleFileUpload(e, 'id_front')}
                          className="hidden"
                        />
                        <label
                          htmlFor="id_front"
                          className={`flex flex-col items-center justify-center w-full h-56 border-2 border-dashed rounded-3xl cursor-pointer transition-all ${
                            formData.id_document_front
                              ? 'border-primary bg-primary/5'
                              : 'border-gray-300 hover:border-primary hover:bg-light'
                          }`}
                        >
                          {uploading.id_front ? (
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                          ) : formData.id_document_front ? (
                            <div className="text-center">
                              <CheckBadgeIcon className="h-12 w-12 text-primary mx-auto mb-2" />
                              <p className="text-sm text-primary font-medium">Uploaded</p>
                            </div>
                          ) : (
                            <>
                              <PhotoIcon className="h-12 w-12 text-gray-400 mb-2" />
                              <p className="text-sm text-gray-500">Upload {getDocumentLabel()} Front</p>
                              <p className="text-xs text-gray-400 mt-2 px-4 text-center">
                                Clear photo showing all details
                              </p>
                            </>
                          )}
                        </label>
                      </div>
                    </div>

                    {/* Selfie with Document */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Selfie with {getDocumentLabel()} *
                      </label>
                      <div className="relative">
                        <input
                          type="file"
                          id="selfie"
                          accept="image/*"
                          onChange={(e) => handleFileUpload(e, 'selfie')}
                          className="hidden"
                        />
                        <label
                          htmlFor="selfie"
                          className={`flex flex-col items-center justify-center w-full h-56 border-2 border-dashed rounded-3xl cursor-pointer transition-all ${
                            formData.selfie_with_id
                              ? 'border-primary bg-primary/5'
                              : 'border-gray-300 hover:border-primary hover:bg-light'
                          }`}
                        >
                          {uploading.selfie ? (
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                          ) : formData.selfie_with_id ? (
                            <div className="text-center">
                              <CheckBadgeIcon className="h-12 w-12 text-primary mx-auto mb-2" />
                              <p className="text-sm text-primary font-medium">Uploaded</p>
                            </div>
                          ) : (
                            <>
                              <PhotoIcon className="h-12 w-12 text-gray-400 mb-2" />
                              <p className="text-sm text-gray-500">Upload Selfie</p>
                              <p className="text-xs text-gray-400 mt-2 px-4 text-center">
                                Hold {getDocumentLabel().toLowerCase()} next to your face
                              </p>
                            </>
                          )}
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-3xl p-4">
                    <p className="text-sm text-blue-800">
                      <strong>Tips for good photos:</strong> Ensure your {getDocumentLabel().toLowerCase()} is clear, well-lit, and all text is readable.
                      For the selfie, hold your {getDocumentLabel().toLowerCase()} next to your face and make sure both your face and the document are clearly visible.
                    </p>
                  </div>
                </div>
              )}

              {/* Step 3: Social Media */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-dark mb-2">Social Media Verification</h2>
                    <p className="text-gray-600">Link your social media accounts (optional but recommended)</p>
                  </div>

                  {/* Instagram */}
                  <div className="p-6 border border-gray-200 rounded-3xl">
                    <div className="flex items-center gap-3 mb-4">
                      <svg className="w-10 h-10 text-pink-600" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                      </svg>
                      <h3 className="text-lg font-bold text-dark">Instagram</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-1">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            name="instagram_verified"
                            checked={formData.instagram_verified}
                            onChange={handleInputChange}
                            className="w-4 h-4 text-primary rounded focus:ring-primary"
                          />
                          <span className="text-sm font-medium text-gray-700">I have Instagram</span>
                        </label>
                      </div>
                      {formData.instagram_verified && (
                        <>
                          <div>
                            <input
                              type="text"
                              name="instagram_username"
                              value={formData.instagram_username}
                              onChange={handleInputChange}
                              className="input"
                              placeholder="@username"
                            />
                          </div>
                          <div>
                            <input
                              type="number"
                              name="instagram_followers"
                              value={formData.instagram_followers}
                              onChange={handleInputChange}
                              className="input"
                              placeholder="Followers count"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* TikTok */}
                  <div className="p-6 border border-gray-200 rounded-3xl">
                    <div className="flex items-center gap-3 mb-4">
                      <svg className="w-10 h-10 text-gray-900" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
                      </svg>
                      <h3 className="text-lg font-bold text-dark">TikTok</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-1">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            name="tiktok_verified"
                            checked={formData.tiktok_verified}
                            onChange={handleInputChange}
                            className="w-4 h-4 text-primary rounded focus:ring-primary"
                          />
                          <span className="text-sm font-medium text-gray-700">I have TikTok</span>
                        </label>
                      </div>
                      {formData.tiktok_verified && (
                        <>
                          <div>
                            <input
                              type="text"
                              name="tiktok_username"
                              value={formData.tiktok_username}
                              onChange={handleInputChange}
                              className="input"
                              placeholder="@username"
                            />
                          </div>
                          <div>
                            <input
                              type="number"
                              name="tiktok_followers"
                              value={formData.tiktok_followers}
                              onChange={handleInputChange}
                              className="input"
                              placeholder="Followers count"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Facebook */}
                  <div className="p-6 border border-gray-200 rounded-3xl">
                    <div className="flex items-center gap-3 mb-4">
                      <svg className="w-10 h-10 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                      <h3 className="text-lg font-bold text-dark">Facebook</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-1">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            name="facebook_verified"
                            checked={formData.facebook_verified}
                            onChange={handleInputChange}
                            className="w-4 h-4 text-primary rounded focus:ring-primary"
                          />
                          <span className="text-sm font-medium text-gray-700">I have Facebook</span>
                        </label>
                      </div>
                      {formData.facebook_verified && (
                        <>
                          <div>
                            <input
                              type="text"
                              name="facebook_username"
                              value={formData.facebook_username}
                              onChange={handleInputChange}
                              className="input"
                              placeholder="Page/Profile name"
                            />
                          </div>
                          <div>
                            <input
                              type="number"
                              name="facebook_followers"
                              value={formData.facebook_followers}
                              onChange={handleInputChange}
                              className="input"
                              placeholder="Followers/Likes count"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex items-center justify-between pt-8 border-t border-gray-200 mt-8">
                <button
                  type="button"
                  onClick={handlePrevious}
                  disabled={currentStep === 1}
                  className="px-8 py-3 border border-gray-300 text-gray-700 rounded-full font-medium hover:bg-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <ArrowLeftIcon className="h-5 w-5" />
                  Previous
                </button>

                {currentStep < steps.length ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="px-8 py-3 bg-dark text-white rounded-full font-medium hover:bg-gray-800 transition-colors flex items-center gap-2"
                  >
                    Next
                    <ArrowRightIcon className="h-5 w-5" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-8 py-3 bg-primary text-dark rounded-full font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-dark"></div>
                        Submitting...
                      </>
                    ) : (
                      <>
                        <CheckBadgeIcon className="h-5 w-5" />
                        Submit Application
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default VerificationApplication;
