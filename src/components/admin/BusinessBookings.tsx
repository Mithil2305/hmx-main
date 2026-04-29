import React, { useState, useEffect } from 'react';
import { Search, Eye, Building, User, Phone, Mail, MapPin, X, Calendar, RefreshCw, UserCheck, Film } from 'lucide-react';
import { businessBookingService, adminService } from '../../services/api';

interface BusinessBooking {
  id: number;
  brand_name: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  property_type: string;
  location_address: string;
  area_size: number;
  business_size: string;
  preferred_date: string;
  preferred_time: string;
  total_cost: number;
  status: string;
  payment_status: string;
  referral_code: string;
  special_requirements: string;
  company_name: string;
  owner_social_link: string;
  company_social_link: string;
  num_floors: number;
  created_at: string;
}

const STATUS_TABS = [
  { key: '', label: 'All' },
  { key: 'pending_approval', label: 'Pending Approval' },
  { key: 'approved', label: 'Approved' },
  { key: 'assigned', label: 'Assigned' },
  { key: 'ongoing', label: 'Ongoing' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'rejected', label: 'Rejected' },
];

const STATUS_COLORS: Record<string, string> = {
  pending_approval: 'bg-yellow-100 text-yellow-800',
  pending:          'bg-yellow-100 text-yellow-800',
  approved:         'bg-blue-100 text-blue-800',
  assigned:         'bg-indigo-100 text-indigo-800',
  in_progress:      'bg-purple-100 text-purple-800',
  ongoing:          'bg-purple-100 text-purple-800',
  completed:        'bg-green-100 text-green-800',
  cancelled:        'bg-red-100 text-red-800',
  rejected:         'bg-red-100 text-red-800',
  locked_mismatch:  'bg-orange-100 text-orange-800',
};

const PAYMENT_COLORS: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-700',
  paid:    'bg-green-100 text-green-700',
  partial: 'bg-yellow-100 text-yellow-700',
  failed:  'bg-red-100 text-red-700',
};

