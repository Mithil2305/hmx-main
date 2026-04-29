import React, { useState, useEffect } from 'react';
import { Search, Eye, Edit, Trash2, Plus } from 'lucide-react';

interface Referral {
  id: number;
  name: string;
  email: string;
  phone: string;
  commission_rate: number;
  total_referrals: number;
  total_earnings: number;
  status: string;
  created_at: string;
  referral_link?: string;
  category?: string;
  password?: string;
  [key: string]: any; // For dynamic fields
}

const ReferralManagement: React.FC = () => {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReferral, setSelectedReferral] = useState<Referral | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    commission_rate: ''
  });

  useEffect(() => {
    fetchReferrals();
  }, []);

  const fetchReferrals = async () => {
    try {
      const response = await fetch('/api/admin/referrals', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      // Ensure data is an array before setting state
      if (Array.isArray(data)) {
        setReferrals(data);
      } else if (data && typeof data === 'object') {
        // If the API returns an object with a data property
        setReferrals(Array.isArray(data.data) ? data.data : []);
      } else {
        setReferrals([]);
      }
      setLoading(false);
    } catch (error) {
      setError('Failed to fetch referrals');
      setReferrals([]); // Set empty array on error
      setLoading(false);
    }
  };

  const handleAddReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/admin/referrals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...formData,
          commission_rate: parseFloat(formData.commission_rate)
        })
      });
      
      if (response.ok) {
        setShowAddModal(false);
        setFormData({
          name: '',
          email: '',
          phone: '',
          commission_rate: ''
        });
        fetchReferrals();
      }
    } catch (error) {
      setError('Failed to add referral');
    }
  };

  const handleUpdateStatus = async (id: number, status: string) => {
    try {
      const response = await fetch(`/api/admin/referrals/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status })
      });
      
      if (response.ok) {
        fetchReferrals();
      }
    } catch (error) {
      setError('Failed to update referral status');
    }
  };

  const handleDeleteReferral = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this referral?')) return;

    try {
      const response = await fetch(`/api/admin/referrals/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        fetchReferrals();
      }
    } catch (error) {
      setError('Failed to delete referral');
    }
  };

  const filteredReferrals = referrals.filter(referral =>
    referral.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    referral.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    referral.phone.includes(searchTerm)
  );

  // Calculate total earnings with proper type checking
  const totalEarnings = Array.isArray(referrals) 
    ? referrals.reduce((sum, referral) => sum + (referral.total_earnings || 0), 0)
    : 0;

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="container mx-auto px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Referral Management</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
        >
          <Plus size={20} className="mr-2" />
          Add Referral
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-700">Total Referrals</h3>
          <p className="text-3xl font-bold text-primary-600">{referrals.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-700">Active Referrals</h3>
          <p className="text-3xl font-bold text-green-600">
            {referrals.filter(r => r.status === 'active').length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-700">Total Earnings</h3>
          <p className="text-3xl font-bold text-blue-600">
            ₹{totalEarnings.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Search referrals..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 pl-10 border rounded-md"
          />
          <Search size={20} className="absolute left-3 top-2.5 text-gray-400" />
        </div>
      </div>

      {/* Referrals Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Commission</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Referrals</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Earnings</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredReferrals.map((referral) => (
              <tr key={referral.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{referral.name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{referral.email}</div>
                  <div className="text-sm text-gray-500">{referral.phone}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{referral.commission_rate}%</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{referral.total_referrals}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">₹{referral.total_earnings?.toFixed(2) || '0.00'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    referral.status === 'active' ? 'bg-green-100 text-green-800' :
                    referral.status === 'inactive' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {referral.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => {
                      setSelectedReferral(referral);
                      setShowDetailsModal(true);
                    }}
                    className="text-indigo-600 hover:text-indigo-900 mr-4"
                  >
                    <Eye size={20} />
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(referral.id, referral.status === 'active' ? 'inactive' : 'active')}
                    className="text-yellow-600 hover:text-yellow-900 mr-4"
                  >
                    <Edit size={20} />
                  </button>
                  <button
                    onClick={() => handleDeleteReferral(referral.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    <Trash2 size={20} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Referral Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Add New Referral</h2>
            <form onSubmit={handleAddReferral}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Commission Rate (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.commission_rate}
                    onChange={(e) => setFormData({ ...formData, commission_rate: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    required
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                >
                  Add Referral
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Referral Details Modal */}
      {showDetailsModal && selectedReferral && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Referral Details</h2>
            <div className="space-y-4">
              {Object.entries(selectedReferral).map(([key, value]) => {
                if (value === undefined || value === null) return null;
                const labelMap: { [key: string]: string } = {
                  id: 'ID',
                  name: 'Name',
                  email: 'Email',
                  phone: 'Phone',
                  status: 'Status',
                  commission_rate: 'Commission Rate',
                  total_referrals: 'Total Referrals',
                  total_earnings: 'Total Earnings',
                  created_at: 'Date Added',
                  referral_link: 'Referral Link',
                  referral_code: 'Referral Code',
                  category: 'Category',
                  password: 'Password (Hashed)',
                  city: 'City',
                  referral_source: 'Referral Source',
                  source: 'Source',
                  business_type: 'Business Type',
                  industry: 'Industry',
                  // Add more mappings as needed
                };
                let label = labelMap[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                if (key === 'status') {
                  return (
                    <div key={key}>
                      <label className="block text-sm font-medium text-gray-700">Status</label>
                      <div className="mt-1">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          value === 'active' ? 'bg-green-100 text-green-800' :
                          value === 'inactive' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {value}
                        </span>
                      </div>
                    </div>
                  );
                }
                if (key === 'created_at') {
                  return (
                    <div key={key}>
                      <label className="block text-sm font-medium text-gray-700">Date Added</label>
                      <div className="mt-1 text-sm text-gray-900">{new Date(value).toLocaleString()}</div>
                    </div>
                  );
                }
                if (key === 'total_earnings') {
                  return (
                    <div key={key}>
                      <label className="block text-sm font-medium text-gray-700">Total Earnings</label>
                      <div className="mt-1 text-sm text-gray-900">₹{Number(value).toFixed(2)}</div>
                    </div>
                  );
                }
                if (key === 'commission_rate') {
                  return (
                    <div key={key}>
                      <label className="block text-sm font-medium text-gray-700">Commission Rate</label>
                      <div className="mt-1 text-sm text-gray-900">{value}%</div>
                    </div>
                  );
                }
                return (
                  <div key={key}>
                    <label className="block text-sm font-medium text-gray-700">{label}</label>
                    <div className="mt-1 text-sm text-gray-900">{String(value)}</div>
                  </div>
                );
              })}
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReferralManagement; 