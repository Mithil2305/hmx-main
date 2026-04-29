import React, { useState, useEffect } from 'react';
import { Search, Eye, Filter, DollarSign, Building, User, Phone, Mail, MapPin, X, Calendar, FileText, CreditCard } from 'lucide-react';

interface Client {
  id: number;
  contact_name: string;
  business_name: string;
  position: string;
  phone: string;
  email: string;
  city: string;
  created_at: string;
  order_count: number;
  total_order_value: number;
}

interface Filters {
  orderId: string;
  clientName: string;
  companyName: string;
  city: string;
  minOrderValue: string;
  maxOrderValue: string;
}

const ClientDatabase: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [clientDetails, setClientDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    orderId: '',
    clientName: '',
    companyName: '',
    city: '',
    minOrderValue: '',
    maxOrderValue: ''
  });

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const response = await fetch('/api/admin/clients', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch clients');
      }
      
      const data = await response.json();
      setClients(data);
      setLoading(false);
    } catch (error) {
      setError('Failed to fetch clients');
      setLoading(false);
    }
  };

  const handleViewOrders = (clientId: number) => {
    // Navigate to orders page with client filter
    window.location.href = `/admin/orders?clientId=${clientId}`;
  };

  const handleViewDetails = async (client: Client) => {
    setSelectedClient(client);
    setShowDetailsModal(true);
    setLoadingDetails(true);

    try {
      // Fetch detailed client information including business details
      const response = await fetch(`/api/admin/clients/${client.id}/details`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const details = await response.json();
        setClientDetails(details);
      } else {
        // Fallback to basic client info if detailed endpoint doesn't exist
        setClientDetails(client);
      }
    } catch (error) {
      console.error('Error fetching client details:', error);
      setClientDetails(client);
    } finally {
      setLoadingDetails(false);
    }
  };

  const filteredClients = clients.filter(client => {
    // Search filter
    const searchMatch = 
      client.contact_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.phone.includes(searchTerm) ||
      client.email.toLowerCase().includes(searchTerm.toLowerCase());

    // Additional filters
    const clientNameMatch = !filters.clientName || 
      client.contact_name.toLowerCase().includes(filters.clientName.toLowerCase());
    
    const companyNameMatch = !filters.companyName || 
      client.business_name.toLowerCase().includes(filters.companyName.toLowerCase());
    
    const cityMatch = !filters.city || 
      (client.city && client.city.toLowerCase().includes(filters.city.toLowerCase()));
    
    const orderValueMatch = 
      (!filters.minOrderValue || client.total_order_value >= parseFloat(filters.minOrderValue)) &&
      (!filters.maxOrderValue || client.total_order_value <= parseFloat(filters.maxOrderValue));

    return searchMatch && clientNameMatch && companyNameMatch && cityMatch && orderValueMatch;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const clearFilters = () => {
    setFilters({
      orderId: '',
      clientName: '',
      companyName: '',
      city: '',
      minOrderValue: '',
      maxOrderValue: ''
    });
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-lg">Loading clients...</div>
    </div>
  );

  if (error) return (
    <div className="text-red-500 text-center p-4">{error}</div>
  );

  return (
    <div className="container mx-auto px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Client Database</h1>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md"
        >
          <Filter size={20} className="mr-2" />
          Filters
        </button>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Search by client name, phone, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 pl-10 border rounded-md"
          />
          <Search size={20} className="absolute left-3 top-2.5 text-gray-400" />
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Client Name</label>
              <input
                type="text"
                value={filters.clientName}
                onChange={(e) => setFilters({...filters, clientName: e.target.value})}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="Filter by client name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
              <input
                type="text"
                value={filters.companyName}
                onChange={(e) => setFilters({...filters, companyName: e.target.value})}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="Filter by company name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input
                type="text"
                value={filters.city}
                onChange={(e) => setFilters({...filters, city: e.target.value})}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="Filter by city"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min Order Value</label>
              <input
                type="number"
                value={filters.minOrderValue}
                onChange={(e) => setFilters({...filters, minOrderValue: e.target.value})}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="Minimum amount"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Order Value</label>
              <input
                type="number"
                value={filters.maxOrderValue}
                onChange={(e) => setFilters({...filters, maxOrderValue: e.target.value})}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="Maximum amount"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={clearFilters}
                className="w-full px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clients Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Business</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Orders</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Value</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredClients.map((client) => (
              <tr key={client.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <User size={20} className="text-blue-600" />
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{client.contact_name}</div>
                      <div className="text-sm text-gray-500">{client.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <Building size={16} className="text-gray-400 mr-2" />
                    <div className="text-sm text-gray-900">{client.business_name || 'N/A'}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <Phone size={14} className="text-gray-400 mr-1" />
                    <div className="text-sm text-gray-900">{client.phone || 'N/A'}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{client.order_count}</div>
                  <div className="text-xs text-gray-500">orders</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <DollarSign size={16} className="text-green-500 mr-1" />
                    <div className="text-sm font-medium text-gray-900">
                      {formatCurrency(client.total_order_value)}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end space-x-2">
                    <button
                      onClick={() => handleViewDetails(client)}
                      className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      <Eye size={16} className="mr-1" />
                      View
                    </button>
                    <button
                      onClick={() => handleViewOrders(client.id)}
                      className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Orders
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {filteredClients.length === 0 && (
          <div className="text-center py-8">
            <div className="text-gray-500">No clients found matching your criteria</div>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500">Total Clients</div>
          <div className="text-2xl font-bold text-gray-900">{filteredClients.length}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500">Total Orders</div>
          <div className="text-2xl font-bold text-gray-900">
            {filteredClients.reduce((sum, client) => sum + client.order_count, 0)}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500">Total Revenue</div>
          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(filteredClients.reduce((sum, client) => sum + client.total_order_value, 0))}
          </div>
        </div>
      </div>

      {/* Client Details Modal */}
      {showDetailsModal && selectedClient && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">Client Details</h3>
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
            ) : clientDetails ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Information */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
                    <User size={18} className="mr-2" />
                    Basic Information
                  </h4>
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm font-medium text-gray-500">Name:</span>
                      <span className="ml-2 text-sm text-gray-900">{clientDetails.contact_name || selectedClient.contact_name}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Email:</span>
                      <span className="ml-2 text-sm text-gray-900">{clientDetails.email || selectedClient.email}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Phone:</span>
                      <span className="ml-2 text-sm text-gray-900">{clientDetails.phone || selectedClient.phone || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Position:</span>
                      <span className="ml-2 text-sm text-gray-900">{clientDetails.position || selectedClient.position || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Joined:</span>
                      <span className="ml-2 text-sm text-gray-900">
                        {new Date(clientDetails.created_at || selectedClient.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Business Information */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
                    <Building size={18} className="mr-2" />
                    Business Information
                  </h4>
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm font-medium text-gray-500">Business Name:</span>
                      <span className="ml-2 text-sm text-gray-900">{clientDetails.business_name || selectedClient.business_name || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Registration Number:</span>
                      <span className="ml-2 text-sm text-gray-900">{clientDetails.registration_number || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Organization Type:</span>
                      <span className="ml-2 text-sm text-gray-900">{clientDetails.organization_type || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Official Email:</span>
                      <span className="ml-2 text-sm text-gray-900">{clientDetails.official_email || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Business Phone:</span>
                      <span className="ml-2 text-sm text-gray-900">{clientDetails.business_phone || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Official Address:</span>
                      <span className="ml-2 text-sm text-gray-900">{clientDetails.official_address || clientDetails.city || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Business Contact:</span>
                      <span className="ml-2 text-sm text-gray-900">{clientDetails.business_contact_name || clientDetails.contact_name || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Order Statistics */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
                    <FileText size={18} className="mr-2" />
                    Order Statistics
                  </h4>
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm font-medium text-gray-500">Total Orders:</span>
                      <span className="ml-2 text-sm text-gray-900">{selectedClient.order_count}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Total Value:</span>
                      <span className="ml-2 text-sm text-gray-900 font-medium text-green-600">
                        {formatCurrency(selectedClient.total_order_value)}
                      </span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Average Order Value:</span>
                      <span className="ml-2 text-sm text-gray-900">
                        {selectedClient.order_count > 0
                          ? formatCurrency(selectedClient.total_order_value / selectedClient.order_count)
                          : 'N/A'
                        }
                      </span>
                    </div>
                  </div>
                </div>

                {/* Documents & Compliance */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
                    <FileText size={18} className="mr-2" />
                    Documents & Compliance
                  </h4>
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm font-medium text-gray-500">Registration Certificate:</span>
                      {clientDetails.registration_certificate_url ? (
                        <a
                          href={clientDetails.registration_certificate_url}
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
                      <span className="text-sm font-medium text-gray-500">Tax Identification:</span>
                      {clientDetails.tax_identification_url ? (
                        <a
                          href={clientDetails.tax_identification_url}
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
                      <span className="text-sm font-medium text-gray-500">Business License:</span>
                      {clientDetails.business_license_url ? (
                        <a
                          href={clientDetails.business_license_url}
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
                      <span className="text-sm font-medium text-gray-500">Address Proof:</span>
                      {clientDetails.address_proof_url ? (
                        <a
                          href={clientDetails.address_proof_url}
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
                  </div>
                </div>

                {/* Additional Information */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
                    <Calendar size={18} className="mr-2" />
                    Additional Information
                  </h4>
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm font-medium text-gray-500">Incorporation Date:</span>
                      <span className="ml-2 text-sm text-gray-900">
                        {clientDetails.incorporation_date
                          ? new Date(clientDetails.incorporation_date).toLocaleDateString()
                          : 'N/A'
                        }
                      </span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Business Status:</span>
                      <span className="ml-2 text-sm text-gray-900">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          clientDetails.business_status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {clientDetails.business_status || 'Active'}
                        </span>
                      </span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Approval Status:</span>
                      <span className="ml-2 text-sm text-gray-900">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          clientDetails.business_approval_status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {clientDetails.business_approval_status || 'Approved'}
                        </span>
                      </span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Last Updated:</span>
                      <span className="ml-2 text-sm text-gray-900">
                        {clientDetails.business_updated_at
                          ? new Date(clientDetails.business_updated_at).toLocaleDateString()
                          : 'N/A'
                        }
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
                onClick={() => handleViewOrders(selectedClient.id)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                View Orders
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
    </div>
  );
};

export default ClientDatabase;