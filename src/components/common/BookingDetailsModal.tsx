import React from 'react';
import { X, MapPin, Calendar, User, FileText, ExternalLink } from 'lucide-react';

interface BookingDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: any;
  userRole: 'pilot' | 'editor' | 'client';
}

const BookingDetailsModal: React.FC<BookingDetailsModalProps> = ({ isOpen, onClose, booking, userRole: _userRole }) => {
  if (!isOpen || !booking) return null;

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'Not specified';
    return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const renderField = (label: string, value: any) => (
    <div className="mb-1">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <p className="text-sm text-gray-900">{value !== null && value !== undefined && value !== '' ? value : 'Not specified'}</p>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold flex items-center">
            <FileText className="mr-2" size={24} /> Booking Details - {booking.booking_id || booking.id}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={28} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Grid layout for main sections */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Basic Info */}
            <div className="bg-indigo-50 rounded-lg p-4 shadow-md">
              <h3 className="text-lg font-semibold mb-3 flex items-center"><User className="mr-2" />Basic Info</h3>
              {renderField('Order ID', booking.id)}
              {renderField('Booking ID', booking.booking_id)}
              {renderField('Status', booking.status)}
              {renderField('Created At', formatDate(booking.created_at))}
              {renderField('Updated At', formatDate(booking.updated_at))}
            </div>

            {/* Client Info */}
            <div className="bg-green-50 rounded-lg p-4 shadow-md">
              <h3 className="text-lg font-semibold mb-3 flex items-center"><User className="mr-2" />Client Info</h3>
              {renderField('Client Name', booking.client_name)}
              {renderField('Client Email', booking.client_email)}
              {renderField('Client ID', booking.client_id)}
            </div>

            {/* Team Assignments */}
            <div className="bg-yellow-50 rounded-lg p-4 shadow-md">
              <h3 className="text-lg font-semibold mb-3 flex items-center"><User className="mr-2" />Team</h3>
              {renderField('Pilot', booking.pilot_name)}
              {renderField('Editor', booking.editor_name)}
              {renderField('Referral', booking.referral_name)}
            </div>
          </div>

          {/* Location & Property */}
          <div className="bg-purple-50 rounded-lg p-6 shadow-md">
            <h3 className="text-xl font-semibold mb-4 flex items-center"><MapPin className="mr-2" />Location & Property</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {renderField('Location', booking.location)}
              {renderField('Full Address', booking.location_address)}
              {booking.gps_link ? (
                <div>
                  <label className="text-sm font-medium text-gray-700">GPS Link</label>
                  <a href={booking.gps_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 text-sm">
                    <ExternalLink size={14} className="mr-1" /> Open Location
                  </a>
                </div>
              ) : renderField('GPS Link', null)}
              {renderField('Property Type', booking.property_type)}
              {renderField('Industry', booking.industry)}
              {renderField('Indoor/Outdoor', booking.indoor_outdoor)}
              {renderField('Area Size', booking.area_size ? `${booking.area_size} ${booking.area_unit || 'sq ft'}` : null)}
              {renderField('Rooms/Sections', booking.rooms_sections)}
              {renderField('Duration', booking.duration)}
            </div>
          </div>

          {/* Scheduling & Video Specs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-blue-50 rounded-lg p-4 shadow-md">
              <h3 className="text-lg font-semibold mb-3 flex items-center"><Calendar className="mr-2" />Scheduling</h3>
              {renderField('Preferred Date', formatDate(booking.preferred_date))}
              {renderField('Preferred Time', booking.preferred_time)}
            </div>
          </div>

          {/* Notes & Requirements */}
          <div className="bg-green-50 rounded-lg p-4 shadow-md">
            <h3 className="text-lg font-semibold mb-3">Notes & Requirements</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderField('Requirements', booking.requirements)}
              {renderField('Special Requirements', booking.special_requirements)}
              {renderField('Custom Quote', booking.custom_quote)}
              {renderField('Pilot Notes', booking.pilot_notes)}
              {renderField('Client Notes', booking.client_notes)}
              {renderField('Admin Comments', booking.admin_comments)}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200">
          <button onClick={onClose} className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookingDetailsModal;
