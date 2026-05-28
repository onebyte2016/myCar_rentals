import stripe
from django.conf import settings
from decimal import Decimal
import requests
import hmac
import hashlib


FLUTTERWAVE_BASE_URL = 'https://api.flutterwave.com/v3'
THAWANI_BASE_URL = 'https://uatcheckout.thawani.om/api/v1'  # use https://checkout.thawani.om/api/v1 for production
stripe.api_key = settings.STRIPE_SECRET_KEY


class StripeGateway:
    """
    Handles Stripe card payments and refunds.

    Required settings:
        STRIPE_SECRET_KEY = 'sk_live_...'
        STRIPE_PUBLISHABLE_KEY = 'pk_live_...'
        STRIPE_WEBHOOK_SECRET = 'whsec_...'
    """

    @staticmethod
    def create_payment_intent(amount: Decimal, currency: str, booking_ref: str, metadata: dict = {}):
        """Creates a PaymentIntent. Returns client_secret for frontend."""
        try:
            intent = stripe.PaymentIntent.create(
                amount=int(amount * 100),  # Stripe uses smallest unit
                currency=currency.lower(),
                metadata={'booking_reference': booking_ref, **metadata},
                automatic_payment_methods={'enabled': True},
            )
            return {
                'success': True,
                'client_secret': intent.client_secret,
                'payment_intent_id': intent.id,
            }
        except stripe.error.StripeError as e:
            return {'success': False, 'error': str(e)}

    @staticmethod
    def confirm_payment(payment_intent_id: str):
        """Verify a PaymentIntent status after frontend confirms."""
        try:
            intent = stripe.PaymentIntent.retrieve(payment_intent_id)
            return {
                'success': intent.status == 'succeeded',
                'status': intent.status,
                'amount': Decimal(str(intent.amount / 100)),
                'currency': intent.currency.upper(),
                'gateway_reference': intent.id,
            }
        except stripe.error.StripeError as e:
            return {'success': False, 'error': str(e)}

    @staticmethod
    def process_refund(payment_intent_id: str, amount: Decimal = None):
        """Refund a charge. Pass amount for partial refund, None for full."""
        try:
            params = {'payment_intent': payment_intent_id}
            if amount:
                params['amount'] = int(amount * 100)
            refund = stripe.Refund.create(**params)
            return {
                'success': refund.status in ('succeeded', 'pending'),
                'refund_id': refund.id,
                'amount': Decimal(str(refund.amount / 100)),
                'status': refund.status,
            }
        except stripe.error.StripeError as e:
            return {'success': False, 'error': str(e)}

    @staticmethod
    def verify_webhook(payload: bytes, sig_header: str):
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
            )
            return {'success': True, 'event': event}
        except (ValueError, stripe.error.SignatureVerificationError) as e:
            return {'success': False, 'error': str(e)}



