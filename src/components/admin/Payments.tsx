import React, { useState, useEffect } from 'react';
import { Search, Eye, Download, Filter, User, Plane, Users } from 'lucide-react';

interface Payment {
  id: number;
  booking_id: number;
  amount: number;
  status: string;
  payment_method: string;
  transaction_id: string;
  created_at: string;
  updated_at: string;
  industry: string;
  location: string;
  client_name: string;
  client_company: string;
  client_email: string;
  client_phone: string;
  pilot_name: string;
  pilot_email: string;
  pilot_phone: string;
  referral_name: string;
  referral_email: string;
}

interface Filters {
  clientName: string;
  pilotName: string;
  referralName: string;
  status: string;
  paymentMethod: string;
  minAmount: string;
  maxAmount: string;
}

const Payments: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    clientName: '',
    pilotName: '',
    referralName: '',
    status: '',
    paymentMethod: '',
    minAmount: '',
    maxAmount: ''
  });

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      const response = await fetch('/api/admin/payments', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();

      // Check if response is an array (success) or an object with error
      if (Array.isArray(data)) {
        setPayments(data);
      } else if (data.message || data.error) {
        console.error('API Error:', data.message || data.error);
        setError(data.message || 'Failed to fetch payments');
        setPayments([]);
      } else {
        // Handle unexpected response format
        console.warn('Unexpected response format:', data);
        setPayments([]);
      }
      setLoading(false);
    } catch (error) {
      console.error('Fetch error:', error);
      setError('Failed to fetch payments');
      setPayments([]);
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    const headers = [
      'Transaction ID',
      'Booking ID',
      'Amount',
      'Status',
      'Payment Method',
      'Date',
      'Client Name',
      'Client Company',
      'Pilot Name',
      'Referral Name',
      'Industry',
      'Location'
    ];
    const csvData = filteredPayments.map(payment => [
      payment.transaction_id,
      payment.booking_id,
      payment.amount,
      payment.status,
      payment.payment_method,
      new Date(payment.created_at).toLocaleString(),
      payment.client_name,
      payment.client_company,
      payment.pilot_name || 'N/A',
      payment.referral_name || 'N/A',
      payment.industry,
      payment.location
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `payments_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredPayments = payments.filter(payment => {
    // Search filter
    const searchMatch =
      payment.transaction_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.payment_method.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.pilot_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.referral_name.toLowerCase().includes(searchTerm.toLowerCase());

    // Additional filters
    const clientNameMatch = !filters.clientName ||
      payment.client_name.toLowerCase().includes(filters.clientName.toLowerCase());

    const pilotNameMatch = !filters.pilotName ||
      (payment.pilot_name && payment.pilot_name.toLowerCase().includes(filters.pilotName.toLowerCase()));

    const referralNameMatch = !filters.referralName ||
      (payment.referral_name && payment.referral_name.toLowerCase().includes(filters.referralName.toLowerCase()));

    const statusMatch = !filters.status ||
      payment.status.toLowerCase() === filters.status.toLowerCase();

    const paymentMethodMatch = !filters.paymentMethod ||
      payment.payment_method.toLowerCase().includes(filters.paymentMethod.toLowerCase());

    const amountMatch =
      (!filters.minAmount || payment.amount >= parseFloat(filters.minAmount)) &&
      (!filters.maxAmount || payment.amount <= parseFloat(filters.maxAmount));

    return searchMatch && clientNameMatch && pilotNameMatch && referralNameMatch &&
      statusMatch && paymentMethodMatch && amountMatch;
  });

  const clearFilters = () => {
    setFilters({
      clientName: '',
      pilotName: '',
      referralName: '',
      status: '',
      paymentMethod: '',
      minAmount: '',
      maxAmount: ''
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="container mx-auto px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Payment Records</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md"
          >
            <Filter size={20} className="mr-2" />
            Filters
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
          >
            <Download size={20} className="mr-2" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Search payments by transaction ID, method, status, client, pilot, or referral..."
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
                onChange={(e) => setFilters({ ...filters, clientName: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="Filter by client name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pilot Name</label>
              <input
                type="text"
                value={filters.pilotName}
                onChange={(e) => setFilters({ ...filters, pilotName: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="Filter by pilot name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Referral Name</label>
              <input
                type="text"
                value={filters.referralName}
                onChange={(e) => setFilters({ ...filters, referralName: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="Filter by referral name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="">All Statuses</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
              <input
                type="text"
                value={filters.paymentMethod}
                onChange={(e) => setFilters({ ...filters, paymentMethod: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="Filter by payment method"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min Amount</label>
              <input
                type="number"
                value={filters.minAmount}
                onChange={(e) => setFilters({ ...filters, minAmount: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="Minimum amount"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Amount</label>
              <input
                type="number"
                value={filters.maxAmount}
                onChange={(e) => setFilters({ ...filters, maxAmount: e.target.value })}
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

      {/* Payments Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transaction</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pilot</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Referral</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredPayments.map((payment) => (
              <tr key={payment.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{payment.transaction_id}</div>
                  <div className="text-xs text-gray-500">Booking #{payment.booking_id}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <User size={16} className="text-blue-500 mr-2" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">{payment.client_name}</div>
                      <div className="text-xs text-gray-500">{payment.client_company}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {payment.pilot_name ? (
                    <div className="flex items-center">
                      <Plane size={16} className="text-green-500 mr-2" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{payment.pilot_name}</div>
                        <div className="text-xs text-gray-500">{payment.pilot_email}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-400">Not assigned</div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {payment.referral_name ? (
                    <div className="flex items-center">
                      <Users size={16} className="text-purple-500 mr-2" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{payment.referral_name}</div>
                        <div className="text-xs text-gray-500">{payment.referral_email}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-400">No referral</div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{formatCurrency(payment.amount)}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${payment.status === 'completed' ? 'bg-green-100 text-green-800' :
                      payment.status === 'failed' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                    }`}>
                    {payment.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{payment.payment_method}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {new Date(payment.created_at).toLocaleDateString()}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => {
                      setSelectedPayment(payment);
                      setShowDetailsModal(true);
                    }}
                    className="text-indigo-600 hover:text-indigo-900"
                  >
                    <Eye size={20} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredPayments.length === 0 && (
          <div className="text-center py-8">
            <div className="text-gray-500">No payments found matching your criteria</div>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500">Total Payments</div>
          <div className="text-2xl font-bold text-gray-900">{filteredPayments.length}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500">Total Amount</div>
          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(filteredPayments.reduce((sum, payment) => sum + payment.amount, 0))}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500">Completed</div>
          <div className="text-2xl font-bold text-green-600">
            {filteredPayments.filter(p => p.status === 'completed').length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500">Pending</div>
          <div className="text-2xl font-bold text-yellow-600">
            {filteredPayments.filter(p => p.status === 'pending').length}
          </div>
        </div>
      </div>

      {/* Payment Details Modal */}
      {showDetailsModal && selectedPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Payment Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Transaction ID</label>
                <div className="mt-1 text-sm text-gray-900">{selectedPayment.transaction_id}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Booking ID</label>
                <div className="mt-1 text-sm text-gray-900">{selectedPayment.booking_id}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Amount</label>
                <div className="mt-1 text-sm text-gray-900">{formatCurrency(selectedPayment.amount)}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <div className="mt-1">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${selectedPayment.status === 'completed' ? 'bg-green-100 text-green-800' :
                      selectedPayment.status === 'failed' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                    }`}>
                    {selectedPayment.status}
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Payment Method</label>
                <div className="mt-1 text-sm text-gray-900">{selectedPayment.payment_method}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Date</label>
                <div className="mt-1 text-sm text-gray-900">
                  {new Date(selectedPayment.created_at).toLocaleString()}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Client Name</label>
                <div className="mt-1 text-sm text-gray-900">{selectedPayment.client_name}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Client Company</label>
                <div className="mt-1 text-sm text-gray-900">{selectedPayment.client_company}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Client Email</label>
                <div className="mt-1 text-sm text-gray-900">{selectedPayment.client_email}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Client Phone</label>
                <div className="mt-1 text-sm text-gray-900">{selectedPayment.client_phone}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Pilot Name</label>
                <div className="mt-1 text-sm text-gray-900">{selectedPayment.pilot_name || 'Not assigned'}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Pilot Email</label>
                <div className="mt-1 text-sm text-gray-900">{selectedPayment.pilot_email || 'N/A'}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Referral Name</label>
                <div className="mt-1 text-sm text-gray-900">{selectedPayment.referral_name || 'No referral'}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Referral Email</label>
                <div className="mt-1 text-sm text-gray-900">{selectedPayment.referral_email || 'N/A'}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Industry</label>
                <div className="mt-1 text-sm text-gray-900">{selectedPayment.industry}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Location</label>
                <div className="mt-1 text-sm text-gray-900">{selectedPayment.location}</div>
              </div>
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

export default Payments; 