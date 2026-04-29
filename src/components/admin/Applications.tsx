import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { 
  Filter, 
  Search, 
  Calendar, 
  Eye, 
  Check, 
  X, 
  Mail,
  User,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react';

interface Application {
  id: number;
  name?: string;
  full_name?: string;
  email: string;
  phone: string;
  status: string;
  created_at: string;
  admin_comments?: string;
  // Pilot specific
  cities?: string;
  experience?: string;
  equipment?: string;
  portfolio_url?: string;
  bank_account?: string;
  license_number?: string;
  total_flying_hours?: number;
  // Editor specific
  role?: string;
  years_experience?: number;
  primary_skills?: string;
  specialization?: string;
  time_zone?: string;
  // Business client specific
  business_name?: string;
  contact_name?: string;
  organization_type?: string;
  // Referral specific
  referral_code?: string;
  commission_rate?: number;
}

const API_URL = '/api';

const Applications: React.FC = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [filteredApplications, setFilteredApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [adminComment, setAdminComment] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  
  // Filter states
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'status'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const applicationTypes = [
    { value: 'all', label: 'All Applications' },
    { value: 'pilot', label: 'Pilot Applications' },
    { value: 'editor', label: 'Editor Applications' },
    { value: 'referral', label: 'Referral Applications' },
    { value: 'business_client', label: 'Business Client Applications' }
  ];

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' }
  ];

  useEffect(() => {
    fetchAllApplications();
  }, []);

  useEffect(() => {
    filterAndSortApplications();
  }, [applications, selectedType, selectedStatus, searchTerm, sortBy, sortOrder]);

  const fetchAllApplications = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const types = ['pilot', 'editor', 'referral', 'business_client'];
      const allApplications: Application[] = [];
      
      for (const type of types) {
        try {
          const response = await axios.get(`${API_URL}/admin/applications/${type}`, {
            withCredentials: true,
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
          
          const typeApplications = response.data.applications.map((app: Application) => ({
            ...app,
            applicationType: type
          }));
          
          allApplications.push(...typeApplications);
        } catch (err) {
          console.warn(`Failed to fetch ${type} applications:`, err);
        }
      }
      
      setApplications(allApplications);
    } catch (err: any) {
      setError('Failed to fetch applications');
      console.error('Error fetching applications:', err);
    }
    
    setLoading(false);
  };

  const filterAndSortApplications = () => {
    let filtered = [...applications];

    // Filter by type
    if (selectedType !== 'all') {
      filtered = filtered.filter(app => (app as any).applicationType === selectedType);
    }

    // Filter by status
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(app => app.status === selectedStatus);
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(app => 
        (app.name?.toLowerCase().includes(term)) ||
        (app.full_name?.toLowerCase().includes(term)) ||
        (app.email.toLowerCase().includes(term)) ||
        (app.phone.includes(term))
      );
    }

    // Sort applications
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'name':
          aValue = (a.name || a.full_name || '').toLowerCase();
          bValue = (b.name || b.full_name || '').toLowerCase();
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'date':
        default:
          aValue = new Date(a.created_at);
          bValue = new Date(b.created_at);
          break;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredApplications(filtered);
  };

  const handleViewApplication = (app: Application) => {
    setSelectedApp(app);
    setAdminComment(app.admin_comments || '');
    setShowDialog(true);
  };

  const handleApprove = async () => {
    if (!selectedApp) return;
    
    setActionLoading(true);
    try {
      const applicationType = (selectedApp as any).applicationType;
      await axios.post(
        `${API_URL}/admin/applications/${applicationType}/${selectedApp.id}/approve`,
        { comments: adminComment },
        {
          withCredentials: true,
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );
      
      setShowDialog(false);
      setSelectedApp(null);
      fetchAllApplications();
      
      // Show success message
      alert('Application approved successfully! User has been notified via email.');
    } catch (err) {
      console.error('Error approving application:', err);
      alert('Failed to approve application');
    }
    setActionLoading(false);
  };

  const handleReject = async () => {
    if (!selectedApp) return;
    
    setActionLoading(true);
    try {
      const applicationType = (selectedApp as any).applicationType;
      await axios.post(
        `${API_URL}/admin/applications/${applicationType}/${selectedApp.id}/reject`,
        { comments: adminComment },
        {
          withCredentials: true,
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );
      
      setShowDialog(false);
      setSelectedApp(null);
      fetchAllApplications();
      
      // Show success message
      alert('Application rejected. User has been notified via email.');
    } catch (err) {
      console.error('Error rejecting application:', err);
      alert('Failed to reject application');
    }
    setActionLoading(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getApplicationTypeLabel = (type: string) => {
    const typeMap: { [key: string]: string } = {
      pilot: 'Pilot',
      editor: 'Editor',
      referral: 'Referral',
      business_client: 'Business Client'
    };
    return typeMap[type] || type;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="animate-spin mx-auto mb-4" size={32} />
          <p>Loading applications...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="text-red-800">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Applications Management</h2>
        <div className="text-sm text-gray-500">
          Total: {filteredApplications.length} applications
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Application Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Filter className="w-4 h-4 inline mr-1" />
              Type
            </label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              {applicationTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              {statusOptions.map(status => (
                <option key={status.value} value={status.value}>{status.label}</option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Search className="w-4 h-4 inline mr-1" />
              Search
            </label>
            <input
              type="text"
              placeholder="Name, email, phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>

          {/* Sort By */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sort By
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'date' | 'name' | 'status')}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="date">Date</option>
              <option value="name">Name</option>
              <option value="status">Status</option>
            </select>
          </div>

          {/* Sort Order */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Order
            </label>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="desc">Newest First</option>
              <option value="asc">Oldest First</option>
            </select>
          </div>
        </div>
      </div>

      {/* Applications List */}
      <div className="bg-white rounded-lg shadow-sm border">
        {filteredApplications.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No applications found matching your criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Applicant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Applied Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredApplications.map((app) => (
                  <tr key={`${(app as any).applicationType}-${app.id}`} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <User className="w-8 h-8 text-gray-400 mr-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {app.name || app.full_name || 'N/A'}
                          </div>
                          <div className="text-sm text-gray-500">{app.email}</div>
                          <div className="text-xs text-gray-400">{app.phone}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {getApplicationTypeLabel((app as any).applicationType)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(app.status)}`}>
                        {getStatusIcon(app.status)}
                        <span className="ml-1 capitalize">{app.status}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        {new Date(app.created_at).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-gray-400">
                        {new Date(app.created_at).toLocaleTimeString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleViewApplication(app)}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Application Details Dialog */}
      {showDialog && selectedApp && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              {/* Dialog Header */}
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {getApplicationTypeLabel((selectedApp as any).applicationType)} Application Details
                </h3>
                <button
                  onClick={() => setShowDialog(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Application Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900 border-b pb-2">Basic Information</h4>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Name</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedApp.name || selectedApp.full_name || 'N/A'}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedApp.email}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Phone</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedApp.phone}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Application Date</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {new Date(selectedApp.created_at).toLocaleString()}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Current Status</label>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedApp.status)}`}>
                      {getStatusIcon(selectedApp.status)}
                      <span className="ml-1 capitalize">{selectedApp.status}</span>
                    </span>
                  </div>
                </div>

                {/* Type-specific Information */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900 border-b pb-2">
                    {getApplicationTypeLabel((selectedApp as any).applicationType)} Specific Details
                  </h4>

                  {(selectedApp as any).applicationType === 'pilot' && (
                    <>
                      {selectedApp.license_number && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700">License Number</label>
                          <p className="mt-1 text-sm text-gray-900">{selectedApp.license_number}</p>
                        </div>
                      )}
                      {selectedApp.total_flying_hours && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Flying Hours</label>
                          <p className="mt-1 text-sm text-gray-900">{selectedApp.total_flying_hours} hours</p>
                        </div>
                      )}
                      {selectedApp.cities && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Cities</label>
                          <p className="mt-1 text-sm text-gray-900">{selectedApp.cities}</p>
                        </div>
                      )}
                      {selectedApp.experience && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Experience</label>
                          <p className="mt-1 text-sm text-gray-900">{selectedApp.experience}</p>
                        </div>
                      )}
                      {selectedApp.equipment && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Equipment</label>
                          <p className="mt-1 text-sm text-gray-900">{selectedApp.equipment}</p>
                        </div>
                      )}
                    </>
                  )}

                  {(selectedApp as any).applicationType === 'editor' && (
                    <>
                      {selectedApp.role && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Role</label>
                          <p className="mt-1 text-sm text-gray-900">{selectedApp.role}</p>
                        </div>
                      )}
                      {selectedApp.years_experience && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Years of Experience</label>
                          <p className="mt-1 text-sm text-gray-900">{selectedApp.years_experience} years</p>
                        </div>
                      )}
                      {selectedApp.primary_skills && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Primary Skills</label>
                          <p className="mt-1 text-sm text-gray-900">{selectedApp.primary_skills}</p>
                        </div>
                      )}
                      {selectedApp.specialization && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Specialization</label>
                          <p className="mt-1 text-sm text-gray-900">{selectedApp.specialization}</p>
                        </div>
                      )}
                    </>
                  )}

                  {(selectedApp as any).applicationType === 'business_client' && (
                    <>
                      {selectedApp.business_name && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Business Name</label>
                          <p className="mt-1 text-sm text-gray-900">{selectedApp.business_name}</p>
                        </div>
                      )}
                      {selectedApp.organization_type && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Organization Type</label>
                          <p className="mt-1 text-sm text-gray-900">{selectedApp.organization_type}</p>
                        </div>
                      )}
                    </>
                  )}

                  {(selectedApp as any).applicationType === 'referral' && (
                    <>
                      {selectedApp.referral_code && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Referral Code</label>
                          <p className="mt-1 text-sm text-gray-900">{selectedApp.referral_code}</p>
                        </div>
                      )}
                      {selectedApp.commission_rate && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Commission Rate</label>
                          <p className="mt-1 text-sm text-gray-900">{selectedApp.commission_rate}%</p>
                        </div>
                      )}
                    </>
                  )}

                  {selectedApp.portfolio_url && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Portfolio</label>
                      <a
                        href={selectedApp.portfolio_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 text-sm text-blue-600 hover:text-blue-800 underline"
                      >
                        View Portfolio
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Admin Comments */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Admin Comments
                </label>
                <textarea
                  value={adminComment}
                  onChange={(e) => setAdminComment(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Add comments about this application..."
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowDialog(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>

                {selectedApp.status === 'pending' && (
                  <>
                    <button
                      onClick={handleReject}
                      disabled={actionLoading}
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                    >
                      {actionLoading ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <X className="w-4 h-4 mr-2" />
                      )}
                      Reject
                    </button>

                    <button
                      onClick={handleApprove}
                      disabled={actionLoading}
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                    >
                      {actionLoading ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4 mr-2" />
                      )}
                      Approve
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Applications;
