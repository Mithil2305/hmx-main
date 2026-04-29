import React, { useEffect, useState } from 'react';

const FPVEvents: React.FC = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch('/api/admin/fpv-events', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch FPV events');
        }
        
        const data = await response.json();
        setEvents(data || []);
      } catch (e: any) {
        console.error('Error fetching FPV events:', e);
        setError('Failed to load FPV event bookings');
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  // Filter events based on search term
  const filteredEvents = events.filter(event => 
    (event.event_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (event.guest_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (event.guest_email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (event.location_address || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  if (loading) return <div className="p-4">Loading FPV Events...</div>;
  if (error) return <div className="p-4 text-red-600">{error}</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">FPV Shoots - Events & Expos</h2>
        <div className="relative">
          <input
            type="text"
            placeholder="Search events..."
            className="px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      
      {filteredEvents.length === 0 ? (
        <div className="p-4 bg-yellow-50 rounded">No event bookings found.</div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Event Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date & Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Requirements
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Guest Information
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredEvents.map((event) => (
                <tr key={event.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{event.event_name || 'N/A'}</div>
                    <div className="text-sm text-gray-500">{event.event_type || 'N/A'}</div>
                    <div className="text-xs text-gray-400">ID: {event.id}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      <div className="font-medium">Event: {formatDate(event.event_date)}</div>
                      {event.preferred_date && (
                        <div className="text-xs text-gray-500">Preferred: {formatDate(event.preferred_date)} {event.preferred_time || ''}</div>
                      )}
                      <div className="text-sm text-gray-500">{event.event_duration_hours || 'N/A'} hours</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 max-w-xs truncate">{event.location_address || 'N/A'}</div>
                    <div className="text-sm text-gray-500">{event.venue_type || 'N/A'}</div>
                    {event.gps_link && (
                      <a href={event.gps_link} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                        View Map
                      </a>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">Shots: {event.shots_required || 'N/A'}</div>
                    <div className="text-sm text-gray-500">Budget: {event.budget_range || 'N/A'}</div>
                    {event.special_requirements && (
                      <div className="text-xs text-gray-500 mt-1 max-w-xs truncate" title={event.special_requirements}>
                        {event.special_requirements}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {event.contact_person && (
                      <div className="text-sm text-gray-900">{event.contact_person}</div>
                    )}
                    {event.organization_name && (
                      <div className="text-xs text-gray-500">{event.organization_name}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{event.guest_name || 'N/A'}</div>
                    <div className="text-sm text-gray-500">{event.guest_email || 'N/A'}</div>
                    <div className="text-sm text-gray-500">{event.guest_phone || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      event.status === 'completed' ? 'bg-green-100 text-green-800' :
                      event.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      event.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {event.status || 'pending'}
                    </span>
                    <div className="text-xs text-gray-500 mt-1">
                      {formatDate(event.created_at)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default FPVEvents;