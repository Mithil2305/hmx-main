import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext'; // context

interface FormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

type Step = 'email' | 'otp' | 'reset';

const LoginPage: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    rememberMe: false
  });
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string>('');
  const navigate = useNavigate();

  const { login, isAuthenticated, user } = useAuth();

  // Forgot password states
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [fpStep, setFpStep] = useState<Step>('email');
  const [fpEmail, setFpEmail] = useState('');
  const [fpOtp, setFpOtp] = useState('');
  const [fpNewPassword, setFpNewPassword] = useState('');
  const [fpError, setFpError] = useState('');
  const [fpLoading, setFpLoading] = useState(false);

  // 🔑 Redirect after successful login
  useEffect(() => {
    if (isAuthenticated && user) {
      // Check if user has completed BBD form (for clients only)
      const bbdCompleted = localStorage.getItem(`bbd_completed_${user.id}`) === 'true';

      // Redirect based on role and BBD completion status
      if (user.role === 'admin') {
        navigate('/admin', { replace: true });
      } else if (user.role === 'pilot') {
        navigate('/pilot', { replace: true });
      } else if (user.role === 'editor') {
        navigate('/editor', { replace: true });
      } else if (user.role === 'referral') {
        navigate('/referral', { replace: true });
      } else if (user.role === 'client' && !bbdCompleted) {
        // Redirect to BBD form for first-time client users
        navigate('/business-booking', { replace: true });
      } else {
        // Regular client with completed BBD
        navigate('/client', { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate]);

  const validate = (): boolean => {
    const newErrors: Partial<FormData> = {};
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid';
    if (!formData.password) newErrors.password = 'Password is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
    if (errors[name as keyof FormData]) setErrors({ ...errors, [name]: undefined });
    setLoginError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    setLoginError('');
    try {
      await login(formData.email, formData.password);
      // Navigation handled by useEffect above ✅
    } catch (err: any) {
      setLoginError(err.response?.data.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  /** ---------------- FORGOT PASSWORD ---------------- **/
  const sendOtp = async () => {
    setFpError('');
    if (!fpEmail) return setFpError('Email is required');
    setFpLoading(true);
    try {
      await axios.post('/api/auth/request-otp', {
        email: fpEmail,
        user_type: 'user'
      });
      setFpStep('otp');
    } catch (err: any) {
      setFpError(err.response?.data.error || 'Failed to send OTP');
    } finally {
      setFpLoading(false);
    }
  };

  const verifyOtp = async () => {
    setFpError('');
    if (!fpOtp) return setFpError('OTP is required');
    setFpLoading(true);
    try {
      await axios.post('/api/auth/verify-otp', {
        email: fpEmail,
        otp: fpOtp
      });
      setFpStep('reset');
    } catch (err: any) {
      setFpError(err.response?.data.error || 'OTP verification failed');
    } finally {
      setFpLoading(false);
    }
  };

  const resetPassword = async () => {
    setFpError('');
    if (!fpNewPassword) return setFpError('Password is required');
    setFpLoading(true);
    try {
      await axios.post('/api/auth/reset-password', {
        email: fpEmail,
        new_password: fpNewPassword
      });

      setShowForgotPassword(false);
      setFpStep('email');
      setFpEmail('');
      setFpOtp('');
      setFpNewPassword('');
      alert('Password reset successfully. You can now login.');
    } catch (err: any) {
      setFpError(err.response?.data.error || 'Failed to reset password');
    } finally {
      setFpLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-20 pb-16 bg-background-light flex items-center justify-center relative overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary-500/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-md mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="bg-white rounded-3xl shadow-hmx-lg overflow-hidden border border-white/50 backdrop-blur-sm"
          >
            {/* Header */}
            <div className="bg-sidebar-bg text-white p-10 text-center relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-hmx-gradient"></div>
              <div className="inline-flex items-center justify-center w-16 h-16 bg-hmx-gradient rounded-2xl mb-6 shadow-hmx-lg transform -rotate-3">
                <span className="text-3xl font-black text-white tracking-tighter">H</span>
              </div>
              <h1 className="text-3xl font-heading font-black mb-3 tracking-tight">Welcome Back</h1>
              <p className="text-zinc-400 font-medium">Elevate your brand with hyper-mobility</p>
            </div>

            {/* Form */}
            <div className="p-10">
              {loginError && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-600 text-sm font-semibold flex items-center">
                  <div className="w-1.5 h-1.5 bg-red-600 rounded-full mr-3 animate-pulse"></div>
                  {loginError}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="email" className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-2 px-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={`w-full px-5 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all font-medium text-zinc-900 placeholder-zinc-400 ${errors.email ? 'border-red-500 bg-red-50/30' : ''
                      }`}
                    placeholder="name@example.com"
                    disabled={isLoading}
                  />
                  {errors.email && <p className="mt-2 text-[10px] font-black text-red-500 uppercase tracking-wider px-1">{errors.email}</p>}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2 px-1">
                    <label htmlFor="password" className="block text-xs font-black text-zinc-500 uppercase tracking-widest">
                      Password
                    </label>
                    <button
                      type="button"
                      className="text-xs font-bold text-primary-600 hover:text-primary-700 transition-colors"
                      onClick={() => setShowForgotPassword(true)}
                    >
                      Forgot password?
                    </button>
                  </div>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className={`w-full px-5 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all font-medium text-zinc-900 placeholder-zinc-400 ${errors.password ? 'border-red-500 bg-red-50/30' : ''
                      }`}
                    placeholder="••••••••"
                    disabled={isLoading}
                  />
                  {errors.password && <p className="mt-2 text-[10px] font-black text-red-500 uppercase tracking-wider px-1">{errors.password}</p>}
                </div>

                <div className="flex items-center px-1">
                  <div className="relative flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id="rememberMe"
                        name="rememberMe"
                        type="checkbox"
                        checked={formData.rememberMe}
                        onChange={handleChange}
                        className="w-5 h-5 text-primary-600 focus:ring-primary-500 border-zinc-300 rounded-lg cursor-pointer accent-primary-600 transition-all"
                        disabled={isLoading}
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="rememberMe" className="font-bold text-zinc-600 cursor-pointer select-none">
                        Remember me
                      </label>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-hmx-gradient hover:bg-hmx-gradient-hover text-white font-black py-4 px-6 rounded-2xl transition-all shadow-hmx-lg active:scale-[0.98] disabled:opacity-70 flex items-center justify-center tracking-tight"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Signing in...
                    </>
                  ) : 'Sign In to HMX'}
                </button>
              </form>

              <div className="mt-10 text-center">
                <p className="text-zinc-500 font-bold text-sm">
                  Don't have an account?{' '}
                  <Link to="/" className="text-primary-600 hover:text-primary-700 underline underline-offset-4 font-black transition-all">
                    Explore options
                  </Link>
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Forgot Password</h2>
            {fpError && <p className="text-red-600 mb-2">{fpError}</p>}

            {fpStep === 'email' && (
              <>
                <input
                  type="email"
                  placeholder="Your email"
                  value={fpEmail}
                  onChange={(e) => setFpEmail(e.target.value)}
                  className="w-full px-4 py-3 border rounded mb-4"
                  disabled={fpLoading}
                />
                <button
                  onClick={sendOtp}
                  className="w-full bg-primary-600 text-white py-3 rounded"
                  disabled={fpLoading}
                >
                  {fpLoading ? 'Sending OTP...' : 'Send OTP'}
                </button>
              </>
            )}

            {fpStep === 'otp' && (
              <>
                <input
                  type="text"
                  placeholder="Enter OTP"
                  value={fpOtp}
                  onChange={(e) => setFpOtp(e.target.value)}
                  className="w-full px-4 py-3 border rounded mb-4"
                  disabled={fpLoading}
                />
                <button
                  onClick={verifyOtp}
                  className="w-full bg-primary-600 text-white py-3 rounded"
                  disabled={fpLoading}
                >
                  {fpLoading ? 'Verifying OTP...' : 'Verify OTP'}
                </button>
              </>
            )}

            {fpStep === 'reset' && (
              <>
                <input
                  type="password"
                  placeholder="New Password"
                  value={fpNewPassword}
                  onChange={(e) => setFpNewPassword(e.target.value)}
                  className="w-full px-4 py-3 border rounded mb-4"
                  disabled={fpLoading}
                />
                <button
                  onClick={resetPassword}
                  className="w-full bg-primary-600 text-white py-3 rounded"
                  disabled={fpLoading}
                >
                  {fpLoading ? 'Resetting...' : 'Reset Password'}
                </button>
              </>
            )}

            <button
              className="mt-4 text-sm text-gray-600 hover:text-gray-800"
              onClick={() => setShowForgotPassword(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;
