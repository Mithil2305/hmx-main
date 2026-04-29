import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Phone, Lock, Calendar, MapPin, FileText, Camera, Shield } from 'lucide-react';
import { pilotService } from '../services/api';
import { CITY_LIST as LOCAL_CITIES } from '../data/cities';
import axios from 'axios';
interface FormData {
  // Personal Details
  fullName: string;
  dateOfBirth: string;
  gender: string;
  address: string;
  phone: string;
  email: string;
  password: string;
  confirmPassword: string;

  // Identification & License Details
  governmentIdProof: string;
  licenseNumber: string;
  issuingAuthority: string;
  licenseIssueDate: string;
  licenseExpiryDate: string;

  // Drone Details
  droneModel: string;
  droneSerial: string;
  droneUin: string;
  droneCategory: string;

  // Experience & Insurance
  totalFlyingHours: string;
  flightRecords: string;
  insurancePolicy: string;
  insuranceValidity: string;
  cities: string[];
  experience: string;
  equipment: string;
  portfolio: string;
  bankAccount: string;

  // Document Uploads
  pilotLicenseUrl: string;
  idProofUrl: string;
  trainingCertificateUrl: string;
  photographUrl: string;
  insuranceCertificateUrl: string;

  agreeTerms: boolean;
}

interface FormErrors extends Omit<Partial<FormData>, 'cities' | 'agreeTerms'> {
  cities?: string;
  agreeTerms?: string;
  submit?: string;
}

