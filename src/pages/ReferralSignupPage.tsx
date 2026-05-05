import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';
import { referralService, otpService } from '../services/api';

interface FormData {
  name: string;
  email: string;
  phone: string;
  city: string;
  category: string;
  password: string;
  referralSource: string;
  businessTypes: string;
  message: string;
  agreeTerms: boolean | string;
}

const ReferralSignupPage: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<FormData>({
  name: '',
  email: '',
  phone: '',
  city: '',
  category: '',
  password: '',
  referralSource: '',
  businessTypes: '',
  message: '',
  agreeTerms: false,
  });

  interface Errors extends Partial<FormData> {
    submit?: string;
  }

  const [errors, setErrors] = useState<Errors>({});
  const [step, setStep] = useState<number>(1);
  const [isFormSubmitted, setIsFormSubmitted] = useState<boolean>(false);
  const [referralLink, setReferralLink] = useState<string | null>(null);
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpError, setOtpError] = useState('');


  useEffect(() => {
    // Scroll to top on page load
    window.scrollTo(0, 0);

    // Update page title
    document.title = 'Referral Partner Sign Up - HMX FPV Tours';
  }, []);

  const validateStep1 = (): boolean => {
    const newErrors: Partial<FormData> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    }

    if (!formData.city.trim()) {
      newErrors.city = 'City is required';
    }

    if (!formData.category) {
      newErrors.category = 'Please select your category';
    }
    if (!formData.password || formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = (): boolean => {
    const newErrors: Partial<FormData> = {};

    if (!formData.referralSource.trim()) {
      newErrors.referralSource = 'Please tell us how you heard about us';
    }

    if (!formData.businessTypes.trim()) {
      newErrors.businessTypes = 'Please specify business types you can refer';
    }

    if (!formData.agreeTerms) {
      newErrors.agreeTerms = 'You must confirm understanding of referral responsibilities';
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

  const handleNextStep = async () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      try {
        // Register referral and receive referral link
        const result = await referralService.register({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          city: formData.city,
          category: formData.category,
          password: formData.password,
          referral_source: formData.referralSource,
          business_types: formData.businessTypes,
          message: formData.message
        });

        if (result?.referral_link) {
          setReferralLink(result.referral_link);
          setIsFormSubmitted(true);
          // Don't redirect - keep user on success page
          // setTimeout(() => {
          //   navigate('/referral', { replace: true });
          // }, 4000);
        }
      } catch (err: any) {
        setErrors({
          ...errors,
          submit: err?.response?.data?.message || 'Failed to submit referral application'
        });
      }
    }
  };

  const handlePrevStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const referralSources = [
    'Social Media',
    'Search Engine',
    'Friend or Colleague',
    'Industry Event',
    'Online Advertisement',
    'Blog or Article',
    'Other'
  ];
  const requestOtp = async () => {
    try {
      const res = await otpService.requestOtp({ email: formData.email });
      if (res.success) {
        setOtpSent(true);
        setOtpError('');
        alert('OTP sent to your email!');
      }
    } catch (err: any) {
      setOtpError(err.response?.data?.error || 'Failed to send OTP');
    }
  };

  const verifyOtp = async () => {
    try {
      const res = await otpService.verifyOtp({ email: formData.email, otp });
      if (res.success) {
        setOtpVerified(true);
        setOtpError('');
        alert('OTP Verified! You can continue.');
      }
    } catch (err: any) {
      setOtpError(err.response?.data?.error || 'Invalid OTP');
    }
  };
  return (
    <div className="min-h-screen pt-20 pb-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-primary-900 text-white p-8">
            <h1 className="text-3xl font-heading font-bold mb-2">
              {isFormSubmitted
                ? 'Referral Partner Application Submitted!'
                : 'Become a HMX Referral Partner'}
            </h1>
            <p className="text-gray-200">
              {isFormSubmitted
                ? 'Thank you for applying to join our referral partner program.'
                : 'Join our referral program and earn generous commissions by connecting businesses with our FPV virtual tour services.'}
            </p>
          </div>

          {/* Form Content */}
          <div className="p-8">
            {isFormSubmitted ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-center py-8"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-6">
                  <CheckCircle size={32} className="text-green-600" />
                </div>

                <h2 className="text-2xl font-heading font-semibold text-primary-900 mb-4">
                  Your Application Has Been Received!
                </h2>

                <p className="text-gray-700 mb-6">
                  Thanks for your interest in becoming a HMX referral partner. Your application is now pending admin approval.
                </p>

                <div className="bg-primary-50 rounded-lg p-6 text-left mb-8">
                  <h3 className="text-lg font-medium text-primary-900 mb-3">Your Unique Referral Link</h3>
                  <div className="mb-4">
                    <span className="bg-gray-100 px-4 py-2 rounded text-primary-900 font-mono select-all">
                      {referralLink ? referralLink : '(Referral link will appear here)'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    This link will be activated once your application is approved by our admin team.
                  </p>
                  <ol className="list-decimal pl-5 space-y-2 text-gray-700">
                    <li>Our admin team will review your application within 1-2 business days</li>
                    <li>Once approved, you can start sharing your referral link</li>
                    <li>Track your referrals and earnings in your dashboard</li>
                  </ol>
                </div>

                <Link
                  to="/"
                  className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-3 rounded-md font-medium transition-colors inline-block"
                >
                  Return to Home
                </Link>
              </motion.div>
            ) : (
              <>
                {/* Progress Steps */}
                <div className="flex items-center mb-8">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-medium ${step >= 1 ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-600'
                    }`}>
                    1
                  </div>
                  <div className={`flex-1 h-1 mx-2 ${step >= 2 ? 'bg-primary-600' : 'bg-gray-200'}`}></div>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-medium ${step >= 2 ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-600'
                    }`}>
                    2
                  </div>
                </div>

                {/* Step 1: Personal Information */}
                {step === 1 && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <h2 className="text-2xl font-heading font-semibold text-primary-900 mb-6">
                      Contact Information
                    </h2>

                    <div className="space-y-4">
                      <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                          Full Name*
                        </label>
                        <input
                          type="text"
                          id="name"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          className={`w-full px-4 py-2 border rounded-md focus:ring-primary-500 focus:border-primary-500 ${errors.name ? 'border-red-500' : 'border-gray-300'
                            }`}
                          placeholder="Your full name"
                        />
                        {errors.name && (
                          <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                          Email Address*
                        </label>
                        <input
                          type="email"
                          id="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          className={`w-full px-4 py-2 border rounded-md focus:ring-primary-500 focus:border-primary-500 ${errors.email ? 'border-red-500' : 'border-gray-300'
                            }`}
                          placeholder="Your email"
                        />
                        {errors.email && (
                          <p className="mt-1 text-sm text-red-600">{errors.email}</p>
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
                          placeholder="Your phone number"
                        />
                        {errors.phone && (
                          <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                          City*
                        </label>
                        <input
                          type="text"
                          id="city"
                          name="city"
                          value={formData.city}
                          onChange={handleChange}
                          className={`w-full px-4 py-2 border rounded-md focus:ring-primary-500 focus:border-primary-500 ${errors.city ? 'border-red-500' : 'border-gray-300'
                            }`}
                          placeholder="Your city of residence"
                        />
                        {errors.city && (
                          <p className="mt-1 text-sm text-red-600">{errors.city}</p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                          Category*
                        </label>
                        <select
                          id="category"
                          name="category"
                          value={formData.category}
                          onChange={handleChange}
                          className={`w-full px-4 py-2 border rounded-md focus:ring-primary-500 focus:border-primary-500 ${errors.category ? 'border-red-500' : 'border-gray-300'}`}
                        >
                          <option value="">Select category</option>
                          <option value="individual">Individual</option>
                          <option value="influencer">Influencer</option>
                          <option value="business">Business</option>
                        </select>
                        {errors.category && (
                          <p className="mt-1 text-sm text-red-600">{errors.category}</p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                          Password*
                        </label>
                        <input
                          type="password"
                          id="password"
                          name="password"
                          value={(formData as any).password || ''}
                          onChange={handleChange}
                          className="w-full px-4 py-2 border rounded-md focus:ring-primary-500 focus:border-primary-500"
                          placeholder="Create a password (min 6 chars)"
                        />
                      </div>

                      {/* OTP Section */}
                      <div>
                        {!otpSent ? (
                          <button
                            type="button"
                            onClick={requestOtp}
                            disabled={!formData.email}
                            className="mt-2 bg-primary-600 text-white px-4 py-2 rounded disabled:opacity-50"
                          >
                            Send OTP
                          </button>
                        ) : !otpVerified && (
                          <div>
                            <label className="block font-semibold mb-1">Enter OTP*</label>
                            <input
                              type="text"
                              value={otp}
                              onChange={(e) => setOtp(e.target.value)}
                              placeholder="Enter the 6-digit OTP"
                              className="w-full border rounded-lg px-4 py-2"
                            />
                            <button
                              type="button"
                              onClick={verifyOtp}
                              className="mt-2 bg-primary-600 text-white px-4 py-2 rounded"
                            >
                              Verify OTP
                            </button>
                            {otpError && <div className="text-red-500 text-sm mt-1">{otpError}</div>}
                          </div>
                        )}
                        {otpVerified && (
                          <div className="text-green-600 font-semibold"> OTP Verified</div>
                        )}
                      </div>

                    </div>
                  </motion.div>
                )}

                {/* Step 2: Referral Details */}
                {step === 2 && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <h2 className="text-2xl font-heading font-semibold text-primary-900 mb-6">
                      Referral Information
                    </h2>

                    <div className="space-y-4">
                      <div>
                        <label htmlFor="referralSource" className="block text-sm font-medium text-gray-700 mb-1">
                          How did you hear about us?*
                        </label>
                        <select
                          id="referralSource"
                          name="referralSource"
                          value={formData.referralSource}
                          onChange={handleChange}
                          className={`w-full px-4 py-2 border rounded-md focus:ring-primary-500 focus:border-primary-500 ${errors.referralSource ? 'border-red-500' : 'border-gray-300'
                            }`}
                        >
                          <option value="">Select an option</option>
                          {referralSources.map((source, index) => (
                            <option key={index} value={source}>{source}</option>
                          ))}
                        </select>
                        {errors.referralSource && (
                          <p className="mt-1 text-sm text-red-600">{errors.referralSource}</p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="businessTypes" className="block text-sm font-medium text-gray-700 mb-1">
                          Types of businesses you can refer*
                        </label>
                        <textarea
                          id="businessTypes"
                          name="businessTypes"
                          value={formData.businessTypes}
                          onChange={handleChange}
                          rows={3}
                          className={`w-full px-4 py-2 border rounded-md focus:ring-primary-500 focus:border-primary-500 ${errors.businessTypes ? 'border-red-500' : 'border-gray-300'
                            }`}
                          placeholder="E.g., Retail stores, restaurants, real estate agencies, etc."
                        ></textarea>
                        {errors.businessTypes && (
                          <p className="mt-1 text-sm text-red-600">{errors.businessTypes}</p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                          Additional Information (Optional)
                        </label>
                        <textarea
                          id="message"
                          name="message"
                          value={formData.message}
                          onChange={handleChange}
                          rows={3}
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                          placeholder="Tell us about your network or any other information you'd like to share"
                        ></textarea>
                      </div>

                      <div className="mt-6 bg-primary-50 p-4 rounded-lg">
                        <h3 className="text-lg font-medium text-primary-900 mb-3">
                          Referral Program Benefits
                        </h3>
                        <ul className="space-y-2 mb-4">
                          <li className="flex items-start">
                            <CheckCircle className="text-primary-600 mr-2 mt-1 flex-shrink-0" size={16} />
                            <span className="text-gray-700">10-15% commission on all completed projects you refer</span>
                          </li>
                          <li className="flex items-start">
                            <CheckCircle className="text-primary-600 mr-2 mt-1 flex-shrink-0" size={16} />
                            <span className="text-gray-700">Bonus incentives for high-volume referrers</span>
                          </li>
                          <li className="flex items-start">
                            <CheckCircle className="text-primary-600 mr-2 mt-1 flex-shrink-0" size={16} />
                            <span className="text-gray-700">Monthly payments via direct deposit or PayPal</span>
                          </li>
                          <li className="flex items-start">
                            <CheckCircle className="text-primary-600 mr-2 mt-1 flex-shrink-0" size={16} />
                            <span className="text-gray-700">Transparent tracking dashboard for all your referrals</span>
                          </li>
                        </ul>

                        <div className="flex items-start">
                          <div className="flex items-center h-5">
                            <input
                              id="agreeTerms"
                              name="agreeTerms"
                              type="checkbox"
                              checked={!!formData.agreeTerms}
                              onChange={handleChange}
                              className="w-4 h-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                            />
                          </div>
                          <div className="ml-3 text-sm">
                            <label htmlFor="agreeTerms" className={`font-medium ${errors.agreeTerms ? 'text-red-600' : 'text-gray-700'}`}>
                              I understand the referral process and agree to the <a href="#" className="text-primary-600 hover:text-primary-700">Referral Terms</a>
                            </label>
                            {errors.agreeTerms && (
                              <p className="mt-1 text-sm text-red-600">{errors.agreeTerms}</p>
                            )}
                          </div>
                        </div>
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
                    className={`ml-auto bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-6 rounded-md transition-colors ${step === 2 ? 'w-full' : ''
                      }`}
                  >
                    {step === 1 ? 'Next' : 'Submit Application'}
                  </button>
                </div>

                {errors.submit && (
                  <p className="mt-4 text-sm text-red-600 text-center">{errors.submit}</p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReferralSignupPage;