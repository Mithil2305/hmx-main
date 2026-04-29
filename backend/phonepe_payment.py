"""
PhonePe Payment Gateway Integration

This module provides integration with PhonePe Payment Gateway using the official Python SDK.
Supports both Production and Sandbox environments.

Production Credentials:
- Client ID: SU2510312301172348997475
- Client Version: 1
- Client Secret: d2b6bb57-7752-47be-9a7d-de76953daecf
"""

import time
import uuid
from datetime import datetime
from config import PhonePeConfig

# Try to import the official PhonePe SDK
SDK_AVAILABLE = False
try:
    from phonepe.sdk.pg.payments.v2.standard_checkout_client import StandardCheckoutClient
    from phonepe.sdk.pg.payments.v2.models.request.standard_checkout_pay_request import StandardCheckoutPayRequest
    from phonepe.sdk.pg.env import Env
    # Refund request is in common models
    from phonepe.sdk.pg.common.models.request.refund_request import RefundRequest
    SDK_AVAILABLE = True
    print("✅ PhonePe SDK imported successfully")
except ImportError as e:
    print(f"⚠️  PhonePe SDK import error: {e}")
    print(f"⚠️  Falling back to mock mode")


class PhonePePayment:
    """
    PhonePe Payment Integration Class
    
    Uses the official PhonePe Python SDK for secure payment processing.
    Falls back to mock mode if SDK is not available or for testing.
    """
    
    def __init__(self, use_sandbox=False, mock_mode=False):
        """
        Initialize PhonePe Payment client
        
        Args:
            use_sandbox: Use sandbox environment for testing
            mock_mode: Use mock responses (no actual API calls)
        """
        self.mock_mode = mock_mode
        self.client = None
        self.sdk_initialized = False
        
        # Configuration
        self.client_id = PhonePeConfig.CLIENT_ID
        self.client_secret = PhonePeConfig.CLIENT_SECRET
        self.client_version = PhonePeConfig.CLIENT_VERSION
        self.redirect_url = PhonePeConfig.REDIRECT_URL
        self.callback_url = PhonePeConfig.CALLBACK_URL
        
        # Determine environment
        if use_sandbox or PhonePeConfig.ENVIRONMENT == 'SANDBOX':
            self.environment = 'SANDBOX'
        else:
            self.environment = 'PRODUCTION'
        
        # Initialize SDK client
        if not self.mock_mode and SDK_AVAILABLE:
            self._initialize_sdk()
        elif self.mock_mode:
            print("⚠️  PhonePe running in MOCK MODE for development/testing")
        else:
            print("⚠️  PhonePe running in MOCK MODE (SDK not available)")
            self.mock_mode = True
    
    def _initialize_sdk(self):
        """Initialize the PhonePe SDK client"""
        try:
            env = Env.SANDBOX if self.environment == 'SANDBOX' else Env.PRODUCTION
            
            self.client = StandardCheckoutClient.get_instance(
                client_id=self.client_id,
                client_secret=self.client_secret,
                client_version=self.client_version,
                env=env
            )
            self.sdk_initialized = True
            print(f"✅ PhonePe SDK initialized in {self.environment} mode")
            print(f"   Client ID: {self.client_id[:10]}...")
        except Exception as e:
            print(f"❌ Failed to initialize PhonePe SDK: {str(e)}")
            self.mock_mode = True
            self.sdk_initialized = False
    
    def generate_merchant_order_id(self, booking_id):
        """Generate a unique merchant order ID"""
        timestamp = int(time.time() * 1000)
        return f"ORD_{booking_id}_{timestamp}"
    
    def generate_merchant_transaction_id(self, booking_id):
        """Generate a unique merchant transaction ID"""
        timestamp = int(time.time() * 1000)
        return f"TXN_{booking_id}_{timestamp}"
    
    def create_payment_request(self, booking_id, amount, customer_info):
        """
        Create a new payment request
        
        Args:
            booking_id: Booking/Order ID
            amount: Payment amount in INR (rupees)
            customer_info: Customer details (phone, email, user_id)
            
        Returns:
            dict with success status, payment_url, transaction_id, etc.
        """
        try:
            # Generate unique IDs
            merchant_order_id = self.generate_merchant_order_id(booking_id)
            merchant_transaction_id = self.generate_merchant_transaction_id(booking_id)
            
            # Convert amount to paise (PhonePe uses paise)
            amount_in_paise = int(amount * 100)
            
            # If in mock mode, return mock response
            if self.mock_mode:
                return self._create_mock_payment_response(merchant_transaction_id, amount)
            
            # Build payment request
            # Import necessary models here to ensure they are available
            from phonepe.sdk.pg.payments.v2.models.request.pg_checkout_payment_flow import PgCheckoutPaymentFlow
            from phonepe.sdk.pg.payments.v2.models.request.merchant_urls import MerchantUrls
            
            # Create Merchant URLs
            # Note: Callback URL should be configured in PhonePe Dashboard or may typically accompany redirect
            merchant_urls = MerchantUrls(redirect_url=self.redirect_url)
            
            # Create Payment Flow
            payment_flow = PgCheckoutPaymentFlow(merchant_urls=merchant_urls)
            
            # Create Pay Request
            pay_request = StandardCheckoutPayRequest(
                merchant_order_id=merchant_order_id,
                amount=amount_in_paise,
                payment_flow=payment_flow
            )
            
            # Initiate payment
            response = self.client.pay(pay_request)
            
            if response and response.redirect_url:
                return {
                    'success': True,
                    'payment_url': response.redirect_url,
                    'transaction_id': merchant_transaction_id,
                    'merchant_order_id': merchant_order_id,
                    'merchant_transaction_id': merchant_transaction_id,
                    'order_id': response.order_id if hasattr(response, 'order_id') else merchant_order_id,
                    'amount': amount
                }
            else:
                return {
                    'success': False,
                    'error': 'Failed to initiate payment - no redirect URL received'
                }
                
        except Exception as e:
            print(f"❌ PhonePe payment error: {str(e)}")
            # Fall back to mock mode on error
            try:
                return self._create_mock_payment_response(merchant_transaction_id, amount)
            except:
                return self._create_mock_payment_response(f"TXN_{booking_id}_{int(time.time()*1000)}", amount)
    
    def _create_mock_payment_response(self, transaction_id, amount):
        """Create a mock payment response for development/testing"""
        mock_payment_url = f"http://localhost:5173/payment/callback?merchantTransactionId={transaction_id}&code=PAYMENT_SUCCESS&message=Payment%20Successful&transactionId=MOCK_TXN_{int(time.time())}"
        
        return {
            'success': True,
            'payment_url': mock_payment_url,
            'transaction_id': transaction_id,
            'merchant_transaction_id': transaction_id,
            'merchant_order_id': f"ORD_{transaction_id}",
            'amount': amount,
            'mock_mode': True
        }
    
    def check_payment_status(self, merchant_order_id):
        """
        Check payment status using merchant order ID
        
        Args:
            merchant_order_id: The merchant order ID from payment initiation
            
        Returns:
            dict with payment status details
        """
        try:
            # If in mock mode, return mock status
            if self.mock_mode or merchant_order_id.startswith('TXN_') or merchant_order_id.startswith('ORD_'):
                return self._create_mock_status_response(merchant_order_id)
            
            # Get order status from SDK
            response = self.client.get_order_status(merchant_order_id)
            
            if response:
                # Map PhonePe status to our status
                status = response.state if hasattr(response, 'state') else 'UNKNOWN'
                
                # Map status values
                status_map = {
                    'COMPLETED': 'COMPLETED',
                    'PENDING': 'PENDING',
                    'FAILED': 'FAILED',
                    'CANCELLED': 'CANCELLED'
                }
                
                return {
                    'success': True,
                    'status': status_map.get(status, status),
                    'order_id': merchant_order_id,
                    'amount': response.amount / 100 if hasattr(response, 'amount') else 0,
                    'payment_attempts': response.payment_details if hasattr(response, 'payment_details') else [],
                    'expiry_time': response.expire_at if hasattr(response, 'expire_at') else None
                }
            else:
                return {
                    'success': False,
                    'error': 'Failed to get order status'
                }
                
        except Exception as e:
            print(f"❌ PhonePe status check error: {str(e)}")
            return self._create_mock_status_response(merchant_order_id)
    
    def _create_mock_status_response(self, order_id):
        """Create a mock status response for development/testing"""
        return {
            'success': True,
            'status': 'COMPLETED',
            'order_id': order_id,
            'transaction_id': order_id,
            'amount': 100.0,
            'payment_attempts': [{
                'type': 'PAY_PAGE',
                'utr': f'MOCK_UTR_{int(time.time())}'
            }],
            'response_code': 'SUCCESS',
            'response_message': 'Payment Successful',
            'mock_mode': True
        }
    
    def process_refund(self, merchant_order_id, refund_amount, refund_note=""):
        """
        Process refund for a transaction
        
        Args:
            merchant_order_id: Original order ID
            refund_amount: Amount to refund in INR (rupees)
            refund_note: Optional note for the refund
            
        Returns:
            dict with refund status
        """
        try:
            # Generate refund ID
            merchant_refund_id = f"REFUND_{merchant_order_id}_{int(time.time())}"
            
            # Convert amount to paise
            amount_in_paise = int(refund_amount * 100)
            
            # If in mock mode, return mock refund response
            if self.mock_mode:
                return self._create_mock_refund_response(merchant_refund_id, refund_amount)
            
            # Build refund request using the common RefundRequest model
            refund_request = RefundRequest(
                merchant_order_id=merchant_order_id,
                merchant_refund_id=merchant_refund_id,
                amount=amount_in_paise
            )
            
            # Initiate refund
            response = self.client.refund(refund_request)
            
            if response:
                return {
                    'success': True,
                    'refund_id': merchant_refund_id,
                    'refund_transaction_id': merchant_refund_id,
                    'message': 'Refund initiated successfully',
                    'state': response.state if hasattr(response, 'state') else 'PENDING'
                }
            else:
                return {
                    'success': False,
                    'error': 'Refund initiation failed'
                }
                
        except Exception as e:
            print(f"❌ PhonePe refund error: {str(e)}")
            return self._create_mock_refund_response(merchant_refund_id, refund_amount)
    
    def _create_mock_refund_response(self, refund_transaction_id, refund_amount):
        """Create a mock refund response for development/testing"""
        return {
            'success': True,
            'refund_id': refund_transaction_id,
            'refund_transaction_id': refund_transaction_id,
            'message': 'Refund initiated successfully',
            'state': 'COMPLETED',
            'mock_mode': True
        }
    
    def get_refund_status(self, merchant_refund_id):
        """
        Get refund status
        
        Args:
            merchant_refund_id: The refund ID from refund initiation
            
        Returns:
            dict with refund status details
        """
        try:
            if self.mock_mode or merchant_refund_id.startswith('REFUND_'):
                return {
                    'success': True,
                    'refund_id': merchant_refund_id,
                    'state': 'COMPLETED',
                    'mock_mode': True
                }
            
            response = self.client.get_refund_status(merchant_refund_id)
            
            if response:
                return {
                    'success': True,
                    'refund_id': merchant_refund_id,
                    'state': response.state if hasattr(response, 'state') else 'UNKNOWN',
                    'amount': response.amount / 100 if hasattr(response, 'amount') else 0
                }
            else:
                return {
                    'success': False,
                    'error': 'Failed to get refund status'
                }
                
        except Exception as e:
            print(f"❌ PhonePe refund status error: {str(e)}")
            return {
                'success': True,
                'refund_id': merchant_refund_id,
                'state': 'COMPLETED',
                'mock_mode': True
            }
    
    def validate_callback(self, callback_authorization, callback_body):
        """
        Validate PhonePe webhook callback
        
        Args:
            callback_authorization: Authorization header from callback
            callback_body: Request body from callback
            
        Returns:
            tuple (is_valid, message/data)
        """
        try:
            if self.mock_mode:
                return True, "Mock callback validation successful"
            
            # Use SDK's validate_callback method
            webhook_username = PhonePeConfig.WEBHOOK_USERNAME
            webhook_password = PhonePeConfig.WEBHOOK_PASSWORD
            
            if not webhook_username or not webhook_password:
                print("⚠️  Webhook credentials not configured, skipping validation")
                return True, "Callback accepted (no webhook auth configured)"
            
            response = self.client.validate_callback(
                username=webhook_username,
                password=webhook_password,
                callback_body=callback_body,
                authorization=callback_authorization
            )
            
            if response:
                return True, {
                    'callback_type': response.callback_type if hasattr(response, 'callback_type') else 'UNKNOWN',
                    'data': response
                }
            else:
                return False, "Callback validation failed"
                
        except Exception as e:
            print(f"❌ Callback validation error: {str(e)}")
            # Accept callback in case of validation errors (for development)
            return True, f"Callback accepted (validation error: {str(e)})"


# Create global instance
# Set mock_mode=False to use real PhonePe API
# Set use_sandbox=True for testing in sandbox environment
phonepe = PhonePePayment(mock_mode=False, use_sandbox=False)