const PilotSignupPage: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<FormData>({
    // Personal Details
    fullName: '',
    dateOfBirth: '',
    gender: '',
    address: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',

    // Identification & License Details
    governmentIdProof: '',
    licenseNumber: '',
    issuingAuthority: '',
    licenseIssueDate: '',
    licenseExpiryDate: '',

    // Drone Details
    droneModel: '',
    droneSerial: '',
    droneUin: '',
    droneCategory: '',

    // Experience & Insurance
    totalFlyingHours: '',
    flightRecords: '',
    insurancePolicy: '',
    insuranceValidity: '',
    cities: [],
    experience: '',
    equipment: '',
    portfolio: '',
    bankAccount: '',

    // Document Uploads
    pilotLicenseUrl: '',
    idProofUrl: '',
    trainingCertificateUrl: '',
    photographUrl: '',
    insuranceCertificateUrl: '',

    agreeTerms: false
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [step, setStep] = useState<number>(1);
  const [cities, setCities] = useState<string[]>([]);
  const [success, setSuccess] = useState<string | null>(null);
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpError, setOtpError] = useState('');


  const genderOptions = ['Male', 'Female', 'Other', 'Prefer not to say'];
  const droneCategories = ['Nano', 'Micro', 'Small', 'Medium', 'Large'];
  const issuingAuthorities = ['DGCA (India)', 'FAA (USA)', 'EASA (Europe)', 'CASA (Australia)', 'Other'];
  const idProofTypes = ['Aadhaar Card', 'Passport', 'Driving License', 'Voter ID', 'PAN Card', 'Other'];

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Pilot Sign Up - HMX FPV Tours';

    const fetchCities = async () => {
      try {
        setCities(LOCAL_CITIES);
      } catch (error) {
        console.error('Error loading cities:', error);
        setCities(['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 'Hyderabad', 'Pune', 'Ahmedabad']);
      }
    };
    fetchCities();
  }, []);

  // Step 1: Personal Details
  const validateStep1 = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }

    if (!formData.dateOfBirth) {
      newErrors.dateOfBirth = 'Date of birth is required';
    } else {
      const birthDate = new Date(formData.dateOfBirth);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      if (age < 18) {
        newErrors.dateOfBirth = 'Must be at least 18 years old';
      }
    }

    if (!formData.gender) {
      newErrors.gender = 'Gender is required';
    }

    if (!formData.address.trim()) {
      newErrors.address = 'Address is required';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Step 2: Identification & License Details
  const validateStep2 = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.governmentIdProof) {
      newErrors.governmentIdProof = 'Government ID proof type is required';
    }

    if (!formData.licenseNumber.trim()) {
      newErrors.licenseNumber = 'Drone pilot license number is required';
    }

    if (!formData.issuingAuthority) {
      newErrors.issuingAuthority = 'Issuing authority is required';
    }

    if (!formData.licenseIssueDate) {
      newErrors.licenseIssueDate = 'License issue date is required';
    }

    if (!formData.licenseExpiryDate) {
      newErrors.licenseExpiryDate = 'License expiry date is required';
    } else if (new Date(formData.licenseExpiryDate) <= new Date()) {
      newErrors.licenseExpiryDate = 'License must not be expired';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Step 3: Drone Details (Optional)
  const validateStep3 = (): boolean => {
    const newErrors: FormErrors = {};

    // All drone fields are optional, but if one is filled, validate format
    if (formData.droneModel && !formData.droneSerial) {
      newErrors.droneSerial = 'Drone serial number is required when model is provided';
    }

    if (formData.droneSerial && !formData.droneModel) {
      newErrors.droneModel = 'Drone model is required when serial number is provided';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Step 4: Experience & Insurance
  const validateStep4 = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.totalFlyingHours) {
      newErrors.totalFlyingHours = 'Total flying hours is required';
    } else if (isNaN(Number(formData.totalFlyingHours)) || Number(formData.totalFlyingHours) < 0) {
      newErrors.totalFlyingHours = 'Please enter a valid number of hours';
    }

    if (formData.cities.length === 0) {
      newErrors.cities = 'Please select at least one city';
    } else if (formData.cities.length > 2) {
      newErrors.cities = 'Please select maximum 2 cities';
    }

    if (!formData.experience.trim()) {
      newErrors.experience = 'Please describe your experience';
    }

    if (!formData.equipment.trim()) {
      newErrors.equipment = 'Please describe your equipment';
    }

    if (!formData.bankAccount.trim()) {
      newErrors.bankAccount = 'Bank account number is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Step 5: Document Uploads & Terms
  const validateStep5 = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.pilotLicenseUrl.trim()) {
      newErrors.pilotLicenseUrl = 'Pilot license document is required';
    } else if (!isValidUrl(formData.pilotLicenseUrl)) {
      newErrors.pilotLicenseUrl = 'Please enter a valid URL';
    }

    if (!formData.idProofUrl.trim()) {
      newErrors.idProofUrl = 'ID proof document is required';
    } else if (!isValidUrl(formData.idProofUrl)) {
      newErrors.idProofUrl = 'Please enter a valid URL';
    }

    if (!formData.photographUrl.trim()) {
      newErrors.photographUrl = 'Recent photograph is required';
    } else if (!isValidUrl(formData.photographUrl)) {
      newErrors.photographUrl = 'Please enter a valid URL';
    }

    if (!formData.agreeTerms) {
      newErrors.agreeTerms = 'You must agree to the terms and conditions';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

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

  const handleCityChange = (city: string) => {
    const updatedCities = formData.cities.includes(city)
      ? formData.cities.filter(c => c !== city)
      : formData.cities.length < 2
        ? [...formData.cities, city]
        : formData.cities;

    setFormData(prev => ({ ...prev, cities: updatedCities }));

    if (errors.cities) {
      setErrors(prev => ({ ...prev, cities: undefined }));
    }
  };
  const requestOtp = async () => {
    try {
      const res = await axios.post('/api/auth/request-otp', {
        email: formData.email,
        user_type: 'editor',
        user_data: formData
      });
      if (res.data.success) {
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
      const res = await axios.post('/api/auth/verify-otp', {
        email: formData.email,
        otp: otp
      });
      if (res.data.success) {
        setOtpVerified(true);
        setOtpError('');
        alert('OTP Verified! You can continue.');
      }
    } catch (err: any) {
      setOtpError(err.response?.data?.error || 'Invalid OTP');
    }
  };


  const handleSubmit = async () => {
    if (!validateStep5()) return;

    try {
      const applicationData = {
        name: formData.fullName,
        full_name: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        date_of_birth: formData.dateOfBirth,
        gender: formData.gender,
        address: formData.address,
        government_id_proof: formData.governmentIdProof,
        license_number: formData.licenseNumber,
        issuing_authority: formData.issuingAuthority,
        license_issue_date: formData.licenseIssueDate,
        license_expiry_date: formData.licenseExpiryDate,
        drone_model: formData.droneModel,
        drone_serial: formData.droneSerial,
        drone_uin: formData.droneUin,
        drone_category: formData.droneCategory,
        total_flying_hours: formData.totalFlyingHours,
        flight_records: formData.flightRecords,
        insurance_policy: formData.insurancePolicy,
        insurance_validity: formData.insuranceValidity,
        pilot_license_url: formData.pilotLicenseUrl,
        id_proof_url: formData.idProofUrl,
        training_certificate_url: formData.trainingCertificateUrl,
        photograph_url: formData.photographUrl,
        insurance_certificate_url: formData.insuranceCertificateUrl,
        cities: formData.cities.join(', '),
        experience: formData.experience,
        equipment: formData.equipment,
        portfolio_url: formData.portfolio,
        bank_account: formData.bankAccount
      };

      setSuccess('Application submitted successfully! Redirecting to login...');
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 2000);

    } catch (err: any) {
      console.error('Error registering pilot:', err);
      setErrors({
        ...errors,
        submit: err.response?.data?.message || 'Failed to submit application. Please try again.'
      });
    }
  };

  const handleNextStep = () => {
    if (step === 1 && validateStep1()) {
      if (!otpVerified) {
        setOtpError('Please verify OTP before continuing');
        return;
      }
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      setStep(3);
    } else if (step === 3 && validateStep3()) {
      setStep(4);
    } else if (step === 4 && validateStep4()) {
      setStep(5);
    } else if (step === 5) {
      handleSubmit();
    }
  };


  const handlePrevStep = () => {
    if (step > 1) {
      setStep(step - 1);
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


  return (
    <div className="min-h-screen pt-20 pb-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-primary-900 text-white p-8">
            <h1 className="text-3xl font-bold mb-2">Join Our Pilot Network</h1>
            <p className="text-gray-200">Step {step} of 5: {
              step === 1 ? 'Personal Details' :
                step === 2 ? 'Identification & License' :
                  step === 3 ? 'Drone Details' :
                    step === 4 ? 'Experience & Insurance' :
                      'Document Uploads'
            }</p>
          </div>

          {/* Progress Bar */}
          <div className="bg-gray-200 h-2">
            <div
              className="bg-primary-600 h-2 transition-all duration-300"
              style={{ width: `${(step / 5) * 100}%` }}
            />
          </div>

          {/* Form Content */}
          <div className="p-8">
            <h2 className="text-2xl font-bold mb-6 text-primary-900">
              {step === 1 ? 'Personal Details' :
                step === 2 ? 'Identification & License Details' :
                  step === 3 ? 'Drone Details (Optional)' :
                    step === 4 ? 'Experience & Insurance' :
                      'Document Uploads & Agreement'}
            </h2>

            <form>
              {/* Step 1: Personal Details */}
              {step === 1 && (
                <div className="space-y-5">
                  {/* Full Name */}
                  <div>
                    <label className="block font-semibold mb-1">Full Name (as per ID)*</label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 text-gray-400" size={18} />
                      <input
                        type="text"
                        name="fullName"
                        placeholder="Your full name as per government ID"
                        value={formData.fullName}
                        onChange={handleChange}
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    {errors.fullName && <div className="text-red-500 text-sm mt-1">{errors.fullName}</div>}
                  </div>

                  {/* Date of Birth */}
                  <div>
                    <label className="block font-semibold mb-1">Date of Birth*</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-3 text-gray-400" size={18} />
                      <input
                        type="date"
                        name="dateOfBirth"
                        value={formData.dateOfBirth}
                        onChange={handleChange}
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    {errors.dateOfBirth && <div className="text-red-500 text-sm mt-1">{errors.dateOfBirth}</div>}
                  </div>

                  {/* Gender */}
                  <div>
                    <label className="block font-semibold mb-1">Gender*</label>
                    <select
                      name="gender"
                      value={formData.gender}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="">Select gender</option>
                      {genderOptions.map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                    {errors.gender && <div className="text-red-500 text-sm mt-1">{errors.gender}</div>}
                  </div>

                  {/* Address */}
                  <div>
                    <label className="block font-semibold mb-1">Address*</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 text-gray-400" size={18} />
                      <textarea
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        rows={3}
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        placeholder="Your complete address"
                      ></textarea>
                    </div>
                    {errors.address && <div className="text-red-500 text-sm mt-1">{errors.address}</div>}
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block font-semibold mb-1">Contact Number*</label>
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

                  {/* Email */}
                  <div>
                    <label className="block font-semibold mb-1">Email ID*</label>
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
                      <div className="text-green-600 font-semibold">OTP Verified</div>
                    )}
                  </div>

                </div>
              )}

              {/* Step 2: Identification & License Details */}
              {step === 2 && (
                <div className="space-y-5">
                  {/* Government ID Proof */}
                  <div>
                    <label className="block font-semibold mb-1">Government ID Proof*</label>
                    <select
                      name="governmentIdProof"
                      value={formData.governmentIdProof}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="">Select ID proof type</option>
                      {idProofTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                    {errors.governmentIdProof && <div className="text-red-500 text-sm mt-1">{errors.governmentIdProof}</div>}
                  </div>

                  {/* License Number */}
                  <div>
                    <label className="block font-semibold mb-1">Drone Pilot License Number / RPC*</label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-3 text-gray-400" size={18} />
                      <input
                        type="text"
                        name="licenseNumber"
                        placeholder="Your drone pilot license number"
                        value={formData.licenseNumber}
                        onChange={handleChange}
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    {errors.licenseNumber && <div className="text-red-500 text-sm mt-1">{errors.licenseNumber}</div>}
                  </div>

                  {/* Issuing Authority */}
                  <div>
                    <label className="block font-semibold mb-1">Issuing Authority*</label>
                    <select
                      name="issuingAuthority"
                      value={formData.issuingAuthority}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="">Select issuing authority</option>
                      {issuingAuthorities.map(authority => (
                        <option key={authority} value={authority}>{authority}</option>
                      ))}
                    </select>
                    {errors.issuingAuthority && <div className="text-red-500 text-sm mt-1">{errors.issuingAuthority}</div>}
                  </div>

                  {/* License Issue Date */}
                  <div>
                    <label className="block font-semibold mb-1">License Issue Date*</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-3 text-gray-400" size={18} />
                      <input
                        type="date"
                        name="licenseIssueDate"
                        value={formData.licenseIssueDate}
                        onChange={handleChange}
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    {errors.licenseIssueDate && <div className="text-red-500 text-sm mt-1">{errors.licenseIssueDate}</div>}
                  </div>

                  {/* License Expiry Date */}
                  <div>
                    <label className="block font-semibold mb-1">License Expiry Date*</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-3 text-gray-400" size={18} />
                      <input
                        type="date"
                        name="licenseExpiryDate"
                        value={formData.licenseExpiryDate}
                        onChange={handleChange}
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    {errors.licenseExpiryDate && <div className="text-red-500 text-sm mt-1">{errors.licenseExpiryDate}</div>}
                  </div>
                </div>
              )}

              {/* Step 3: Drone Details */}
              {step === 3 && (
                <div className="space-y-5">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <p className="text-blue-800 text-sm">
                      <strong>Note:</strong> This section is optional. Fill only if you own a drone.
                    </p>
                  </div>

                  {/* Drone Model */}
                  <div>
                    <label className="block font-semibold mb-1">Drone Model & Serial Number</label>
                    <input
                      type="text"
                      name="droneModel"
                      placeholder="e.g., DJI Mavic Air 2"
                      value={formData.droneModel}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                    {errors.droneModel && <div className="text-red-500 text-sm mt-1">{errors.droneModel}</div>}
                  </div>

                  {/* Drone Serial */}
                  <div>
                    <label className="block font-semibold mb-1">Drone Serial Number</label>
                    <input
                      type="text"
                      name="droneSerial"
                      placeholder="Serial number of your drone"
                      value={formData.droneSerial}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                    {errors.droneSerial && <div className="text-red-500 text-sm mt-1">{errors.droneSerial}</div>}
                  </div>

                  {/* Drone UIN */}
                  <div>
                    <label className="block font-semibold mb-1">Drone UIN (Unique Identification Number)</label>
                    <input
                      type="text"
                      name="droneUin"
                      placeholder="UIN if applicable"
                      value={formData.droneUin}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                    {errors.droneUin && <div className="text-red-500 text-sm mt-1">{errors.droneUin}</div>}
                  </div>

                  {/* Drone Category */}
                  <div>
                    <label className="block font-semibold mb-1">Category of Drone</label>
                    <select
                      name="droneCategory"
                      value={formData.droneCategory}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="">Select drone category</option>
                      {droneCategories.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                    {errors.droneCategory && <div className="text-red-500 text-sm mt-1">{errors.droneCategory}</div>}
                  </div>
                </div>
              )}

              {/* Step 4: Experience & Insurance */}
              {step === 4 && (
                <div className="space-y-5">
                  {/* Total Flying Hours */}
                  <div>
                    <label className="block font-semibold mb-1">Total Flying Hours*</label>
                    <input
                      type="number"
                      name="totalFlyingHours"
                      placeholder="Total hours of drone flying experience"
                      value={formData.totalFlyingHours}
                      onChange={handleChange}
                      min="0"
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                    {errors.totalFlyingHours && <div className="text-red-500 text-sm mt-1">{errors.totalFlyingHours}</div>}
                  </div>

                  {/* Flight Records */}
                  <div>
                    <label className="block font-semibold mb-1">Past Flight Records</label>
                    <textarea
                      name="flightRecords"
                      value={formData.flightRecords}
                      onChange={handleChange}
                      rows={3}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Describe your past flight records and notable projects"
                    ></textarea>
                    {errors.flightRecords && <div className="text-red-500 text-sm mt-1">{errors.flightRecords}</div>}
                  </div>

                  {/* Insurance Details */}
                  <div>
                    <label className="block font-semibold mb-1">Drone Insurance Policy Number</label>
                    <input
                      type="text"
                      name="insurancePolicy"
                      placeholder="Insurance policy number (if applicable)"
                      value={formData.insurancePolicy}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                    {errors.insurancePolicy && <div className="text-red-500 text-sm mt-1">{errors.insurancePolicy}</div>}
                  </div>

                  {/* Insurance Validity */}
                  <div>
                    <label className="block font-semibold mb-1">Insurance Validity</label>
                    <input
                      type="date"
                      name="insuranceValidity"
                      value={formData.insuranceValidity}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                    {errors.insuranceValidity && <div className="text-red-500 text-sm mt-1">{errors.insuranceValidity}</div>}
                  </div>

                  {/* Cities */}
                  <div>
                    <label className="block font-semibold mb-1">Preferred Cities (Select up to 2)*</label>
                    <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border rounded-lg p-3">
                      {cities.map((city) => (
                        <label key={city} className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.cities.includes(city)}
                            onChange={() => handleCityChange(city)}
                            disabled={!formData.cities.includes(city) && formData.cities.length >= 2}
                            className="rounded"
                          />
                          <span className="text-sm">{city}</span>
                        </label>
                      ))}
                    </div>
                    {errors.cities && <div className="text-red-500 text-sm mt-1">{errors.cities}</div>}
                  </div>

                  {/* Experience */}
                  <div>
                    <label className="block font-semibold mb-1">Experience Description*</label>
                    <textarea
                      name="experience"
                      value={formData.experience}
                      onChange={handleChange}
                      rows={4}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Describe your drone flying experience, types of projects, and expertise"
                    ></textarea>
                    {errors.experience && <div className="text-red-500 text-sm mt-1">{errors.experience}</div>}
                  </div>

                  {/* Equipment */}
                  <div>
                    <label className="block font-semibold mb-1">Equipment Details*</label>
                    <textarea
                      name="equipment"
                      value={formData.equipment}
                      onChange={handleChange}
                      rows={3}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="List your drones, cameras, and other equipment"
                    ></textarea>
                    {errors.equipment && <div className="text-red-500 text-sm mt-1">{errors.equipment}</div>}
                  </div>

                  {/* Portfolio */}
                  <div>
                    <label className="block font-semibold mb-1">Portfolio URL</label>
                    <input
                      type="url"
                      name="portfolio"
                      placeholder="Link to your portfolio or sample work"
                      value={formData.portfolio}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                    {errors.portfolio && <div className="text-red-500 text-sm mt-1">{errors.portfolio}</div>}
                  </div>

                  {/* Bank Account */}
                  <div>
                    <label className="block font-semibold mb-1">Bank Account Number*</label>
                    <input
                      type="text"
                      name="bankAccount"
                      placeholder="Your bank account number for payments"
                      value={formData.bankAccount}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                    {errors.bankAccount && <div className="text-red-500 text-sm mt-1">{errors.bankAccount}</div>}
                  </div>
                </div>
              )}

              {/* Step 5: Document Uploads & Agreement */}
              {step === 5 && (
                <div className="space-y-5">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                    <p className="text-yellow-800 text-sm">
                      <strong>Important:</strong> Please upload your documents to Google Drive or similar service and provide the shareable links below.
                    </p>
                  </div>

                  {/* Pilot License URL */}
                  <div>
                    <label className="block font-semibold mb-1">Pilot License / RPC Document*</label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-3 text-gray-400" size={18} />
                      <input
                        type="url"
                        name="pilotLicenseUrl"
                        placeholder="https://drive.google.com/..."
                        value={formData.pilotLicenseUrl}
                        onChange={handleChange}
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    {errors.pilotLicenseUrl && <div className="text-red-500 text-sm mt-1">{errors.pilotLicenseUrl}</div>}
                  </div>

                  {/* ID Proof URL */}
                  <div>
                    <label className="block font-semibold mb-1">ID Proof Document*</label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-3 text-gray-400" size={18} />
                      <input
                        type="url"
                        name="idProofUrl"
                        placeholder="https://drive.google.com/..."
                        value={formData.idProofUrl}
                        onChange={handleChange}
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    {errors.idProofUrl && <div className="text-red-500 text-sm mt-1">{errors.idProofUrl}</div>}
                  </div>

                  {/* Training Certificate URL */}
                  <div>
                    <label className="block font-semibold mb-1">Training Certificate</label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-3 text-gray-400" size={18} />
                      <input
                        type="url"
                        name="trainingCertificateUrl"
                        placeholder="https://drive.google.com/... (optional)"
                        value={formData.trainingCertificateUrl}
                        onChange={handleChange}
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    {errors.trainingCertificateUrl && <div className="text-red-500 text-sm mt-1">{errors.trainingCertificateUrl}</div>}
                  </div>

                  {/* Photograph URL */}
                  <div>
                    <label className="block font-semibold mb-1">Recent Photograph*</label>
                    <div className="relative">
                      <Camera className="absolute left-3 top-3 text-gray-400" size={18} />
                      <input
                        type="url"
                        name="photographUrl"
                        placeholder="https://drive.google.com/..."
                        value={formData.photographUrl}
                        onChange={handleChange}
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    {errors.photographUrl && <div className="text-red-500 text-sm mt-1">{errors.photographUrl}</div>}
                  </div>

                  {/* Insurance Certificate URL */}
                  <div>
                    <label className="block font-semibold mb-1">Insurance Certificate</label>
                    <div className="relative">
                      <Shield className="absolute left-3 top-3 text-gray-400" size={18} />
                      <input
                        type="url"
                        name="insuranceCertificateUrl"
                        placeholder="https://drive.google.com/... (if applicable)"
                        value={formData.insuranceCertificateUrl}
                        onChange={handleChange}
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    {errors.insuranceCertificateUrl && <div className="text-red-500 text-sm mt-1">{errors.insuranceCertificateUrl}</div>}
                  </div>

                  {/* Terms Agreement */}
                  <div className="border-t pt-6">
                    <label className="flex items-start space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        name="agreeTerms"
                        checked={formData.agreeTerms}
                        onChange={handleChange}
                        className="mt-1 rounded"
                      />
                      <span className="text-sm text-gray-700">
                        I agree to the <a href="/terms" className="text-primary-600 hover:underline">Terms and Conditions</a> and
                        <a href="/privacy" className="text-primary-600 hover:underline ml-1">Privacy Policy</a>.
                        I confirm that all information provided is accurate and I have the necessary licenses and permissions to operate drones commercially.
                      </span>
                    </label>
                    {errors.agreeTerms && <div className="text-red-500 text-sm mt-1">{errors.agreeTerms}</div>}
                  </div>
                </div>
              )}

              {/* Error Message */}
              {errors.submit && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                  <p className="text-red-800 text-sm">{errors.submit}</p>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex justify-between pt-8">
                <button
                  type="button"
                  onClick={handlePrevStep}
                  disabled={step === 1}
                  className={`px-6 py-2 rounded-lg font-medium ${step === 1
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                >
                  Previous
                </button>

                <button
                  type="button"
                  onClick={handleNextStep}
                  className="px-6 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 focus:ring-2 focus:ring-primary-500"
                >
                  {step === 5 ? 'Submit Application' : 'Next'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PilotSignupPage;
