import React, { useState, useEffect } from 'react';
import { Search, Eye, Trash2, Plus, X, CheckCircle, XCircle, Settings, Mail } from 'lucide-react';
import CreateOrderModal from './CreateOrderModal';

interface Order {
  id: number;
  booking_id: string;
  user_id: number;
  client_id: number;
  client_name: string;
  client_email: string;
  pilot_id: number | null;
  pilot_name: string;
  editor_id: number | null;
  editor_name: string;
  referral_id: number | null;
  referral_name: string;
  admin_comments: string;
  status: string;
  total_amount: number;
  created_at: string;
  updated_at: string;
  industry: string;
  location: string;
  requirements: string;
  payment_status: string;
  payment_amount: number;
  payment_date: string;
  completed_date: string;
  preferred_date: string;
  preferred_time: string;
  location_address: string;
  gps_link: string;
  property_type: string;
  indoor_outdoor: string;
  area_size: number;
  area_unit: string;
  area_sqft: number;
  num_floors: number;
  rooms_sections: number;
  duration: number;
  total_cost: number;
  special_requirements: string;
  drive_link: string;
  delivery_video_link: string;
  drone_permissions_required: boolean;
  base_package_cost: number;
  area_covered: number;
  shooting_hours: number;
  editing_color_grading: boolean;
  voiceover_script: boolean;
  background_music_licensed: boolean;
  branding_overlay: boolean;
  multiple_revisions: boolean;
  drone_licensing_fee: boolean;
  travel_cost: number;
  tax_percentage: number;
  discount_code: string;
  discount_amount: number;
  base_cost: number;
  final_cost: number;
  custom_quote: string;
  description: string;
  pilot_notes: string;
  client_notes: string;
  booking_category: string;
  brand_name: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  business_size: string;
}

