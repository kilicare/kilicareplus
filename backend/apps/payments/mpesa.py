import requests
import base64
from datetime import datetime
from django.conf import settings


class MPesaDaraja:
    """Safaricom M-Pesa Daraja API"""

    def __init__(self):
        self.consumer_key = settings.MPESA_CONSUMER_KEY
        self.consumer_secret = settings.MPESA_CONSUMER_SECRET
        self.shortcode = settings.MPESA_SHORTCODE
        self.passkey = settings.MPESA_PASSKEY
        self.env = settings.MPESA_ENV  # 'sandbox' or 'production'

        if self.env == 'production':
            self.base_url = 'https://api.safaricom.co.ke'
        else:
            self.base_url = 'https://sandbox.safaricom.co.ke'

    def get_access_token(self) -> str:
        credentials = base64.b64encode(
            f'{self.consumer_key}:{self.consumer_secret}'.encode()
        ).decode('utf-8')

        response = requests.get(
            f'{self.base_url}/oauth/v1/generate?grant_type=client_credentials',
            headers={'Authorization': f'Basic {credentials}'},
            timeout=30,
        )
        response.raise_for_status()
        return response.json()['access_token']

    def get_password(self, timestamp: str) -> str:
        data = f'{self.shortcode}{self.passkey}{timestamp}'
        return base64.b64encode(data.encode()).decode('utf-8')

    def stk_push(
        self,
        phone: str,
        amount: int,
        account_ref: str,
        description: str,
        callback_url: str = None,
    ) -> dict:
        """Initiate STK Push — prompts user on phone"""
        token = self.get_access_token()
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        password = self.get_password(timestamp)

        # Format phone: 254XXXXXXXXX
        phone = phone.replace('+', '').replace(' ', '')
        if phone.startswith('0'):
            phone = f'254{phone[1:]}'
        elif phone.startswith('07') or phone.startswith('01'):
            phone = f'254{phone[1:]}'

        cb_url = callback_url or f'{settings.BASE_URL}/api/payments/mpesa/callback/'

        payload = {
            'BusinessShortCode': self.shortcode,
            'Password': password,
            'Timestamp': timestamp,
            'TransactionType': 'CustomerPayBillOnline',
            'Amount': amount,
            'PartyA': phone,
            'PartyB': self.shortcode,
            'PhoneNumber': phone,
            'CallBackURL': cb_url,
            'AccountReference': account_ref[:12],
            'TransactionDesc': description[:13],
        }

        response = requests.post(
            f'{self.base_url}/mpesa/stkpush/v1/processrequest',
            json=payload,
            headers={
                'Authorization': f'Bearer {token}',
                'Content-Type': 'application/json',
            },
            timeout=30,
        )
        return response.json()

    def query_stk(self, checkout_request_id: str) -> dict:
        """Check STK Push payment status"""
        token = self.get_access_token()
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        password = self.get_password(timestamp)

        payload = {
            'BusinessShortCode': self.shortcode,
            'Password': password,
            'Timestamp': timestamp,
            'CheckoutRequestID': checkout_request_id,
        }

        response = requests.post(
            f'{self.base_url}/mpesa/stkpushquery/v1/query',
            json=payload,
            headers={
                'Authorization': f'Bearer {token}',
                'Content-Type': 'application/json',
            },
            timeout=30,
        )
        return response.json()

    @staticmethod
    def parse_callback(data: dict) -> dict:
        """Parse M-Pesa webhook callback"""
        try:
            callback = data['Body']['stkCallback']
            result_code = callback['ResultCode']
            success = result_code == 0

            result = {
                'success': success,
                'result_code': result_code,
                'result_desc': callback.get('ResultDesc', ''),
                'merchant_request_id': callback.get('MerchantRequestID'),
                'checkout_request_id': callback.get('CheckoutRequestID'),
                'transaction_code': None,
                'amount': None,
                'phone': None,
                'transaction_date': None,
            }

            if success and 'CallbackMetadata' in callback:
                items = callback['CallbackMetadata']['Item']
                for item in items:
                    name = item.get('Name')
                    value = item.get('Value')
                    if name == 'MpesaReceiptNumber':
                        result['transaction_code'] = value
                    elif name == 'Amount':
                        result['amount'] = value
                    elif name == 'PhoneNumber':
                        result['phone'] = str(value)
                    elif name == 'TransactionDate':
                        result['transaction_date'] = str(value)

            return result
        except (KeyError, TypeError) as e:
            return {
                'success': False,
                'error': str(e),
                'result_code': -1,
            }