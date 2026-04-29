import React, { useEffect, useState } from 'react';
import axios from 'axios';

interface PilotApplication {
  id: number;
  name: string;
  email: string;
  phone: string;
  cities: string;
  experience: string;
  equipment: string;
  portfolio_url: string;
  bank_account: string;
  status: string;
  admin_comments: string;
  created_at: string;
}

const API_URL = '/api';

const PilotApplications: React.FC = () => {
  const [applications, setApplications] = useState<PilotApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedApp, setSelectedApp] = useState<PilotApplication | null>(null);
  const [adminComment, setAdminComment] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${API_URL}/admin/pilot-applications`, {
        withCredentials: true,
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setApplications(res.data);
    } catch (err: any) {
      setError('Failed to fetch applications');
    }
    setLoading(false);
  };

  const handleSelect = (app: PilotApplication) => {
    setSelectedApp(app);
    setAdminComment(app.admin_comments || '');
  };

  const handleApprove = async () => {
    if (!selectedApp) return;
    setActionLoading(true);
    try {
      await axios.post(`${API_URL}/admin/pilot-applications/${selectedApp.id}/approve`, {
        admin_comments: adminComment
      }, {
        withCredentials: true,
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setSelectedApp(null);
      fetchApplications();
    } catch (err) {
      alert('Failed to approve application');
    }
    setActionLoading(false);
  };

  const handleReject = async () => {
    if (!selectedApp) return;
    setActionLoading(true);
    try {
      await axios.post(`${API_URL}/admin/pilot-applications/${selectedApp.id}/reject`, {
        admin_comments: adminComment
      }, {
        withCredentials: true,
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setSelectedApp(null);
      fetchApplications();
    } catch (err) {
      alert('Failed to reject application');
    }
    setActionLoading(false);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Pilot Applications</h2>
      {loading ? (
        <div>Loading...</div>
      ) : error ? (
        <div className="text-red-500">{error}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold mb-2">Pending Applications</h3>
            <ul className="divide-y divide-gray-200">
              {applications.filter(a => a.status === 'pending').map(app => (
                <li key={app.id} className="py-3 cursor-pointer hover:bg-gray-100 px-2 rounded" onClick={() => handleSelect(app)}>
                  <div className="font-medium">{app.name} ({app.email})</div>
                  <div className="text-sm text-gray-600">Cities: {app.cities}</div>
                  <div className="text-xs text-gray-400">Applied: {new Date(app.created_at).toLocaleString()}</div>
                </li>
              ))}
            </ul>
          </div>
          <div>
            {selectedApp ? (
              <div className="p-4 border rounded bg-white shadow">
                <h4 className="font-bold mb-2">Application Details</h4>
                <div><b>Name:</b> {selectedApp.name}</div>
                <div><b>Email:</b> {selectedApp.email}</div>
                <div><b>Phone:</b> {selectedApp.phone}</div>
                <div><b>Cities:</b> {selectedApp.cities}</div>
                <div><b>Experience:</b> {selectedApp.experience}</div>
                <div><b>Equipment:</b> {selectedApp.equipment}</div>
                <div><b>Portfolio:</b> <a href={selectedApp.portfolio_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">View</a></div>
                <div><b>Bank Account:</b> {selectedApp.bank_account}</div>
                <div className="mt-2">
                  <label className="block font-semibold mb-1">Admin Comments</label>
                  <textarea
                    className="w-full border rounded p-2"
                    rows={3}
                    value={adminComment}
                    onChange={e => setAdminComment(e.target.value)}
                  />
                </div>
                <div className="flex gap-2 mt-4">
                  <button className="bg-green-600 text-white px-4 py-2 rounded" onClick={handleApprove} disabled={actionLoading}>Approve</button>
                  <button className="bg-red-600 text-white px-4 py-2 rounded" onClick={handleReject} disabled={actionLoading}>Reject</button>
                  <button className="bg-gray-300 px-4 py-2 rounded" onClick={() => setSelectedApp(null)}>Close</button>
                </div>
              </div>
            ) : (
              <div className="text-gray-500">Select an application to review</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PilotApplications; 