const Orders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'ongoing' | 'completed' | 'cancelled' | 'custom' | 'guest_referrals'>('pending');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  // Custom Accept Modal
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [acceptAmount, setAcceptAmount] = useState('');
  const [acceptingOrderId, setAcceptingOrderId] = useState<number | null>(null);
  const [pilots, setPilots] = useState<any[]>([]);
  const [editors, setEditors] = useState<any[]>([]);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    fetchOrders();
    fetchPilots();
    fetchEditors();
  }, [activeTab]);

  const fetchOrders = async () => {
    try {
      let url = `/api/admin/orders`;
      if (activeTab === 'custom') {
        // no extra filters; we'll filter on client
      } else if (activeTab === 'guest_referrals') {
        // Only fetch pending guest referral orders by default so approved ones don't stay listed here
        url = `/api/admin/orders?guest_referral=1&status=pending`;
      } else {
        url = `/api/admin/orders?status=${activeTab}`;
      }
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();

      // Debug: Log the received data
      console.log('Received order data:', data);
      if (data && data.length > 0) {
        console.log('First order keys:', Object.keys(data[0]));
        console.log('Sample field values:', {
          property_type: data[0].property_type,
          location_address: data[0].location_address,
          gps_coordinates: data[0].gps_coordinates,
          area_size: data[0].area_size,
          preferred_time: data[0].preferred_time
        });
      }

      if (Array.isArray(data)) {
        setOrders(data);
      } else if (data && typeof data === 'object') {
        const ordersArray = Array.isArray(data.data) ? data.data : [];
        setOrders(ordersArray);
      } else {
        setOrders([]);
      }
      setLoading(false);
    } catch (error) {
      setError('Failed to fetch orders');
      setOrders([]);
      setLoading(false);
    }
  };

  const fetchPilots = async () => {
    try {
      const response = await fetch('/api/admin/pilots', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setPilots(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch pilots:', error);
    }
  };

  const fetchEditors = async () => {
    try {
      const response = await fetch('/api/admin/editors', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setEditors(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch editors:', error);
    }
  };

  const handleUpdateOrder = async (id: number, updates: any) => {
    try {
      const response = await fetch(`/api/admin/orders/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(updates)
      });

      if (response.ok) {
        // Optimistically update local state so UI removes approved/rejected orders from pending lists
        if (updates.status && updates.status !== 'pending') {
          setOrders(prev => prev.filter(o => o.id !== id));
        } else {
          setOrders(prev => prev.map(o => o.id === id ? { ...o, ...updates } : o));
        }

        // Refresh from server to ensure consistency
        fetchOrders();
        setShowAssignModal(false);
        setShowRejectModal(false);
      }
    } catch (error) {
      setError('Failed to update order');
    }
  };


  // Accept custom order with custom amount
  const handleApproveOrder = (id: number) => {
    setAcceptingOrderId(id);
    setShowAcceptModal(true);
    setAcceptAmount('');
  };

  const handleAcceptSubmit = async () => {
    if (!acceptingOrderId || !acceptAmount || isNaN(Number(acceptAmount)) || Number(acceptAmount) <= 0) return;
    await handleUpdateOrder(acceptingOrderId, { status: 'approved', total_cost: Number(acceptAmount) });
    setShowAcceptModal(false);
    setAcceptingOrderId(null);
    setAcceptAmount('');
    fetchOrders();
  };

  const handleRejectOrder = (id: number) => {
    if (rejectReason.trim()) {
      handleUpdateOrder(id, { status: 'rejected', admin_comments: `Rejected: ${rejectReason}` });
      setRejectReason('');
    }
  };

  const handleRetakeOrder = (id: number) => {
    handleUpdateOrder(id, { status: 'approved' });
  };

  const handleDeleteOrder = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this order?')) return;

    try {
      const response = await fetch(`/api/admin/orders/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        fetchOrders();
      }
    } catch (error) {
      setError('Failed to delete order');
    }
  };

  const handleOrderCreated = () => {
    fetchOrders();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount || 0);
  };

  // Compute approximate square feet for an order
  const getSqft = (order: Order): number => {
    if (order.area_sqft && order.area_sqft > 0) return order.area_sqft;
    if (order.area_size && order.area_unit) {
      const unit = (order.area_unit || '').toLowerCase().replace(/\s+/g, '');
      if (unit.includes('sq') && (unit.includes('ft') || unit.includes('feet') || unit.includes('foot'))) {
        return order.area_size;
      }
      if (unit.includes('acre')) {
        return order.area_size * 43560; // 1 acre = 43,560 sqft
      }
      if (unit.includes('sqm') || unit.includes('m2') || unit.includes('squaremeter')) {
        return order.area_size * 10.7639; // 1 sqm ~ 10.7639 sqft
      }
      if (unit.includes('sqyd') || unit.includes('squareyard') || unit.includes('yard')) {
        return order.area_size * 9; // 1 sq yd = 9 sqft
      }
    }
    return 0;
  };

  const filteredOrders = orders.filter(order =>
    (order.booking_id?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (order.client_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (order.client_email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (order.pilot_name?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  // Custom orders: > 50,000 sqft
  const customOrders = orders.filter((order) => getSqft(order) > 50000);
  const customFilteredOrders = customOrders.filter(order =>
    (order.booking_id?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (order.client_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (order.client_email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (order.pilot_name?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  const displayedCount = activeTab === 'custom' ? customFilteredOrders.length : filteredOrders.length;

  const statusOptions = [
    { value: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'approved', label: 'Approved', color: 'bg-blue-100 text-blue-800' },
    { value: 'assigned', label: 'Assigned', color: 'bg-purple-100 text-purple-800' },
    { value: 'in_progress', label: 'In Progress', color: 'bg-orange-100 text-orange-800' },
    { value: 'editing', label: 'Editing', color: 'bg-indigo-100 text-indigo-800' },
    { value: 'review_changes', label: 'Review Changes', color: 'bg-pink-100 text-pink-800' },
    { value: 'completed', label: 'Completed', color: 'bg-green-100 text-green-800' },
    { value: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-800' },
    { value: 'rejected', label: 'Rejected', color: 'bg-red-100 text-red-800' }
  ];

  const getStatusColor = (status: string) => {
    const statusOption = statusOptions.find(option => option.value === status);
    return statusOption ? statusOption.color : 'bg-gray-100 text-gray-800';
  };

  const handleStatusChange = async (orderId: number, newStatus: string) => {
    try {
      await handleUpdateOrder(orderId, { status: newStatus });
      setSuccessMessage(`Order status updated to ${newStatus}`);
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
      fetchOrders(); // Refresh the orders list
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="container mx-auto px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Order Management</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
        >
          <Plus size={20} className="mr-2" />
          New Order
        </button>
      </div>

      {/* Success Message */}
      {showSuccessMessage && (
        <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-md">
          <div className="flex items-center">
            <CheckCircle size={20} className="mr-2" />
            {successMessage}
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { key: 'pending', label: 'New Orders', count: orders.length },
              { key: 'ongoing', label: 'Ongoing Orders', count: 0 },
              { key: 'completed', label: 'Completed Orders', count: 0 },
              { key: 'cancelled', label: 'Cancelled Orders', count: 0 },
              { key: 'custom', label: 'Custom Orders', count: 0 },
              { key: 'guest_referrals', label: 'Referral Guest Orders', count: orders.filter(o => (o as any).is_guest_referral).length }
            ].map((tab: any) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === tab.key
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                {tab.label}
                {activeTab === tab.key && (
                  <span className="ml-2 bg-primary-100 text-primary-600 py-0.5 px-2 rounded-full text-xs">
                    {displayedCount}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Search orders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 pl-10 border rounded-md"
          />
          <Search size={20} className="absolute left-3 top-2.5 text-gray-400" />
        </div>
      </div>



      {/* Tab Content */}
      {activeTab === 'guest_referrals' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Guest</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Property Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Preferred Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Cost</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Referral</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {orders.filter((o: any) => o.is_guest_referral).length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                      <div className="text-lg font-medium mb-2">No referral guest orders found</div>
                      <div className="text-sm">Guest orders created via referral links will appear here.</div>
                    </td>
                  </tr>
                ) : (
                  // Only show guest referral orders that are still pending
                  orders.filter((o: any) => o.is_guest_referral && o.status === 'pending').map((order: any) => (
                    <tr key={order.id}>
                      <td className="px-4 py-4 whitespace-nowrap">{order.booking_id}</td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{order.client_name || order.guest_name || 'Guest'}</div>
                        <div className="text-xs text-gray-500">{order.client_email || order.guest_email || ''}</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">{order.property_type}</td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-gray-900 max-w-24 truncate">{order.location_address || order.location}</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">{order.preferred_date ? new Date(order.preferred_date).toLocaleDateString() : 'Not specified'}</td>
                      <td className="px-4 py-4 whitespace-nowrap">{formatCurrency(order.total_cost || order.total_amount || 0)}</td>
                      <td className="px-4 py-4 whitespace-nowrap">{order.referral_name || order.referral_id || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => {
                              setAcceptingOrderId(order.id);
                              setShowAcceptModal(true);
                              setAcceptAmount(String(order.total_cost || ''));
                            }}
                            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => {
                              setSelectedOrder(order);
                              setShowRejectModal(true);
                            }}
                            className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {/* Tab Content */}
      {activeTab === 'pending' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {/* Horizontal scroll wrapper */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Property Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Preferred Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Cost</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pilot</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Editor</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Referral</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                      <div className="text-lg font-medium mb-2">No pending orders found</div>
                      <div className="text-sm">
                        Orders will appear here when clients submit new bookings from the Client Dashboard.
                        <br />
                        Make sure clients are creating bookings with status 'pending'.
                      </div>
                    </td>
                  </tr>
                ) : (
                  // Render pending + pending_approval orders
                  filteredOrders.filter(order => order.status === 'pending' || order.status === 'pending_approval').map((order: any) => (
                    <tr key={order.id}>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div>{order.booking_id || `#${order.id}`}</div>
                        {order.booking_category === 'business' && (
                          <span className="inline-block mt-1 px-2 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-bold rounded-full uppercase tracking-wide">Business</span>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {order.booking_category === 'business' ? (
                          <div>
                            <div className="font-medium text-gray-900">{order.brand_name || order.guest_name || 'Business Client'}</div>
                            <div className="text-xs text-gray-500">{order.guest_email}</div>
                            <div className="text-xs text-gray-400">{order.guest_phone}</div>
                          </div>
                        ) : order.client_id ? (
                          <div>
                            <a href={`/admin/clients/${order.client_id}`} className="text-blue-600 hover:text-blue-900 underline font-medium">
                              {order.client_name}
                            </a>
                            <div className="text-xs text-gray-500">{order.client_email}</div>
                          </div>
                        ) : (
                          <span className="text-gray-500">No Client</span>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">{order.property_type }</td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-gray-900 max-w-24 truncate">
                          {(order.location_address || order.location || 'Not specified').length > 20
                            ? (order.location_address || order.location || 'Not specified').substring(0, 20) + '...'
                            : (order.location_address || order.location || 'Not specified')
                          }
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">{order.preferred_date ? new Date(order.preferred_date).toLocaleDateString() : 'Not specified'}</td>
                      <td className="px-4 py-4 whitespace-nowrap">{formatCurrency(order.total_cost || order.total_amount || 0)}</td>
                      <td className="px-4 py-4 whitespace-nowrap">{order.pilot_id ? <a href={`/admin/pilots/${order.pilot_id}`} className="text-blue-600 hover:text-blue-900 underline text-sm">{order.pilot_name}</a> : <span className="text-gray-500 text-sm">Unassigned</span>}</td>
                      <td className="px-4 py-4 whitespace-nowrap">{order.editor_id ? <a href={`/admin/editors/${order.editor_id}`} className="text-blue-600 hover:text-blue-900 underline text-sm">{order.editor_name}</a> : <span className="text-gray-500 text-sm">Unassigned</span>}</td>
                      <td className="px-4 py-4 whitespace-nowrap">{order.referral_id ? <span className="text-sm text-gray-900">{order.referral_name || `REF-${order.referral_id}`}</span> : <span className="text-gray-500 text-sm">None</span>}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button onClick={() => { setSelectedOrder(order); setShowDetailsModal(true); }} className="text-blue-600 hover:text-blue-900" title="View Details"><Eye size={16} /></button>
                          <button onClick={() => handleDeleteOrder(order.id)} className="text-red-600 hover:text-red-900" title="Delete"><Trash2 size={16} /></button>
                          <button onClick={() => handleApproveOrder(order.id)} className="text-green-600 hover:text-green-900" title="Approve"><CheckCircle size={16} /></button>
                          <button onClick={() => { setSelectedOrder(order); setShowRejectModal(true); }} className="text-red-600 hover:text-red-900" title="Reject"><XCircle size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Custom Orders Tab (> 50,000 sqft) */}
  {activeTab === 'custom' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Property</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Area (sqft)</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {customFilteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      <div className="text-lg font-medium mb-2">No custom-sized orders found</div>
                      <div className="text-sm">Orders larger than 50,000 sqft will appear here.</div>
                    </td>
                  </tr>
                ) : (
                  customFilteredOrders.map((order) => {
                    const sqft = Math.round(getSqft(order));
                    return (
                      <tr key={order.id}>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-blue-600">{order.booking_id}</div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          {order.client_id ? (
                            <div>
                              <a href={`/admin/clients/${order.client_id}`} className="text-blue-600 hover:text-blue-900 underline font-medium">
                                {order.client_name}
                              </a>
                              <div className="text-xs text-gray-500">{order.client_email}</div>
                            </div>
                          ) : (
                            <span className="text-gray-500">No Client</span>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 max-w-28 truncate">{order.property_type || order.industry || 'Not specified'}</div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{sqft.toLocaleString()}</div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-sm text-gray-900 max-w-40 truncate">
                            {order.location_address || order.location || 'Not specified'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => { setSelectedOrder(order); setShowDetailsModal(true); }}
                              className="text-blue-600 hover:text-blue-900"
                              title="View Details"
                            >
                              <Eye size={16} />
                            </button>
                            {order.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleApproveOrder(order.id)}
                                  className="text-green-600 hover:text-green-900"
                                  title="Accept & Set Amount"
                                >
                                  <CheckCircle size={16} />
                                </button>
                                <button
                                  onClick={() => { setSelectedOrder(order); setShowRejectModal(true); }}
                                  className="text-red-600 hover:text-red-900"
                                  title="Reject"
                                >
                                  <XCircle size={16} />
                                </button>
                              </>
                            )}
                            {order.client_email && (
                              <a
                                href={`mailto:${encodeURIComponent(order.client_email)}?subject=${encodeURIComponent('Custom Order Consultation - ' + (order.booking_id || 'Order'))}&body=${encodeURIComponent(`Hi ${order.client_name || 'there'},\n\nWe noticed your order ${order.booking_id || ''} has a large area (~${sqft.toLocaleString()} sqft). We'd love to discuss details and prepare a custom plan and quote.\n\nProperty: ${order.property_type || order.industry || 'N/A'}\nLocation: ${order.location_address || order.location || 'N/A'}\nPreferred Date: ${order.preferred_date ? new Date(order.preferred_date).toLocaleDateString() : 'N/A'}\n\nPlease reply with a convenient time for a quick call.\n\nThanks,\nHMX Team`)}`}
                                className="text-green-600 hover:text-green-900"
                                title="Email Client"
                              >
                                <Mail size={16} />
                              </a>
                            )}
                          </div>
                        </td>
      {/* Accept Custom Order Modal */}
      {showAcceptModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-semibold">Accept Custom Order</h2>
              <button
                onClick={() => setShowAcceptModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Enter Custom Total Cost (INR)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={acceptAmount}
                    onChange={e => setAcceptAmount(e.target.value)}
                    placeholder="e.g. 100000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={() => setShowAcceptModal(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAcceptSubmit}
                    disabled={!acceptAmount || isNaN(Number(acceptAmount)) || Number(acceptAmount) <= 0}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Accept & Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}


      {/* Ongoing Orders Tab */}
      {activeTab === 'ongoing' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Property</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shoot Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pilot</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Editor</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Video Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOrders.map((order) => (
                <tr key={order.id}>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-blue-600">{order.booking_id}</div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    {order.client_id ? (
                      <div>
                        <a
                          href={`/admin/clients/${order.client_id}`}
                          className="text-blue-600 hover:text-blue-900 underline font-medium"
                        >
                          {order.client_name}
                        </a>
                        <div className="text-xs text-gray-500">{order.client_email}</div>
                      </div>
                    ) : (
                      <span className="text-gray-500">No Client</span>
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 max-w-20 truncate">{order.property_type || order.industry || 'Not specified'}</div>
                    <div className="text-xs text-gray-500">{order.area_size ? `${order.area_size} ${order.area_unit || 'sq_ft'}` : ''}</div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {order.preferred_date ? new Date(order.preferred_date).toLocaleDateString() : 'Not set'}
                    </div>
                    <div className="text-xs text-gray-500">{order.preferred_time || ''}</div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    {order.pilot_id ? (
                      <a
                        href={`/admin/pilots/${order.pilot_id}`}
                        className="text-blue-600 hover:text-blue-900 underline text-sm"
                      >
                        {order.pilot_name}
                      </a>
                    ) : (
                      <span className="text-red-500 text-sm">Unassigned</span>
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    {order.editor_id ? (
                      <a
                        href={`/admin/editors/${order.editor_id}`}
                        className="text-blue-600 hover:text-blue-900 underline text-sm"
                      >
                        {order.editor_name}
                      </a>
                    ) : (
                      <span className="text-red-500 text-sm">Unassigned</span>
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <select
                      value={order.status}
                      onChange={(e) => handleStatusChange(order.id, e.target.value)}
                      className={`px-2 py-1 text-xs font-semibold rounded-md border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 cursor-pointer ${getStatusColor(order.status)}`}
                      title="Click to change status"
                    >
                      {statusOptions.map((option) => (
                        <option key={option.value} value={option.value} className="bg-white text-gray-900">
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm">
                      {order.drive_link ? (
                        <a href={order.drive_link} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:text-green-900">
                          Raw Video ✓
                        </a>
                      ) : (
                        <span className="text-gray-500">Pending</span>
                      )}
                    </div>
                    <div className="text-xs">
                      {order.delivery_video_link ? (
                        <a href={order.delivery_video_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-900">
                          Final Video ✓
                        </a>
                      ) : (
                        <span className="text-gray-500">Editing</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => {
                          setSelectedOrder(order);
                          setShowDetailsModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                        title="View Details"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedOrder(order);
                          setShowAssignModal(true);
                        }}
                        className="text-purple-600 hover:text-purple-900"
                        title="Manage Assignments"
                      >
                        <Settings size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Completed Orders Tab */}
      {activeTab === 'completed' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Property</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pilot</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Editor</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Videos</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Completed</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOrders.map((order) => (
                <tr key={order.id}>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-blue-600">{order.booking_id}</div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    {order.client_id ? (
                      <div>
                        <a
                          href={`/admin/clients/${order.client_id}`}
                          className="text-blue-600 hover:text-blue-900 underline font-medium"
                        >
                          {order.client_name}
                        </a>
                        <div className="text-xs text-gray-500">{order.client_email}</div>
                      </div>
                    ) : (
                      <span className="text-gray-500">No Client</span>
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 max-w-20 truncate">{order.property_type || order.industry || 'Not specified'}</div>
                    <div className="text-xs text-gray-500 max-w-20 truncate">{order.location_address || order.location}</div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    {order.pilot_id ? (
                      <a
                        href={`/admin/pilots/${order.pilot_id}`}
                        className="text-blue-600 hover:text-blue-900 underline text-sm"
                      >
                        {order.pilot_name}
                      </a>
                    ) : (
                      <span className="text-gray-500">No Pilot</span>
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    {order.editor_id ? (
                      <a
                        href={`/admin/editors/${order.editor_id}`}
                        className="text-blue-600 hover:text-blue-900 underline text-sm"
                      >
                        {order.editor_name}
                      </a>
                    ) : (
                      <span className="text-gray-500">No Editor</span>
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {formatCurrency(order.total_cost || order.total_amount || 0)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {order.payment_status === 'completed' ? 'Paid' : 'Pending'}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      {order.drive_link && (
                        <a href={order.drive_link} target="_blank" rel="noopener noreferrer" className="block text-xs text-green-600 hover:text-green-900">
                          Raw Video ✓
                        </a>
                      )}
                      {order.delivery_video_link && (
                        <a href={order.delivery_video_link} target="_blank" rel="noopener noreferrer" className="block text-xs text-blue-600 hover:text-blue-900">
                          Final Video ✓
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {new Date(order.created_at).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => {
                        setSelectedOrder(order);
                        setShowDetailsModal(true);
                      }}
                      className="text-blue-600 hover:text-blue-900"
                      title="View Details"
                    >
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Cancelled Orders Tab */}
      {activeTab === 'cancelled' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Property</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Admin Comments</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cancelled Date</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOrders.map((order) => (
                <tr key={order.id}>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-red-600">{order.booking_id}</div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    {order.client_id ? (
                      <div>
                        <a
                          href={`/admin/clients/${order.client_id}`}
                          className="text-blue-600 hover:text-blue-900 underline font-medium"
                        >
                          {order.client_name}
                        </a>
                        <div className="text-xs text-gray-500">{order.client_email}</div>
                      </div>
                    ) : (
                      <span className="text-gray-500">No Client</span>
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 max-w-20 truncate">{order.property_type || order.industry || 'Not specified'}</div>
                    <div className="text-xs text-gray-500 max-w-20 truncate">{order.location_address || order.location}</div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm text-gray-900 max-w-xs">
                      {order.admin_comments || 'No comments provided'}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {formatCurrency(order.total_cost || order.total_amount || 0)}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {new Date(order.created_at).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => {
                          setSelectedOrder(order);
                          setShowDetailsModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                        title="View Details"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => handleRetakeOrder(order.id)}
                        className="text-green-600 hover:text-green-900"
                        title="Retake Order"
                      >
                        <CheckCircle size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Order Details Modal */}
      {showDetailsModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[95vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b bg-gray-50">
              <h2 className="text-2xl font-bold text-gray-800">Complete Order Details - {selectedOrder.booking_id}</h2>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-3 gap-6">

                {/* Basic Information */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-bold text-blue-800 mb-3 text-lg">📋 Basic Information</h3>
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm font-medium text-gray-600">Order ID:</span>
                      <p className="text-gray-900 font-semibold">{selectedOrder.booking_id}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">Internal ID:</span>
                      <p className="text-gray-900">{selectedOrder.id}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">Status:</span>
                      <select
                        value={selectedOrder.status}
                        onChange={(e) => {
                          handleStatusChange(selectedOrder.id, e.target.value);
                          setSelectedOrder({ ...selectedOrder, status: e.target.value });
                        }}
                        className={`ml-2 px-3 py-1 text-sm font-semibold rounded-md border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 cursor-pointer ${getStatusColor(selectedOrder.status)}`}
                        title="Click to change status"
                      >
                        {statusOptions.map((option) => (
                          <option key={option.value} value={option.value} className="bg-white text-gray-900">
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">Created Date:</span>
                      <p className="text-gray-900">{new Date(selectedOrder.created_at).toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">Last Updated:</span>
                      <p className="text-gray-900">{selectedOrder.updated_at ? new Date(selectedOrder.updated_at).toLocaleString() : 'Not updated'}</p>
                    </div>
                  </div>
                </div>

                {/* Client Information */}
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="font-bold text-green-800 mb-3 text-lg">👤 Client Information</h3>
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm font-medium text-gray-600">Client ID:</span>
                      <p className="text-gray-900">{selectedOrder.client_id || 'Not assigned'}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">Client Name:</span>
                      <p className="text-gray-900 font-semibold">{selectedOrder.client_name || 'Unknown'}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">Email:</span>
                      <p className="text-gray-900">{selectedOrder.client_email || 'Not provided'}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">User ID:</span>
                      <p className="text-gray-900">{selectedOrder.user_id || 'Not linked'}</p>
                    </div>
                  </div>
                </div>

                {/* Assignment Information */}
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h3 className="font-bold text-purple-800 mb-3 text-lg">👥 Team Assignment</h3>
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm font-medium text-gray-600">Pilot ID:</span>
                      <p className="text-gray-900">{selectedOrder.pilot_id || 'Unassigned'}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">Pilot Name:</span>
                      <p className="text-gray-900 font-semibold">{selectedOrder.pilot_name || 'Unassigned'}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">Editor ID:</span>
                      <p className="text-gray-900">{selectedOrder.editor_id || 'Unassigned'}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">Editor Name:</span>
                      <p className="text-gray-900 font-semibold">{selectedOrder.editor_name || 'Unassigned'}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">Referral ID:</span>
                      <p className="text-gray-900">{selectedOrder.referral_id || 'None'}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">Referral Name:</span>
                      <p className="text-gray-900">{selectedOrder.referral_name || 'None'}</p>
                    </div>
                  </div>
                </div>

                {/* Location & Property Details */}
                <div className="bg-yellow-50 p-4 rounded-lg col-span-2">
                  <h3 className="font-bold text-yellow-800 mb-3 text-lg">📍 Location & Property Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm font-medium text-gray-600">Full Address:</span>
                      <p className="text-gray-900">{selectedOrder.location_address || selectedOrder.location || 'Not specified'}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">GPS Coordinates:</span>
                      <p className="text-gray-900">{selectedOrder.gps_link || 'Not provided'}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">Property Type:</span>
                      <p className="text-gray-900">{selectedOrder.property_type || selectedOrder.industry || 'Not specified'}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">Indoor/Outdoor:</span>
                      <p className="text-gray-900">{selectedOrder.indoor_outdoor || 'Not specified'}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">Area Size:</span>
                      <p className="text-gray-900">{selectedOrder.area_size ? `${selectedOrder.area_size} ${selectedOrder.area_unit || 'sq_ft'}` : selectedOrder.area_sqft ? `${selectedOrder.area_sqft} sq_ft` : 'Not specified'}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">Number of Floors:</span>
                      <p className="text-gray-900">{selectedOrder.num_floors || 'Not specified'}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">Rooms/Sections:</span>
                      <p className="text-gray-900">{selectedOrder.rooms_sections || 'Not specified'}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">Duration:</span>
                      <p className="text-gray-900">{selectedOrder.duration ? `${selectedOrder.duration} hours` : 'Not specified'}</p>
                    </div>
                  </div>
                </div>

                {/* Scheduling Information */}
                <div className="bg-indigo-50 p-4 rounded-lg">
                  <h3 className="font-bold text-indigo-800 mb-3 text-lg">📅 Scheduling</h3>
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm font-medium text-gray-600">Preferred Date:</span>
                      <p className="text-gray-900 font-semibold">{selectedOrder.preferred_date ? new Date(selectedOrder.preferred_date).toLocaleDateString() : 'Not specified'}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">Preferred Time:</span>
                      <p className="text-gray-900">{selectedOrder.preferred_time || 'Not specified'}</p>
                    </div>
                    
                    <div>
                      <span className="text-sm font-medium text-gray-600">Area Covered:</span>
                      <p className="text-gray-900">{selectedOrder.area_size || 'Not specified'}</p>
                    </div>
                  </div>
                </div>

                {/* Financial Details */}
                <div className="bg-green-50 p-4 rounded-lg col-span-2">
                  <h3 className="font-bold text-green-800 mb-3 text-lg">💰 Financial Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm font-medium text-gray-600">Base Package Cost:</span>
                      <p className="text-gray-900 font-semibold">{formatCurrency(selectedOrder.base_package_cost || selectedOrder.base_cost || 0)}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">Travel Cost:</span>
                      <p className="text-gray-900">{formatCurrency(selectedOrder.travel_cost || 0)}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">Tax Percentage:</span>
                      <p className="text-gray-900">{selectedOrder.tax_percentage ? `${selectedOrder.tax_percentage}%` : 'Not specified'}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">Discount Code:</span>
                      <p className="text-gray-900">{selectedOrder.discount_code || 'None'}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">Discount Amount:</span>
                      <p className="text-gray-900">{formatCurrency(selectedOrder.discount_amount || 0)}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">Final Cost:</span>
                      <p className="text-gray-900 font-bold text-lg">{formatCurrency(selectedOrder.total_cost || selectedOrder.final_cost || selectedOrder.total_amount || 0)}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">Payment Status:</span>
                      <span className={`px-2 py-1 text-xs rounded-full ${selectedOrder.payment_status === 'completed' ? 'bg-green-100 text-green-800' : selectedOrder.payment_status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                        {selectedOrder.payment_status || 'Unknown'}
                      </span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">Payment Amount:</span>
                      <p className="text-gray-900">{formatCurrency(selectedOrder.payment_amount || 0)}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">Payment Date:</span>
                      <p className="text-gray-900">{selectedOrder.payment_date ? new Date(selectedOrder.payment_date).toLocaleDateString() : 'Not paid'}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">Completed Date:</span>
                      <p className="text-gray-900">{selectedOrder.completed_date ? new Date(selectedOrder.completed_date).toLocaleDateString() : 'Not completed'}</p>
                    </div>
                  </div>
                </div>

                {/* Custom Quote */}
                <div className="bg-orange-50 p-4 rounded-lg">
                  <h3 className="font-bold text-orange-800 mb-3 text-lg">📝 Custom Quote</h3>
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm font-medium text-gray-600">Custom Quote:</span>
                      <p className="text-gray-900">{selectedOrder.custom_quote || 'No custom quote'}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">Description:</span>
                      <p className="text-gray-900">{selectedOrder.description || 'No description'}</p>
                    </div>
                  </div>
                </div>

                {/* Requirements & Notes */}
                <div className="col-span-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-bold text-gray-800 mb-3 text-lg">📋 Requirements</h3>
                      <div className="space-y-3">
                        <div>
                          <span className="text-sm font-medium text-gray-600">General Requirements:</span>
                          <p className="text-gray-900 text-sm">{selectedOrder.requirements || 'No requirements specified'}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-600">Special Requirements:</span>
                          <p className="text-gray-900 text-sm">{selectedOrder.special_requirements || 'No special requirements'}</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-bold text-gray-800 mb-3 text-lg">💬 Notes & Comments</h3>
                      <div className="space-y-3">
                        <div>
                          <span className="text-sm font-medium text-gray-600">Pilot Notes:</span>
                          <p className="text-gray-900 text-sm">{selectedOrder.pilot_notes || 'No pilot notes'}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-600">Client Notes:</span>
                          <p className="text-gray-900 text-sm">{selectedOrder.client_notes || 'No client notes'}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-600">Admin Comments:</span>
                          <p className="text-gray-900 text-sm">{selectedOrder.admin_comments || 'No admin comments'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Links & Deliverables */}
                <div className="bg-blue-50 p-4 rounded-lg col-span-3">
                  <h3 className="font-bold text-blue-800 mb-3 text-lg">🔗 Links & Deliverables</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm font-medium text-gray-600">Raw Video Drive Link:</span>
                      {selectedOrder.drive_link ? (
                        <a href={selectedOrder.drive_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-900 underline block">
                          📁 View Raw Video Files
                        </a>
                      ) : (
                        <p className="text-gray-500">Not uploaded yet</p>
                      )}
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">Final Delivery Video:</span>
                      {selectedOrder.delivery_video_link ? (
                        <a href={selectedOrder.delivery_video_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-900 underline block">
                          🎬 View Final Video
                        </a>
                      ) : (
                        <p className="text-gray-500">Not delivered yet</p>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assignment Modal */}
      {showAssignModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-semibold">Manage Assignments</h2>
              <button
                onClick={() => setShowAssignModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assign Pilot
                  </label>
                  <select
                    value={selectedOrder.pilot_id || ''}
                    onChange={(e) => {
                      const pilotId = e.target.value ? parseInt(e.target.value) : null;
                      handleUpdateOrder(selectedOrder.id, { pilot_id: pilotId, status: 'assigned' });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select Pilot</option>
                    {pilots.map((pilot) => (
                      <option key={pilot.id} value={pilot.id}>
                        {pilot.name} - {pilot.email}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assign Editor
                  </label>
                  <select
                    value={selectedOrder.editor_id || ''}
                    onChange={(e) => {
                      const editorId = e.target.value ? parseInt(e.target.value) : null;
                      handleUpdateOrder(selectedOrder.id, { editor_id: editorId, status: 'assigned' });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select Editor</option>
                    {editors.map((editor) => (
                      <option key={editor.id} value={editor.id}>
                        {editor.name} - {editor.email}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={() => setShowAssignModal(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-semibold">Reject Order</h2>
              <button
                onClick={() => setShowRejectModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for Rejection
                  </label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Please provide a reason for rejecting this order..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    rows={4}
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={() => setShowRejectModal(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleRejectOrder(selectedOrder.id)}
                    disabled={!rejectReason.trim()}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Reject Order
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Accept (Approve with custom amount) Modal - Global */}
      {showAcceptModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-semibold">Approve Order</h2>
              <button onClick={() => setShowAcceptModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Total Amount (INR)</label>
                <input
                  type="number"
                  min={0}
                  value={acceptAmount}
                  onChange={(e) => setAcceptAmount(e.target.value)}
                  placeholder="Enter final order amount"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowAcceptModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAcceptSubmit}
                  disabled={!acceptAmount || isNaN(Number(acceptAmount)) || Number(acceptAmount) <= 0}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Approve
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Order Modal */}
      <CreateOrderModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onOrderCreated={handleOrderCreated}
      />
    </div>
  );
};

export default Orders;
