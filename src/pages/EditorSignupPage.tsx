import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Phone, Lock, Video, Clock, FileText, Globe } from 'lucide-react';
import { editorService, otpService } from '../services/api';

interface FormData {
  fullName: string;
  email: string;
  phone: string;
  role: string;
  yearsExperience: string;
  primarySkills: string;
  specialization: string;
  portfolioUrl: string;
  timeZone: string;
  governmentIdUrl: string;
  taxGstNumber: string;
  password: string;
  confirmPassword: string;
  agreeTerms: boolean;
}

interface FormErrors extends Omit<Partial<FormData>, 'agreeTerms'> {
  agreeTerms?: string;
  submit?: string;
}

const EditorSignupPage: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    email: '',
    phone: '',
    role: '',
    yearsExperience: '',
    primarySkills: '',
    specialization: '',
    portfolioUrl: '',
    timeZone: '',
    governmentIdUrl: '',
    taxGstNumber: '',
    password: '',
    confirmPassword: '',
    agreeTerms: false
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [step, setStep] = useState<number>(1);
  const [success, setSuccess] = useState<string | null>(null);
  // ✅ OTP states
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpError, setOtpError] = useState('');


  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Editor Sign Up - HMX FPV Tours';
  }, []);

  const editorRoles = [
    'Video Editor',
    'Motion Graphics Designer',
    'Animator',
    'Color Grader',
    'Sound Designer',
    'VFX Artist',
    'Post-Production Supervisor'
  ];

  const skillOptions = [
    'Adobe Premiere Pro',
    'Adobe After Effects',
    'DaVinci Resolve',
    'Final Cut Pro',
    'CapCut',
    'Adobe Photoshop',
    'Adobe Illustrator',
    'Cinema 4D',
    'Blender',
    'Avid Media Composer'
  ];

  const specializationOptions = [
    'Short Films',
    'Social Media Content',
    'Corporate Videos',
    'Music Videos',
    'Documentaries',
    'Commercials',
    'Wedding Videos',
    'Real Estate Videos',
    'Drone/FPV Footage',
    'Live Event Coverage'
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }

    // Clear error when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const validateStep1 = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid';
    if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';
    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.role) newErrors.role = 'Role is required';
    if (!formData.yearsExperience) newErrors.yearsExperience = 'Years of experience is required';
    else if (isNaN(Number(formData.yearsExperience)) || Number(formData.yearsExperience) < 0) {
      newErrors.yearsExperience = 'Please enter a valid number';
    }
    if (!formData.primarySkills.trim()) newErrors.primarySkills = 'Primary skills are required';
    if (!formData.specialization.trim()) newErrors.specialization = 'Specialization is required';
    if (!formData.agreeTerms) newErrors.agreeTerms = 'You must agree to the terms and conditions';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateStep2()) return;

    try {
      const applicationData = {
        full_name: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        role: formData.role,
        years_experience: formData.yearsExperience,
        primary_skills: formData.primarySkills,
        specialization: formData.specialization,
        portfolio_url: formData.portfolioUrl,
        time_zone: formData.timeZone,
        government_id_url: formData.governmentIdUrl,
        tax_gst_number: formData.taxGstNumber,
        password: formData.password
      };
      await editorService.register(applicationData);
      setSuccess('Application submitted successfully! Redirecting to login...');
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 2000);

      setFormData({
        fullName: '',
        email: '',
        phone: '',
        role: '',
        yearsExperience: '',
        primarySkills: '',
        specialization: '',
        portfolioUrl: '',
        timeZone: '',
        governmentIdUrl: '',
        taxGstNumber: '',
        password: '',
        confirmPassword: '',
        agreeTerms: false
      });
      window.scrollTo(0, 0);
    } catch (err: any) {
      console.error('Error registering editor:', err);
      setErrors({
        ...errors,
        submit: err.response?.data?.message || 'Failed to submit application. Please try again.'
      });
    }
  };

  const handleNextStep = () => {
    if (step === 1 && validateStep1()) {
      requestOtp();
    } else if (step === 2) {
      handleSubmit();
    }
  };


  if (success) {
    return (
      <div className="min-h-screen pt-20 pb-16 bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Success!</h2>
          <p className="text-gray-600 mb-4">{success}</p>
        </div>
      </div>
    );
  }
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
        <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-primary-900 text-white p-8">
            <h1 className="text-3xl font-bold mb-2">Join Our Editor Network</h1>
            <p className="text-gray-200">Step {step} of 2: {step === 1 ? 'Personal Information' : 'Professional Details'}</p>
          </div>

          {/* Progress Bar */}
          <div className="bg-gray-200 h-2">
            <div
              className="bg-primary-600 h-2 transition-all duration-300"
              style={{ width: `${(step / 2) * 100}%` }}
            />
          </div>

          {/* Form Content */}
          <div className="p-8">
            <h2 className="text-2xl font-bold mb-6 text-primary-900">
              {step === 1 ? 'Personal Information' : 'Professional Details'}
            </h2>

            <form>
              {step === 1 && (
                <div className="space-y-5">
                  {/* Full Name */}
                  <div>
                    <label className="block font-semibold mb-1">Full Name*</label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 text-gray-400" size={18} />
                      <input
                        type="text"
                        name="fullName"
                        placeholder="Your full name"
                        value={formData.fullName}
                        onChange={handleChange}
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    {errors.fullName && <div className="text-red-500 text-sm mt-1">{errors.fullName}</div>}
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block font-semibold mb-1">Email Address*</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 text-gray-400" size={18} />
                      <input
                        type="email"
                        name="email"
                        placeholder="Your email address"
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    {errors.email && <div className="text-red-500 text-sm mt-1">{errors.email}</div>}
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block font-semibold mb-1">Phone Number*</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 text-gray-400" size={18} />
                      <input
                        type="text"
                        name="phone"
                        placeholder="Your phone number"
                        value={formData.phone}
                        onChange={handleChange}
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    {errors.phone && <div className="text-red-500 text-sm mt-1">{errors.phone}</div>}
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block font-semibold mb-1">Password*</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
                      <input
                        type="password"
                        name="password"
                        placeholder="Create a password"
                        value={formData.password}
                        onChange={handleChange}
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    {errors.password && <div className="text-red-500 text-sm mt-1">{errors.password}</div>}
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block font-semibold mb-1">Confirm Password*</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
                      <input
                        type="password"
                        name="confirmPassword"
                        placeholder="Confirm your password"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    {errors.confirmPassword && <div className="text-red-500 text-sm mt-1">{errors.confirmPassword}</div>}
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
              )}

              {step === 2 && (
                <div className="space-y-5">
                  {/* Role */}
                  <div>
                    <label className="block font-semibold mb-1">Role*</label>
                    <div className="relative">
                      <Video className="absolute left-3 top-3 text-gray-400" size={18} />
                      <select
                        name="role"
                        value={formData.role}
                        onChange={handleChange}
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      >
                        <option value="">Select your role</option>
                        {editorRoles.map(role => (
                          <option key={role} value={role}>{role}</option>
                        ))}
                      </select>
                    </div>
                    {errors.role && <div className="text-red-500 text-sm mt-1">{errors.role}</div>}
                  </div>

                  {/* Years of Experience */}
                  <div>
                    <label className="block font-semibold mb-1">Years of Experience*</label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-3 text-gray-400" size={18} />
                      <input
                        type="number"
                        name="yearsExperience"
                        placeholder="e.g., 3"
                        value={formData.yearsExperience}
                        onChange={handleChange}
                        min="0"
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    {errors.yearsExperience && <div className="text-red-500 text-sm mt-1">{errors.yearsExperience}</div>}
                  </div>

                  {/* Primary Skills */}
                  <div>
                    <label className="block font-semibold mb-1">Primary Skills*</label>
                    <textarea
                      name="primarySkills"
                      value={formData.primarySkills}
                      onChange={handleChange}
                      rows={3}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="List your primary skills (e.g., Adobe Premiere Pro, After Effects, DaVinci Resolve)"
                    ></textarea>
                    <div className="text-sm text-gray-500 mt-1">
                      Suggested: {skillOptions.join(', ')}
                    </div>
                    {errors.primarySkills && <div className="text-red-500 text-sm mt-1">{errors.primarySkills}</div>}
                  </div>

                  {/* Specialization */}
                  <div>
                    <label className="block font-semibold mb-1">Specialization*</label>
                    <textarea
                      name="specialization"
                      value={formData.specialization}
                      onChange={handleChange}
                      rows={3}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Describe your specialization (e.g., Short films, Social media content, Corporate videos)"
                    ></textarea>
                    <div className="text-sm text-gray-500 mt-1">
                      Examples: {specializationOptions.join(', ')}
                    </div>
                    {errors.specialization && <div className="text-red-500 text-sm mt-1">{errors.specialization}</div>}
                  </div>

                  {/* Portfolio URL */}
                  <div>
                    <label className="block font-semibold mb-1">Portfolio / Showreel Link</label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-3 text-gray-400" size={18} />
                      <input
                        type="url"
                        name="portfolioUrl"
                        placeholder="YouTube, Vimeo, Google Drive, etc."
                        value={formData.portfolioUrl}
                        onChange={handleChange}
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    {errors.portfolioUrl && <div className="text-red-500 text-sm mt-1">{errors.portfolioUrl}</div>}
                  </div>

                  {/* Time Zone */}
                  <div>
                    <label className="block font-semibold mb-1">Time Zone</label>
                    <input
                      type="text"
                      name="timeZone"
                      placeholder="e.g., IST, EST, PST"
                      value={formData.timeZone}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                    {errors.timeZone && <div className="text-red-500 text-sm mt-1">{errors.timeZone}</div>}
                  </div>

                  {/* Government ID Upload */}
                  <div>
                    <label className="block font-semibold mb-1">Government ID Link</label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-3 text-gray-400" size={18} />
                      <input
                        type="url"
                        name="governmentIdUrl"
                        placeholder="Link to uploaded government ID (Google Drive, etc.)"
                        value={formData.governmentIdUrl}
                        onChange={handleChange}
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      For identity verification purposes
                    </div>
                    {errors.governmentIdUrl && <div className="text-red-500 text-sm mt-1">{errors.governmentIdUrl}</div>}
                  </div>

                  {/* Tax/GST Number */}
                  <div>
                    <label className="block font-semibold mb-1">Tax / GST Number</label>
                    <input
                      type="text"
                      name="taxGstNumber"
                      placeholder="If applicable for payments"
                      value={formData.taxGstNumber}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                    {errors.taxGstNumber && <div className="text-red-500 text-sm mt-1">{errors.taxGstNumber}</div>}
                  </div>

                  {/* Terms and Conditions */}
                  <div className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      id="agreeTerms"
                      name="agreeTerms"
                      checked={formData.agreeTerms}
                      onChange={handleChange}
                      className="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <label htmlFor="agreeTerms" className="text-sm text-gray-700">
                      I agree to the{' '}
                      <a href="/terms" className="text-primary-600 hover:text-primary-500">
                        Terms and Conditions
                      </a>{' '}
                      and{' '}
                      <a href="/privacy" className="text-primary-600 hover:text-primary-500">
                        Privacy Policy
                      </a>
                    </label>
                  </div>
                  {errors.agreeTerms && <div className="text-red-500 text-sm mt-1">{errors.agreeTerms}</div>}
                </div>
              )}

              {/* Submit Error */}
              {errors.submit && (
                <div className="mb-6 p-4 bg-red-100 text-red-800 rounded-lg text-center font-semibold">
                  {errors.submit}
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="mt-8 flex justify-between">
                {step > 1 && (
                  <button
                    type="button"
                    onClick={() => setStep(step - 1)}
                    className="bg-white border border-gray-300 text-gray-700 font-medium py-2 px-6 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Back
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (step === 1) {
                      if (otpVerified) {
                        setStep(2); // allow next only if OTP verified
                      } else {
                        setOtpError('Please verify OTP before continuing');
                      }
                    } else {
                      handleNextStep(); // step 2 -> submit application
                    }
                  }}
                  className={`ml-auto bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-6 rounded-md transition-colors ${step === 2 ? 'w-full' : ''}`}
                >
                  {step === 1 ? 'Next' : 'Submit Application'}
                </button>

              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditorSignupPage;
