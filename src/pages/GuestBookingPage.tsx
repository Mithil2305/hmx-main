import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import PhonePePayment from '../components/PhonePePayment';

const GuestBookingPage: React.FC = () => {
  const navigate = useNavigate();
  const [guestInfo, setGuestInfo] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [totalSteps] = useState(2);
  const [error, setError] = useState('');
  const [showPhonePePayment, setShowPhonePePayment] = useState(false);
  const [createdBooking, setCreatedBooking] = useState<any>(null);

  const [newBooking, setNewBooking] = useState<any>({
    location_address: '',
    gps_link: '',
    property_type: '',
    booking_category: 'standard',
    // FPV Event specific fields
    event_name: '',
    event_type: '',
    event_date: '',
    venue_type: '',
    shots_required: '',
    event_duration_hours: '',
    budget_range: '',
    // Standard booking fields
    event_start_date: '',
    event_end_date: '',
    expected_attendees: '',
    organization_name: '',
    contact_person: '',
    indoor_outdoor: '',
    area_size: '',
    area_unit: 'sq_ft',
    rooms_sections: '',
    num_floors: '1',
    preferred_date: '',
    preferred_time: '',
    special_requirements: '',
    base_package_cost: 0,
    total_cost: 0,
    status: 'pending',
    payment_status: 'pending',
  });

  // Base costs for each property type
  const BASE_COSTS: Record<string, number> = {
    "Restaurants & Cafes": 12000,
    "Retail Store / Showroom": 12000,
    "Gaming & Entertainment Zones": 12000,
    "Fitness & Sports Arenas": 12000,
    "Adventure / Water Parks": 15000,
    "Resorts & Farmstays / Hotels": 18000,
    "Real Estate Property": 20000,
    "Shopping Mall / Complex": 20000
  };

  // Calculate base + final cost using the formula: Base Cost + (Area × 1)
  const calculateCost = (category: string, area_sqft: number, num_floors: number) => {
    if (!BASE_COSTS[category]) return { base: null, final: null, custom: 'Invalid Category' };

    // Calculate base cost
    const base = BASE_COSTS[category];

    // Calculate total cost
    const totalCost = base + (area_sqft * 1);

    // Apply floor adjustment if needed
    const adjustedFloors = !num_floors || num_floors < 1 ? 1 : num_floors;
    const final = Math.round(totalCost * (1 + 0.1 * (adjustedFloors - 1)));

    return { base, final, custom: null };
  };

  useEffect(() => {
    const storedInfo = localStorage.getItem('guestInfo');
    if (!storedInfo) {
      navigate('/guest-signup');
      return;
    }
    try {
      const parsedInfo = JSON.parse(storedInfo);
      if (!parsedInfo || typeof parsedInfo !== 'object') {
        throw new Error('Invalid guest info');
      }
      setGuestInfo(parsedInfo);
    } catch (e) {
      console.error('Failed to parse guest info:', e);
      localStorage.removeItem('guestInfo');
      navigate('/guest-signup');
    }
  }, [navigate]);

  useEffect(() => {
    // Only calculate cost for standard bookings (non-event custom quotes)
    if (newBooking.booking_category === 'fpv_event') return;
    if (!newBooking.property_type || !newBooking.area_size || !newBooking.num_floors) return;

    const areaNum = parseFloat(newBooking.area_size) || 0;
    const sqft = (newBooking.area_unit === 'acres') ? areaNum * 43560 : areaNum;

    if (sqft > 50000) {
      setNewBooking((prev: any) => ({
        ...prev,
        base_package_cost: 0,
        total_cost: 0
      }));
      return;
    }

    const { base, final } = calculateCost(
      newBooking.property_type,
      sqft,
      parseInt(newBooking.num_floors)
    );
    if (base != null && final != null) {
      setNewBooking((prev: any) => ({
        ...prev,
        base_package_cost: base,
        total_cost: final
      }));
    }
  }, [newBooking.property_type, newBooking.area_size, newBooking.area_unit, newBooking.num_floors]);

  const handleCreateBooking = async () => {
    try {
      // If booking is for FPV Event, mark as custom_quote and skip immediate payment flow
      if (newBooking.booking_category === 'fpv_event') {
        const bookingData = {
          booking_category: 'fpv_event',
          event_name: newBooking.event_name,
          event_type: newBooking.event_type,
          event_date: newBooking.event_date,
          location_address: newBooking.location_address,
          gps_link: newBooking.gps_link,
          venue_type: newBooking.venue_type,
          shots_required: newBooking.shots_required,
          event_duration_hours: parseFloat(newBooking.event_duration_hours) || 0,
          budget_range: newBooking.budget_range,
          preferred_date: newBooking.preferred_date,
          preferred_time: newBooking.preferred_time,
          organization_name: newBooking.organization_name,
          contact_person: newBooking.contact_person,
          event_start_date: newBooking.event_start_date,
          event_end_date: newBooking.event_end_date,
          expected_attendees: newBooking.expected_attendees,
          special_requirements: newBooking.special_requirements,
          guest_name: guestInfo.name,
          guest_email: guestInfo.email,
          guest_phone: guestInfo.phone,
          guest_address: guestInfo.address,
          referral_link: guestInfo.referral_link,
          referral_code: guestInfo.referral_code,
          status: 'pending',
        };

        const response = await axios.post('/api/guest/bookings', bookingData);
        setCreatedBooking(response.data);
        // For custom quotes we do NOT show immediate payment UI
        setShowPhonePePayment(false);
        alert('Your FPV Event request has been submitted! Our team will contact you with a custom quote.');
        localStorage.removeItem('guestInfo');
        navigate('/');
        return;
      }

      // Standard booking flow (cost calculated client-side)
      const bookingData = {
        ...newBooking,
        area_size: parseFloat(newBooking.area_size) || 0,
        rooms_sections: parseInt(newBooking.rooms_sections) || 0,
        num_floors: parseInt(newBooking.num_floors) || 1,
        guest_name: guestInfo.name,
        guest_email: guestInfo.email,
        guest_phone: guestInfo.phone,
        guest_address: guestInfo.address,
        referral_link: guestInfo.referral_link,
        referral_code: guestInfo.referral_code,
      };

      const response = await axios.post('/api/guest/bookings', bookingData);
      setCreatedBooking(response.data);
      setShowPhonePePayment(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create booking');
    }
  };

  const validateStep1 = () => (
    newBooking.location_address &&
    // If FPV Event, validate event-specific fields instead of property fields
    (newBooking.booking_category === 'fpv_event'
      ? (newBooking.event_name && newBooking.event_type && newBooking.event_date && newBooking.venue_type && newBooking.shots_required)
      : (newBooking.property_type && newBooking.indoor_outdoor && newBooking.area_size && newBooking.rooms_sections && newBooking.num_floors)) &&
    newBooking.preferred_date &&
    newBooking.preferred_time
  );

  const validateCurrentStep = () => {
    switch (currentStep) {
      case 1: return validateStep1();
      case 2: return true;
      default: return false;
    }
  };

  if (!guestInfo) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow-lg rounded-xl p-8">
          <h2 className="text-2xl font-bold mb-6 text-primary-900 text-center">Guest Order Booking</h2>

          {/* Guest Info Summary */}
          {/* Booking Category Selector */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Booking Type</label>
            <select value={newBooking.booking_category} onChange={(e) => setNewBooking({ ...newBooking, booking_category: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
              <option value="standard">Standard Project</option>
              <option value="fpv_event">FPV Shoots - Events/Expos (Custom Quote)</option>
            </select>
          </div>
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">Guest Information</h3>
            <p className="text-sm text-blue-700">Name: {guestInfo.name}</p>
            <p className="text-sm text-blue-700">Email: {guestInfo.email}</p>
            {guestInfo.referral_code && <p className="text-sm text-blue-700">Referral Code: {guestInfo.referral_code}</p>}
          </div>

          {error && <div className="mb-4 p-4 text-red-700 bg-red-100 rounded-lg">{error}</div>}

          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              {[1, 2].map((step) => (
                <div key={step} className="flex items-center flex-1">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full ${currentStep >= step ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                    {step}
                  </div>
                  <div className={`flex-1 h-1 ${step < 2 ? (currentStep > step ? 'bg-primary-600' : 'bg-gray-200') : ''}`} />
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-xs text-gray-600">Project Details</span>
              <span className="text-xs text-gray-600">Review & Submit</span>
            </div>
          </div>

          {/* Step 1: Project Details */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Location Address *</label>
                  <input type="text" value={newBooking.location_address} onChange={(e) => setNewBooking({ ...newBooking, location_address: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" required />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">GPS Link (Google Maps)</label>
                  <input type="text" value={newBooking.gps_link} onChange={(e) => setNewBooking({ ...newBooking, gps_link: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
                </div>

                {/* FPV Event Fields */}
                {newBooking.booking_category === 'fpv_event' ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Event Name *</label>
                      <input type="text" value={newBooking.event_name} onChange={(e) => setNewBooking({ ...newBooking, event_name: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Event Type *</label>
                      <select value={newBooking.event_type} onChange={(e) => setNewBooking({ ...newBooking, event_type: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" required>
                        <option value="">Select Event Type</option>
                        <option value="conference">Conference</option>
                        <option value="expo">Expo/Exhibition</option>
                        <option value="trade_show">Trade Show</option>
                        <option value="concert">Concert/Music Event</option>
                        <option value="sports">Sports Event</option>
                        <option value="wedding">Wedding</option>
                        <option value="corporate">Corporate Event</option>
                        <option value="festival">Festival</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Event Date *</label>
                      <input type="date" value={newBooking.event_date} onChange={(e) => setNewBooking({ ...newBooking, event_date: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Venue Type *</label>
                      <select value={newBooking.venue_type} onChange={(e) => setNewBooking({ ...newBooking, venue_type: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" required>
                        <option value="">Select Venue Type</option>
                        <option value="indoor">Indoor</option>
                        <option value="outdoor">Outdoor</option>
                        <option value="both">Both Indoor & Outdoor</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">Type of Shots Required *</label>
                      <textarea value={newBooking.shots_required} onChange={(e) => setNewBooking({ ...newBooking, shots_required: e.target.value })} rows={2} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" placeholder="E.g., Aerial shots, crowd coverage, stage shots, booth coverage..." required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Event Duration (hours)</label>
                      <input type="number" step="0.5" value={newBooking.event_duration_hours} onChange={(e) => setNewBooking({ ...newBooking, event_duration_hours: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" placeholder="e.g., 3.5" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Budget Range</label>
                      <select value={newBooking.budget_range} onChange={(e) => setNewBooking({ ...newBooking, budget_range: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                        <option value="">Select Budget Range</option>
                        <option value="under_25k">Under ₹25,000</option>
                        <option value="25k_50k">₹25,000 - ₹50,000</option>
                        <option value="50k_100k">₹50,000 - ₹1,00,000</option>
                        <option value="100k_200k">₹1,00,000 - ₹2,00,000</option>
                        <option value="200k_plus">Above ₹2,00,000</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Organization Name</label>
                      <input type="text" value={newBooking.organization_name} onChange={(e) => setNewBooking({ ...newBooking, organization_name: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" placeholder="Company or organization name" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Contact Person</label>
                      <input type="text" value={newBooking.contact_person} onChange={(e) => setNewBooking({ ...newBooking, contact_person: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" placeholder="Primary contact name" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Event Start Date</label>
                      <input type="date" value={newBooking.event_start_date} onChange={(e) => setNewBooking({ ...newBooking, event_start_date: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Event End Date</label>
                      <input type="date" value={newBooking.event_end_date} onChange={(e) => setNewBooking({ ...newBooking, event_end_date: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Expected Attendees</label>
                      <input type="text" value={newBooking.expected_attendees} onChange={(e) => setNewBooking({ ...newBooking, expected_attendees: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" placeholder="e.g., 500-1000 people" />
                    </div>
                  </>
                ) : (
                  <>
                    {/* Standard Project Fields */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Property Type *</label>
                      <select value={newBooking.property_type} onChange={(e) => setNewBooking({ ...newBooking, property_type: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" required>
                        <option value="">Select Property Type</option>
                        {Object.keys(BASE_COSTS).map((type) => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Indoor/Outdoor *</label>
                      <select value={newBooking.indoor_outdoor} onChange={(e) => setNewBooking({ ...newBooking, indoor_outdoor: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" required>
                        <option value="">Select</option>
                        <option value="indoor">Indoor</option>
                        <option value="outdoor">Outdoor</option>
                        <option value="both">Both</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Area Size *</label>
                      <input type="number" value={newBooking.area_size} onChange={(e) => setNewBooking({ ...newBooking, area_size: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Area Unit *</label>
                      <select value={newBooking.area_unit} onChange={(e) => setNewBooking({ ...newBooking, area_unit: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                        <option value="sq_ft">Square Feet</option>
                        <option value="acres">Acres</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Number of Rooms/Sections *</label>
                      <input type="number" value={newBooking.rooms_sections} onChange={(e) => setNewBooking({ ...newBooking, rooms_sections: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Number of Floors *</label>
                      <input type="number" value={newBooking.num_floors} onChange={(e) => setNewBooking({ ...newBooking, num_floors: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" required />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700">Preferred Date *</label>
                  <input type="date" value={newBooking.preferred_date} onChange={(e) => setNewBooking({ ...newBooking, preferred_date: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Preferred Time *</label>
                  <input type="time" value={newBooking.preferred_time} onChange={(e) => setNewBooking({ ...newBooking, preferred_time: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" required />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Special Requirements</label>
                  <textarea value={newBooking.special_requirements} onChange={(e) => setNewBooking({ ...newBooking, special_requirements: e.target.value })} rows={3} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Review */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-4">Order Summary</h3>
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium">Property Type:</span> {newBooking.property_type}</p>
                  <p><span className="font-medium">Location:</span> {newBooking.location_address}</p>
                  <p><span className="font-medium">Area:</span> {newBooking.area_size} {newBooking.area_unit}</p>
                  <p><span className="font-medium">Floors:</span> {newBooking.num_floors}</p>
                  <p><span className="font-medium">Date:</span> {newBooking.preferred_date} at {newBooking.preferred_time}</p>
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-lg"><span className="font-medium">Base Cost:</span> ₹{newBooking.base_package_cost}</p>
                    <p className="text-xl font-bold text-primary-600"><span className="font-medium">Total Cost:</span> ₹{newBooking.total_cost}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between items-center pt-6 border-t mt-6">
            <button
              onClick={() => currentStep > 1 && setCurrentStep(currentStep - 1)}
              disabled={currentStep === 1}
              className={`px-6 py-2 rounded-md ${currentStep === 1 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-gray-300 text-gray-700 hover:bg-gray-400'}`}
            >
              Previous
            </button>
            {currentStep < totalSteps ? (
              <button
                onClick={() => validateCurrentStep() && setCurrentStep(currentStep + 1)}
                disabled={!validateCurrentStep()}
                className={`px-6 py-2 rounded-md ${!validateCurrentStep() ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-primary-600 text-white hover:bg-primary-700'}`}
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleCreateBooking}
                className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Submit Order & Pay
              </button>
            )}
          </div>
        </div>
      </div>

      {/* PhonePe Payment Modal */}
      {showPhonePePayment && createdBooking && (
        <PhonePePayment
          bookingId={createdBooking.id}
          amount={createdBooking.total_cost || createdBooking.base_package_cost || 0}
          onSuccess={() => {
            setShowPhonePePayment(false);
            localStorage.removeItem('guestInfo');
            navigate('/');
          }}
          onCancel={() => {
            setShowPhonePePayment(false);
          }}
        />
      )}
    </div>
  );
};

export default GuestBookingPage;