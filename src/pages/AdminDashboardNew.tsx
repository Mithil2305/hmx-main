import React, { useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  FileText,
  MessageSquare,
  LogOut,
  UserPlus,
  Video,
  DollarSign,
  Settings as SettingsIcon,
  Loader2,
  Database,
  Mail,
  Briefcase
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import HomeContent from '../components/admin/HomeContent';
import Orders from '../components/admin/Orders';
import EditorManagement from '../components/admin/EditorManagement';
import PilotManagement from '../components/admin/PilotManagement';
import ClientDatabase from '../components/admin/ClientDatabase';
import Payments from '../components/admin/Payments';
import NewInquiries from '../components/admin/NewInquiries';
import ReferralManagement from '../components/admin/ReferralManagement';
import VideoReviews from '../components/admin/VideoReviews';
import Settings from '../components/admin/Settings';
import Applications from '../components/admin/Applications';
import EmailTemplates from '../components/admin/EmailTemplates';
import FPVEvents from '../components/admin/FPVEvents';
import BusinessBookings from '../components/admin/BusinessBookings';
import DemoDataSeeder from '../components/admin/DemoDataSeeder';

const AdminDashboard: React.FC = () => {
  const { isAuthenticated, user, logout, isLoading } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    // 🚀 Don’t run any redirect logic until isLoading is false
    if (isLoading) return;

    if (!isAuthenticated) {
      console.log('Not authenticated, redirecting to login');
      navigate('/login');
      return;
    }

    if (!user) {
      console.log('No user data, redirecting to login');
      navigate('/login');
      return;
    }

    if (user.role !== 'admin') {
      console.log('User is not admin, redirecting to appropriate dashboard');
      if (user.role === 'client') {
        navigate('/client');
      } else if (user.role === 'pilot') {
        navigate('/pilot');
      } else if (user.role === 'editor') {
        navigate('/editor');
      } else if (user.role === 'referral') {
        navigate('/referral');
      } else {
        navigate('/login');
      }
    }
  }, [isAuthenticated, user, isLoading, navigate]);


  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { path: '/admin', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
    { path: '/admin/orders', icon: <FileText size={20} />, label: 'Orders' },
    { path: '/admin/editors', icon: <Users size={20} />, label: 'Editors' },
    { path: '/admin/pilots', icon: <UserPlus size={20} />, label: 'Pilots' },
    { path: '/admin/payments', icon: <DollarSign size={20} />, label: 'Payments' },
    { path: '/admin/inquiries', icon: <MessageSquare size={20} />, label: 'Inquiries' },
    { path: '/admin/referrals', icon: <Users size={20} />, label: 'Referrals' },
    { path: '/admin/video-reviews', icon: <Video size={20} />, label: 'Video Reviews' },
    { path: '/admin/settings', icon: <SettingsIcon size={20} />, label: 'Settings' },
    { path: '/admin/database', icon: <Database size={20} />, label: 'Client Database' },
    { path: '/admin/applications', icon: <FileText size={20} />, label: 'Applications' },
    { path: '/admin/email-templates', icon: <Mail size={20} />, label: 'Email Templates' }
    , { path: '/admin/fpv-events', icon: <Video size={20} />, label: 'FPV Events' }
    , { path: '/admin/business-bookings', icon: <Briefcase size={20} />, label: 'Business Bookings' }
    , { path: '/admin/demo-data', icon: <Database size={20} />, label: 'Demo Data' }
  ];

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin mx-auto mb-4" size={32} />
          <p>Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background-light">
      {/* Sidebar */}
      <div className="w-72 bg-sidebar-bg flex flex-col shadow-2xl z-20">
        <div className="p-8 flex flex-col items-start">
          <div className="flex items-center space-x-2 mb-8">
            <div className="w-10 h-10 bg-hmx-gradient rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-hmx-lg">
              H
            </div>
            <h1 className="text-3xl font-heading font-black tracking-tighter text-white">
              HMX
            </h1>
          </div>
          {user && (
            <div className="flex items-center space-x-3 p-3 bg-white/5 rounded-xl w-full border border-white/10">
              <div className="w-10 h-10 rounded-full bg-hmx-gradient p-0.5">
                <div className="w-full h-full rounded-full bg-sidebar-bg flex items-center justify-center text-white text-xs font-bold overflow-hidden">
                  {user.contact_name?.charAt(0) || user.email.charAt(0)}
                </div>
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-semibold text-white truncate">
                  {user.contact_name || 'Admin'}
                </p>
                <p className="text-[10px] text-zinc-400 truncate">
                  {user.email}
                </p>
              </div>
            </div>
          )}
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto pb-4 custom-scrollbar">
          <p className="px-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Main Menu</p>
          {menuItems.slice(0, 9).map((item) => {
            const isActive = pathname === item.path || (item.path !== '/admin' && pathname.startsWith(item.path));
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center px-4 py-3.5 rounded-xl transition-all duration-300 group ${isActive
                    ? 'bg-hmx-gradient text-white shadow-hmx-lg'
                    : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                  }`}
              >
                <span className={`${isActive ? 'text-white' : 'text-zinc-400 group-hover:text-primary-400'} transition-colors`}>
                  {React.cloneElement(item.icon as React.ReactElement, { size: 20 })}
                </span>
                <span className="ml-3 font-medium text-sm">{item.label}</span>
              </button>
            );
          })}

          <div className="pt-6">
            <p className="px-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Management</p>
            {menuItems.slice(9).map((item) => {
              const isActive = pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`w-full flex items-center px-4 py-3.5 rounded-xl transition-all duration-300 group ${isActive
                      ? 'bg-hmx-gradient text-white shadow-hmx-lg'
                      : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                    }`}
                >
                  <span className={`${isActive ? 'text-white' : 'text-zinc-400 group-hover:text-primary-400'} transition-colors`}>
                    {React.cloneElement(item.icon as React.ReactElement, { size: 20 })}
                  </span>
                  <span className="ml-3 font-medium text-sm">{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        <div className="p-4 border-t border-white/5 bg-black/20">
          <button
            onClick={handleLogout}
            className="w-full flex items-center px-4 py-3 text-zinc-400 hover:bg-red-500/10 hover:text-red-400 rounded-xl transition-all duration-300 group"
          >
            <LogOut size={20} className="group-hover:translate-x-1 transition-transform" />
            <span className="ml-3 font-medium text-sm">Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header/Search Bar */}
        <header className="h-20 bg-white border-b border-zinc-100 flex items-center justify-between px-8 flex-shrink-0">
          <div className="relative w-96">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border-none rounded-xl bg-zinc-50 text-sm placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
              placeholder="Search anything..."
            />
          </div>
          <div className="flex items-center space-x-6">
            <button className="relative p-2 text-zinc-400 hover:text-primary-600 transition-colors">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="absolute top-2 right-2 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-500"></span>
              </span>
            </button>
            <div className="flex items-center space-x-3 cursor-pointer group">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-zinc-900 group-hover:text-primary-600 transition-colors">Admin</p>
                <p className="text-[10px] text-zinc-500">Super Admin</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-hmx-gradient p-0.5 shadow-hmx">
                <div className="w-full h-full rounded-xl bg-white flex items-center justify-center overflow-hidden">
                  <img src="https://ui-avatars.com/api/?name=Admin&background=random" alt="Admin" className="w-full h-full object-cover" />
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Content */}
        <div className="flex-1 overflow-auto bg-background-light custom-scrollbar">
          <div className="p-8 max-w-7xl mx-auto">
            <Routes>
              <Route path="/" element={<HomeContent />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/editors" element={<EditorManagement />} />
              <Route path="/pilots" element={<PilotManagement />} />
              <Route path="/payments" element={<Payments />} />
              <Route path="/inquiries" element={<NewInquiries />} />
              <Route path="/referrals" element={<ReferralManagement />} />
              <Route path="/video-reviews" element={<VideoReviews />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/database" element={<ClientDatabase />} />
              <Route path="/applications" element={<Applications />} />
              <Route path="/email-templates" element={<EmailTemplates />} />
              <Route path="/fpv-events" element={<FPVEvents />} />
              <Route path="/business-bookings" element={<BusinessBookings />} />
              <Route path="/demo-data" element={<DemoDataSeeder />} />
            </Routes>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
