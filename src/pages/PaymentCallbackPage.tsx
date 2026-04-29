import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { paymentService } from '../services/api';

const PaymentCallbackPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handlePaymentCallback = async () => {
      try {
        // Get transaction ID from URL parameters
        const merchantTransactionId = searchParams.get('merchantTransactionId');

        if (!merchantTransactionId) {
          setStatus('failed');
          setMessage('Invalid payment callback - missing transaction ID');
          return;
        }

        // Check payment status
        const result = await paymentService.checkPaymentStatus(merchantTransactionId);

        if (result.success) {
          const s = (result.status || '').toLowerCase();
          if (s === 'completed' || s === 'payment_success' || s === 'success') {
            setStatus('success');
            setMessage('Payment completed successfully!');
          } else if (s === 'failed' || s === 'payment_failed' || s === 'failure') {
            setStatus('failed');
            setMessage('Payment failed. Please try again.');
          } else {
            setStatus('failed');
            setMessage(`Payment status: ${result.status}`);
          }
        } else {
          setStatus('failed');
          setMessage(result.message || 'Failed to verify payment status');
        }
      } catch (error: any) {
        setStatus('failed');
        setMessage(error.response?.data?.message || 'Error processing payment callback');
      }
    };

    handlePaymentCallback();
  }, [searchParams]);

  const handleContinue = () => {
    navigate('/client');
  };

  const handleRetry = () => {
    navigate('/client');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {status === 'loading' && (
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
              <h2 className="mt-4 text-lg font-medium text-gray-900">
                Verifying Payment...
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                Please wait while we verify your payment status.
              </p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="mt-4 text-lg font-medium text-gray-900">
                Payment Successful!
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                {message}
              </p>
              <div className="mt-6">
                <button
                  onClick={handleContinue}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                >
                  Continue to Dashboard
                </button>
              </div>
            </div>
          )}

          {status === 'failed' && (
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="mt-4 text-lg font-medium text-gray-900">
                Payment Failed
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                {message}
              </p>
              <div className="mt-6 space-y-3">
                <button
                  onClick={handleRetry}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                >
                  Try Again
                </button>
                <button
                  onClick={handleContinue}
                  className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                >
                  Go to Dashboard
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentCallbackPage;
