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
  const [formData, setFormData] = useState({
    real_name: '',
    id_type: 'national_id',
    id_number: '',
    reason: '',
    id_document_front: '',
    id_document_back: '',
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
        [documentType === 'id_front' ? 'id_document_front' :
         documentType === 'id_back' ? 'id_document_back' :
         'selfie_with_id']: response.data.file_path
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
      if (!formData.id_document_front || !formData.id_document_back || !formData.selfie_with_id) {
        toast.error('Please upload all required documents');
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
                    <h2 className="text-2xl font-bold text-dark mb-2">Upload ID Documents</h2>
                    <p className="text-gray-600">Upload clear photos of your identification and a selfie</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* ID Front */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        ID Front *
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
                          className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-3xl cursor-pointer transition-all ${
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
                              <p className="text-sm text-gray-500">Upload Front</p>
                            </>
                          )}
                        </label>
                      </div>
                    </div>

                    {/* ID Back */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        ID Back *
                      </label>
                      <div className="relative">
                        <input
                          type="file"
                          id="id_back"
                          accept="image/*,application/pdf"
                          onChange={(e) => handleFileUpload(e, 'id_back')}
                          className="hidden"
                        />
                        <label
                          htmlFor="id_back"
                          className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-3xl cursor-pointer transition-all ${
                            formData.id_document_back
                              ? 'border-primary bg-primary/5'
                              : 'border-gray-300 hover:border-primary hover:bg-light'
                          }`}
                        >
                          {uploading.id_back ? (
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                          ) : formData.id_document_back ? (
                            <div className="text-center">
                              <CheckBadgeIcon className="h-12 w-12 text-primary mx-auto mb-2" />
                              <p className="text-sm text-primary font-medium">Uploaded</p>
                            </div>
                          ) : (
                            <>
                              <PhotoIcon className="h-12 w-12 text-gray-400 mb-2" />
                              <p className="text-sm text-gray-500">Upload Back</p>
                            </>
                          )}
                        </label>
                      </div>
                    </div>

                    {/* Selfie with ID */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Selfie with ID *
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
                          className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-3xl cursor-pointer transition-all ${
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
                            </>
                          )}
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-3xl p-4">
                    <p className="text-sm text-blue-800">
                      <strong>Tips for good photos:</strong> Ensure documents are clear, well-lit, and all text is readable.
                      For the selfie, hold your ID next to your face and make sure both are clearly visible.
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
                      <div className="w-10 h-10 bg-gradient-to-tr from-purple-600 via-pink-600 to-orange-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                        IG
                      </div>
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
                      <div className="w-10 h-10 bg-dark rounded-full flex items-center justify-center text-white font-bold text-sm">
                        TT
                      </div>
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
                      <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                        FB
                      </div>
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
