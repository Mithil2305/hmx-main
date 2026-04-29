import React, { useEffect, useState } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { BarChart3, Users, MessageSquare, Settings, LogOut, ChevronRight } from 'lucide-react';
import axios from 'axios';

const ReferralDashboard: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  // Basic auth check: verify token, redirect to login if invalid
  useEffect(() => {
    const verify = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login', { replace: true });
        return;
      }
      try {
        await axios.get('/api/auth/verify', {
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch {
        navigate('/login', { replace: true });
      }
    };
    verify();
  }, [navigate]);

  const menuItems = [
    { path: '/referral', icon: <BarChart3 size={20} />, label: 'Dashboard', component: <DashboardContent /> },
    { path: '/referral/leads', icon: <Users size={20} />, label: 'My Leads', component: <LeadsContent /> },
    { path: '/referral/messages', icon: <MessageSquare size={20} />, label: 'Messages', component: <MessagesContent /> },
    { path: '/referral/settings', icon: <Settings size={20} />, label: 'Settings', component: <SettingsContent /> },
  ];

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login', { replace: true });
  };

  const userInitial = 'R'; // Could be dynamic if user data is fetched

  return (
    <div className="flex h-screen bg-background-light">
      {/* Sidebar */}
      <aside className={`bg-sidebar-bg flex flex-col shadow-2xl z-20 transition-all duration-300 ${isSidebarOpen ? 'w-72' : 'w-24'}`}>
        <div className="p-8 flex flex-col items-start overflow-hidden">
          <div className="flex items-center space-x-2 mb-8 whitespace-nowrap">
            <div className="w-10 h-10 bg-hmx-gradient rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-hmx-lg flex-shrink-0">
              R
            </div>
            {isSidebarOpen && (
              <h1 className="text-2xl font-heading font-black tracking-tighter text-white">
                HMX Referral
              </h1>
            )}
          </div>

          <div className="flex items-center space-x-3 p-3 bg-white/5 rounded-xl w-full border border-white/10 overflow-hidden">
            <div className="w-10 h-10 rounded-full bg-hmx-gradient p-0.5 flex-shrink-0">
              <div className="w-full h-full rounded-full bg-sidebar-bg flex items-center justify-center text-white text-xs font-bold">
                {userInitial}
              </div>
            </div>
            {isSidebarOpen && (
              <div className="overflow-hidden">
                <p className="text-sm font-semibold text-white truncate">
                  Referral Partner
                </p>
                <p className="text-[10px] text-zinc-400 truncate">
                  partner@hmx.com
                </p>
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto pb-4 custom-scrollbar">
          <p className={`px-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 transition-opacity ${isSidebarOpen ? 'opacity-100' : 'opacity-0'}`}>
            Referral Menu
          </p>
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center rounded-xl py-3.5 transition-all duration-300 group overflow-hidden ${isSidebarOpen ? 'px-4' : 'justify-center'
                  } ${isActive
                    ? 'bg-hmx-gradient text-white shadow-hmx-lg'
                    : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                  }`}
              >
                <span className={`${isActive ? 'text-white' : 'text-zinc-400 group-hover:text-primary-400'} transition-colors flex-shrink-0`}>
                  {React.cloneElement(item.icon as React.ReactElement, { size: 20 })}
                </span>
                {isSidebarOpen && <span className="ml-3 font-medium text-sm whitespace-nowrap">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/5 bg-black/20 overflow-hidden">
          <button
            onClick={handleLogout}
            className={`flex items-center text-zinc-400 hover:bg-red-500/10 hover:text-red-400 rounded-xl transition-all duration-300 group ${isSidebarOpen ? 'w-full px-4 py-3 text-sm' : 'justify-center w-full py-3'
              }`}
          >
            <LogOut size={20} className="group-hover:translate-x-1 transition-transform flex-shrink-0" />
            {isSidebarOpen && <span className="ml-3 font-medium">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-20 bg-white border-b border-zinc-100 flex items-center justify-between px-8 flex-shrink-0">
          <div className="flex items-center">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 mr-4 text-zinc-400 hover:text-primary-600 transition-colors bg-zinc-50 rounded-lg"
            >
              <ChevronRight size={20} className={`transform transition-transform ${isSidebarOpen ? 'rotate-180' : ''}`} />
            </button>
            <h1 className="text-xl font-bold text-zinc-900 tracking-tight">
              {menuItems.find(item => item.path === location.pathname)?.label || 'Dashboard'}
            </h1>
          </div>

          <div className="flex items-center space-x-4">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-sm font-bold text-zinc-900">Partner</span>
              <span className="text-[10px] text-orange-500 font-bold uppercase tracking-widest">Verified</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-orange-500 p-0.5 shadow-sm">
              <div className="w-full h-full rounded-xl bg-white flex items-center justify-center overflow-hidden">
                <img src={`https://ui-avatars.com/api/?name=Referral&background=f97316&color=fff`} alt="Referral" />
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Content */}
        <div className="flex-1 overflow-auto bg-background-light custom-scrollbar">
          <div className="p-8 max-w-7xl mx-auto">
            <Routes>
              {menuItems.map((item) => (
                <Route key={item.path} path={item.path.replace('/referral', '')} element={item.component} />
              ))}
            </Routes>
          </div>
        </div>
      </div>
    </div>
  );
};

const DashboardContent: React.FC = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[
        { label: 'Total Referrals', value: 0 },
        { label: 'Conversions', value: 0 },
        { label: 'Pending Leads', value: 0 },
        { label: 'Earnings', value: '₹0' },
      ].map((stat, index) => (
        <div key={index} className="bg-white rounded-lg shadow p-6">
          <h3 className="mt-2 text-gray-500 text-sm font-medium">{stat.label}</h3>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{stat.value}</p>
        </div>
      ))}
    </div>

    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
      <div className="space-y-4">
        <p className="text-gray-500 text-center py-4">No recent activity to show</p>
      </div>
    </div>
  </div>
);

const LeadsContent: React.FC = () => (
  <div className="bg-white rounded-lg shadow p-6">
    <h2 className="text-lg font-semibold text-gray-900 mb-4">My Leads</h2>
    <div className="text-center text-gray-500 py-8">No leads yet</div>
  </div>
);

const MessagesContent: React.FC = () => (
  <div className="bg-white rounded-lg shadow p-6">
    <h2 className="text-lg font-semibold text-gray-900 mb-4">Messages</h2>
    <div className="text-center text-gray-500 py-8">No messages to display</div>
  </div>
);

const SettingsContent: React.FC = () => (
  <div className="bg-white rounded-lg shadow p-6">
    <h2 className="text-lg font-semibold text-gray-900 mb-4">Settings</h2>
    <div className="text-center text-gray-500 py-8">No settings available</div>
  </div>
);

export default ReferralDashboard;