class ThawaniGateway:
    """
    Handles Thawani payments — popular in Oman.

    Required settings:
        THAWANI_API_KEY = 'your_api_key'
        THAWANI_PUBLISHABLE_KEY = 'your_publishable_key'
        THAWANI_SUCCESS_URL = 'https://yourdomain.com/payment/success'
        THAWANI_CANCEL_URL = 'https://yourdomain.com/payment/cancel'

    Docs: https://developer.thawani.om
    """

    @staticmethod
    def _headers():
        return {
            'thawani-api-key': settings.THAWANI_API_KEY,
            'Content-Type': 'application/json',
        }

    @staticmethod
    def create_session(amount, currency, booking_ref, customer_email, customer_phone, metadata={}):
        if currency == 'OMR':
            amount_baisa = int(float(amount) * 1000)
        else:
            amount_baisa = int(float(amount) * 100)

        payload = {
            'client_reference_id': booking_ref,
            'mode': 'payment',
            'products': [
                {
                    'name': f'Car Rental Booking {booking_ref}',
                    'quantity': 1,
                    'unit_amount': amount_baisa,
                }
            ],
            'success_url': settings.THAWANI_SUCCESS_URL + f'?ref={booking_ref}',
            'cancel_url': settings.THAWANI_CANCEL_URL + f'?ref={booking_ref}',
            'metadata': metadata,
        }

        try:
            response = requests.post(
                f'{THAWANI_BASE_URL}/checkout/session',
                json=payload,
                headers=ThawaniGateway._headers(),
                timeout=30,
            )
            data = response.json()

            # Log full response for debugging
            print(f"Thawani response status: {response.status_code}")
            print(f"Thawani response body: {data}")

            if response.status_code == 200 and data.get('success'):
                session_id = data['data']['session_id']
                checkout_url = f'https://uatcheckout.thawani.om/pay/{session_id}?key={settings.THAWANI_PUBLISHABLE_KEY}'
                return {
                    'success': True,
                    'session_id': session_id,
                    'checkout_url': checkout_url,
                    'gateway_reference': session_id,
                }
            return {
                'success': False,
                'error': data.get('description', str(data))  # show full error
            }
        except requests.RequestException as e:
            return {'success': False, 'error': str(e)}
    
    # @staticmethod
    # def create_session(amount: Decimal, currency: str, booking_ref: str,
    #                    customer_email: str, customer_phone: str, metadata: dict = {}):
    #     """
    #     Creates a Thawani checkout session.
    #     Thawani amounts are in Baisa (1 OMR = 1000 Baisa).
    #     Returns session_id and checkout URL.
    #     """
    #     # Convert OMR to Baisa
    #     if currency == 'OMR':
    #         amount_baisa = int(amount * 1000)
    #     else:
    #         amount_baisa = int(amount * 100)

    #     payload = {
    #         'client_reference_id': booking_ref,
    #         'mode': 'payment',
    #         'products': [
    #             {
    #                 'name': f'Car Rental Booking {booking_ref}',
    #                 'quantity': 1,
    #                 'unit_amount': amount_baisa,
    #             }
    #         ],
    #         'success_url': settings.THAWANI_SUCCESS_URL + f'?ref={booking_ref}',
    #         'cancel_url': settings.THAWANI_CANCEL_URL + f'?ref={booking_ref}',
    #         'metadata': metadata,
    #     }

    #     try:
    #         response = requests.post(
    #             f'{THAWANI_BASE_URL}/checkout/session',
    #             json=payload,
    #             headers=ThawaniGateway._headers(),
    #             timeout=30,
    #         )
    #         data = response.json()

    #         if response.status_code == 200 and data.get('success'):
    #             session_id = data['data']['session_id']
    #             checkout_url = f'https://uatcheckout.thawani.om/pay/{session_id}?key={settings.THAWANI_PUBLISHABLE_KEY}'
    #             return {
    #                 'success': True,
    #                 'session_id': session_id,
    #                 'checkout_url': checkout_url,
    #                 'gateway_reference': session_id,
    #             }
    #         return {'success': False, 'error': data.get('description', 'Thawani session creation failed')}
    #     except requests.RequestException as e:
    #         return {'success': False, 'error': str(e)}

    @staticmethod
    def verify_session(session_id: str):
        """Check the status of a Thawani checkout session."""
        try:
            response = requests.get(
                f'{THAWANI_BASE_URL}/checkout/session/{session_id}',
                headers=ThawaniGateway._headers(),
                timeout=30,
            )
            data = response.json()

            if response.status_code == 200 and data.get('success'):
                session = data['data']
                payment_status = session.get('payment_status', '')
                return {
                    'success': payment_status == 'paid',
                    'status': payment_status,
                    'gateway_reference': session_id,
                    'raw': session,
                }
            return {'success': False, 'error': 'Failed to verify session'}
        except requests.RequestException as e:
            return {'success': False, 'error': str(e)}

    @staticmethod
    def process_refund(payment_id: str, amount: Decimal = None):
        """
        Thawani refund — contact their support API.
        Note: Thawani refunds may need to be done via dashboard for some accounts.
        """
        try:
            payload = {'payment_id': payment_id}
            if amount:
                payload['amount'] = int(amount * 1000)  # Baisa

            response = requests.post(
                f'{THAWANI_BASE_URL}/refund',
                json=payload,
                headers=ThawaniGateway._headers(),
                timeout=30,
            )
            data = response.json()
            return {
                'success': data.get('success', False),
                'refund_id': data.get('data', {}).get('id', ''),
                'status': 'completed' if data.get('success') else 'failed',
                'raw': data,
            }
        except requests.RequestException as e:
            return {'success': False, 'error': str(e)}



