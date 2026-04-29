import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const StandaloneBBD: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    // Business Identity
    businessName: '',
    brandName: '',
    ownerName: '',
    ownerSocialLink: '',
    companyName: '',
    companySocialLink: '',
    email: '',
    phone: '',
    city: '',
    state: '',
    address: '',
    category: '',
    // Property
    businessSize: '',
    numFloors: 1,
    floorAreas: [''] as string[],
    // Schedule
    preferredDates: ['', '', ''],
    platformPreference: '',
    timeSlot: '',
    specialRequirements: '',
    // Referral
    referralId: '',
    referralFromSocial: false,
    // OTP
    otp: '',
    showOtpField: false,
  });

  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [cost, setCost] = useState<number | null>(null);
  const [isApproved, setIsApproved] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [canResend, setCanResend] = useState(true);
  const [otpVerified, setOtpVerified] = useState(false);

  useEffect(() => {
    let timer: any;
    if (resendTimer > 0) {
      timer = setInterval(() => setResendTimer((prev) => prev - 1), 1000);
    } else {
      setCanResend(true);
    }
    return () => clearInterval(timer);
  }, [resendTimer]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name.startsWith('preferredDate')) {
      const index = parseInt(name.split('-')[1]);
      const newDates = [...formData.preferredDates];
      newDates[index] = value;
      setFormData(prev => ({ ...prev, preferredDates: newDates }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleNumFloorsChange = (n: number) => {
    const areas = Array.from({ length: n }, (_, i) => formData.floorAreas[i] || '');
    setFormData(prev => ({ ...prev, numFloors: n, floorAreas: areas }));
  };

  const handleFloorAreaChange = (index: number, value: string) => {
    const areas = [...formData.floorAreas];
    areas[index] = value;
    setFormData(prev => ({ ...prev, floorAreas: areas }));
  };

  const handleReferralSocialToggle = (checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      referralFromSocial: checked,
      referralId: checked ? '' : prev.referralId,
    }));
  };

  const sendOtp = async () => {
    if (!formData.email) { setError('Email is required'); return; }
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(formData.email)) { setError('Please enter a valid email address'); return; }
    try {
      setSuccessMessage('Sending OTP...');
      setError('');
      await axios.post('/api/auth/request-otp', {
        email: formData.email,
        user_type: 'client',
        user_data: { name: formData.ownerName || 'Business Owner', business_name: formData.brandName }
      });
      setSuccessMessage('OTP sent successfully to your email!');
      setFormData(prev => ({ ...prev, showOtpField: true }));
      setResendTimer(30);
      setCanResend(false);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send OTP. Please try again.');
      setSuccessMessage('');
    }
  };

  const verifyOtp = async () => {
    if (!formData.otp) { setError('OTP is required'); return; }
    if (!/^\d{6}$/.test(formData.otp)) { setError('Please enter a valid 6-digit OTP'); return; }
    try {
      setSuccessMessage('Verifying...');
      setError('');
      const res = await axios.post('/api/auth/verify-otp', { email: formData.email, otp: formData.otp });
      if (res.data.success) {
        setSuccessMessage('Email verified successfully!');
        setOtpVerified(true);
        setFormData(prev => ({ ...prev, showOtpField: false, otp: '' }));
      } else {
        setError(res.data.error || 'Invalid OTP');
        setSuccessMessage('');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'OTP verification failed.');
      setSuccessMessage('');
    }
  };

  const calculateCost = () => {
    const requiredFields = ['brandName', 'ownerName', 'companyName', 'category', 'businessSize', 'address', 'city', 'state', 'platformPreference', 'phone'];
    const missingFields = requiredFields.filter(field => !formData[field as keyof typeof formData]);
    if (missingFields.length > 0) { setError(`Please fill in: ${missingFields.join(', ')}`); return; }

    if (!formData.preferredDates.every(d => d !== '')) { setError('Please select all 3 preferred dates'); return; }
    if (formData.businessSize !== 'enterprise' && !formData.timeSlot) { setError('Please select a preferred time slot'); return; }

    const emptyFloor = formData.floorAreas.findIndex(a => !a.trim());
    if (emptyFloor !== -1) { setError(`Please enter area for Floor ${emptyFloor + 1}`); return; }

    if (!formData.referralFromSocial && !formData.referralId.trim()) {
      setError('Referral ID is required. Enter your referral code or select the social media option.');
      return;
    }

    setError('');
    setSuccessMessage('');

    const baseCosts: Record<string, number> = {
      'retail-store': 12000, 'restaurant': 12000, 'office-space': 10000,
      'hotel': 18000, 'real-estate': 20000, 'shopping-mall': 20000,
      'adventure-park': 15000, 'activity-zone': 12000,
    };
    const sizeMultipliers: Record<string, number> = {
      'small': 1.0, 'medium': 1.5, 'large': 2.0, 'extra-large': 3.0, 'enterprise': 0,
    };

    const baseCost = baseCosts[formData.category] || 10000;
    const sizeMultiplier = sizeMultipliers[formData.businessSize] || 1.0;
    let totalCost = baseCost * sizeMultiplier;
    if (formData.platformPreference === 'both') totalCost *= 1.5;

    setCost(formData.businessSize === 'enterprise' ? 0 : Math.round(totalCost));
    setIsApproved(true);
  };

  const handleProceed = async () => {
    if (cost === null) return;

    // Include logged-in user's ID if available
    let loggedInUserId: number | null = null;
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const payload_jwt = JSON.parse(atob(token.split('.')[1]));
        loggedInUserId = payload_jwt.user_id || null;
      }
    } catch {}

    const payload: any = {
      business_name: formData.brandName,
      brand_name: formData.brandName,
      owner_name: formData.ownerName,
      owner_social_link: formData.ownerSocialLink,
      company_name: formData.companyName,
      company_social_link: formData.companySocialLink,
      email: formData.email,
      phone: formData.phone,
      category: formData.category,
      area: formData.floorAreas.reduce((sum, a) => sum + (parseInt(a) || 0), 0),
      floor_areas: formData.floorAreas,
      num_floors: formData.numFloors,
      address: `${formData.address}, ${formData.city}, ${formData.state}`,
      preferred_date: formData.preferredDates[0],
      referral_id: formData.referralFromSocial ? 'SOCIAL_MEDIA' : formData.referralId,
      notes: `Time Slot: ${formData.timeSlot}. Platforms: ${formData.platformPreference}. Size: ${formData.businessSize}. Req: ${formData.specialRequirements}`
    };
    if (loggedInUserId) payload.user_id = loggedInUserId;

    if (cost === 0) {
      try {
        setSuccessMessage('Submitting quote request...');
        await axios.post('/api/business/bookings', payload);
        setSuccessMessage('Quote request submitted! Our team will contact you within 24 hours.');
        setIsApproved(false); setCost(null);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to submit quote request.');
      }
      return;
    }

    try {
      setSuccessMessage('Creating booking...');
      const bookingRes = await axios.post('/api/business/bookings', payload);
      if (bookingRes.data.success) {
        const bookingId = bookingRes.data.booking_id;
        setSuccessMessage('Redirecting to payment...');
        const paymentRes = await axios.post('/api/payment/initiate', {
          booking_id: bookingId, amount: cost / 2, phone: formData.phone, email: formData.email
        });
        if (paymentRes.data.success && paymentRes.data.payment_url) {
          window.location.href = paymentRes.data.payment_url;
        } else {
          setError('Failed to initiate payment. Please contact support.');
          setSuccessMessage('');
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Booking creation failed.');
      setSuccessMessage('');
    }
  };

  const getTimeSlotOptions = () => {
    if (!formData.businessSize) return (
      <select disabled className="w-full px-5 py-4 bg-zinc-100 border border-zinc-100 rounded-2xl font-medium text-zinc-400 appearance-none">
        <option>Select size first</option>
      </select>
    );
    if (formData.businessSize === 'enterprise') return (
      <div className="p-4 bg-zinc-50 border border-zinc-100 rounded-2xl flex items-center">
        <div className="w-1.5 h-1.5 bg-primary-500 rounded-full mr-3 animate-pulse"></div>
        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Custom Quote Required</p>
      </div>
    );
    const timeSlots: Record<string, { value: string; label: string; duration: string }[]> = {
      small: [
        { value: 'morning', label: 'Morning (7 AM - 10 AM)', duration: '3 hours' },
        { value: 'afternoon', label: 'Afternoon (12 PM - 3 PM)', duration: '3 hours' },
        { value: 'evening', label: 'Evening (4 PM - 7 PM)', duration: '3 hours' },
        { value: 'night', label: 'Night (8 PM - 11 PM)', duration: '3 hours' },
      ],
      medium: [
        { value: 'morning', label: 'Morning (7 AM - 10 AM)', duration: '3 hours' },
        { value: 'afternoon', label: 'Afternoon (12 PM - 3 PM)', duration: '3 hours' },
        { value: 'evening', label: 'Evening (4 PM - 7 PM)', duration: '3 hours' },
        { value: 'night', label: 'Night (8 PM - 11 PM)', duration: '3 hours' },
      ],
      large: [
        { value: 'morning', label: 'Morning (7 AM - 1 PM)', duration: '6 hours' },
        { value: 'afternoon', label: 'Afternoon (12 PM - 6 PM)', duration: '6 hours' },
        { value: 'night', label: 'Night (5 PM - 11 PM)', duration: '6 hours' },
      ],
      'extra-large': [
        { value: 'morning-evening', label: 'Morning to Evening (7 AM - 7 PM)', duration: '12 hours' },
        { value: 'late-morning-night', label: 'Late Morning to Night (9 AM - 9 PM)', duration: '12 hours' },
        { value: 'afternoon-night', label: 'Afternoon to Night (11 AM - 11 PM)', duration: '12 hours' },
      ],
    };
    const slots = timeSlots[formData.businessSize] || [];
    return (
      <select name="timeSlot" value={formData.timeSlot} onChange={handleChange}
        className="w-full px-5 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all font-medium text-zinc-900 appearance-none">
        <option value="">Select Time Slot</option>
        {slots.map(s => <option key={s.value} value={s.value}>{s.label} ({s.duration})</option>)}
      </select>
    );
  };

  const inputCls = "w-full px-5 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all font-medium text-zinc-900 placeholder-zinc-400";
  const labelCls = "block text-xs font-black text-zinc-500 uppercase tracking-widest mb-2 px-1";

  return (
    <div className="min-h-screen bg-background-light py-12 px-4 relative overflow-hidden flex items-center justify-center">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary-500/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-3xl relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="bg-white rounded-[40px] shadow-hmx-lg overflow-hidden border border-white/50 backdrop-blur-sm"
        >
          {/* Header */}
          <div className="bg-sidebar-bg text-white p-10 text-center relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-hmx-gradient"></div>
            <div className="inline-flex items-center justify-center w-16 h-16 bg-hmx-gradient rounded-2xl mb-6 shadow-hmx-lg transform -rotate-3 transition-transform hover:rotate-0">
              <span className="text-3xl font-black text-white tracking-tighter">H</span>
            </div>
            <h1 className="text-3xl font-heading font-black mb-2 tracking-tight">Business Booking</h1>
            <p className="text-zinc-400 font-bold uppercase tracking-widest text-[10px]">Elevate your brand with hyper-mobility</p>
          </div>

          <div className="p-8 md:p-12 space-y-10">
            {error && (
              <div className="p-5 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-600 text-sm font-semibold flex items-center">
                <div className="w-1.5 h-1.5 bg-red-600 rounded-full mr-3 animate-pulse"></div>
                {error}
              </div>
            )}
            {successMessage && (
              <div className="p-5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-600 text-sm font-semibold flex items-center">
                <div className="w-1.5 h-1.5 bg-emerald-600 rounded-full mr-3 animate-pulse"></div>
                {successMessage}
              </div>
            )}

            {/* ── Section 1: Brand & Contact ── */}
            <div>
              <h2 className={`text-sm font-black text-zinc-900 uppercase tracking-widest mb-6 flex items-center`}>
                <span className="w-1.5 h-4 bg-primary-500 rounded-full mr-3"></span>Brand & Contact
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                <div>
                  <label className={labelCls}>Brand Name & Branch *</label>
                  <input type="text" name="brandName" value={formData.brandName} onChange={handleChange}
                    placeholder="e.g. Nike – Connaught Place" className={inputCls} />
                </div>

                <div>
                  <label className={labelCls}>City *</label>
                  <input type="text" name="city" value={formData.city} onChange={handleChange}
                    placeholder="e.g. Mumbai" className={inputCls} />
                </div>

                <div>
                  <label className={labelCls}>Your Name *</label>
                  <input type="text" name="ownerName" value={formData.ownerName} onChange={handleChange}
                    placeholder="Full Name" className={inputCls} />
                </div>

                <div>
                  <label className={labelCls}>Your Social Profile Link</label>
                  <input type="url" name="ownerSocialLink" value={formData.ownerSocialLink} onChange={handleChange}
                    placeholder="Instagram / LinkedIn URL" className={inputCls} />
                </div>

                <div>
                  <label className={labelCls}>Registered Company Name *</label>
                  <input type="text" name="companyName" value={formData.companyName} onChange={handleChange}
                    placeholder="e.g. Acme Pvt. Ltd." className={inputCls} />
                </div>

                <div>
                  <label className={labelCls}>Company Social Profile Link</label>
                  <input type="url" name="companySocialLink" value={formData.companySocialLink} onChange={handleChange}
                    placeholder="Instagram / LinkedIn URL" className={inputCls} />
                </div>

                <div>
                  <label className={labelCls}>Email Address *</label>
                  <div className="flex space-x-2">
                    <input type="email" name="email" value={formData.email} onChange={handleChange}
                      disabled={formData.showOtpField || otpVerified} placeholder="name@company.com"
                      className="flex-1 px-5 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all font-medium text-zinc-900 placeholder-zinc-400" />
                    {otpVerified ? (
                      <div className="px-6 py-4 bg-green-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 flex-shrink-0">
                        ✓ Verified
                      </div>
                    ) : !formData.showOtpField && (
                      <button type="button" onClick={sendOtp}
                        className="px-6 bg-sidebar-bg text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-zinc-800 transition-all shadow-md active:scale-95 flex-shrink-0">
                        OTP
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Phone Number *</label>
                  <input type="tel" name="phone" value={formData.phone} onChange={handleChange}
                    placeholder="+91 98765 43210" className={inputCls} />
                </div>

                {formData.showOtpField && (
                  <div className="md:col-span-2 flex items-end space-x-3 bg-zinc-50 p-6 rounded-[24px] border border-zinc-100">
                    <div className="flex-1">
                      <label className={labelCls}>Verification Code *</label>
                      <input type="text" name="otp" value={formData.otp} onChange={handleChange}
                        placeholder="Enter 6-digit OTP" maxLength={6}
                        className="w-full px-5 py-4 bg-white border border-zinc-100 rounded-2xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all font-medium text-zinc-900 placeholder-zinc-400" />
                    </div>
                    <button type="button" onClick={verifyOtp}
                      className="px-8 py-4 bg-hmx-gradient text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-hmx hover:scale-[1.02] active:scale-95 transition-all">
                      Verify
                    </button>
                    {!canResend ? (
                      <div className="px-4 py-4 bg-zinc-100 text-zinc-400 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-zinc-200 flex items-center justify-center min-w-[100px]">
                        Resend in {resendTimer}s
                      </div>
                    ) : (
                      <button type="button" onClick={sendOtp}
                        className="px-6 py-4 border-2 border-primary-500 text-primary-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-primary-50 transition-all active:scale-95 flex-shrink-0">
                        Resend
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ── Section 2: Property Details ── */}
            <div>
              <h2 className="text-sm font-black text-zinc-900 uppercase tracking-widest mb-6 flex items-center">
                <span className="w-1.5 h-4 bg-primary-500 rounded-full mr-3"></span>Property Details
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                <div>
                  <label className={labelCls}>Category *</label>
                  <select name="category" value={formData.category} onChange={handleChange}
                    className="w-full px-5 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all font-medium text-zinc-900 appearance-none">
                    <option value="">Select Category</option>
                    <option value="retail-store">Retail Store</option>
                    <option value="restaurant">Restaurant</option>
                    <option value="office-space">Office Space</option>
                    <option value="hotel">Hotel</option>
                    <option value="real-estate">Real Estate Property</option>
                    <option value="shopping-mall">Shopping Mall</option>
                    <option value="adventure-park">Adventure Park</option>
                    <option value="activity-zone">Activity / Gaming Zone</option>
                  </select>
                </div>

                <div>
                  <label className={labelCls}>Business Size *</label>
                  <select name="businessSize" value={formData.businessSize} onChange={handleChange}
                    className="w-full px-5 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all font-medium text-zinc-900 appearance-none">
                    <option value="">Select Size</option>
                    <option value="small">Small (&lt;1000 sq. ft.)</option>
                    <option value="medium">Medium (1000–5000 sq. ft.)</option>
                    <option value="large">Large (5000–10,000 sq. ft.)</option>
                    <option value="extra-large">Extra Large (10,000–50,000 sq. ft.)</option>
                    <option value="enterprise">Enterprise (50,000+ sq. ft.)</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className={labelCls}>Business Address *</label>
                  <input type="text" name="address" value={formData.address} onChange={handleChange}
                    placeholder="Street, Landmark, etc." className={inputCls} />
                </div>

                <div>
                  <label className={labelCls}>State *</label>
                  <input type="text" name="state" value={formData.state} onChange={handleChange}
                    placeholder="e.g. Maharashtra" className={inputCls} />
                </div>

                {/* Number of Floors selector */}
                <div className="md:col-span-2">
                  <label className={labelCls}>Number of Floors *</label>
                  <div className="flex flex-wrap gap-3 mt-1">
                    {[1,2,3,4,5,6,7,8,9,10].map(n => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => handleNumFloorsChange(n)}
                        className={`w-12 h-12 rounded-xl font-black text-sm border-2 transition-all active:scale-95 ${
                          formData.numFloors === n
                            ? 'bg-sidebar-bg text-white border-sidebar-bg shadow-md'
                            : 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:border-primary-400'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Dynamic Floor Area Inputs */}
                <div className="md:col-span-2">
                  <label className={labelCls}>Floor Areas (sq ft only) *</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-1">
                    {formData.floorAreas.map((area, i) => (
                      <div key={i}>
                        <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">
                          {i === 0 ? 'Ground Floor (F1)' : `Floor ${i + 1} (F${i + 1})`}
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="1"
                            value={area}
                            onChange={e => handleFloorAreaChange(i, e.target.value)}
                            placeholder="e.g. 1200"
                            className="w-full px-4 py-3 pr-16 bg-zinc-50 border border-zinc-100 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all font-medium text-zinc-900 placeholder-zinc-400"
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-zinc-400 uppercase tracking-widest pointer-events-none">
                            sq ft
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {formData.floorAreas.length > 0 && formData.floorAreas.some(a => a) && (
                    <p className="mt-3 text-xs font-bold text-zinc-400 px-1">
                      Total area: {formData.floorAreas.reduce((s, a) => s + (parseInt(a) || 0), 0).toLocaleString()} sq ft
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* ── Section 3: Scheduling ── */}
            <div>
              <h2 className="text-sm font-black text-zinc-900 uppercase tracking-widest mb-6 flex items-center">
                <span className="w-1.5 h-4 bg-primary-500 rounded-full mr-3"></span>Scheduling
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                <div className="md:col-span-2">
                  <label className={labelCls}>Preferred Shooting Dates (3-day window) *</label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                    {[0,1,2].map(i => (
                      <div key={i}>
                        <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Option {i + 1}</label>
                        <input type="date" name={`preferredDate-${i}`} value={formData.preferredDates[i]} onChange={handleChange}
                          className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all text-sm font-medium" />
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Platform Preference *</label>
                  <select name="platformPreference" value={formData.platformPreference} onChange={handleChange}
                    className="w-full px-5 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all font-medium text-zinc-900 appearance-none">
                    <option value="">Select Platform</option>
                    <option value="youtube">YouTube</option>
                    <option value="instagram">Instagram</option>
                    <option value="both">Both (+50% cost)</option>
                  </select>
                </div>

                <div>
                  <label className={labelCls}>Required Time Slot *</label>
                  {getTimeSlotOptions()}
                </div>

                <div className="md:col-span-2">
                  <label className={labelCls}>Special Requirements</label>
                  <textarea name="specialRequirements" value={formData.specialRequirements} onChange={handleChange}
                    rows={3} placeholder="Tell us about specific focus areas or drone needs..."
                    className="w-full px-5 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all font-medium text-zinc-900 placeholder-zinc-400" />
                </div>
              </div>
            </div>

            {/* ── Section 4: Referral (Mandatory) ── */}
            <div>
              <h2 className="text-sm font-black text-zinc-900 uppercase tracking-widest mb-1 flex items-center">
                <span className="w-1.5 h-4 bg-primary-500 rounded-full mr-3"></span>Referral ID
                <span className="ml-2 text-[10px] font-black text-red-500 bg-red-50 px-2 py-0.5 rounded-full border border-red-100">Required</span>
              </h2>
              <p className="text-xs text-zinc-400 font-medium mb-5 px-1">Enter the referral code shared with you, or select the option below.</p>

              <input
                type="text"
                name="referralId"
                value={formData.referralId}
                onChange={handleChange}
                disabled={formData.referralFromSocial}
                placeholder={formData.referralFromSocial ? '—' : 'Enter referral code (e.g. HMX-12345)'}
                className={`w-full px-5 py-4 border rounded-2xl font-medium transition-all outline-none ${
                  formData.referralFromSocial
                    ? 'bg-zinc-100 border-zinc-100 text-zinc-400 cursor-not-allowed'
                    : 'bg-zinc-50 border-zinc-100 text-zinc-900 placeholder-zinc-400 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500'
                }`}
              />

              <label className="flex items-start gap-3 mt-4 cursor-pointer group">
                <div className="relative mt-0.5 flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={formData.referralFromSocial}
                    onChange={e => handleReferralSocialToggle(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-5 h-5 rounded-md border-2 border-zinc-300 bg-white peer-checked:bg-sidebar-bg peer-checked:border-sidebar-bg transition-all flex items-center justify-center group-hover:border-primary-400">
                    {formData.referralFromSocial && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
                <span className="text-sm font-semibold text-zinc-600 leading-snug group-hover:text-zinc-900 transition-colors">
                  Got to know from <span className="font-black text-zinc-900">HMX Hub's social media handles</span>
                </span>
              </label>
            </div>

            {/* ── Cost Summary ── */}
            {isApproved && cost !== null && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-zinc-900 text-white p-8 rounded-[32px] shadow-2xl relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/20 rounded-full blur-[60px]"></div>
                <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-6 flex items-center">
                  <span className="w-1 h-3 bg-primary-500 rounded-full mr-2"></span>Cost Summary
                </h3>
                {cost === 0 ? (
                  <div>
                    <p className="text-xl font-black tracking-tight">Enterprise Quote Required</p>
                    <p className="text-zinc-500 text-xs mt-2 font-bold uppercase tracking-widest">Our team will contact you for a custom proposal within 24 hours.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center text-zinc-400 font-bold uppercase tracking-widest text-[10px]">
                      <span>Total Estimated Cost</span>
                      <span className="text-white text-lg font-black">₹{cost.toLocaleString()}</span>
                    </div>
                    <div className="h-px bg-zinc-800"></div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-zinc-300">50% Advance Booking Fee</span>
                      <span className="text-2xl font-black text-white p-2 px-4 bg-white/5 rounded-xl border border-white/5">
                        ₹{(cost / 2).toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* ── Actions ── */}
            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <button type="button" onClick={() => isApproved ? setIsApproved(false) : navigate(-1)}
                className="flex-1 px-8 py-4 border border-zinc-100 rounded-2xl text-zinc-500 font-black text-xs uppercase tracking-widest hover:bg-zinc-50 transition-all active:scale-95">
                {isApproved ? 'Edit Details' : 'Cancel'}
              </button>
              <button type="button" onClick={() => isApproved ? handleProceed() : calculateCost()}
                className="flex-[2] bg-hmx-gradient hover:bg-hmx-gradient-hover text-white font-black py-4 px-8 rounded-2xl transition-all shadow-hmx-lg active:scale-[0.98] flex items-center justify-center tracking-tight">
                {isApproved ? (cost === 0 ? 'Submit Quote Request' : 'Proceed to Payment') : 'Calculate Estimated Cost'}
              </button>
            </div>
          </div>
        </motion.div>

        <p className="mt-8 text-center text-zinc-400 font-bold text-xs uppercase tracking-widest">
          Secured by HMX Mobility Intelligence
        </p>
      </div>
    </div>
  );
};

export default StandaloneBBD;
