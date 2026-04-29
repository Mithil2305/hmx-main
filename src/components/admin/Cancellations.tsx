import React, { useState, useEffect } from 'react';
import { Search, Eye, Check, X } from 'lucide-react';

interface Cancellation {
  id: number;
  booking_id: number;
  reason: string;
  status: string;
  refund_amount: number;
  created_at: string;
}

const Cancellations: React.FC = () => {
  const [cancellations, setCancellations] = useState<Cancellation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCancellation, setSelectedCancellation] = useState<Cancellation | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    fetchCancellations();
  }, []);

  const fetchCancellations = async () => {
    try {
      const response = await fetch('/api/admin/cancellations', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setCancellations(data);
      setLoading(false);
    } catch (error) {
      setError('Failed to fetch cancellations');
      setLoading(false);
    }
  };

  const handleProcessCancellation = async (id: number, action: 'approve' | 'reject') => {
    try {
      const response = await fetch(`/api/admin/cancellations/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ action })
      });
      
      if (response.ok) {
        fetchCancellations();
        setShowDetailsModal(false);
      }
    } catch (error) {
      setError('Failed to process cancellation');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount || 0);
  };

  const filteredCancellations = cancellations.filter(cancellation =>
    cancellation.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cancellation.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="container mx-auto px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Cancellation Requests</h1>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Search cancellations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 pl-10 border rounded-md"
          />
          <Search size={20} className="absolute left-3 top-2.5 text-gray-400" />
        </div>
      </div>

      {/* Cancellations Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Booking ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Refund Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredCancellations.map((cancellation) => (
              <tr key={cancellation.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{cancellation.booking_id}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900 line-clamp-2">{cancellation.reason}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{formatCurrency(cancellation.refund_amount)}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    cancellation.status === 'approved' ? 'bg-green-100 text-green-800' :
                    cancellation.status === 'rejected' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {cancellation.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {new Date(cancellation.created_at).toLocaleDateString()}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => {
                      setSelectedCancellation(cancellation);
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
      </div>

      {/* Cancellation Details Modal */}
      {showDetailsModal && selectedCancellation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Cancellation Details</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Booking ID</label>
                <div className="mt-1 text-sm text-gray-900">{selectedCancellation.booking_id}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Reason</label>
                <div className="mt-1 text-sm text-gray-900">{selectedCancellation.reason}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Refund Amount</label>
                <div className="mt-1 text-sm text-gray-900">{formatCurrency(selectedCancellation.refund_amount)}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <div className="mt-1">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    selectedCancellation.status === 'approved' ? 'bg-green-100 text-green-800' :
                    selectedCancellation.status === 'rejected' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {selectedCancellation.status}
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Date</label>
                <div className="mt-1 text-sm text-gray-900">
                  {new Date(selectedCancellation.created_at).toLocaleString()}
                </div>
              </div>
            </div>
            {selectedCancellation.status === 'pending' && (
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => handleProcessCancellation(selectedCancellation.id, 'reject')}
                  className="px-4 py-2 border rounded-md text-red-600 hover:bg-red-50 flex items-center"
                >
                  <X size={20} className="mr-2" />
                  Reject
                </button>
                <button
                  onClick={() => handleProcessCancellation(selectedCancellation.id, 'approve')}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center"
                >
                  <Check size={20} className="mr-2" />
                  Approve
                </button>
              </div>
            )}
            {selectedCancellation.status !== 'pending' && (
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Cancellations; 