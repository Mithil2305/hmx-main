import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { otpService } from '../services/api';
import { createRecord } from '../services/firestoreService';

const GuestSignupPage: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    referral_link: '',
    referral_code: '',
    otp: '',
    emailVerified: false,
  });
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Step 1: Basic details
  const handleSendOtp = async () => {
    setLoading(true);
    setError('');
    try {
      await otpService.requestOtp({ email: form.email });
      setOtpSent(true);
      setSuccess('OTP sent to your email');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await otpService.verifyOtp({ email: form.email, otp: form.otp });
      if (!result.success) {
        setError(result.error || 'Failed to verify OTP');
        setLoading(false);
        return;
      }
      setForm(f => ({ ...f, emailVerified: true }));
      setSuccess('Email verified!');
      setStep(2);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to verify OTP');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Address, referral link/code
  const handleNext = () => {
    setStep(3);
  };

  // Step 3: Order booking (reuse client dashboard logic)
  const handleProceedToOrder = () => {
    const guestProfile = {
      name: form.name,
      email: form.email,
      phone: form.phone,
      address: form.address,
      referral_link: form.referral_link,
      referral_code: form.referral_code,
      role: 'guest'
    };
    createRecord('guests', guestProfile).finally(() => {
      localStorage.setItem('guestInfo', JSON.stringify(guestProfile));
      navigate('/guest-booking');
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-lg bg-white shadow-lg rounded-xl p-8">
        <h2 className="text-2xl font-bold mb-6 text-primary-900 text-center">Guest Signup (with Referral)</h2>
        {error && <div className="mb-4 text-red-600">{error}</div>}
        {success && <div className="mb-4 text-green-600">{success}</div>}
        {step === 1 && (
          <form onSubmit={e => { e.preventDefault(); handleSendOtp(); }} className="space-y-4">
            <input type="text" placeholder="Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full border rounded px-3 py-2" required />
            <input type="email" placeholder="Email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="w-full border rounded px-3 py-2" required />
            <input type="tel" placeholder="Phone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="w-full border rounded px-3 py-2" required />
            <button type="submit" className="w-full bg-primary-600 text-white py-2 rounded">Send OTP</button>
            {otpSent && (
              <div className="mt-4">
                <input type="text" placeholder="Enter OTP" value={form.otp} onChange={e => setForm(f => ({ ...f, otp: e.target.value }))} className="w-full border rounded px-3 py-2" required />
                <button type="button" onClick={handleVerifyOtp} className="w-full bg-green-600 text-white py-2 rounded mt-2">Verify OTP</button>
              </div>
            )}
          </form>
        )}
        {step === 2 && (
          <form onSubmit={e => { e.preventDefault(); handleNext(); }} className="space-y-4">
            <input type="text" placeholder="Address" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className="w-full border rounded px-3 py-2" required />
            <input type="text" placeholder="Referral Link (optional)" value={form.referral_link} onChange={e => setForm(f => ({ ...f, referral_link: e.target.value }))} className="w-full border rounded px-3 py-2" />
            <input type="text" placeholder="Referral Code (optional)" value={form.referral_code} onChange={e => setForm(f => ({ ...f, referral_code: e.target.value }))} className="w-full border rounded px-3 py-2" />
            <button type="submit" className="w-full bg-primary-600 text-white py-2 rounded">Next: Book Order</button>
          </form>
        )}
        {step === 3 && (
          <div className="space-y-4">
            <p className="text-center text-gray-700">Proceed to order booking. Your referral will get earnings after order completion.</p>
            <button onClick={handleProceedToOrder} className="w-full bg-primary-600 text-white py-2 rounded">Proceed to Booking</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GuestSignupPage;
