import React from 'react';
import { Link } from 'react-router-dom';


const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-6">
          <span className="text-xl font-heading font-bold text-primary-600">HMX</span>
        </div>
        
        <h1 className="text-4xl font-heading font-bold text-primary-950 mb-4">
          404 - Page Not Found
        </h1>
        
        <p className="text-lg text-gray-700 mb-8">
          Oops! The page you're looking for has flown away. Let's get you back on course.
        </p>
        
        <div className="space-y-4">
          <Link
            to="/"
            className="block w-full bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-md font-medium transition-colors"
          >
            Return to Home
          </Link>
          
          <Link
            to="/signup"
            className="block w-full border border-primary-600 text-primary-600 hover:bg-primary-50 px-6 py-3 rounded-md font-medium transition-colors"
          >
            Schedule an FPV Tour
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;