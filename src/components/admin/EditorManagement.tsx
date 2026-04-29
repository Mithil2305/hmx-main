import React, { useState, useEffect } from 'react';
import { Search, Eye, Edit, Trash2, Plus, X, User, Phone, Mail, Calendar, FileText, Briefcase, Clock } from 'lucide-react';
import AddEditorForm from './AddEditorForm';

interface Editor {
  id: number;
  name: string;
  full_name?: string;
  email: string;
  phone: string;
  status: string;
  portfolio_url: string;
  created_at: string;
  // Additional fields for detailed view
  role?: string;
  years_experience?: string;
  primary_skills?: string;
  specialization?: string;
  time_zone?: string;
  government_id_url?: string;
  tax_gst_number?: string;
}

const EditorManagement: React.FC = () => {
  const [editors, setEditors] = useState<Editor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEditor, setSelectedEditor] = useState<Editor | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddEditorForm, setShowAddEditorForm] = useState(false);
  const [editorDetails, setEditorDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    portfolio_url: '',
    password: ''
  });

  useEffect(() => {
    fetchEditors();
  }, []);

  const fetchEditors = async () => {
    try {
      const response = await fetch('/api/admin/editors', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setEditors(data);
      setLoading(false);
    } catch (error) {
      setError('Failed to fetch editors');
      setLoading(false);
    }
  };

  const handleAddEditor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/admin/editors', {
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
          portfolio_url: '',
          password: ''
        });
        fetchEditors();
      }
    } catch (error) {
      setError('Failed to add editor');
    }
  };

  const handleUpdateStatus = async (id: number, status: string) => {
    try {
      const response = await fetch(`/api/admin/editors/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status })
      });
      
      if (response.ok) {
        fetchEditors();
      }
    } catch (error) {
      setError('Failed to update editor status');
    }
  };

  const handleDeleteEditor = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this editor?')) return;

    try {
      const response = await fetch(`/api/admin/editors/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        fetchEditors();
      }
    } catch (error) {
      setError('Failed to delete editor');
    }
  };

  const handleViewDetails = async (editor: Editor) => {
    setSelectedEditor(editor);
    setShowDetailsModal(true);
    setLoadingDetails(true);

    try {
      // Fetch detailed editor information
      const response = await fetch(`/api/admin/editors/${editor.id}/details`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const details = await response.json();
        setEditorDetails(details);
      } else {
        // Fallback to basic editor info if detailed endpoint doesn't exist
        setEditorDetails(editor);
      }
    } catch (error) {
      console.error('Error fetching editor details:', error);
      setEditorDetails(editor);
    } finally {
      setLoadingDetails(false);
    }
  };

  const filteredEditors = editors.filter(editor =>
    editor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    editor.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    editor.phone.includes(searchTerm)
  );

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="container mx-auto px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Editor Management</h1>
        <button
          onClick={() => setShowAddEditorForm(true)}
          className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
        >
          <Plus size={20} className="mr-2" />
          Add Editor
        </button>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Search editors..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 pl-10 border rounded-md"
          />
          <Search size={20} className="absolute left-3 top-2.5 text-gray-400" />
        </div>
      </div>

      {/* Editors Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Portfolio</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredEditors.map((editor) => (
              <tr key={editor.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{editor.name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{editor.email}</div>
                  <div className="text-sm text-gray-500">{editor.phone}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <a
                    href={editor.portfolio_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-600 hover:text-primary-900"
                  >
                    View Portfolio
                  </a>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    editor.status === 'active' ? 'bg-green-100 text-green-800' :
                    editor.status === 'inactive' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {editor.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {new Date(editor.created_at).toLocaleDateString()}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end space-x-2">
                    <button
                      onClick={() => handleViewDetails(editor)}
                      className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      <Eye size={16} className="mr-1" />
                      View
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(editor.id, editor.status === 'active' ? 'inactive' : 'active')}
                      className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                    >
                      <Edit size={16} className="mr-1" />
                      {editor.status === 'active' ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => handleDeleteEditor(editor.id)}
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

      {/* Add Editor Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Add New Editor</h2>
            <form onSubmit={handleAddEditor}>
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
                  <label className="block text-sm font-medium text-gray-700">Portfolio URL</label>
                  <input
                    type="url"
                    value={formData.portfolio_url}
                    onChange={(e) => setFormData({ ...formData, portfolio_url: e.target.value })}
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
                  Add Editor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Editor Details Modal */}
      {showDetailsModal && selectedEditor && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">Editor Details</h3>
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
            ) : editorDetails ? (
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
                      <span className="ml-2 text-sm text-gray-900">{editorDetails.full_name || editorDetails.name || selectedEditor.name}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Email:</span>
                      <span className="ml-2 text-sm text-gray-900">{editorDetails.email || selectedEditor.email}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Phone:</span>
                      <span className="ml-2 text-sm text-gray-900">{editorDetails.phone || selectedEditor.phone}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Time Zone:</span>
                      <span className="ml-2 text-sm text-gray-900">{editorDetails.time_zone || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Status:</span>
                      <span className="ml-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          selectedEditor.status === 'active' ? 'bg-green-100 text-green-800' :
                          selectedEditor.status === 'inactive' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {selectedEditor.status}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Professional Information */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
                    <Briefcase size={18} className="mr-2" />
                    Professional Information
                  </h4>
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm font-medium text-gray-500">Role:</span>
                      <span className="ml-2 text-sm text-gray-900">{editorDetails.role || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Years of Experience:</span>
                      <span className="ml-2 text-sm text-gray-900">{editorDetails.years_experience || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Primary Skills:</span>
                      <span className="ml-2 text-sm text-gray-900">{editorDetails.primary_skills || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Specialization:</span>
                      <span className="ml-2 text-sm text-gray-900">{editorDetails.specialization || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Portfolio & Work */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
                    <FileText size={18} className="mr-2" />
                    Portfolio & Work
                  </h4>
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm font-medium text-gray-500">Portfolio:</span>
                      {selectedEditor.portfolio_url ? (
                        <a
                          href={selectedEditor.portfolio_url}
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
                      <span className="text-sm font-medium text-gray-500">Joined:</span>
                      <span className="ml-2 text-sm text-gray-900">
                        {new Date(selectedEditor.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Technical Skills & Equipment */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
                    <FileText size={18} className="mr-2" />
                    Technical Skills & Equipment
                  </h4>
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm font-medium text-gray-500">Equipment:</span>
                      <span className="ml-2 text-sm text-gray-900">{editorDetails.equipment || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Additional Experience:</span>
                      <span className="ml-2 text-sm text-gray-900">{editorDetails.experience || 'N/A'}</span>
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
                      <span className="text-sm font-medium text-gray-500">Tax/GST Number:</span>
                      <span className="ml-2 text-sm text-gray-900">{editorDetails.tax_gst_number || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Government ID:</span>
                      {editorDetails.government_id_url ? (
                        <a
                          href={editorDetails.government_id_url}
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
                      <span className="text-sm font-medium text-gray-500">Approval Status:</span>
                      <span className="ml-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          editorDetails.approval_status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {editorDetails.approval_status || 'Approved'}
                        </span>
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
                onClick={() => handleUpdateStatus(selectedEditor.id, selectedEditor.status === 'active' ? 'inactive' : 'active')}
                className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500"
              >
                {selectedEditor.status === 'active' ? 'Deactivate' : 'Activate'}
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

      {/* Add Editor Form */}
      <AddEditorForm
        isOpen={showAddEditorForm}
        onClose={() => setShowAddEditorForm(false)}
        onSuccess={() => {
          fetchEditors();
          setShowAddEditorForm(false);
        }}
      />
    </div>
  );
};

export default EditorManagement; 