class FlutterwaveGateway:
    """
    Handles Flutterwave payments — cards, mobile money (MTN, Airtel, M-Pesa),
    bank transfers. Used across Africa.

    Required settings:
        FLUTTERWAVE_SECRET_KEY = 'FLWSECK_TEST-...'
        FLUTTERWAVE_PUBLIC_KEY = 'FLWPUBK_TEST-...'
        FLUTTERWAVE_ENCRYPTION_KEY = '...'
        FLUTTERWAVE_WEBHOOK_SECRET = '...'
        FLUTTERWAVE_REDIRECT_URL = 'https://yourdomain.com/payment/flutterwave/callback'

    Docs: https://developer.flutterwave.com
    """

    @staticmethod
    def _headers():
        return {
            'Authorization': f'Bearer {settings.FLUTTERWAVE_SECRET_KEY}',
            'Content-Type': 'application/json',
        }

    @staticmethod
    def initiate_payment(amount: Decimal, currency: str, booking_ref: str,
                         customer_name: str, customer_email: str,
                         customer_phone: str, payment_type: str = 'card',
                         metadata: dict = {}):
        """
        Initiates a Flutterwave payment.
        payment_type options: 'card', 'mobilemoneyghana', 'mobilemoneyrwanda',
                              'mobilemoneyuganda', 'mobilemoneyzambia',
                              'mpesa', 'account' (bank transfer)
        Returns payment link for redirect.
        """
        payload = {
            'tx_ref': booking_ref,
            'amount': str(amount),
            'currency': currency,
            'redirect_url': settings.FLUTTERWAVE_REDIRECT_URL,
            'meta': {'booking_ref': booking_ref, **metadata},
            'customer': {
                'email': customer_email,
                'phonenumber': customer_phone,
                'name': customer_name,
            },
            'customizations': {
                'title': 'Abeliza Car Rentals',
                'description': f'Payment for Booking {booking_ref}',
            },
            'payment_options': payment_type,
        }

        try:
            response = requests.post(
                f'{FLUTTERWAVE_BASE_URL}/payments',
                json=payload,
                headers=FlutterwaveGateway._headers(),
                timeout=30,
            )
            data = response.json()

            if data.get('status') == 'success':
                return {
                    'success': True,
                    'payment_link': data['data']['link'],
                    'gateway_reference': booking_ref,
                }
            return {'success': False, 'error': data.get('message', 'Payment initiation failed')}
        except requests.RequestException as e:
            return {'success': False, 'error': str(e)}

    @staticmethod
    def verify_payment(transaction_id: str):
        """Verify a Flutterwave transaction after redirect."""
        try:
            response = requests.get(
                f'{FLUTTERWAVE_BASE_URL}/transactions/{transaction_id}/verify',
                headers=FlutterwaveGateway._headers(),
                timeout=30,
            )
            data = response.json()

            if data.get('status') == 'success':
                tx = data['data']
                return {
                    'success': tx['status'] == 'successful',
                    'status': tx['status'],
                    'amount': Decimal(str(tx['amount'])),
                    'currency': tx['currency'],
                    'gateway_reference': str(transaction_id),
                    'tx_ref': tx.get('tx_ref', ''),
                    'raw': tx,
                }
            return {'success': False, 'error': data.get('message', 'Verification failed')}
        except requests.RequestException as e:
            return {'success': False, 'error': str(e)}

    @staticmethod
    def initiate_mobile_money(amount: Decimal, currency: str, booking_ref: str,
                               phone: str, network: str, country: str,
                               customer_email: str, customer_name: str):
        """
        Direct mobile money charge.
        network: 'MTN', 'VODAFONE', 'TIGO', 'AIRTEL'
        country: 'GH', 'UG', 'RW', 'ZM', 'KE'
        currency: 'GHS', 'UGX', 'RWF', 'ZMW', 'KES'
        """
        network_map = {
            'GH': 'mobilemoneyghana',
            'UG': 'mobilemoneyuganda',
            'RW': 'mobilemoneyrwanda',
            'ZM': 'mobilemoneyzambia',
            'KE': 'mpesa',
        }
        payment_type = network_map.get(country, 'mobilemoneyghana')

        payload = {
            'amount': str(amount),
            'currency': currency,
            'email': customer_email,
            'fullname': customer_name,
            'phone_number': phone,
            'network': network,
            'tx_ref': booking_ref,
            'redirect_url': settings.FLUTTERWAVE_REDIRECT_URL,
        }

        try:
            response = requests.post(
                f'{FLUTTERWAVE_BASE_URL}/charges?type={payment_type}',
                json=payload,
                headers=FlutterwaveGateway._headers(),
                timeout=30,
            )
            data = response.json()
            if data.get('status') == 'success':
                return {
                    'success': True,
                    'status': data['data'].get('status'),
                    'flw_ref': data['data'].get('flw_ref'),
                    'message': data.get('message', ''),
                    'raw': data,
                }
            return {'success': False, 'error': data.get('message', 'Mobile money charge failed')}
        except requests.RequestException as e:
            return {'success': False, 'error': str(e)}

    @staticmethod
    def process_refund(transaction_id: str, amount: Decimal):
        """Process a full or partial refund via Flutterwave."""
        try:
            payload = {'amount': str(amount)}
            response = requests.post(
                f'{FLUTTERWAVE_BASE_URL}/transactions/{transaction_id}/refund',
                json=payload,
                headers=FlutterwaveGateway._headers(),
                timeout=30,
            )
            data = response.json()
            return {
                'success': data.get('status') == 'success',
                'refund_id': str(data.get('data', {}).get('id', '')),
                'status': data.get('data', {}).get('status', 'failed'),
                'raw': data,
            }
        except requests.RequestException as e:
            return {'success': False, 'error': str(e)}

    @staticmethod
    def verify_webhook(payload: str, signature: str):
        """Verify Flutterwave webhook signature."""
        secret = settings.FLUTTERWAVE_WEBHOOK_SECRET
        expected = hmac.new(
            secret.encode('utf-8'),
            payload.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        return hmac.compare_digest(expected, signature)






# """
# Payment gateway service classes.
# Each gateway implements the same interface:
#   - initiate_payment(payment, **kwargs) → dict with gateway data
#   - verify_payment(gateway_reference) → bool
#   - process_refund(refund) → bool
# """
# import stripe
# import requests
# import hmac
# import hashlib
# from decimal import Decimal
# from django.conf import settings


# # ── Stripe ────────────────────────────────────────────────────────────────────
# class StripeService:
#     def __init__(self):
#         stripe.api_key = settings.STRIPE_SECRET_KEY

#     def initiate_payment(self, payment, stripe_payment_method_id=None, **kwargs):
#         """
#         Creates a Stripe PaymentIntent.
#         Returns client_secret for frontend confirmation.
#         """
#         try:
#             # Convert to cents (Stripe uses smallest currency unit)
#             amount_cents = int(payment.total_amount * 100)

#             intent = stripe.PaymentIntent.create(
#                 amount=amount_cents,
#                 currency=payment.currency.code.lower(),
#                 payment_method=stripe_payment_method_id,
#                 confirm=bool(stripe_payment_method_id),
#                 metadata={
#                     'payment_reference': payment.reference,
#                     'booking_id': str(payment.booking.id),
#                     'user_email': payment.user.email,
#                 },
#                 description=f'Abeliza Car Rental - Booking #{payment.booking.id}',
#             )

#             return {
#                 'success': True,
#                 'client_secret': intent.client_secret,
#                 'payment_intent_id': intent.id,
#                 'status': intent.status,
#             }

#         except stripe.error.StripeError as e:
#             return {'success': False, 'error': str(e)}

#     def verify_payment(self, payment_intent_id):
#         """Verify payment status from Stripe."""
#         try:
#             intent = stripe.PaymentIntent.retrieve(payment_intent_id)
#             return intent.status == 'succeeded'
#         except stripe.error.StripeError:
#             return False

#     def process_refund(self, refund):
#         """Process refund via Stripe."""
#         try:
#             payment = refund.payment
#             amount_cents = int(refund.amount * 100)

#             stripe_refund = stripe.Refund.create(
#                 payment_intent=payment.gateway_reference,
#                 amount=amount_cents,
#                 reason='requested_by_customer',
#                 metadata={'refund_reference': refund.reference},
#             )

#             refund.gateway_refund_id = stripe_refund.id
#             refund.save(update_fields=['gateway_refund_id'])
#             return True

#         except stripe.error.StripeError:
#             return False

#     def construct_webhook_event(self, payload, sig_header):
#         """Verify and parse Stripe webhook."""
#         try:
#             return stripe.Webhook.construct_event(
#                 payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
#             )
#         except (ValueError, stripe.error.SignatureVerificationError):
#             return None


# # ── Thawani ───────────────────────────────────────────────────────────────────
# class ThawaniService:
#     BASE_URL = 'https://uatcheckout.thawani.om/api/v1'  # use prod URL in production

#     def __init__(self):
#         self.api_key = settings.THAWANI_API_KEY
#         self.publishable_key = settings.THAWANI_PUBLISHABLE_KEY
#         self.headers = {
#             'thawani-api-key': self.api_key,
#             'Content-Type': 'application/json',
#         }

#     def initiate_payment(self, payment, redirect_url=None, **kwargs):
#         """
#         Creates a Thawani checkout session.
#         Returns checkout URL for redirect.
#         Thawani works in OMR (amounts in baisa = OMR * 1000).
#         """
#         try:
#             # Thawani uses baisa (1 OMR = 1000 baisa)
#             amount_baisa = int(payment.total_amount * 1000)

#             payload = {
#                 'client_reference_id': payment.reference,
#                 'mode': 'payment',
#                 'products': [
#                     {
#                         'name': f'Car Rental - Booking #{payment.booking.id}',
#                         'quantity': 1,
#                         'unit_amount': amount_baisa,
#                     }
#                 ],
#                 'success_url': redirect_url or f'{settings.FRONTEND_URL}/booking/success',
#                 'cancel_url': f'{settings.FRONTEND_URL}/booking/cancel',
#                 'metadata': {
#                     'payment_reference': payment.reference,
#                     'booking_id': str(payment.booking.id),
#                 },
#             }

#             response = requests.post(
#                 f'{self.BASE_URL}/checkout/session',
#                 json=payload,
#                 headers=self.headers,
#                 timeout=30,
#             )
#             data = response.json()

#             if response.status_code == 200 and data.get('success'):
#                 session_id = data['data']['session_id']
#                 checkout_url = f'https://uatcheckout.thawani.om/pay/{session_id}?key={self.publishable_key}'
#                 return {
#                     'success': True,
#                     'checkout_url': checkout_url,
#                     'session_id': session_id,
#                 }

#             return {'success': False, 'error': data.get('description', 'Thawani error')}

#         except requests.RequestException as e:
#             return {'success': False, 'error': str(e)}

#     def verify_payment(self, session_id):
#         """Verify Thawani checkout session status."""
#         try:
#             response = requests.get(
#                 f'{self.BASE_URL}/checkout/session/{session_id}',
#                 headers=self.headers,
#                 timeout=30,
#             )
#             data = response.json()
#             if data.get('success'):
#                 return data['data']['payment_status'] == 'paid'
#             return False
#         except requests.RequestException:
#             return False

#     def process_refund(self, refund):
#         """Thawani refund via their API."""
#         try:
#             amount_baisa = int(refund.amount * 1000)
#             payload = {
#                 'client_reference_id': refund.reference,
#                 'amount': amount_baisa,
#                 'session_id': refund.payment.gateway_response.get('session_id', ''),
#                 'reason': refund.reason,
#             }
#             response = requests.post(
#                 f'{self.BASE_URL}/refund',
#                 json=payload,
#                 headers=self.headers,
#                 timeout=30,
#             )
#             data = response.json()
#             if data.get('success'):
#                 refund.gateway_refund_id = data['data'].get('id', '')
#                 refund.save(update_fields=['gateway_refund_id'])
#                 return True
#             return False
#         except requests.RequestException:
#             return False


# # ── Flutterwave ───────────────────────────────────────────────────────────────
# class FlutterwaveService:
#     BASE_URL = 'https://api.flutterwave.com/v3'

#     def __init__(self):
#         self.secret_key = settings.FLUTTERWAVE_SECRET_KEY
#         self.headers = {
#             'Authorization': f'Bearer {self.secret_key}',
#             'Content-Type': 'application/json',
#         }

#     def initiate_card_payment(self, payment, redirect_url=None, **kwargs):
#         """Standard card payment via Flutterwave hosted page."""
#         try:
#             payload = {
#                 'tx_ref': payment.reference,
#                 'amount': str(payment.total_amount),
#                 'currency': payment.currency.code,
#                 'redirect_url': redirect_url or f'{settings.FRONTEND_URL}/booking/success',
#                 'customer': {
#                     'email': payment.user.email,
#                     'name': payment.user.get_full_name() or payment.user.username,
#                 },
#                 'customizations': {
#                     'title': 'Abeliza Car Rentals',
#                     'description': f'Booking #{payment.booking.id}',
#                 },
#                 'meta': {
#                     'payment_reference': payment.reference,
#                     'booking_id': str(payment.booking.id),
#                 },
#             }
#             response = requests.post(
#                 f'{self.BASE_URL}/payments',
#                 json=payload,
#                 headers=self.headers,
#                 timeout=30,
#             )
#             data = response.json()
#             if data.get('status') == 'success':
#                 return {
#                     'success': True,
#                     'checkout_url': data['data']['link'],
#                     'tx_ref': payment.reference,
#                 }
#             return {'success': False, 'error': data.get('message', 'Flutterwave error')}
#         except requests.RequestException as e:
#             return {'success': False, 'error': str(e)}

#     def initiate_mobile_money(self, payment, mobile_number, network, **kwargs):
#         """
#         Mobile money charge (MTN, Airtel, Mpesa, etc.)
#         Supported networks: MTN, AIRTEL, ZAMTEL, MPESA, VODAFONE, TIGO
#         """
#         try:
#             network_map = {
#                 'MTN': 'MTN',
#                 'AIRTEL': 'AIRTEL',
#                 'MPESA': 'MPESA',
#                 'VODAFONE': 'VODAFONE',
#                 'TIGO': 'TIGO',
#                 'ZAMTEL': 'ZAMTEL',
#             }
#             payload = {
#                 'tx_ref': payment.reference,
#                 'amount': str(payment.total_amount),
#                 'currency': payment.currency.code,
#                 'email': payment.user.email,
#                 'phone_number': mobile_number,
#                 'network': network_map.get(network.upper(), network.upper()),
#                 'fullname': payment.user.get_full_name() or payment.user.username,
#                 'redirect_url': f'{settings.FRONTEND_URL}/booking/success',
#             }
#             response = requests.post(
#                 f'{self.BASE_URL}/charges?type=mobile_money_ghana',
#                 json=payload,
#                 headers=self.headers,
#                 timeout=30,
#             )
#             data = response.json()
#             if data.get('status') == 'success':
#                 return {
#                     'success': True,
#                     'flw_ref': data['data'].get('flw_ref'),
#                     'status': data['data'].get('status'),
#                     'message': data.get('message', 'OTP sent to mobile'),
#                 }
#             return {'success': False, 'error': data.get('message', 'Mobile money error')}
#         except requests.RequestException as e:
#             return {'success': False, 'error': str(e)}

#     def initiate_payment(self, payment, payment_method='card', **kwargs):
#         """Route to correct method based on payment_method."""
#         if payment_method == 'mobile_money':
#             return self.initiate_mobile_money(
#                 payment,
#                 mobile_number=kwargs.get('mobile_number', ''),
#                 network=kwargs.get('network', 'MTN'),
#             )
#         return self.initiate_card_payment(payment, **kwargs)

#     def verify_payment(self, transaction_id):
#         """Verify Flutterwave transaction."""
#         try:
#             response = requests.get(
#                 f'{self.BASE_URL}/transactions/{transaction_id}/verify',
#                 headers=self.headers,
#                 timeout=30,
#             )
#             data = response.json()
#             if data.get('status') == 'success':
#                 return data['data']['status'] == 'successful'
#             return False
#         except requests.RequestException:
#             return False

#     def verify_by_tx_ref(self, tx_ref):
#         """Verify by transaction reference (our payment.reference)."""
#         try:
#             response = requests.get(
#                 f'{self.BASE_URL}/transactions',
#                 params={'tx_ref': tx_ref},
#                 headers=self.headers,
#                 timeout=30,
#             )
#             data = response.json()
#             if data.get('status') == 'success' and data['data']:
#                 return data['data'][0]['status'] == 'successful'
#             return False
#         except requests.RequestException:
#             return False

#     def process_refund(self, refund):
#         """Process refund via Flutterwave."""
#         try:
#             transaction_id = refund.payment.gateway_response.get('transaction_id')
#             if not transaction_id:
#                 return False

#             payload = {'amount': str(refund.amount)}
#             response = requests.post(
#                 f'{self.BASE_URL}/transactions/{transaction_id}/refund',
#                 json=payload,
#                 headers=self.headers,
#                 timeout=30,
#             )
#             data = response.json()
#             if data.get('status') == 'success':
#                 refund.gateway_refund_id = str(data['data'].get('id', ''))
#                 refund.save(update_fields=['gateway_refund_id'])
#                 return True
#             return False
#         except requests.RequestException:
#             return False

#     def verify_webhook_signature(self, payload, signature):
#         """Verify Flutterwave webhook signature."""
#         expected = hmac.new(
#             settings.FLUTTERWAVE_SECRET_HASH.encode(),
#             payload,
#             hashlib.sha256
#         ).hexdigest()
#         return hmac.compare_digest(expected, signature)


# # ── Gateway factory ───────────────────────────────────────────────────────────
# def get_gateway_service(gateway: str):
#     """Returns the correct gateway service instance."""
#     services = {
#         'stripe': StripeService,
#         'thawani': ThawaniService,
#         'flutterwave': FlutterwaveService,
#     }
#     service_class = services.get(gateway)
#     if not service_class:
#         raise ValueError(f'Unsupported gateway: {gateway}')
#     return service_class()