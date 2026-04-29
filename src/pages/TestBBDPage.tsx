import React from 'react';
import BusinessBookingForm from './BusinessBookingForm';

const TestBBDPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-blue-600 text-white p-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold">🧪 BBD Form Test Page</h1>
          <p className="text-blue-100">Testing the Business Booking Details form without authentication</p>
        </div>
      </div>
      
      <div className="py-8">
        <BusinessBookingForm />
      </div>
    </div>
  );
};

export default TestBBDPage;