const BusinessBookings: React.FC = () => {
  const [bookings, setBookings] = useState<BusinessBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<BusinessBooking | null>(null);
  const [saving, setSaving] = useState(false);

  // Pilots & editors for assignment
  const [pilots, setPilots] = useState<any[]>([]);
  const [editors, setEditors] = useState<any[]>([]);

  // Form state in modal
  const [newStatus, setNewStatus] = useState('');
  const [adminComment, setAdminComment] = useState('');
  const [selectedPilot, setSelectedPilot] = useState<number | ''>('');
  const [selectedEditor, setSelectedEditor] = useState<number | ''>('');
  const [customCost, setCustomCost] = useState<string>('');

  useEffect(() => {
    fetchBookings();
    fetchPilotsAndEditors();
  }, [activeTab]);

  const fetchBookings = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await businessBookingService.getAll(activeTab, searchTerm);
      setBookings(data.bookings || []);
    } catch {
      setError('Failed to load business bookings');
    } finally {
      setLoading(false);
    }
  };

  const fetchPilotsAndEditors = async () => {
    try {
      const [pilotsData, editorsData] = await Promise.all([
        fetch('/api/admin/pilots', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }).then(r => r.json()),
        fetch('/api/admin/editors', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }).then(r => r.json()),
      ]);
      setPilots(Array.isArray(pilotsData) ? pilotsData : (pilotsData.pilots || []));
      setEditors(Array.isArray(editorsData) ? editorsData : (editorsData.editors || []));
    } catch {
      // non-critical
    }
  };

  const openModal = (booking: BusinessBooking) => {
    setSelectedBooking(booking);
    setNewStatus(booking.status);
    setAdminComment('');
    setSelectedPilot('');
    setSelectedEditor('');
    setCustomCost(booking.total_cost ? String(booking.total_cost) : '');
  };

  const handleSave = async () => {
    if (!selectedBooking || !newStatus) return;
    setSaving(true);
    try {
      const payload: any = {
        status: newStatus,
        admin_comments: adminComment,
      };
      if (selectedPilot)  payload.pilot_id  = Number(selectedPilot);
      if (selectedEditor) payload.editor_id = Number(selectedEditor);
      if (customCost)     payload.total_cost = parseFloat(customCost);

      await businessBookingService.updateOrder(selectedBooking.id, payload);
      setSelectedBooking(null);
      fetchBookings();
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Failed to update booking');
    } finally {
      setSaving(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchBookings();
  };

  const fmt = (amount: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

  const fmtDate = (d: string) =>
    d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  const isApproval = newStatus === 'approved';

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-heading font-black text-zinc-900">Business Bookings</h1>
          <p className="text-sm text-zinc-500 mt-1">BBD form submissions — approve, assign & manage</p>
        </div>
        <button onClick={fetchBookings} className="flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 rounded-xl text-sm text-zinc-600 hover:bg-zinc-50 transition-colors">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="mb-4 flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by brand, name, email, phone..."
            className="w-full pl-9 pr-4 py-2.5 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20"
          />
        </div>
        <button type="submit" className="px-4 py-2.5 bg-purple-600 text-white text-sm rounded-xl hover:bg-purple-700 transition-colors">Search</button>
      </form>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 flex-wrap">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setSearchTerm(''); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === tab.key ? 'bg-purple-600 text-white' : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" /></div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 text-sm">{error}</div>
      ) : bookings.length === 0 ? (
        <div className="bg-white rounded-2xl border border-zinc-100 p-12 text-center">
          <Building size={40} className="mx-auto text-zinc-300 mb-3" />
          <p className="text-zinc-500 font-medium">No business bookings found</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-100">
                  <th className="text-left px-4 py-3 text-xs font-bold text-zinc-500 uppercase tracking-wider">ID</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-zinc-500 uppercase tracking-wider">Brand / Owner</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-zinc-500 uppercase tracking-wider">Contact</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-zinc-500 uppercase tracking-wider">Category</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-zinc-500 uppercase tracking-wider">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-zinc-500 uppercase tracking-wider">Cost</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-zinc-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-zinc-500 uppercase tracking-wider">Payment</th>
                  <th className="text-center px-4 py-3 text-xs font-bold text-zinc-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {bookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-4 py-3 text-zinc-400 font-mono text-xs">#{booking.id}</td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-zinc-900">{booking.brand_name || '—'}</p>
                      <p className="text-xs text-zinc-500">{booking.guest_name}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-zinc-700">{booking.guest_email}</p>
                      <p className="text-xs text-zinc-500">{booking.guest_phone}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-zinc-700 capitalize">{(booking.property_type || '').replace(/-/g, ' ')}</p>
                      <p className="text-xs text-zinc-500 capitalize">{booking.business_size}</p>
                    </td>
                    <td className="px-4 py-3 text-zinc-600">{fmtDate(booking.preferred_date)}</td>
                    <td className="px-4 py-3 font-semibold text-zinc-900">{booking.total_cost ? fmt(booking.total_cost) : '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[booking.status] || 'bg-gray-100 text-gray-700'}`}>
                        {(booking.status || '').replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${PAYMENT_COLORS[booking.payment_status] || 'bg-gray-100 text-gray-700'}`}>
                        {booking.payment_status || 'pending'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => openModal(booking)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg text-xs font-medium hover:bg-purple-100 transition-colors"
                      >
                        <Eye size={13} /> Manage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-zinc-100">
              <div>
                <h2 className="text-lg font-bold text-zinc-900">{selectedBooking.brand_name || selectedBooking.guest_name}</h2>
                <p className="text-sm text-zinc-500">Booking #{selectedBooking.id} · {fmtDate(selectedBooking.created_at)}</p>
              </div>
              <button onClick={() => setSelectedBooking(null)} className="p-2 hover:bg-zinc-100 rounded-xl transition-colors"><X size={18} /></button>
            </div>

            <div className="p-6 space-y-5">
              {/* Contact */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <User size={16} className="text-zinc-400 mt-0.5 shrink-0" />
                  <div><p className="text-xs text-zinc-500 font-medium">Owner</p><p className="text-sm text-zinc-900">{selectedBooking.guest_name}</p></div>
                </div>
                <div className="flex items-start gap-3">
                  <Building size={16} className="text-zinc-400 mt-0.5 shrink-0" />
                  <div><p className="text-xs text-zinc-500 font-medium">Company</p><p className="text-sm text-zinc-900">{selectedBooking.company_name || '—'}</p></div>
                </div>
                <div className="flex items-start gap-3">
                  <Mail size={16} className="text-zinc-400 mt-0.5 shrink-0" />
                  <div><p className="text-xs text-zinc-500 font-medium">Email</p><p className="text-sm text-zinc-900">{selectedBooking.guest_email}</p></div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone size={16} className="text-zinc-400 mt-0.5 shrink-0" />
                  <div><p className="text-xs text-zinc-500 font-medium">Phone</p><p className="text-sm text-zinc-900">{selectedBooking.guest_phone}</p></div>
                </div>
              </div>

              {/* Property */}
              <div className="bg-zinc-50 rounded-xl p-4 grid grid-cols-2 gap-4">
                <div><p className="text-xs text-zinc-500 font-medium">Category</p><p className="text-sm text-zinc-900 capitalize">{(selectedBooking.property_type || '').replace(/-/g, ' ')}</p></div>
                <div><p className="text-xs text-zinc-500 font-medium">Business Size</p><p className="text-sm text-zinc-900 capitalize">{selectedBooking.business_size}</p></div>
                <div><p className="text-xs text-zinc-500 font-medium">Area</p><p className="text-sm text-zinc-900">{selectedBooking.area_size} sq ft · {selectedBooking.num_floors} floor(s)</p></div>
                <div>
                  <p className="text-xs text-zinc-500 font-medium">Quote Cost</p>
                  <p className="text-sm font-bold text-zinc-900">{selectedBooking.total_cost ? fmt(selectedBooking.total_cost) : '—'}</p>
                </div>
              </div>

              {/* Location + Date */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <MapPin size={16} className="text-zinc-400 mt-0.5 shrink-0" />
                  <div><p className="text-xs text-zinc-500 font-medium">Address</p><p className="text-sm text-zinc-900">{selectedBooking.location_address}</p></div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar size={16} className="text-zinc-400 mt-0.5 shrink-0" />
                  <div><p className="text-xs text-zinc-500 font-medium">Preferred Date & Time</p><p className="text-sm text-zinc-900">{fmtDate(selectedBooking.preferred_date)} · {selectedBooking.preferred_time}</p></div>
                </div>
              </div>

              {/* Notes */}
              {selectedBooking.special_requirements && (
                <div><p className="text-xs text-zinc-500 font-medium mb-1">Notes</p><p className="text-sm text-zinc-700 bg-zinc-50 rounded-xl px-3 py-2">{selectedBooking.special_requirements}</p></div>
              )}

              {/* ── Action Panel ── */}
              <div className="border-t border-zinc-100 pt-5 space-y-4">
                <p className="text-sm font-bold text-zinc-800">Update & Assign</p>

                {/* Status */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1.5">Status</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  >
                    <option value="pending_approval">Pending Approval</option>
                    <option value="approved">Approved</option>
                    <option value="assigned">Assigned</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="rejected">Rejected</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                {/* Cost — shown when approving */}
                {isApproval && (
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 mb-1.5">Confirmed Cost (₹)</label>
                    <input
                      type="number"
                      value={customCost}
                      onChange={(e) => setCustomCost(e.target.value)}
                      placeholder={String(selectedBooking.total_cost || '')}
                      className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                    />
                    <p className="text-xs text-zinc-400 mt-1">Leave blank to keep quoted cost. Setting this triggers earnings calculation.</p>
                  </div>
                )}

                {/* Pilot assignment — shown when approving or assigning */}
                {(isApproval || newStatus === 'assigned') && (
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 mb-1.5 flex items-center gap-1.5">
                      <UserCheck size={13} /> Assign Pilot
                    </label>
                    <select
                      value={selectedPilot}
                      onChange={(e) => setSelectedPilot(e.target.value ? Number(e.target.value) : '')}
                      className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                    >
                      <option value="">— Select Pilot (optional) —</option>
                      {pilots.map((p: any) => (
                        <option key={p.id} value={p.id}>{p.name} {p.city ? `(${p.city})` : ''}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Editor assignment — shown when approving or assigning */}
                {(isApproval || newStatus === 'assigned') && (
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 mb-1.5 flex items-center gap-1.5">
                      <Film size={13} /> Assign Editor
                    </label>
                    <select
                      value={selectedEditor}
                      onChange={(e) => setSelectedEditor(e.target.value ? Number(e.target.value) : '')}
                      className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                    >
                      <option value="">— Select Editor (optional) —</option>
                      {editors.map((e: any) => (
                        <option key={e.id} value={e.id}>{e.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Admin comment */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1.5">Admin Comment</label>
                  <textarea
                    value={adminComment}
                    onChange={(e) => setAdminComment(e.target.value)}
                    placeholder={newStatus === 'rejected' ? 'Reason for rejection (sent to client)...' : 'Optional internal note...'}
                    rows={2}
                    className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>

                {/* Approval info banner */}
                {isApproval && (
                  <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-700">
                    Approving will send an <strong>approval email</strong> to the client and calculate earnings automatically.
                  </div>
                )}
                {newStatus === 'rejected' && (
                  <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-xs text-red-700">
                    Rejecting will send a <strong>rejection email</strong> to the client with your comment as the reason.
                  </div>
                )}

                {/* Buttons */}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 py-2.5 bg-purple-600 text-white text-sm font-semibold rounded-xl hover:bg-purple-700 disabled:opacity-60 transition-colors"
                  >
                    {saving ? 'Saving...' : isApproval ? 'Approve & Assign' : 'Save Changes'}
                  </button>
                  <button
                    onClick={() => setSelectedBooking(null)}
                    className="px-4 py-2.5 border border-zinc-200 text-zinc-600 text-sm font-semibold rounded-xl hover:bg-zinc-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BusinessBookings;
