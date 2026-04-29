import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, ChevronDown } from 'lucide-react';
import axios from 'axios';

interface FormData {
  // Organization Details
  businessName: string;
  registrationNumber: string;
  organizationType: string;
  incorporationDate: string;
  officialAddress: string;

  // Contact Details
  officialEmail: string;
  phone: string;
  contactName: string;
  contactDesignation: string;

  // Personal Login Details
  email: string; // Personal email for login
  password: string;
  confirmPassword: string;

  // Verification Documents
  registrationCertificateUrl: string;
  taxIdentificationUrl: string;
  businessLicenseUrl: string;
  addressProofUrl: string;

  // Legacy fields (keeping for compatibility)
  industry: string;
  preferredDate: string;
  message: string;
  agreeTerms: boolean;
}

const SignupPage: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    // Organization Details
    businessName: '',
    registrationNumber: '',
    organizationType: '',
    incorporationDate: '',
    officialAddress: '',

    // Contact Details
    officialEmail: '',
    phone: '',
    contactName: '',
    contactDesignation: '',

    // Personal Login Details
    email: '',
    password: '',
    confirmPassword: '',

    // Verification Documents
    registrationCertificateUrl: '',
    taxIdentificationUrl: '',
    businessLicenseUrl: '',
    addressProofUrl: '',

    // Legacy fields
    industry: '',
    preferredDate: '',
    message: '',
    agreeTerms: false,
  });

  interface FormErrors {
    // Organization Details
    businessName?: string;
    registrationNumber?: string;
    organizationType?: string;
    incorporationDate?: string;
    officialAddress?: string;

    // Contact Details
    officialEmail?: string;
    phone?: string;
    contactName?: string;
    contactDesignation?: string;

    // Personal Login Details
    email?: string;
    password?: string;
    confirmPassword?: string;

    // Verification Documents
    registrationCertificateUrl?: string;
    taxIdentificationUrl?: string;
    businessLicenseUrl?: string;
    addressProofUrl?: string;

    // Legacy fields
    industry?: string;
    preferredDate?: string;
    message?: string;
    agreeTerms?: string;

    // General
    submit?: string;
  }
  // --- Add extra states at the top ---
  const [otp, setOtp] = useState<string>('');
  const [otpSent, setOtpSent] = useState<boolean>(false);
  const [otpVerified, setOtpVerified] = useState<boolean>(false);
  const [otpError, setOtpError] = useState<string>('');

  // --- Send OTP ---
  const handleSendOtp = async () => {
    try {
      setOtpError('');
      await axios.post('/api/auth/request-otp', {
        email: formData.email,
        user_type: 'client',
        user_data: formData
      });
      setOtpSent(true);
      alert('OTP sent to your email. Please check your inbox.');
    } catch (err: any) {
      setOtpError(err.response?.data?.error || 'Failed to send OTP. Try again.');
    }
  };

  // --- Verify OTP ---
  const handleVerifyOtp = async () => {
    try {
      setOtpError('');
      const res = await axios.post('/api/auth/verify-otp', {
        email: formData.email,
        otp: String(otp)
      });
      if (res.data.success) {
        setOtpVerified(true);
        alert('OTP verified successfully!');
      } else {
        setOtpError(res.data.error || 'Invalid OTP');
      }
    } catch (err: any) {
      setOtpError(err.response?.data?.error || 'OTP verification failed.');
    }
  };

  const [errors, setErrors] = useState<FormErrors>({});
  const [step, setStep] = useState<number>(1);
  const [isFormSubmitted, setIsFormSubmitted] = useState<boolean>(false);
  const [isOrgTypeDropdownOpen, setIsOrgTypeDropdownOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const navigate = useNavigate();

  const organizationTypes = [
    'Private Limited',
    'Public Limited',
    'Partnership',
    'LLP',
    'Sole Proprietorship',
    'NGO',
    'Trust',
    'Society',
    'Other'
  ];

  useEffect(() => {
    // Scroll to top on page load
    window.scrollTo(0, 0);

    // Update page title
    document.title = 'Sign Up - HMX FPV Tours';
  }, []);

  // Step 1: Organization Details
  const validateStep1 = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.businessName.trim()) {
      newErrors.businessName = 'Organization name is required';
    }

    if (!formData.registrationNumber.trim()) {
      newErrors.registrationNumber = 'Registration/Incorporation number is required';
    }

    if (!formData.organizationType) {
      newErrors.organizationType = 'Organization type is required';
    }

    if (!formData.incorporationDate) {
      newErrors.incorporationDate = 'Date of incorporation is required';
    } else {
      // Validate date format
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(formData.incorporationDate)) {
        newErrors.incorporationDate = 'Please enter a valid date (YYYY-MM-DD)';
      }
    }

    if (!formData.officialAddress.trim()) {
      newErrors.officialAddress = 'Official address is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Step 2: Contact Details
  const validateStep2 = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.officialEmail.trim()) {
      newErrors.officialEmail = 'Official email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.officialEmail)) {
      newErrors.officialEmail = 'Official email is invalid';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    }

    if (!formData.contactName.trim()) {
      newErrors.contactName = 'Contact person name is required';
    }

    if (!formData.contactDesignation.trim()) {
      newErrors.contactDesignation = 'Contact person designation is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Step 3: Verification Documents (optional but recommended)
  const validateStep3 = (): boolean => {
    const newErrors: FormErrors = {};

    // All document fields are optional, but we can add warnings
    // For now, just return true as documents are optional

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Step 4: Password Setup
  const validateStep4 = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Personal email for login is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.agreeTerms) {
      newErrors.agreeTerms = 'You must agree to the terms and conditions';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;

    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });

    // Clear error when user starts typing
    if (errors[name as keyof FormData]) {
      setErrors({
        ...errors,
        [name]: undefined
      });
    }
  };

  const handleSubmit = async () => {
    if (!validateStep4()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Register the user with all the new fields
      const response = await axios.post('/api/auth/register', {
        business_name: formData.businessName,
        contact_name: formData.contactName,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        registration_number: formData.registrationNumber,
        organization_type: formData.organizationType,
        incorporation_date: formData.incorporationDate,
        official_address: formData.officialAddress,
        official_email: formData.officialEmail,
        contact_person_designation: formData.contactDesignation,
        registration_certificate_url: formData.registrationCertificateUrl,
        tax_identification_url: formData.taxIdentificationUrl,
        business_license_url: formData.businessLicenseUrl,
        address_proof_url: formData.addressProofUrl,
        role: 'client'
      });

      // Persist token if returned so dashboard loads seamlessly
      if (response?.data?.token) {
        localStorage.setItem('token', response.data.token);
      }

      setIsFormSubmitted(true);
      // Show success message and redirect to client dashboard after 2 seconds
      setTimeout(() => {
        navigate('/client', { replace: true });
      }, 2000);

    } catch (error: any) {
      console.error('Registration failed:', error);
      alert(error.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNextStep = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      setStep(3);
    } else if (step === 3 && validateStep3()) {
      setStep(4);
    } else if (step === 4) {
      handleSubmit();
    }
  };

  const handlePrevStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleOrgTypeSelect = (orgType: string) => {
    setFormData({
      ...formData,
      organizationType: orgType
    });
    setIsOrgTypeDropdownOpen(false);

    // Clear error
    if (errors.organizationType) {
      setErrors({
        ...errors,
        organizationType: undefined
      });
    }
  };

  return (
    <div className="min-h-screen pt-20 pb-16 bg-background-light">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto bg-white rounded-[32px] shadow-hmx overflow-hidden border border-zinc-100">
          {/* Header */}
          <div className="bg-sidebar-bg text-white p-8 text-center relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-hmx-gradient"></div>
            <h1 className="text-3xl font-black mb-2 tracking-tight">
              {isFormSubmitted
                ? 'Thank You for Signing Up!'
                : 'Business Registration'}
            </h1>
            <p className="text-zinc-400 font-bold uppercase tracking-widest text-[10px]">
              {isFormSubmitted
                ? 'You will be redirected to your client dashboard shortly.'
                : `Step ${step} of 4: ${step === 1 ? 'Organization Details' :
                  step === 2 ? 'Contact Information' :
                    step === 3 ? 'Verification Documents' :
                      'Account Setup'
                }`}
            </p>
          </div>

          {/* Progress Bar */}
          {!isFormSubmitted && (
            <div className="bg-zinc-100 h-1.5">
              <div
                className="bg-hmx-gradient h-full transition-all duration-500 ease-out"
                style={{ width: `${(step / 4) * 100}%` }}
              />
            </div>
          )}

          {/* Form Content */}
          <div className="p-8 md:p-12">
            {isFormSubmitted ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="text-center py-8"
              >
                <div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-50 text-emerald-500 rounded-3xl mb-8 shadow-sm">
                  <CheckCircle size={40} />
                </div>

                <h2 className="text-3xl font-black text-zinc-900 mb-4 tracking-tight">
                  Registration Successful!
                </h2>

                <p className="text-zinc-500 font-medium mb-10 max-w-md mx-auto">
                  Thank you for registering your business with HMX. Our team will review your application shortly.
                </p>

                <div className="bg-zinc-50 rounded-[32px] p-8 text-left mb-10 border border-zinc-100">
                  <h3 className="text-sm font-black text-zinc-900 uppercase tracking-widest mb-4 flex items-center">
                    <span className="w-1.5 h-4 bg-primary-500 rounded-full mr-3"></span>
                    Next Steps
                  </h3>
                  <ul className="space-y-4">
                    {[
                      'Team review of registration and documents',
                      'Approval confirmation within 24-48 hours',
                      'Dashboard access for booking FPV tours',
                      'Schedule virtual tours for your locations'
                    ].map((item, i) => (
                      <li key={i} className="flex items-start">
                        <span className="w-6 h-6 rounded-full bg-white border border-zinc-200 flex items-center justify-center text-xs font-black text-zinc-400 mr-3 flex-shrink-0">
                          {i + 1}
                        </span>
                        <span className="text-zinc-600 font-medium">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Link
                  to="/"
                  className="bg-hmx-gradient hover:scale-[1.02] active:scale-95 text-white px-10 py-4 rounded-2xl font-black transition-all inline-block shadow-hmx-lg"
                >
                  Return to Home
                </Link>
              </motion.div>
            ) : (
              <>
                {/* Progress Steps */}
                <div className="flex items-center justify-between mb-12 relative px-4">
                  <div className="absolute top-1/2 left-0 w-full h-0.5 bg-zinc-100 -translate-y-1/2 z-0"></div>
                  {[1, 2, 3, 4].map((num) => (
                    <div key={num} className="relative z-10 flex flex-col items-center">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm transition-all duration-300 ${step >= num ? 'bg-hmx-gradient text-white shadow-hmx' : 'bg-white border-2 border-zinc-100 text-zinc-300'
                        }`}>
                        {num}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Step 1: Organization Details */}
                {step === 1 && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <h2 className="text-2xl font-heading font-semibold text-primary-900 mb-6">
                      Organization Details
                    </h2>

                    <div className="space-y-4">
                      <div>
                        <label htmlFor="businessName" className="block text-sm font-medium text-gray-700 mb-1">
                          Organization Name*
                        </label>
                        <input
                          type="text"
                          id="businessName"
                          name="businessName"
                          value={formData.businessName}
                          onChange={handleChange}
                          className={`w-full px-4 py-2 border rounded-md focus:ring-primary-500 focus:border-primary-500 ${errors.businessName ? 'border-red-500' : 'border-gray-300'
                            }`}
                          placeholder="Your organization name"
                        />
                        {errors.businessName && (
                          <p className="mt-1 text-sm text-red-600">{errors.businessName}</p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="registrationNumber" className="block text-sm font-medium text-gray-700 mb-1">
                          Registration / Incorporation Number*
                        </label>
                        <input
                          type="text"
                          id="registrationNumber"
                          name="registrationNumber"
                          value={formData.registrationNumber}
                          onChange={handleChange}
                          className={`w-full px-4 py-2 border rounded-md focus:ring-primary-500 focus:border-primary-500 ${errors.registrationNumber ? 'border-red-500' : 'border-gray-300'
                            }`}
                          placeholder="Registration or incorporation number"
                        />
                        {errors.registrationNumber && (
                          <p className="mt-1 text-sm text-red-600">{errors.registrationNumber}</p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="organizationType" className="block text-sm font-medium text-gray-700 mb-1">
                          Type of Organization*
                        </label>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setIsOrgTypeDropdownOpen(!isOrgTypeDropdownOpen)}
                            className={`w-full px-4 py-2 border rounded-md focus:ring-primary-500 focus:border-primary-500 text-left flex items-center justify-between ${errors.organizationType ? 'border-red-500' : 'border-gray-300'
                              }`}
                          >
                            <span className={formData.organizationType ? 'text-gray-900' : 'text-gray-500'}>
                              {formData.organizationType || 'Select organization type'}
                            </span>
                            <ChevronDown size={20} className={`transform transition-transform ${isOrgTypeDropdownOpen ? 'rotate-180' : ''}`} />
                          </button>

                          {isOrgTypeDropdownOpen && (
                            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                              {organizationTypes.map((type) => (
                                <button
                                  key={type}
                                  type="button"
                                  onClick={() => handleOrgTypeSelect(type)}
                                  className="w-full px-4 py-2 text-left hover:bg-primary-50 hover:text-primary-700 transition-colors"
                                >
                                  {type}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        {errors.organizationType && (
                          <p className="mt-1 text-sm text-red-600">{errors.organizationType}</p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="incorporationDate" className="block text-sm font-medium text-gray-700 mb-1">
                          Date of Incorporation*
                        </label>
                        <input
                          type="date"
                          id="incorporationDate"
                          name="incorporationDate"
                          value={formData.incorporationDate}
                          onChange={handleChange}
                          className={`w-full px-4 py-2 border rounded-md focus:ring-primary-500 focus:border-primary-500 ${errors.incorporationDate ? 'border-red-500' : 'border-gray-300'
                            }`}
                        />
                        {errors.incorporationDate && (
                          <p className="mt-1 text-sm text-red-600">{errors.incorporationDate}</p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="officialAddress" className="block text-sm font-medium text-gray-700 mb-1">
                          Official Address*
                        </label>
                        <textarea
                          id="officialAddress"
                          name="officialAddress"
                          value={formData.officialAddress}
                          onChange={handleChange}
                          rows={3}
                          className={`w-full px-4 py-2 border rounded-md focus:ring-primary-500 focus:border-primary-500 ${errors.officialAddress ? 'border-red-500' : 'border-gray-300'
                            }`}
                          placeholder="Complete official address of your organization"
                        />
                        {errors.officialAddress && (
                          <p className="mt-1 text-sm text-red-600">{errors.officialAddress}</p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Step 2: Contact Details */}
                {step === 2 && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <h2 className="text-2xl font-heading font-semibold text-primary-900 mb-6">
                      Contact Details
                    </h2>

                    <div className="space-y-4">
                      <div>
                        <label htmlFor="officialEmail" className="block text-sm font-medium text-gray-700 mb-1">
                          Official Email Address*
                        </label>
                        <input
                          type="email"
                          id="officialEmail"
                          name="officialEmail"
                          value={formData.officialEmail}
                          onChange={handleChange}
                          className={`w-full px-4 py-2 border rounded-md focus:ring-primary-500 focus:border-primary-500 ${errors.officialEmail ? 'border-red-500' : 'border-gray-300'
                            }`}
                          placeholder="hr@company.com (domain-based preferred)"
                        />
                        {errors.officialEmail && (
                          <p className="mt-1 text-sm text-red-600">{errors.officialEmail}</p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                          Phone Number*
                        </label>
                        <input
                          type="tel"
                          id="phone"
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          className={`w-full px-4 py-2 border rounded-md focus:ring-primary-500 focus:border-primary-500 ${errors.phone ? 'border-red-500' : 'border-gray-300'
                            }`}
                          placeholder="Official contact number"
                        />
                        {errors.phone && (
                          <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="contactName" className="block text-sm font-medium text-gray-700 mb-1">
                          Contact Person Name*
                        </label>
                        <input
                          type="text"
                          id="contactName"
                          name="contactName"
                          value={formData.contactName}
                          onChange={handleChange}
                          className={`w-full px-4 py-2 border rounded-md focus:ring-primary-500 focus:border-primary-500 ${errors.contactName ? 'border-red-500' : 'border-gray-300'
                            }`}
                          placeholder="Full name of contact person"
                        />
                        {errors.contactName && (
                          <p className="mt-1 text-sm text-red-600">{errors.contactName}</p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="contactDesignation" className="block text-sm font-medium text-gray-700 mb-1">
                          Contact Person Designation*
                        </label>
                        <input
                          type="text"
                          id="contactDesignation"
                          name="contactDesignation"
                          value={formData.contactDesignation}
                          onChange={handleChange}
                          className={`w-full px-4 py-2 border rounded-md focus:ring-primary-500 focus:border-primary-500 ${errors.contactDesignation ? 'border-red-500' : 'border-gray-300'
                            }`}
                          placeholder="e.g., HR Manager, CEO, Marketing Head"
                        />
                        {errors.contactDesignation && (
                          <p className="mt-1 text-sm text-red-600">{errors.contactDesignation}</p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Step 3: Verification Documents */}
                {step === 3 && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <h2 className="text-2xl font-heading font-semibold text-primary-900 mb-6">
                      Verification Documents
                    </h2>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                      <p className="text-blue-800 text-sm">
                        <strong>Note:</strong> Please upload your documents to Google Drive or similar cloud storage and provide the shareable links below. All documents are optional but recommended for faster verification.
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label htmlFor="registrationCertificateUrl" className="block text-sm font-medium text-gray-700 mb-1">
                          Registration Certificate / Incorporation Certificate
                        </label>
                        <input
                          type="url"
                          id="registrationCertificateUrl"
                          name="registrationCertificateUrl"
                          value={formData.registrationCertificateUrl}
                          onChange={handleChange}
                          className={`w-full px-4 py-2 border rounded-md focus:ring-primary-500 focus:border-primary-500 ${errors.registrationCertificateUrl ? 'border-red-500' : 'border-gray-300'
                            }`}
                          placeholder="https://drive.google.com/file/d/..."
                        />
                        {errors.registrationCertificateUrl && (
                          <p className="mt-1 text-sm text-red-600">{errors.registrationCertificateUrl}</p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="taxIdentificationUrl" className="block text-sm font-medium text-gray-700 mb-1">
                          Tax Identification (GST / PAN / TAN)
                        </label>
                        <input
                          type="url"
                          id="taxIdentificationUrl"
                          name="taxIdentificationUrl"
                          value={formData.taxIdentificationUrl}
                          onChange={handleChange}
                          className={`w-full px-4 py-2 border rounded-md focus:ring-primary-500 focus:border-primary-500 ${errors.taxIdentificationUrl ? 'border-red-500' : 'border-gray-300'
                            }`}
                          placeholder="https://drive.google.com/file/d/..."
                        />
                        {errors.taxIdentificationUrl && (
                          <p className="mt-1 text-sm text-red-600">{errors.taxIdentificationUrl}</p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="businessLicenseUrl" className="block text-sm font-medium text-gray-700 mb-1">
                          Business License / Trade License
                        </label>
                        <input
                          type="url"
                          id="businessLicenseUrl"
                          name="businessLicenseUrl"
                          value={formData.businessLicenseUrl}
                          onChange={handleChange}
                          className={`w-full px-4 py-2 border rounded-md focus:ring-primary-500 focus:border-primary-500 ${errors.businessLicenseUrl ? 'border-red-500' : 'border-gray-300'
                            }`}
                          placeholder="https://drive.google.com/file/d/..."
                        />
                        {errors.businessLicenseUrl && (
                          <p className="mt-1 text-sm text-red-600">{errors.businessLicenseUrl}</p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="addressProofUrl" className="block text-sm font-medium text-gray-700 mb-1">
                          Proof of Address (utility bill, lease agreement, etc.)
                        </label>
                        <input
                          type="url"
                          id="addressProofUrl"
                          name="addressProofUrl"
                          value={formData.addressProofUrl}
                          onChange={handleChange}
                          className={`w-full px-4 py-2 border rounded-md focus:ring-primary-500 focus:border-primary-500 ${errors.addressProofUrl ? 'border-red-500' : 'border-gray-300'
                            }`}
                          placeholder="https://drive.google.com/file/d/..."
                        />
                        {errors.addressProofUrl && (
                          <p className="mt-1 text-sm text-red-600">{errors.addressProofUrl}</p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Step 4: Account Setup */}
                {step === 4 && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <h2 className="text-2xl font-heading font-semibold text-primary-900 mb-6">
                      Account Setup
                    </h2>

                    <div className="space-y-4">
                      {/* Email */}
                      <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                          Personal Email for Login*
                        </label>
                        <input
                          type="email"
                          id="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          className={`w-full px-4 py-2 border rounded-md focus:ring-primary-500 focus:border-primary-500 ${errors.email ? 'border-red-500' : 'border-gray-300'
                            }`}
                          placeholder="Your personal email for account access"
                        />
                        {errors.email && (
                          <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                        )}
                      </div>

                      {/* Password */}
                      <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                          Password*
                        </label>
                        <input
                          type="password"
                          id="password"
                          name="password"
                          value={formData.password}
                          onChange={handleChange}
                          className={`w-full px-4 py-2 border rounded-md focus:ring-primary-500 focus:border-primary-500 ${errors.password ? 'border-red-500' : 'border-gray-300'
                            }`}
                          placeholder="Create a strong password"
                        />
                        {errors.password && (
                          <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                        )}
                      </div>

                      {/* Confirm Password */}
                      <div>
                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                          Confirm Password*
                        </label>
                        <input
                          type="password"
                          id="confirmPassword"
                          name="confirmPassword"
                          value={formData.confirmPassword}
                          onChange={handleChange}
                          className={`w-full px-4 py-2 border rounded-md focus:ring-primary-500 focus:border-primary-500 ${errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                            }`}
                          placeholder="Confirm your password"
                        />
                        {errors.confirmPassword && (
                          <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
                        )}
                      </div>

                      {/* OTP Section */}
                      <div className="space-y-2">
                        {!otpSent ? (
                          <button
                            type="button"
                            onClick={handleSendOtp}
                            className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md"
                          >
                            Send OTP
                          </button>
                        ) : (
                          <>
                            <input
                              type="text"
                              value={otp}
                              onChange={(e) => setOtp(e.target.value)}
                              placeholder="Enter OTP"
                              className="w-full px-4 py-2 border rounded-md border-gray-300 focus:ring-primary-500 focus:border-primary-500"
                            />
                            <button
                              type="button"
                              onClick={handleVerifyOtp}
                              className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md"
                            >
                              Verify OTP
                            </button>
                            {otpVerified && (
                              <p className="text-green-600 text-sm mt-1">✅ OTP Verified</p>
                            )}
                            {otpError && (
                              <p className="text-red-600 text-sm mt-1">{otpError}</p>
                            )}
                          </>
                        )}
                      </div>

                      {/* Terms */}
                      <div className="flex items-start mt-6">
                        <input
                          id="agreeTerms"
                          name="agreeTerms"
                          type="checkbox"
                          checked={formData.agreeTerms}
                          onChange={handleChange}
                          className="w-4 h-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                        <label htmlFor="agreeTerms" className="ml-3 text-sm text-gray-700">
                          I agree to the <a href="#" className="text-primary-600">Terms</a> & <a href="#" className="text-primary-600">Privacy Policy</a>
                        </label>
                      </div>
                    </div>
                  </motion.div>
                )}


                {/* Navigation Buttons */}
                <div className="mt-8 flex justify-between">
                  {step > 1 && (
                    <button
                      type="button"
                      onClick={handlePrevStep}
                      className="bg-white border border-gray-300 text-gray-700 font-medium py-2 px-6 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      Back
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleNextStep}
                    disabled={isSubmitting || (step === 4 && !otpVerified)} // disable if OTP not verified
                    className={`ml-auto bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-6 rounded-md transition-colors ${step === 4 ? 'w-full' : ''
                      } ${isSubmitting || (step === 4 && !otpVerified) ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {isSubmitting ? 'Submitting...' : (step < 4 ? 'Next' : 'Submit Registration')}
                  </button>

                </div>
              </>
            )}

            {/* Sign in link */}
            {!isFormSubmitted && (
              <div className="mt-6 text-center text-gray-600">
                Already have an account? <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">Sign in</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;