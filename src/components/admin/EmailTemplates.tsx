import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface EmailTemplate {
  name: string;
  subject: string;
  body: string;
}

const EmailTemplates: React.FC = () => {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTemplate, setNewTemplate] = useState({ name: '', subject: '', body: '' });

  // Fetch all templates list
  const fetchTemplates = async () => {
    try {
      const res = await axios.get('/api/admin/email-templates', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setTemplates(res.data);
      if (res.data.length > 0 && !selectedTemplate) {
        setSelectedTemplate(res.data[0]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleSelectTemplate = async (template: EmailTemplate) => {
    try {
      const res = await axios.get(`/api/admin/email-templates/${template.name}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setSelectedTemplate(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async () => {
    if (!selectedTemplate) return;
    setLoading(true);
    setMessage('');
    try {
      await axios.put(
        `/api/admin/email-templates/${selectedTemplate.name}`,
        { subject: selectedTemplate.subject, body: selectedTemplate.body },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setMessage('✅ Template saved successfully!');
    } catch (err) {
      console.error(err);
      setMessage('❌ Failed to save template.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      await axios.post(
        '/api/admin/email-templates',
        newTemplate,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setShowCreateModal(false);
      setNewTemplate({ name: '', subject: '', body: '' });
      fetchTemplates();
    } catch (err) {
      console.error(err);
      alert('❌ Failed to create template');
    }
  };

  // Preview renderer (with sample variables)
  const renderPreview = (tpl: EmailTemplate) => {
    let previewHtml = tpl.body;

    // Insert example values for dynamic templates
    if (tpl.name === "order_approved") {
      previewHtml = previewHtml
        .replace(/{{name}}/g, "John Doe")
        .replace(/{{booking_id}}/g, "12345")
        .replace(/{{location}}/g, "New York City")
        .replace(/{{date}}/g, "2025-08-30");
    } else if (tpl.name === "order_rejected") {
      previewHtml = previewHtml
        .replace(/{{name}}/g, "John Doe")
        .replace(/{{booking_id}}/g, "12345")
        .replace(/{{reason}}/g, "Incomplete documents");
    } else if (tpl.name === "order_deleted") {
      previewHtml = previewHtml
        .replace(/{{name}}/g, "John Doe")
        .replace(/{{booking_id}}/g, "12345");
    }

    return <div dangerouslySetInnerHTML={{ __html: previewHtml }} />;
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Email Templates</h1>

      {/* Buttons */}
      <div className="flex gap-4 mb-4 flex-wrap">
        {templates.map((tpl) => (
          <button
            key={tpl.name}
            onClick={() => handleSelectTemplate(tpl)}
            className={`px-4 py-2 rounded ${
              selectedTemplate?.name === tpl.name ? 'bg-blue-600 text-white' : 'bg-gray-200'
            }`}
          >
            {tpl.name}
          </button>
        ))}

        {/* Create New */}
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 rounded bg-green-600 text-white"
        >
          + Create New
        </button>
      </div>

      {/* Editor */}
      {selectedTemplate && (
        <div>
          <div className="mb-4">
            <label className="block font-medium mb-1">Subject</label>
            <input
              type="text"
              value={selectedTemplate.subject}
              onChange={(e) =>
                setSelectedTemplate({ ...selectedTemplate, subject: e.target.value })
              }
              className="w-full px-4 py-2 border rounded"
            />
          </div>

          <div className="mb-4">
            <label className="block font-medium mb-1">Body</label>
            <textarea
              value={selectedTemplate.body}
              onChange={(e) =>
                setSelectedTemplate({ ...selectedTemplate, body: e.target.value })
              }
              rows={10}
              className="w-full px-4 py-2 border rounded"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-2 rounded"
          >
            {loading ? 'Saving...' : 'Save Template'}
          </button>

          {message && <p className="mt-2">{message}</p>}

          {/* Live Preview */}
          <div className="mt-6 border rounded p-4 bg-gray-50">
            <h3 className="font-semibold mb-2">Preview</h3>
            {renderPreview(selectedTemplate)}
          </div>
        </div>
      )}

      {/* Create Template Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <h2 className="text-xl font-semibold mb-4">Create New Template</h2>

            <label className="block mb-2 font-medium">Template Name</label>
            <input
              type="text"
              value={newTemplate.name}
              onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
              className="w-full mb-4 px-3 py-2 border rounded"
              placeholder="e.g. pilot_credentials"
            />

            <label className="block mb-2 font-medium">Subject</label>
            <input
              type="text"
              value={newTemplate.subject}
              onChange={(e) => setNewTemplate({ ...newTemplate, subject: e.target.value })}
              className="w-full mb-4 px-3 py-2 border rounded"
              placeholder="Email subject"
            />

            <label className="block mb-2 font-medium">Body</label>
            <textarea
              value={newTemplate.body}
              onChange={(e) => setNewTemplate({ ...newTemplate, body: e.target.value })}
              rows={6}
              className="w-full mb-4 px-3 py-2 border rounded"
              placeholder="HTML body with {{variables}}"
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 bg-gray-300 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                className="px-4 py-2 bg-green-600 text-white rounded"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailTemplates;
