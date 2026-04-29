import React, { useState, useEffect } from 'react';
import { Save, AlertCircle, Mail, Send } from 'lucide-react';
import EmailTestModal from './EmailTestModal';

interface Settings {
  companyName: string;
  email: string;
  phone: string;
  address: string;
  currency: string;
  timezone: string;
  notificationSettings: {
    emailNotifications: boolean;
    orderUpdates: boolean;
    paymentReminders: boolean;
    systemAlerts: boolean;
  };
}

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<Settings>({
    companyName: '',
    email: '',
    phone: '',
    address: '',
    currency: 'INR',
    timezone: 'Asia/Kolkata',
    notificationSettings: {
      emailNotifications: true,
      orderUpdates: true,
      paymentReminders: true,
      systemAlerts: true
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showEmailTest, setShowEmailTest] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/admin/settings', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch settings');
      }

      const data = await response.json();
      setSettings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while fetching settings');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (name.startsWith('notification.')) {
      const settingName = name.split('.')[1];
      setSettings(prev => ({
        ...prev,
        notificationSettings: {
          ...prev.notificationSettings,
          [settingName]: (e.target as HTMLInputElement).checked
        }
      }));
    } else {
      setSettings(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      setSuccess(null);

      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(settings)
      });

      if (!response.ok) {
        throw new Error('Failed to update settings');
      }

      setSuccess('Settings updated successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while updating settings');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
          <AlertCircle className="text-red-500 mr-2" size={20} />
          <div className="text-red-700">{error}</div>
        </div>
      )}

      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center">
          <div className="text-green-700">{success}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Company Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Company Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Company Name
              </label>
              <input
                type="text"
                name="companyName"
                value={settings.companyName}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={settings.email}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              <input
                type="tel"
                name="phone"
                value={settings.phone}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address
              </label>
              <input
                type="text"
                name="address"
                value={settings.address}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
          </div>
        </div>

        {/* System Settings */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">System Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Currency
              </label>
              <select
                name="currency"
                value={settings.currency}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="INR">Indian Rupee (₹)</option>
                <option value="USD">US Dollar ($)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Timezone
              </label>
              <select
                name="timezone"
                value={settings.timezone}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="Asia/Kolkata">India (IST)</option>
                <option value="UTC">UTC</option>
                <option value="America/New_York">Eastern Time (ET)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Notification Settings</h2>
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                name="notification.emailNotifications"
                checked={settings.notificationSettings.emailNotifications}
                onChange={handleInputChange}
                className="h-4 w-4 text-primary-600 rounded border-gray-300"
              />
              <label className="ml-2 text-sm text-gray-700">
                Email Notifications
              </label>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                name="notification.orderUpdates"
                checked={settings.notificationSettings.orderUpdates}
                onChange={handleInputChange}
                className="h-4 w-4 text-primary-600 rounded border-gray-300"
              />
              <label className="ml-2 text-sm text-gray-700">
                Order Updates
              </label>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                name="notification.paymentReminders"
                checked={settings.notificationSettings.paymentReminders}
                onChange={handleInputChange}
                className="h-4 w-4 text-primary-600 rounded border-gray-300"
              />
              <label className="ml-2 text-sm text-gray-700">
                Payment Reminders
              </label>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                name="notification.systemAlerts"
                checked={settings.notificationSettings.systemAlerts}
                onChange={handleInputChange}
                className="h-4 w-4 text-primary-600 rounded border-gray-300"
              />
              <label className="ml-2 text-sm text-gray-700">
                System Alerts
              </label>
            </div>
          </div>
        </div>

        {/* Email Configuration */}
        <div className="bg-white rounded-lg shadow p-6 mt-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Email Configuration</h2>
            <button
              type="button"
              onClick={() => setShowEmailTest(true)}
              className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
            >
              <Send className="mr-2" size={14} />
              Test Email
            </button>
          </div>

          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex">
                <AlertCircle className="text-yellow-600 mr-3 mt-0.5" size={16} />
                <div>
                  <h4 className="text-sm font-medium text-yellow-800 mb-1">Email Configuration Required</h4>
                  <p className="text-sm text-yellow-700 mb-2">
                    To send account creation emails, configure your email settings in the backend/.env file.
                  </p>
                  <div className="text-xs text-yellow-600">
                    <p>1. Copy backend/.env.example to backend/.env</p>
                    <p>2. Add your email credentials (Gmail App Password recommended)</p>
                    <p>3. Restart the backend server</p>
                    <p>4. Use the "Test Email" button to verify configuration</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex">
                <Mail className="text-blue-600 mr-3 mt-0.5" size={16} />
                <div>
                  <h4 className="text-sm font-medium text-blue-800 mb-1">Automatic Email Features</h4>
                  <div className="text-sm text-blue-700 space-y-1">
                    <p>✅ Account creation emails with login credentials</p>
                    <p>✅ Secure password generation and delivery</p>
                    <p>✅ Welcome messages with dashboard links</p>
                    <p>✅ Password change instructions</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
          >
            <Save size={20} className="mr-2" />
            Save Changes
          </button>
        </div>
      </form>

      {/* Email Test Modal */}
      <EmailTestModal
        isOpen={showEmailTest}
        onClose={() => setShowEmailTest(false)}
      />
    </div>
  );
};

export default Settings; 