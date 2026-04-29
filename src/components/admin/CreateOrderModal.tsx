import React, { useState, useEffect } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import { industries } from '../../data/industries';
import { useAuth } from '../../contexts/AuthContext'; // Import your auth context

interface CreateOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderCreated: () => void;
}

interface Pilot {
  id: number;
  name: string;
  email: string;
}

interface OrderFormData {
  client_name: string;
  client_email: string;
  pilot_id: number;
  property_type: string;
  location_address: string;
  gps_link: string;
  indoor_outdoor: 'Indoor' | 'Outdoor' | 'Both';
  area_size: number;
  area_unit: string;
  rooms_sections: number;
  num_floors: number;
  preferred_date: string;
  preferred_time: string;
  requirements: string;
  referral_id?: string;
  base_package_cost: number;
  total_cost: number; // ✅ Add this field
  industry: string;
  status?: string;
  user_id?: number;
}

const CreateOrderModal: React.FC<CreateOrderModalProps> = ({ isOpen, onClose, onOrderCreated }) => {
  const { user } = useAuth(); // user is the logged-in admin

  const [formData, setFormData] = useState<OrderFormData>({
    client_name: '',
    client_email: '',
    pilot_id: 0,
    property_type: '',
    location_address: '',
    gps_link: '', // Initialize gps_link
    indoor_outdoor: 'Indoor',
    area_size: 0,
    area_unit: 'sq_ft',
    rooms_sections: 1,
    num_floors: 1,
    preferred_date: '',
    preferred_time: '',
    requirements: '',
    referral_id: '',
    base_package_cost: 0, // Initialize base_package_cost
    total_cost: 0, // Initialize total_cost
    industry: '', // ✅ Add this field
    status: 'pending', // Default status
  });
  const propertyOptions = [
    "Retail Store / Showroom",
    "Restaurants & Cafes",
    "Fitness & Sports Arenas",
    "Resorts & Farmstays / Hotels",
    "Real Estate Property",
    "Shopping Mall / Complex",
    "Adventure / Water Parks",
    "Gaming & Entertainment Zones"
  ];

  const [pilots, setPilots] = useState<Pilot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchPilots();
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setFormData(prev => ({ ...prev, preferred_date: tomorrow.toISOString().split('T')[0] }));
    }
  }, [isOpen]);

  const fetchPilots = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/pilots', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setPilots(data);
      }
    } catch (error) {
      console.error('Error fetching pilots:', error);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]:
        ['area_size', 'rooms_sections', 'num_floors'].includes(name)
          ? parseFloat(value) || 0
          : value,
    }));
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const adminUserId = user?.id;
    if (!adminUserId) {
      setError('Admin user ID is missing. Please log in again.');
      return;
    }
    if (
      !formData.location_address ||
      !formData.gps_link ||
      !formData.property_type ||
      !formData.indoor_outdoor ||
      !formData.area_size ||
      !formData.rooms_sections ||
      !formData.num_floors ||
      !formData.preferred_date ||
      !formData.preferred_time ||
      !formData.total_cost // <-- Use total_cost only
    ) {
      setError('Please fill all mandatory fields.');
      return;
    }

    const payload = {
      user_id: adminUserId,
      client_name: formData.client_name,   // ✅ add
      client_email: formData.client_email,
      pilot_id: formData.pilot_id || null,
      property_type: formData.property_type,
      location_address: formData.location_address,
      gps_link: formData.gps_link,
      indoor_outdoor: formData.indoor_outdoor,
      area_size: formData.area_size,
      area_unit: formData.area_unit,
      rooms_sections: formData.rooms_sections,
      num_floors: formData.num_floors,
      preferred_date: formData.preferred_date,
      preferred_time: formData.preferred_time,
      base_package_cost: formData.base_package_cost,
      total_cost: formData.total_cost, // <-- Use total_cost only
      status: formData.status || 'pending',
      requirements: formData.requirements,
      referral_id: formData.referral_id || null,
      industry: formData.industry,
    };

    setLoading(true);

    try {
      const token = localStorage.getItem('token');

      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (response.ok) {
        setSuccess('Booking created successfully!');
        setTimeout(() => {
          onOrderCreated();
          onClose();
          setFormData({
            client_name: '',
            client_email: '',
            pilot_id: 0,
            property_type: '',
            location_address: '',
            gps_link: '', // Reset gps_link
            indoor_outdoor: 'Indoor',
            area_size: 0,
            area_unit: 'sq_ft',
            rooms_sections: 1,
            num_floors: 1,
            preferred_date: '',
            preferred_time: '',
            requirements: '',
            referral_id: '',
            base_package_cost: 0, // Reset base_package_cost
            total_cost: 0, // Reset total_cost
            industry: '',
            status: 'pending',
          });
        }, 1500);
      } else {
        setError(data.message || data.error || 'Failed to create booking');
      }
    } catch (error) {
      console.error('Error creating booking:', error);
      setError('An error occurred while creating the booking');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-semibold">Create New Booking</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" disabled={loading}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && <div className="bg-red-50 border border-red-200 rounded-md p-3 text-red-600">{error}</div>}
          {success && <div className="bg-green-50 border border-green-200 rounded-md p-3 text-green-600">{success}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">Client Name *</label>
              <input
                type="text"
                name="client_name"
                value={formData.client_name}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Client Email *</label>
              <input
                type="email"
                name="client_email"
                value={formData.client_email}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Pilot *</label>
              <select
                name="pilot_id"
                value={formData.pilot_id}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="">Select a pilot</option>
                {pilots.map(pilot => (
                  <option key={pilot.id} value={pilot.id}>
                    {pilot.name} - {pilot.email}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Property Type *</label>
              <select
                name="property_type"
                value={formData.property_type}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="">Select a property type</option>
                {propertyOptions.map(item => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>

            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Location Address *</label>
              <input
                type="text"
                name="location_address"
                value={formData.location_address}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">GPS Link *</label>
              <input
                type="text"
                name="gps_link"
                value={formData.gps_link}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Indoor/Outdoor *</label>
              <select
                name="indoor_outdoor"
                value={formData.indoor_outdoor}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="Indoor">Indoor</option>
                <option value="Outdoor">Outdoor</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Area Size (sq ft) *</label>
              <input
                type="number"
                name="area_size"
                value={formData.area_size}
                onChange={handleInputChange}
                required
                min={1}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Rooms/Sections *</label>
              <input
                type="number"
                name="rooms_sections"
                value={formData.rooms_sections}
                onChange={handleInputChange}
                required
                min={1}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Number of Floors</label>
              <input
                type="number"
                name="num_floors"
                value={formData.num_floors}
                onChange={handleInputChange}
                min={1}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Preferred Date *</label>
              <input
                type="date"
                name="preferred_date"
                value={formData.preferred_date}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Preferred Time *</label>
              <input
                type="time"
                name="preferred_time"
                value={formData.preferred_time}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>



            <div>
              <label className="block text-sm font-medium mb-2">Referral ID (optional)</label>
              <input
                type="text"
                name="referral_id"
                value={formData.referral_id}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Special Requirements</label>
              <textarea
                name="requirements"
                value={formData.requirements}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Payment Amount (₹) *</label>
              <input
                type="number"
                name="total_cost"
                value={formData.total_cost}
                onChange={handleInputChange}
                min={0}
                step={0.01}
                required
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={onClose} disabled={loading} className="px-4 py-2 border rounded-md">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-primary-600 text-white rounded-md flex items-center"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" /> Creating...
                </>
              ) : (
                <>
                  <Save size={16} className="mr-2" /> Create Booking
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateOrderModal;
