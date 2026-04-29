import React, { useState, useEffect } from 'react';
import { Search, Eye, Edit, Trash2, Plus, X, User, Phone, Mail, Calendar, FileText, Shield, Plane, MapPin } from 'lucide-react';
import AddPilotForm from './AddPilotForm';

interface Pilot {
  id: number;
  name: string;
  full_name?: string;
  email: string;
  phone: string;
  status: string;
  experience: string;
  created_at: string;
  // Additional fields for detailed view
  date_of_birth?: string;
  gender?: string;
  address?: string;
  license_number?: string;
  issuing_authority?: string;
  license_issue_date?: string;
  license_expiry_date?: string;
  drone_model?: string;
  total_flying_hours?: string;
  cities?: string;
  equipment?: string;
  portfolio_url?: string;
}

const PilotManagement: React.FC = () => {
  const [pilots, setPilots] = useState<Pilot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPilot, setSelectedPilot] = useState<Pilot | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddPilotForm, setShowAddPilotForm] = useState(false);
  const [pilotDetails, setPilotDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    experience: '',
    password: ''
  });

  useEffect(() => {
    fetchPilots();
  }, []);

  const fetchPilots = async () => {
    try {
      const response = await fetch('/api/admin/pilots', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      // Ensure data is an array before setting state
      setPilots(Array.isArray(data) ? data : []);
      setLoading(false);
    } catch (error) {
      setError('Failed to fetch pilots');
      setPilots([]); // Set empty array on error
      setLoading(false);
    }
  };

  const handleAddPilot = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/admin/pilots', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        setShowAddModal(false);
        setFormData({
          name: '',
          email: '',
          phone: '',
          experience: '',
          password: ''
        });
        fetchPilots();
      }
    } catch (error) {
      setError('Failed to add pilot');
    }
  };

  const handleUpdateStatus = async (id: number, status: string) => {
    try {
      const response = await fetch(`/api/admin/pilots/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status })
      });

      if (response.ok) {
        fetchPilots();
      }
    } catch (error) {
      setError('Failed to update pilot status');
    }
  };

  const handleViewDetails = async (pilot: Pilot) => {
    setSelectedPilot(pilot);
    setShowDetailsModal(true);
    setLoadingDetails(true);

    try {
      // Fetch detailed pilot information
      const response = await fetch(`/api/admin/pilots/${pilot.id}/details`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const details = await response.json();
        setPilotDetails(details);
      } else {
        // Fallback to basic pilot info if detailed endpoint doesn't exist
        setPilotDetails(pilot);
      }
    } catch (error) {
      console.error('Error fetching pilot details:', error);
      setPilotDetails(pilot);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleDeletePilot = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this pilot?')) return;

    try {
      const response = await fetch(`/api/admin/pilots/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        fetchPilots();
      }
    } catch (error) {
      setError('Failed to delete pilot');
    }
  };

  const filteredPilots = pilots.filter(pilot =>
    pilot.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pilot.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pilot.phone.includes(searchTerm)
  );

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="container mx-auto px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Pilot Management</h1>
        <button
          onClick={() => setShowAddPilotForm(true)}
          className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
        >
          <Plus size={20} className="mr-2" />
          Add Pilot
        </button>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Search pilots..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 pl-10 border rounded-md"
          />
          <Search size={20} className="absolute left-3 top-2.5 text-gray-400" />
        </div>
      </div>

      {/* Pilots Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Experience</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredPilots.map((pilot) => (
              <tr key={pilot.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{pilot.name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{pilot.email}</div>
                  <div className="text-sm text-gray-500">{pilot.phone}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{pilot.experience}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    pilot.status === 'active' ? 'bg-green-100 text-green-800' :
                    pilot.status === 'inactive' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {pilot.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {new Date(pilot.created_at).toLocaleDateString()}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end space-x-2">
                    <button
                      onClick={() => handleViewDetails(pilot)}
                      className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      <Eye size={16} className="mr-1" />
                      View
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(pilot.id, pilot.status === 'active' ? 'inactive' : 'active')}
                      className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                    >
                      <Edit size={16} className="mr-1" />
                      {pilot.status === 'active' ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => handleDeletePilot(pilot.id)}
                      className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Pilot Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Add New Pilot</h2>
            <form onSubmit={handleAddPilot}>
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
                  <label className="block text-sm font-medium text-gray-700">Experience</label>
                  <input
                    type="text"
                    value={formData.experience}
                    onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Password</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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
                  Add Pilot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pilot Details Modal */}
      {showDetailsModal && selectedPilot && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">Pilot Details</h3>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            {loadingDetails ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-lg">Loading details...</div>
              </div>
            ) : pilotDetails ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Personal Information */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
                    <User size={18} className="mr-2" />
                    Personal Information
                  </h4>
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm font-medium text-gray-500">Name:</span>
                      <span className="ml-2 text-sm text-gray-900">{pilotDetails.full_name || pilotDetails.name || selectedPilot.name}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Email:</span>
                      <span className="ml-2 text-sm text-gray-900">{pilotDetails.email || selectedPilot.email}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Phone:</span>
                      <span className="ml-2 text-sm text-gray-900">{pilotDetails.phone || selectedPilot.phone}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Date of Birth:</span>
                      <span className="ml-2 text-sm text-gray-900">
                        {pilotDetails.date_of_birth
                          ? new Date(pilotDetails.date_of_birth).toLocaleDateString()
                          : 'N/A'
                        }
                      </span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Gender:</span>
                      <span className="ml-2 text-sm text-gray-900">{pilotDetails.gender || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Address:</span>
                      <span className="ml-2 text-sm text-gray-900">{pilotDetails.address || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* License Information */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
                    <Shield size={18} className="mr-2" />
                    License Information
                  </h4>
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm font-medium text-gray-500">License Number:</span>
                      <span className="ml-2 text-sm text-gray-900">{pilotDetails.license_number || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Issuing Authority:</span>
                      <span className="ml-2 text-sm text-gray-900">{pilotDetails.issuing_authority || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Issue Date:</span>
                      <span className="ml-2 text-sm text-gray-900">
                        {pilotDetails.license_issue_date
                          ? new Date(pilotDetails.license_issue_date).toLocaleDateString()
                          : 'N/A'
                        }
                      </span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Expiry Date:</span>
                      <span className="ml-2 text-sm text-gray-900">
                        {pilotDetails.license_expiry_date
                          ? new Date(pilotDetails.license_expiry_date).toLocaleDateString()
                          : 'N/A'
                        }
                      </span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Status:</span>
                      <span className="ml-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          selectedPilot.status === 'active' ? 'bg-green-100 text-green-800' :
                          selectedPilot.status === 'inactive' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {selectedPilot.status}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Drone & Equipment */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
                    <Plane size={18} className="mr-2" />
                    Drone & Equipment
                  </h4>
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm font-medium text-gray-500">Drone Model:</span>
                      <span className="ml-2 text-sm text-gray-900">{pilotDetails.drone_model || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Drone Serial:</span>
                      <span className="ml-2 text-sm text-gray-900">{pilotDetails.drone_serial || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Drone UIN:</span>
                      <span className="ml-2 text-sm text-gray-900">{pilotDetails.drone_uin || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Drone Category:</span>
                      <span className="ml-2 text-sm text-gray-900">{pilotDetails.drone_category || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Equipment:</span>
                      <span className="ml-2 text-sm text-gray-900">{pilotDetails.equipment || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Flying Hours:</span>
                      <span className="ml-2 text-sm text-gray-900">{pilotDetails.total_flying_hours || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Experience:</span>
                      <span className="ml-2 text-sm text-gray-900">{pilotDetails.experience || selectedPilot.experience}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Flight Records:</span>
                      <span className="ml-2 text-sm text-gray-900">{pilotDetails.flight_records || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Insurance & Documents */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
                    <Shield size={18} className="mr-2" />
                    Insurance & Documents
                  </h4>
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm font-medium text-gray-500">Insurance Policy:</span>
                      <span className="ml-2 text-sm text-gray-900">{pilotDetails.insurance_policy || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Insurance Validity:</span>
                      <span className="ml-2 text-sm text-gray-900">
                        {pilotDetails.insurance_validity
                          ? new Date(pilotDetails.insurance_validity).toLocaleDateString()
                          : 'N/A'
                        }
                      </span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Pilot License:</span>
                      {pilotDetails.pilot_license_url ? (
                        <a
                          href={pilotDetails.pilot_license_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 text-sm text-blue-600 hover:text-blue-800 underline"
                        >
                          View Document
                        </a>
                      ) : (
                        <span className="ml-2 text-sm text-gray-900">N/A</span>
                      )}
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">ID Proof:</span>
                      {pilotDetails.id_proof_url ? (
                        <a
                          href={pilotDetails.id_proof_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 text-sm text-blue-600 hover:text-blue-800 underline"
                        >
                          View Document
                        </a>
                      ) : (
                        <span className="ml-2 text-sm text-gray-900">N/A</span>
                      )}
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Training Certificate:</span>
                      {pilotDetails.training_certificate_url ? (
                        <a
                          href={pilotDetails.training_certificate_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 text-sm text-blue-600 hover:text-blue-800 underline"
                        >
                          View Document
                        </a>
                      ) : (
                        <span className="ml-2 text-sm text-gray-900">N/A</span>
                      )}
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Insurance Certificate:</span>
                      {pilotDetails.insurance_certificate_url ? (
                        <a
                          href={pilotDetails.insurance_certificate_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 text-sm text-blue-600 hover:text-blue-800 underline"
                        >
                          View Document
                        </a>
                      ) : (
                        <span className="ml-2 text-sm text-gray-900">N/A</span>
                      )}
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Photograph:</span>
                      {pilotDetails.photograph_url ? (
                        <a
                          href={pilotDetails.photograph_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 text-sm text-blue-600 hover:text-blue-800 underline"
                        >
                          View Photo
                        </a>
                      ) : (
                        <span className="ml-2 text-sm text-gray-900">N/A</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Service Areas & Portfolio */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
                    <MapPin size={18} className="mr-2" />
                    Service Areas & Portfolio
                  </h4>
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm font-medium text-gray-500">Service Cities:</span>
                      <span className="ml-2 text-sm text-gray-900">{pilotDetails.cities || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Portfolio:</span>
                      {pilotDetails.portfolio_url ? (
                        <a
                          href={pilotDetails.portfolio_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 text-sm text-blue-600 hover:text-blue-800 underline"
                        >
                          View Portfolio
                        </a>
                      ) : (
                        <span className="ml-2 text-sm text-gray-900">N/A</span>
                      )}
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Bank Account:</span>
                      <span className="ml-2 text-sm text-gray-900">{pilotDetails.bank_account || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Government ID:</span>
                      <span className="ml-2 text-sm text-gray-900">{pilotDetails.government_id_proof || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Joined:</span>
                      <span className="ml-2 text-sm text-gray-900">
                        {new Date(selectedPilot.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-gray-500">No additional details available</div>
              </div>
            )}

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => handleUpdateStatus(selectedPilot.id, selectedPilot.status === 'active' ? 'inactive' : 'active')}
                className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500"
              >
                {selectedPilot.status === 'active' ? 'Deactivate' : 'Activate'}
              </button>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Pilot Form */}
      <AddPilotForm
        isOpen={showAddPilotForm}
        onClose={() => setShowAddPilotForm(false)}
        onSuccess={() => {
          fetchPilots();
          setShowAddPilotForm(false);
        }}
      />
    </div>
  );
};

export default PilotManagement; 