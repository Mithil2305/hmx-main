import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const RoleSelectionPage: React.FC = () => {
  const navigate = useNavigate();

  const chooseRole = (role: 'pilot' | 'referral') => {
    // Persist the selection so protected routes can verify it
    localStorage.setItem('preferredRole', role);
    // Navigate to home (now protected by RequireRoleSelected)
    navigate('/');
  };

  return (
    <div className="min-h-screen pt-20 pb-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="bg-primary-900 text-white p-8 text-center">
            <h1 className="text-3xl font-heading font-bold mb-2">Choose Your Portal</h1>
            <p className="text-gray-200">Select how you'd like to continue</p>
          </div>

          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                onClick={() => chooseRole('pilot')}
                className="border rounded-lg p-6 text-left hover:shadow-md transition-shadow focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <div className="text-primary-700 font-heading text-xl mb-2">Pilot</div>
                <p className="text-gray-600">Continue as a Pilot to access pilot-specific features and information.</p>
              </motion.button>

              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.05 }}
                onClick={() => chooseRole('referral')}
                className="border rounded-lg p-6 text-left hover:shadow-md transition-shadow focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <div className="text-primary-700 font-heading text-xl mb-2">Referral</div>
                <p className="text-gray-600">Continue as a Referral partner to access referral-specific tools.</p>
              </motion.button>
            </div>

            <p className="text-sm text-gray-500 mt-6 text-center">
              You can change this choice later from your settings.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoleSelectionPage;
