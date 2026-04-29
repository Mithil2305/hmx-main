import React, { useState, useEffect } from 'react';
import { Video, FileText, DollarSign, Calendar, Plus, UserPlus, Users, AlertCircle, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Stats {
  pendingVideos: number;
  activeOrders: number;
  revenueMTD: number;
  completedOrders: number;
}

interface Activity {
  id: number;
  type: 'order' | 'pilot' | 'referral';
  action: string;
  timestamp: string;
  details: string;
}

const HomeContent: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({
    pendingVideos: 0,
    activeOrders: 0,
    revenueMTD: 0,
    completedOrders: 0
  });
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch stats
      const statsResponse = await fetch('/api/admin/dashboard/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!statsResponse.ok) {
        throw new Error('Failed to fetch dashboard stats');
      }

      const statsData = await statsResponse.json();
      setStats(statsData);

      // Fetch recent activities
      const activitiesResponse = await fetch('/api/admin/dashboard/activities', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!activitiesResponse.ok) {
        throw new Error('Failed to fetch recent activities');
      }

      const activitiesData = await activitiesResponse.json();
      setActivities(activitiesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while fetching dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'newOrder':
        navigate('/admin/orders');
        break;
      case 'newPilot':
        navigate('/admin/pilots');
        break;
      case 'newReferral':
        navigate('/admin/referrals');
        break;
      default:
        break;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow p-6">
                <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
          <AlertCircle className="text-red-500 mr-2" size={20} />
          <div className="text-red-700">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-black text-zinc-900 tracking-tight">
            Dashboard Overview
          </h1>
          <p className="text-zinc-500 mt-1 font-medium">Monitoring your FPV virtual tour operations</p>
        </div>
        <div className="flex items-center space-x-2 bg-white p-1.5 rounded-xl shadow-hmx border border-zinc-100">
          <button className="px-4 py-2 text-xs font-bold bg-zinc-100 text-zinc-900 rounded-lg shadow-sm">MTD</button>
          <button className="px-4 py-2 text-xs font-bold text-zinc-500 hover:text-zinc-900 transition-colors">YTD</button>
          <button className="px-4 py-2 text-xs font-bold text-zinc-500 hover:text-zinc-900 transition-colors">All Time</button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { icon: <Video size={24} />, label: 'Pending Videos', value: stats.pendingVideos, color: 'from-orange-500 to-red-500' },
          { icon: <FileText size={24} />, label: 'Active Orders', value: stats.activeOrders, color: 'from-blue-500 to-indigo-500' },
          { icon: <DollarSign size={24} />, label: 'Revenue (MTD)', value: `₹${stats.revenueMTD.toLocaleString()}`, color: 'from-emerald-500 to-teal-500' },
          { icon: <Calendar size={24} />, label: 'Completed Orders', value: stats.completedOrders, color: 'from-purple-500 to-pink-500' },
        ].map((stat, i) => (
          <div key={i} className="group bg-white rounded-3xl p-6 shadow-hmx border border-white hover:border-primary-100 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-4 rounded-2xl bg-gradient-to-br ${stat.color} text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                {stat.icon}
              </div>
              <span className="text-[10px] font-bold py-1 px-2.5 bg-zinc-100 text-zinc-500 rounded-full uppercase tracking-wider">
                This Month
              </span>
            </div>
            <div>
              <p className="text-4xl font-black text-zinc-900 tracking-tighter mb-1">{stat.value}</p>
              <p className="text-sm font-semibold text-zinc-400">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Actions */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-[32px] p-8 shadow-hmx border border-zinc-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-primary-50rounded-full blur-3xl opacity-20"></div>
            <h2 className="text-xl font-black text-zinc-900 mb-6 flex items-center">
              <span className="w-1.5 h-6 bg-primary-500 rounded-full mr-3"></span>
              Quick Actions
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 relative z-10">
              <button
                onClick={() => handleQuickAction('newOrder')}
                className="group flex flex-col items-center justify-center p-6 bg-hmx-gradient rounded-3xl shadow-hmx-lg transition-all duration-300 hover:scale-[1.02] active:scale-95 text-white"
              >
                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center mb-3 group-hover:rotate-12 transition-transform">
                  <Plus size={24} />
                </div>
                <span className="font-bold text-sm">Create Order</span>
              </button>
              <button
                onClick={() => handleQuickAction('newPilot')}
                className="group flex flex-col items-center justify-center p-6 bg-white border-2 border-zinc-100 rounded-3xl transition-all duration-300 hover:border-primary-200 hover:bg-primary-50"
              >
                <div className="w-12 h-12 rounded-2xl bg-primary-100 text-primary-600 flex items-center justify-center mb-3 group-hover:-rotate-12 transition-transform">
                  <UserPlus size={24} />
                </div>
                <span className="font-bold text-sm text-zinc-900">Add Pilot</span>
              </button>
              <button
                onClick={() => handleQuickAction('newReferral')}
                className="group flex flex-col items-center justify-center p-6 bg-white border-2 border-zinc-100 rounded-3xl transition-all duration-300 hover:border-primary-200 hover:bg-primary-50"
              >
                <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mb-3 group-hover:rotate-12 transition-transform">
                  <Users size={24} />
                </div>
                <span className="font-bold text-sm text-zinc-900">Add Referral</span>
              </button>
            </div>
          </div>

          {/* Activity Placeholder or Chart could go here */}
          <div className="bg-white rounded-[32px] p-8 shadow-hmx border border-zinc-100 min-h-[300px] flex flex-col justify-center items-center text-center">
            <div className="w-20 h-20 bg-zinc-50 rounded-full flex items-center justify-center mb-4 border border-zinc-100">
              <BarChart3 className="text-zinc-300" size={32} />
            </div>
            <h3 className="text-lg font-bold text-zinc-900">Analytics Overview</h3>
            <p className="text-zinc-500 text-sm max-w-xs mt-2">Charts and detailed performance analytics are currently being generated for your data.</p>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-[32px] p-8 shadow-hmx border border-zinc-100 flex flex-col h-full">
          <h2 className="text-xl font-black text-zinc-900 mb-6 flex items-center justify-between">
            <span className="flex items-center">
              <span className="w-1.5 h-6 bg-primary-500 rounded-full mr-3"></span>
              Activity
            </span>
            <button className="text-xs font-bold text-primary-600 hover:text-primary-700">View All</button>
          </h2>
          {activities.length > 0 ? (
            <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
              {activities.map((activity) => (
                <div key={activity.id} className="group flex items-start space-x-4 p-4 hover:bg-zinc-50 rounded-2xl transition-colors border border-transparent hover:border-zinc-100">
                  <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center shadow-sm transition-transform group-hover:scale-110 ${activity.type === 'order' ? 'bg-blue-50 text-blue-600' :
                    activity.type === 'pilot' ? 'bg-emerald-50 text-emerald-600' :
                      'bg-orange-50 text-orange-600'
                    }`}>
                    {activity.type === 'order' && <FileText size={18} />}
                    {activity.type === 'pilot' && <UserPlus size={18} />}
                    {activity.type === 'referral' && <Users size={18} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-zinc-900 group-hover:text-primary-700 transition-colors truncate">{activity.action}</p>
                    <p className="text-xs text-zinc-500 mt-0.5 truncate">{activity.details}</p>
                    <p className="text-[10px] font-bold text-zinc-300 mt-2 uppercase tracking-wider">
                      {new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 py-8">
              <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mb-4">
                <AlertCircle size={24} />
              </div>
              <p className="text-sm font-medium italic">No recent activity</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HomeContent;