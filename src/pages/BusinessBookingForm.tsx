import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

const BusinessBookingForm: React.FC = () => {
  const [formData, setFormData] = useState({
    businessName: '',
    ownerName: '',
    phone: '',
    email: '',
    category: '',
    businessSize: '',
    numFloors: 'G',
    address: '',
    city: '',
    state: '',
    preferredDates: ['', '', ''],
    platformPreference: '',
    timeSlot: '',
    specialRequirements: '',
    otp: '',
    showOtpField: false,
  });

  const getTimeSlotOptions = () => {
    if (!formData.businessSize) {
      return (
        <select
          name="timeSlot"
          value=""
          onChange={() => {}}
          required
          disabled
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-100"
        >
          <option value="">Select business size first</option>
        </select>
      );
    }

    const timeSlots = {
      small: [
        { value: 'morning', label: 'Morning (7 AM - 10 AM)', duration: '3 hours' },
        { value: 'afternoon', label: 'Afternoon (12 PM - 3 PM)', duration: '3 hours' },
        { value: 'evening', label: 'Evening (4 PM - 7 PM)', duration: '3 hours' },
        { value: 'night', label: 'Night (8 PM - 11 PM)', duration: '3 hours' }
      ],
      medium: [
        { value: 'morning', label: 'Morning (7 AM - 10 AM)', duration: '3 hours' },
        { value: 'afternoon', label: 'Afternoon (12 PM - 3 PM)', duration: '3 hours' },
        { value: 'evening', label: 'Evening (4 PM - 7 PM)', duration: '3 hours' },
        { value: 'night', label: 'Night (8 PM - 11 PM)', duration: '3 hours' }
      ],
      large: [
        { value: 'morning', label: 'Morning (7 AM - 1 PM)', duration: '6 hours' },
        { value: 'afternoon', label: 'Afternoon (12 PM - 6 PM)', duration: '6 hours' },
        { value: 'night', label: 'Night (5 PM - 11 PM)', duration: '6 hours' }
      ],
      'extra-large': [
        { value: 'morning-evening', label: 'Morning to Evening (7 AM - 7 PM)', duration: '12 hours' },
        { value: 'late-morning-night', label: 'Late Morning to Night (9 AM - 9 PM)', duration: '12 hours' },
        { value: 'afternoon-night', label: 'Afternoon to Night (11 AM - 11 PM)', duration: '12 hours' }
      ],
      enterprise: []
    };

    if (formData.businessSize === 'enterprise') {
      return (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-sm text-yellow-800">
            <strong>Custom Quote Required:</strong> For enterprise sizes (50,000+ sq. ft.), please contact us directly for a custom time slot arrangement.
          </p>
        </div>
      );
    }

    const slots = timeSlots[formData.businessSize as keyof typeof timeSlots] || [];

    return (
      <select
        name="timeSlot"
        value={formData.timeSlot}
        onChange={handleChange}
        required
        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        <option value="">Select Time Slot</option>
        {slots.map(slot => (
          <option key={slot.value} value={slot.value}>
            {slot.label} ({slot.duration})
          </option>
        ))}
      </select>
    );
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [cost, setCost] = useState<number | null>(null);
  const [isApproved, setIsApproved] = useState(false);
  const [isPaymentPending, setIsPaymentPending] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  // Set user's email if available
  useEffect(() => {
    if (user?.email) {
      setFormData(prev => ({
        ...prev,
        email: user.email,
        phone: user.phone || ''
      }));
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name.startsWith('preferredDate')) {
      const index = parseInt(name.split('-')[1]);
      const newPreferredDates = [...formData.preferredDates];
      newPreferredDates[index] = value;
      setFormData(prev => ({ ...prev, preferredDates: newPreferredDates }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const sendOtp = async () => {
    if (!formData.phone) {
      setError('Phone number is required');
      setSuccessMessage('');
      return;
    }
    
    // Validate phone number format (basic validation for Indian numbers)
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(formData.phone)) {
      setError('Please enter a valid 10-digit phone number');
      setSuccessMessage('');
      return;
    }
    
    try {
      await axios.post('/api/auth/send-otp', {
        phone: formData.phone,
        type: 'verification'
      });
      setFormData(prev => ({ ...prev, showOtpField: true }));
      setSuccessMessage('OTP sent successfully!');
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send OTP');
      setSuccessMessage('');
    }
  };

  const verifyOtp = async () => {
    if (!formData.otp) {
      setError('OTP is required');
      setSuccessMessage('');
      return;
    }

    // Validate OTP format (6 digits)
    const otpRegex = /^\d{6}$/;
    if (!otpRegex.test(formData.otp)) {
      setError('Please enter a valid 6-digit OTP');
      setSuccessMessage('');
      return;
    }

    try {
      await axios.post('/api/auth/verify-otp', {
        phone: formData.phone,
        otp: formData.otp
      });
      setFormData(prev => ({ ...prev, showOtpField: false, otp: '' }));
      setSuccessMessage('Phone number verified successfully!');
      setError('');
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid OTP');
      setSuccessMessage('');
    }
  };

  const calculateCost = () => {
    // Validate required fields before calculating cost
    const requiredFields = ['businessName', 'category', 'businessSize', 'numFloors', 'address', 'city', 'state', 'platformPreference'];
    const missingFields = requiredFields.filter(field => !formData[field as keyof typeof formData]);
    
    if (missingFields.length > 0) {
      setError(`Please fill in all required fields: ${missingFields.join(', ')}`);
      setSuccessMessage('');
      return;
    }

    // Validate preferred dates
    const hasValidDates = formData.preferredDates.every(date => date !== '');
    if (!hasValidDates) {
      setError('Please select all 3 preferred dates');
      setSuccessMessage('');
      return;
    }

    // Validate time slot for non-enterprise sizes
    if (formData.businessSize !== 'enterprise' && !formData.timeSlot) {
      setError('Please select a preferred time slot');
      setSuccessMessage('');
      return;
    }

    setError(''); // Clear any previous errors
    setSuccessMessage(''); // Clear any previous success messages
    // Base costs mapping for business categories
    const baseCosts: Record<string, number> = {
      'retail-store': 12000,
      'restaurant': 12000,
      'office-space': 10000,
      'hotel': 18000,
      'real-estate': 20000,
      'shopping-mall': 20000,
      'adventure-park': 15000,
      'activity-zone': 12000,
    };

    // Size-based cost multipliers
    const sizeMultipliers: Record<string, number> = {
      'small': 1.0,
      'medium': 1.5,
      'large': 2.0,
      'extra-large': 3.0,
      'enterprise': 0, // Custom quote
    };

    const baseCost = baseCosts[formData.category] || 10000;
    const sizeMultiplier = sizeMultipliers[formData.businessSize] || 1.0;
    
    // Calculate base cost with size multiplier
    let totalCost = baseCost * sizeMultiplier;
    
    // Apply floor adjustment (15% per additional floor)
    const floorCount = formData.numFloors === 'G' ? 0 : parseInt(formData.numFloors.split('+')[1]) || 0;
    const floorMultiplier = 1 + (0.15 * floorCount);
    totalCost = totalCost * floorMultiplier;
    
    // Apply platform preference (50% increase for both platforms)
    if (formData.platformPreference === 'both') {
      totalCost = totalCost * 1.5;
    }
    
    // For enterprise size, return 0 to indicate custom quote
    if (formData.businessSize === 'enterprise') {
      setCost(0);
      return 0;
    }
    
    setCost(Math.round(totalCost));
    return totalCost;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!isApproved) {
      // First submission - calculate cost and wait for approval
      calculateCost();
      setIsApproved(true);
      return;
    }

    // Second submission - proceed to payment or custom quote
    if (cost === 0) {
      // Handle custom quote submission
      try {
        setIsSubmitting(true);
        const response = await axios.post('/api/bookings/custom-quote', {
          ...formData,
          status: 'custom_quote_requested'
        }, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });

        // Show success message and redirect
        alert('Custom quote request submitted successfully! Our team will contact you within 24 hours.');
        navigate('/dashboard');
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to submit custom quote request');
      } finally {
        setIsSubmitting(false);
      }
    } else if (cost) {
      // Handle normal payment flow
      try {
        setIsSubmitting(true);
        const response = await axios.post('/api/bookings/business', {
          ...formData,
          cost: cost / 2, // 50% payment
          status: 'payment_pending'
        }, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });

        // Redirect to payment gateway
        window.location.href = response.data.paymentUrl;
        setIsPaymentPending(true);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to process booking');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  if (isPaymentPending) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <h2 className="text-2xl font-bold mb-4">Redirecting to Payment...</h2>
          <p>Please wait while we redirect you to the payment gateway.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow rounded-lg p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-8">Business Booking Details</h1>
          
          {error && (
            <div className={`mb-6 p-4 rounded-md ${
              error.includes('successfully') || error.includes('verified') 
                ? 'bg-green-50 text-green-700' 
                : 'bg-red-50 text-red-700'
            }`}>
              {error}
            </div>
          )}

          {successMessage && (
            <div className="mb-6 p-4 bg-green-50 text-green-700 rounded-md">
              {successMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business Name *
                </label>
                <input
                  type="text"
                  name="businessName"
                  value={formData.businessName}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Owner Name *
                </label>
                <input
                  type="text"
                  name="ownerName"
                  value={formData.ownerName}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number *
                </label>
                <div className="flex space-x-2">
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="Enter 10-digit mobile number"
                    maxLength={10}
                    required
                    disabled={formData.showOtpField}
                    className={`flex-1 px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 ${
                      formData.phone && !/^[6-9]\d{9}$/.test(formData.phone) 
                        ? 'border-red-300 bg-red-50' 
                        : 'border-gray-300'
                    }`}
                  />
                  {!formData.showOtpField && (
                    <button
                      type="button"
                      onClick={sendOtp}
                      disabled={!formData.phone || !/^[6-9]\d{9}$/.test(formData.phone)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Send OTP
                    </button>
                  )}
                </div>
                {formData.phone && !/^[6-9]\d{9}$/.test(formData.phone) && (
                  <p className="text-xs text-red-600 mt-1">Please enter a valid 10-digit mobile number starting with 6, 7, 8, or 9</p>
                )}
              </div>

              {formData.showOtpField && (
                <div className="flex items-end space-x-2">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Enter OTP *
                    </label>
                    <input
                      type="text"
                      name="otp"
                      value={formData.otp}
                      onChange={handleChange}
                      placeholder="Enter 6-digit OTP"
                      maxLength={6}
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        formData.otp && !/^\d{6}$/.test(formData.otp)
                          ? 'border-red-300 bg-red-50'
                          : 'border-gray-300'
                      }`}
                    />
                    {formData.otp && !/^\d{6}$/.test(formData.otp) && (
                      <p className="text-xs text-red-600 mt-1">OTP must be 6 digits</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={verifyOtp}
                    disabled={!formData.otp || !/^\d{6}$/.test(formData.otp)}
                    className="h-10 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Verify
                  </button>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category *
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Category</option>
                  <option value="retail-store">Retail Store</option>
                  <option value="restaurant">Restaurant</option>
                  <option value="office-space">Office Space</option>
                  <option value="hotel">Hotel</option>
                  <option value="real-estate">Real Estate Property</option>
                  <option value="shopping-mall">Shopping Mall/Entertainment Zone</option>
                  <option value="adventure-park">Adventure Park/Waterpark</option>
                  <option value="activity-zone">Activity/Gaming Zone</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business Size *
                </label>
                <select
                  name="businessSize"
                  value={formData.businessSize}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Business Size</option>
                  <option value="small">Small (&lt;1000 sq. ft.)</option>
                  <option value="medium">Medium (1000–5000 sq. ft.)</option>
                  <option value="large">Large (5000–10,000 sq. ft.)</option>
                  <option value="extra-large">Extra Large (10,000–50,000 sq. ft.)</option>
                  <option value="enterprise">Enterprise (50,000+ sq. ft.)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Number of Floors *
                </label>
                <select
                  name="numFloors"
                  value={formData.numFloors}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="G">Ground (G)</option>
                  <option value="G+1">Ground + 1 (G+1)</option>
                  <option value="G+2">Ground + 2 (G+2)</option>
                  <option value="G+3">Ground + 3 (G+3)</option>
                  <option value="G+4">Ground + 4 (G+4)</option>
                  <option value="G+5">Ground + 5 (G+5)</option>
                  <option value="G+6">Ground + 6 (G+6)</option>
                  <option value="G+7">Ground + 7 (G+7)</option>
                  <option value="G+8">Ground + 8 (G+8)</option>
                  <option value="G+9">Ground + 9 (G+9)</option>
                  <option value="G+10">Ground + 10 (G+10)</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">15% cost increase for each additional floor</p>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business Address *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    required
                    placeholder="Start typing to search location..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <div className="absolute right-2 top-2.5">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">Enter exact location with landmark or search using Google Maps</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City *
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  State *
                </label>
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Preferred Shooting Dates (3-day window) *
                </label>
                <p className="text-sm text-gray-500 mb-2">Select 3 consecutive dates (must be at least 5 days from today)</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Date 1</label>
                    <input
                      type="date"
                      name="preferredDate-0"
                      value={formData.preferredDates[0]}
                      onChange={handleChange}
                      required
                      min={new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Date 2</label>
                    <input
                      type="date"
                      name="preferredDate-1"
                      value={formData.preferredDates[1]}
                      onChange={handleChange}
                      required
                      min={new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Date 3</label>
                    <input
                      type="date"
                      name="preferredDate-2"
                      value={formData.preferredDates[2]}
                      onChange={handleChange}
                      required
                      min={new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Platform Preference *
                </label>
                <select
                  name="platformPreference"
                  value={formData.platformPreference}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Platform</option>
                  <option value="youtube">YouTube</option>
                  <option value="instagram">Instagram</option>
                  <option value="both">Both (50% cost increase)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Preferred Time Slot *
                </label>
                {getTimeSlotOptions()}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Special Requirements and Focus Areas
                </label>
                <textarea
                  name="specialRequirements"
                  value={formData.specialRequirements}
                  onChange={handleChange}
                  rows={2}
                  placeholder="e.g., focus on a particular section, promotional content needs, specific areas to highlight"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {isApproved && cost !== null && (
              <div className="bg-blue-50 p-4 rounded-md mb-6">
                <h3 className="text-lg font-medium text-blue-800 mb-2">Cost Summary</h3>
                {cost === 0 ? (
                  <div>
                    <p className="text-blue-800 font-medium">Custom Quote Required</p>
                    <p className="text-sm text-gray-600 mt-2">
                      For enterprise sizes (50,000+ sq. ft.), please contact us directly for a custom quote based on your specific requirements.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <div>Base Cost:</div>
                    <div className="text-right">₹{cost.toLocaleString()}</div>
                    <div className="col-span-2 border-t my-1"></div>
                    <div className="font-medium">50% Advance Payment:</div>
                    <div className="text-right font-bold text-blue-800">₹{(cost / 2).toLocaleString()}</div>
                  </div>
                )}
                <p className="text-sm text-gray-600 mt-2">
                  {cost === 0 
                    ? "Our team will contact you within 24 hours to discuss your requirements."
                    : "Please proceed to make the advance payment to confirm your booking."
                  }
                </p>
              </div>
            )}

            <div className="flex justify-end space-x-4 pt-4">
              <button
                type="button"
                onClick={() => isApproved ? setIsApproved(false) : navigate(-1)}
                className="px-6 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {isApproved ? 'Back' : 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  'Processing...'
                ) : isApproved ? (
                  cost === 0 ? 'Submit for Custom Quote' : 'Proceed to Payment (50%)'
                ) : (
                  'Calculate Cost'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BusinessBookingForm;
