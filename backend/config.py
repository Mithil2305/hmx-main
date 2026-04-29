import os

# PhonePe Production Configuration
class PhonePeConfig:
    """
    PhonePe Payment Gateway Configuration
    
    Production Credentials:
    - Client ID: SU2510312301172348997475
    - Client Version: 1
    - Client Secret: d2b6bb57-7752-47be-9a7d-de76953daecf
    """
    
    # Production Environment
    CLIENT_ID = os.getenv('PHONEPE_CLIENT_ID', 'SU2510312301172348997475')
    CLIENT_SECRET = os.getenv('PHONEPE_CLIENT_SECRET', 'd2b6bb57-7752-47be-9a7d-de76953daecf')
    CLIENT_VERSION = int(os.getenv('PHONEPE_CLIENT_VERSION', '1'))
    
    # Environment setting: 'PRODUCTION' or 'SANDBOX'
    ENVIRONMENT = os.getenv('PHONEPE_ENVIRONMENT', 'PRODUCTION')
    
    # Redirect URL after payment
    REDIRECT_URL = os.getenv('PHONEPE_REDIRECT_URL', 'http://localhost:5173/payment/callback')
    
    # Callback URL for webhooks (your backend endpoint)
    CALLBACK_URL = os.getenv('PHONEPE_CALLBACK_URL', 'http://localhost:5000/api/payment/callback')
    
    # Webhook authentication (for verifying callbacks)
    WEBHOOK_USERNAME = os.getenv('PHONEPE_WEBHOOK_USERNAME', '')
    WEBHOOK_PASSWORD = os.getenv('PHONEPE_WEBHOOK_PASSWORD', '')


# Sandbox/Test Configuration (for development)
class PhonePeConfigSandbox:
    """
    PhonePe Sandbox Configuration for testing
    Use this for development/testing before going live
    """
    
    # Sandbox credentials (example - replace with your actual sandbox credentials)
    CLIENT_ID = os.getenv('PHONEPE_SANDBOX_CLIENT_ID', 'SANDBOX_CLIENT_ID')
    CLIENT_SECRET = os.getenv('PHONEPE_SANDBOX_CLIENT_SECRET', 'SANDBOX_CLIENT_SECRET')
    CLIENT_VERSION = int(os.getenv('PHONEPE_SANDBOX_CLIENT_VERSION', '1'))
    
    ENVIRONMENT = 'SANDBOX'
    
    REDIRECT_URL = os.getenv('PHONEPE_REDIRECT_URL', 'http://localhost:5173/payment/callback')
    CALLBACK_URL = os.getenv('PHONEPE_CALLBACK_URL', 'http://localhost:5000/api/payment/callback')
    
    WEBHOOK_USERNAME = os.getenv('PHONEPE_WEBHOOK_USERNAME', '')
    WEBHOOK_PASSWORD = os.getenv('PHONEPE_WEBHOOK_PASSWORD', '')


# Legacy configuration (keeping for backward compatibility)
class PhonePeConfigLegacy:
    """
    Legacy PhonePe Configuration using old API approach
    Kept for backward compatibility
    """
    MERCHANT_ID = os.getenv('PHONEPE_MERCHANT_ID', 'M22ZR5G5PJQK2')
    SALT_KEY = os.getenv('PHONEPE_SALT_KEY', 'c099eb0cd-02cf-4e2a-8aca-3e6c6aff0399')
    SALT_INDEX = os.getenv('PHONEPE_SALT_INDEX', '1')
    
    BASE_URL = os.getenv('PHONEPE_BASE_URL', 'https://api-preprod.phonepe.com/apis/pg-sandbox')
    REDIRECT_URL = os.getenv('PHONEPE_REDIRECT_URL', 'http://localhost:5173/payment/callback')
    
    PAY_API = f"{BASE_URL}/pg/v1/pay"
    STATUS_API = f"{BASE_URL}/pg/v1/status"
    REFUND_API = f"{BASE_URL}/pg/v1/refund"
