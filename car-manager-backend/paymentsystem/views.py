import uuid
from django.utils import timezone
from django.shortcuts import get_object_or_404
from django.db.models import Sum, Count, Q
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser, AllowAny
from rest_framework import status
from decimal import Decimal
from .utils import generate_invoice
from .services import StripeGateway, ThawaniGateway, FlutterwaveGateway

from .models import (
     CouponUsage, Wallet, WalletTransaction, Coupon,
    Payment, SplitPayment, Refund, Invoice, DynamicPricingRule
)
from .serializers import (
     WalletSerializer, WalletTransactionSerializer,
     CouponSerializer,
    PaymentSerializer,
    RefundSerializer, InvoiceSerializer, DynamicPricingRuleSerializer,
)



# ── Helpers ───────────────────────────────────────────────────────────────────
def get_client_ip(request):
    x_forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    return x_forwarded.split(',')[0] if x_forwarded else request.META.get('REMOTE_ADDR')


def create_split(payment):
    """Auto-creates SplitPayment when car belongs to a vendor."""
    try:
        vendor = payment.booking.car.vendor
        if not vendor:
            return
        rate = float(vendor.commission_rate)
        total = float(payment.amount)
        platform = round(total * rate / 100, 2)
        vendor_cut = round(total - platform, 2)
        SplitPayment.objects.create(
            payment=payment,
            vendor=vendor,
            total_amount=total,
            vendor_amount=vendor_cut,
            platform_amount=platform,
            commission_rate=rate,
        )
    except Exception:
        pass


# ── Currency ──────────────────────────────────────────────────────────────────
class CurrencyListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        # Currency is stored as choices on Payment model, not a separate model
        currencies = [
            {'code': code, 'name': name}
            for code, name in Payment.CURRENCY_CHOICES
        ]
        return Response(currencies)

# ── Wallet ────────────────────────────────────────────────────────────────────
class WalletView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        wallet, _ = Wallet.objects.get_or_create(
            user=request.user,
            defaults={'currency': 'OMR'}
        )
        transactions = wallet.transactions.all()[:20]
        return Response({
            'balance': float(wallet.balance),
            'currency': wallet.currency,
            'transactions': WalletTransactionSerializer(transactions, many=True).data,
        })


class WalletTransactionsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        wallet = get_object_or_404(Wallet, user=request.user)
        txns = WalletTransaction.objects.filter(wallet=wallet).order_by('-created_at')
        return Response(WalletTransactionSerializer(txns, many=True).data)


class WalletTopUpView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        amount = Decimal(str(request.data.get('amount', 0)))
        gateway = request.data.get('gateway', 'stripe')
        currency = request.data.get('currency', 'USD')

        if amount <= 0:
            return Response({'error': 'Invalid amount'}, status=400)

        tx_ref = f'TOPUP-{request.user.id}-{uuid.uuid4().hex[:8].upper()}'

        try:
            if gateway == 'stripe':
                result = StripeGateway.create_payment_intent(
                    amount=amount,
                    currency=currency,
                    booking_ref=tx_ref,
                    metadata={
                        'type': 'wallet_topup',
                        'user_id': str(request.user.id),
                    },
                )
                if not result['success']:
                    return Response({'error': result['error']}, status=400)
                return Response({
                    'gateway': 'stripe',
                    'client_secret': result['client_secret'],
                    'payment_intent_id': result['payment_intent_id'],
                    'tx_ref': tx_ref,
                    'amount': float(amount),
                })

            elif gateway == 'flutterwave':
                customer_name = f"{request.user.first_name} {request.user.last_name}".strip() or request.user.email
                result = FlutterwaveGateway.initiate_payment(
                    amount=amount,
                    currency=currency,
                    booking_ref=tx_ref,
                    customer_name=customer_name,
                    customer_email=request.user.email,
                    customer_phone=getattr(request.user, 'phone_number', ''),
                )
                if not result['success']:
                    return Response({'error': result['error']}, status=400)
                return Response({
                    'gateway': 'flutterwave',
                    'payment_link': result['payment_link'],
                    'tx_ref': tx_ref,
                    'amount': float(amount),
                })

            elif gateway == 'thawani':
                result = ThawaniGateway.create_session(
                    amount=amount,
                    currency='OMR',
                    booking_ref=tx_ref,
                    customer_email=request.user.email,
                    customer_phone=getattr(request.user, 'phone_number', ''),
                )
                if not result['success']:
                    return Response({'error': result['error']}, status=400)
                return Response({
                    'gateway': 'thawani',
                    'checkout_url': result['checkout_url'],
                    'tx_ref': tx_ref,
                    'amount': float(amount),
                })

            return Response({'error': f'Unknown gateway: {gateway}'}, status=400)

        except Exception as e:
            return Response({'error': str(e)}, status=400)
# class WalletTopUpView(APIView):
#     """Initiates top-up via a payment gateway, then credits wallet on webhook."""
#     permission_classes = [IsAuthenticated]

#     def post(self, request):
#         serializer = WalletSerializer(data=request.data)
#         if not serializer.is_valid():
#             return Response(serializer.errors, status=400)

#         data = serializer.validated_data
#         gateway = data['gateway']
#         amount = data['amount']
#         currency = get_object_or_404(Currency, code=data['currency_code'].upper())
#         tx_ref = f'TOPUP-{request.user.id}-{uuid.uuid4().hex[:8].upper()}'

#         try:
#             if gateway == 'stripe':
#                 gw = StripeGateway()
#                 result = gw.create_payment_intent(amount, currency.code, metadata={
#                     'type': 'wallet_topup',
#                     'user_id': request.user.id,
#                     'tx_ref': tx_ref,
#                 })
#                 return Response({'gateway': 'stripe', 'client_secret': result['client_secret'], 'tx_ref': tx_ref})

#             elif gateway == 'thawani':
#                 gw = ThawaniGateway()
#                 result = gw.create_session(
#                     amount_omr=amount,
#                     booking_id=f'topup-{request.user.id}',
#                     success_url=f'{request.build_absolute_uri("/")}/wallet?status=success',
#                     cancel_url=f'{request.build_absolute_uri("/")}/wallet?status=cancelled',
#                     metadata={'type': 'wallet_topup', 'user_id': request.user.id},
#                 )
#                 return Response({'gateway': 'thawani', 'checkout_url': result['checkout_url'], 'tx_ref': tx_ref})

#             elif gateway == 'flutterwave':
#                 gw = FlutterwaveGateway()
#                 result = gw.initiate_payment(
#                     amount=amount, currency=currency.code,
#                     email=request.user.email,
#                     phone=getattr(request.user, 'phone_number', ''),
#                     name=f'{request.user.first_name} {request.user.last_name}',
#                     tx_ref=tx_ref,
#                     redirect_url=f'{request.build_absolute_uri("/")}/wallet?status=success',
#                 )
#                 return Response({'gateway': 'flutterwave', 'checkout_url': result['link'], 'tx_ref': tx_ref})

#         except Exception as e:
#             return Response({'error': str(e)}, status=400)


# ── Coupon ────────────────────────────────────────────────────────────────────
class CouponValidateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = CouponSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        code = serializer.validated_data['code']
        booking_amount = serializer.validated_data['booking_amount']

        try:
            coupon = Coupon.objects.get(code=code.upper())
        except Coupon.DoesNotExist:
            return Response({'valid': False, 'message': 'Coupon not found'}, status=404)

        valid, message = coupon.is_valid()
        if not valid:
            return Response({'valid': False, 'message': message})

        if booking_amount < coupon.min_booking_amount:
            return Response({
                'valid': False,
                'message': f'Minimum booking amount is {coupon.min_booking_amount}'
            })

        discount = coupon.calculate_discount(booking_amount)
        final_amount = float(booking_amount) - float(discount)

        return Response({
            'valid': True,
            'code': coupon.code,
            'discount_type': coupon.discount_type,
            'discount_value': float(coupon.discount_value),
            'discount_amount': float(discount),
            'original_amount': float(booking_amount),
            'final_amount': float(final_amount),
        })


# ── Payment ───────────────────────────────────────────────────────────────────

class InitiatePaymentView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        booking_id = request.data.get('booking_id')
        amount = request.data.get('amount')
        currency = request.data.get('currency', 'OMR')
        coupon_code = request.data.get('coupon_code', '')
        payment_type = request.data.get('payment_type', 'card')
        phone = request.data.get('phone', '')
        network = request.data.get('network', '')
        country = request.data.get('country', '')

        from core.models import Booking  # update to your app name
        from django.shortcuts import get_object_or_404
        booking = get_object_or_404(Booking, id=booking_id, user=request.user)

        # Determine gateway from URL path
        path = request.path
        if 'thawani' in path:
            result = ThawaniGateway.create_session(
                amount=Decimal(str(amount)),
                currency=currency,
                booking_ref=str(booking.id),
                customer_email=request.user.email,
                customer_phone=phone or getattr(booking, 'gsm', ''),
            )
            if not result['success']:
                return Response({'error': result['error']}, status=400)

            payment = Payment.objects.create(
                booking=booking, user=request.user,
                amount=Decimal(str(amount)), currency=currency,
                method='thawani', status='pending',
                gateway_reference=result['session_id'],
            )
            return Response({
                'checkout_url': result['checkout_url'],
                'session_id': result['session_id'],
                'payment_reference': payment.reference,
                'amount': float(amount),
            })

        elif 'stripe' in path:
            result = StripeGateway.create_payment_intent(
                amount=Decimal(str(amount)),
                currency='USD',
                booking_ref=str(booking.id),
            )
            if not result['success']:
                return Response({'error': result['error']}, status=400)

            payment = Payment.objects.create(
                booking=booking, user=request.user,
                amount=Decimal(str(amount)), currency='USD',
                method='stripe', status='pending',
                gateway_reference=result['payment_intent_id'],
            )
            return Response({
                'client_secret': result['client_secret'],
                'payment_reference': payment.reference,
                'amount': float(amount),
            })

        elif 'flutterwave' in path:
            customer_name = f"{request.user.first_name} {request.user.last_name}".strip() or request.user.email

            if payment_type == 'mobile_money' and phone and network and country:
                result = FlutterwaveGateway.initiate_mobile_money(
                    amount=Decimal(str(amount)), currency=currency,
                    booking_ref=f"{booking.id}-{int(timezone.now().timestamp())}",
                    phone=phone, network=network, country=country,
                    customer_email=request.user.email, customer_name=customer_name,
                )
            else:
                result = FlutterwaveGateway.initiate_payment(
                    amount=Decimal(str(amount)), currency=currency,
                    booking_ref=f"{booking.id}-{int(timezone.now().timestamp())}",
                    customer_name=customer_name, customer_email=request.user.email,
                    customer_phone=phone,
                )

            if not result['success']:
                return Response({'error': result['error']}, status=400)

            payment = Payment.objects.create(
                booking=booking, user=request.user,
                amount=Decimal(str(amount)), currency=currency,
                method='flutterwave', status='pending',
                gateway_reference=result.get('gateway_reference', ''),
            )
            return Response({
                'payment_link': result.get('payment_link', ''),
                'payment_reference': payment.reference,
                'amount': float(amount),
            })

        elif 'wallet' in path:
            wallet, _ = Wallet.objects.get_or_create(user=request.user)
            total = Decimal(str(amount))
            if wallet.balance < total:
                return Response({'error': f'Insufficient balance. Need {total}, have {wallet.balance}'}, status=400)

            wallet.withdraw(total, f'Payment for Booking #{booking.id}', reference=str(booking.id))
            payment = Payment.objects.create(
                booking=booking, user=request.user,
                amount=total, currency=wallet.currency,
                method='wallet', status='completed',
                completed_at=timezone.now(),
            )
            booking.payment_status = 'paid'
            booking.save()
            invoice = generate_invoice(payment)
            return Response({
                'success': True,
                'payment_reference': payment.reference,
                'invoice_number': invoice.invoice_number if invoice else None,
                'new_wallet_balance': float(wallet.balance),
            })

        return Response({'error': 'Unknown payment gateway'}, status=400)
# class InitiatePaymentView(APIView):
#     permission_classes = [IsAuthenticated]

#     def post(self, request):
#         serializer = InitiatePaymentSerializer(data=request.data)
#         if not serializer.is_valid():
#             return Response(serializer.errors, status=400)

#         data = serializer.validated_data
#         from core.models import Booking
#         booking = get_object_or_404(Booking, id=data['booking_id'], user=request.user)
#         currency = get_object_or_404(Currency, code=data['currency_code'].upper())
#         amount = float(booking.total_price)
#         original_amount = amount
#         discount_amount = 0
#         coupon = None

#         # Apply coupon if provided
#         if data.get('coupon_code'):
#             try:
#                 coupon = Coupon.objects.get(code=data['coupon_code'].upper())
#                 valid, msg = coupon.is_valid()
#                 if valid:
#                     discount_amount = float(coupon.calculate_discount(amount))
#                     amount -= discount_amount
#                     coupon.usage_count += 1
#                     coupon.save(update_fields=['usage_count'])
#             except Coupon.DoesNotExist:
#                 pass

#         # Create payment record
#         payment = Payment.objects.create(
#             booking=booking,
#             user=request.user,
#             amount=amount,
#             original_amount=original_amount,
#             discount_amount=discount_amount,
#             currency=currency,
#             gateway=data['gateway'],
#             method=data['method'],
#             coupon=coupon,
#             security_deposit=data.get('security_deposit', 0),
#             ip_address=get_client_ip(request),
#             status='processing',
#         )

#         try:
#             gateway = data['gateway']
#             tx_ref = f'PAY-{payment.id}-{uuid.uuid4().hex[:8].upper()}'

#             # ── Wallet payment (instant) ──
#             if gateway == 'wallet':
#                 wallet = get_object_or_404(Wallet, user=request.user)
#                 wallet.debit(amount)
#                 WalletTransaction.objects.create(
#                     wallet=wallet,
#                     amount=amount,
#                     transaction_type='debit',
#                     description=f'Payment for booking #{booking.id}',
#                     reference=str(payment.reference),
#                     balance_after=wallet.balance,
#                 )
#                 payment.gateway_reference = tx_ref
#                 payment.mark_completed()
#                 create_split(payment)
#                 Invoice.objects.create(payment=payment, user=request.user, status='issued', issued_at=timezone.now())
#                 return Response({'status': 'completed', 'payment_id': str(payment.reference)})

#             # ── Stripe ──
#             elif gateway == 'stripe':
#                 gw = StripeGateway()
#                 result = gw.create_payment_intent(amount, currency.code, metadata={
#                     'payment_id': str(payment.reference),
#                     'booking_id': booking.id,
#                 })
#                 payment.gateway_reference = result['payment_intent_id']
#                 payment.save(update_fields=['gateway_reference'])
#                 return Response({
#                     'status': 'processing',
#                     'gateway': 'stripe',
#                     'client_secret': result['client_secret'],
#                     'payment_id': str(payment.reference),
#                 })

#             # ── Thawani ──
#             elif gateway == 'thawani':
#                 gw = ThawaniGateway()
#                 result = gw.create_session(
#                     amount_omr=amount,
#                     booking_id=booking.id,
#                     success_url=f'{request.build_absolute_uri("/")}/booking/{booking.id}?payment=success',
#                     cancel_url=f'{request.build_absolute_uri("/")}/booking/{booking.id}?payment=cancelled',
#                 )
#                 payment.gateway_reference = result['session_id']
#                 payment.save(update_fields=['gateway_reference'])
#                 return Response({
#                     'status': 'processing',
#                     'gateway': 'thawani',
#                     'checkout_url': result['checkout_url'],
#                     'payment_id': str(payment.reference),
#                 })

#             # ── Flutterwave ──
#             elif gateway == 'flutterwave':
#                 gw = FlutterwaveGateway()
#                 payment_options = 'mobilemoney,card' if data['method'] == 'mobile_money' else 'card,banktransfer'
#                 result = gw.initiate_payment(
#                     amount=amount, currency=currency.code,
#                     email=request.user.email,
#                     phone=data.get('phone_number', ''),
#                     name=f'{request.user.first_name} {request.user.last_name}',
#                     tx_ref=tx_ref,
#                     redirect_url=f'{request.build_absolute_uri("/")}/booking/{booking.id}?payment=success',
#                     payment_options=payment_options,
#                 )
#                 payment.gateway_reference = tx_ref
#                 payment.save(update_fields=['gateway_reference'])
#                 return Response({
#                     'status': 'processing',
#                     'gateway': 'flutterwave',
#                     'checkout_url': result['link'],
#                     'payment_id': str(payment.reference),
#                 })

#             # ── Bank Transfer ──
#             elif gateway == 'bank_transfer':
#                 payment.gateway_reference = tx_ref
#                 payment.notes = f"Bank: {data.get('bank_name', '')} | Account: {data.get('account_number', '')}"
#                 payment.status = 'pending'
#                 payment.save(update_fields=['gateway_reference', 'notes', 'status'])
#                 return Response({
#                     'status': 'pending',
#                     'gateway': 'bank_transfer',
#                     'payment_id': str(payment.reference),
#                     'instructions': {
#                         'bank_name': 'Abeliza Bank',
#                         'account_number': '1234567890',
#                         'account_name': 'Abeliza Car Rentals',
#                         'reference': tx_ref,
#                         'amount': amount,
#                         'currency': currency.code,
#                     }
#                 })

#         except Exception as e:
#             payment.status = 'failed'
#             payment.save(update_fields=['status'])
#             return Response({'error': str(e)}, status=400)


class PaymentDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, reference):
        payment = get_object_or_404(Payment, reference=reference, user=request.user)
        return Response(PaymentSerializer(payment).data)


class UserPaymentsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        payments = Payment.objects.filter(user=request.user).order_by('-created_at')
        return Response(PaymentSerializer(payments, many=True).data)


class VerifyPaymentView(APIView):
    """Called after redirect from gateway to verify and complete payment."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        payment_ref = request.data.get('payment_id')
        gateway_ref = request.data.get('gateway_reference')

        payment = get_object_or_404(Payment, reference=payment_ref, user=request.user)
        if payment.status == 'completed':
            return Response({'status': 'completed', 'already_completed': True})

        try:
            if payment.gateway == 'stripe':
                gw = StripeGateway()
                result = gw.confirm_payment(payment.gateway_reference)
                if result['status'] == 'succeeded':
                    payment.mark_completed()
                    create_split(payment)
                    Invoice.objects.get_or_create(payment=payment, user=payment.user, defaults={'status': 'issued', 'issued_at': timezone.now()})

            elif payment.gateway == 'thawani':
                gw = ThawaniGateway()
                result = gw.retrieve_session(payment.gateway_reference)
                if result.get('data', {}).get('payment_status') == 'paid':
                    payment.mark_completed()
                    create_split(payment)
                    Invoice.objects.get_or_create(payment=payment, user=payment.user, defaults={'status': 'issued', 'issued_at': timezone.now()})

            elif payment.gateway == 'flutterwave':
                gw = FlutterwaveGateway()
                result = gw.verify_transaction(gateway_ref)
                if result.get('status') == 'successful':
                    payment.gateway_response = result
                    payment.mark_completed()
                    create_split(payment)
                    Invoice.objects.get_or_create(payment=payment, user=payment.user, defaults={'status': 'issued', 'issued_at': timezone.now()})

            return Response({'status': payment.status, 'payment_id': str(payment.reference)})
        except Exception as e:
            return Response({'error': str(e)}, status=400)


# ── Webhooks ──────────────────────────────────────────────────────────────────
class StripeWebhookView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        from django.conf import settings
        gw = StripeGateway()
        try:
            event = gw.handle_webhook(
                request.body,
                request.META.get('HTTP_STRIPE_SIGNATURE', '')
            )
        except Exception as e:
            return Response({'error': str(e)}, status=400)

        if event['type'] == 'payment_intent.succeeded':
            intent = event['data']['object']
            payment_ref = intent.get('metadata', {}).get('payment_id')
            if payment_ref:
                try:
                    payment = Payment.objects.get(reference=payment_ref)
                    if payment.status != 'completed':
                        payment.mark_completed()
                        create_split(payment)
                        Invoice.objects.get_or_create(payment=payment, user=payment.user, defaults={'status': 'issued', 'issued_at': timezone.now()})
                except Payment.DoesNotExist:
                    pass

        return Response({'received': True})


class FlutterwaveWebhookView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        from django.conf import settings
        secret_hash = settings.FLUTTERWAVE_SECRET_HASH
        request_hash = request.META.get('HTTP_VERIF_HASH', '')

        if request_hash != secret_hash:
            return Response({'error': 'Invalid signature'}, status=400)

        data = request.data
        if data.get('event') == 'charge.completed' and data.get('data', {}).get('status') == 'successful':
            tx_ref = data['data'].get('tx_ref', '')
            if tx_ref.startswith('PAY-'):
                try:
                    payment_id = tx_ref.split('-')[1]
                    payment = Payment.objects.get(id=payment_id)
                    if payment.status != 'completed':
                        payment.gateway_response = data['data']
                        payment.mark_completed()
                        create_split(payment)
                        Invoice.objects.get_or_create(payment=payment, user=payment.user, defaults={'status': 'issued', 'issued_at': timezone.now()})
                except (Payment.DoesNotExist, IndexError):
                    pass

        return Response({'status': 'ok'})


# ── Refund ────────────────────────────────────────────────────────────────────
class RequestRefundView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        payment_ref = request.data.get('payment_id')
        amount = request.data.get('amount')
        reason = request.data.get('reason', '')

        payment = get_object_or_404(Payment, reference=payment_ref, user=request.user)

        if payment.status not in ['completed']:
            return Response({'error': 'Only completed payments can be refunded'}, status=400)

        refund = Refund.objects.create(
            payment=payment,
            amount=amount or payment.amount,
            reason=reason,
            status='pending',
        )
        return Response(RefundSerializer(refund).data, status=201)


class ProcessRefundView(APIView):
    """Admin only — actually processes the refund via gateway."""
    permission_classes = [IsAuthenticated]

    def post(self, request, refund_id):
        if not request.user.is_staff:
            return Response({'error': 'Admin only'}, status=403)

        refund = get_object_or_404(Refund, id=refund_id)
        payment = refund.payment

        try:
            if payment.gateway == 'stripe':
                gw = StripeGateway()
                result = gw.create_refund(payment.gateway_reference, refund.amount)
                refund.gateway_refund_id = result['refund_id']

            elif payment.gateway == 'thawani':
                gw = ThawaniGateway()
                result = gw.create_refund(payment.gateway_reference, reason=refund.reason)
                refund.gateway_refund_id = result.get('data', {}).get('id', '')

            elif payment.gateway == 'flutterwave':
                gw = FlutterwaveGateway()
                result = gw.create_refund(payment.gateway_reference, refund.amount)
                refund.gateway_refund_id = str(result.get('data', {}).get('id', ''))

            refund.status = 'completed'
            refund.completed_at = timezone.now()
            refund.processed_by = request.user
            refund.save()

            payment.status = 'refunded' if float(refund.amount) >= float(payment.amount) else 'partially_refunded'
            payment.save(update_fields=['status'])

            return Response(RefundSerializer(refund).data)
        except Exception as e:
            refund.status = 'failed'
            refund.save(update_fields=['status'])
            return Response({'error': str(e)}, status=400)


# ── Invoice ───────────────────────────────────────────────────────────────────
class UserInvoicesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        invoices = Invoice.objects.filter(user=request.user).order_by('-created_at')
        return Response(InvoiceSerializer(invoices, many=True).data)


class InvoiceDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, invoice_number):
        invoice = get_object_or_404(Invoice, invoice_number=invoice_number, user=request.user)
        return Response(InvoiceSerializer(invoice).data)


# ── Admin ─────────────────────────────────────────────────────────────────────
class AdminPaymentSummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not request.user.is_staff:
            return Response({'error': 'Admin only'}, status=403)

        payments = Payment.objects.all()
        total_revenue = payments.filter(status='completed').aggregate(t=Sum('amount'))['t'] or 0
        total_refunded = Refund.objects.filter(status='completed').aggregate(t=Sum('amount'))['t'] or 0
        total_pending = payments.filter(status='pending').aggregate(t=Sum('amount'))['t'] or 0
        total_deposits = payments.filter(deposit_status='held').aggregate(t=Sum('security_deposit'))['t'] or 0

        by_gateway = {}
        for g in ['stripe', 'thawani', 'flutterwave', 'wallet', 'bank_transfer', 'mobile_money']:
            count = payments.filter(gateway=g, status='completed').count()
            amount = payments.filter(gateway=g, status='completed').aggregate(t=Sum('amount'))['t'] or 0
            by_gateway[g] = {'count': count, 'amount': float(amount)}

        by_status = {}
        for s in ['pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled']:
            by_status[s] = payments.filter(status=s).count()

        recent = PaymentSerializer(payments.order_by('-created_at')[:10], many=True).data

        return Response({
            'total_revenue': float(total_revenue),
            'total_refunded': float(total_refunded),
            'total_pending': float(total_pending),
            'total_deposits_held': float(total_deposits),
            'payments_by_gateway': by_gateway,
            'payments_by_status': by_status,
            'recent_payments': recent,
        })


class AdminPaymentListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not request.user.is_staff:
            return Response({'error': 'Admin only'}, status=403)

        payments = Payment.objects.all().order_by('-created_at')
        status_filter = request.query_params.get('status')
        gateway_filter = request.query_params.get('gateway')
        if status_filter:
            payments = payments.filter(status=status_filter)
        if gateway_filter:
            payments = payments.filter(gateway=gateway_filter)
        return Response(PaymentSerializer(payments, many=True).data)


class AdminRefundListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not request.user.is_staff:
            return Response({'error': 'Admin only'}, status=403)
        refunds = Refund.objects.all().order_by('-created_at')
        return Response(RefundSerializer(refunds, many=True).data)


class AdminCouponView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not request.user.is_staff:
            return Response({'error': 'Admin only'}, status=403)
        coupons = Coupon.objects.all().order_by('-created_at')
        return Response(CouponSerializer(coupons, many=True).data)

    def post(self, request):
        if not request.user.is_staff:
            return Response({'error': 'Admin only'}, status=403)
        serializer = CouponSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)


class AdminCouponDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        if not request.user.is_staff:
            return Response({'error': 'Admin only'}, status=403)
        coupon = get_object_or_404(Coupon, pk=pk)
        serializer = CouponSerializer(coupon, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

    def delete(self, request, pk):
        if not request.user.is_staff:
            return Response({'error': 'Admin only'}, status=403)
        coupon = get_object_or_404(Coupon, pk=pk)
        coupon.delete()
        return Response(status=204)


class AdminDynamicPricingView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not request.user.is_staff:
            return Response({'error': 'Admin only'}, status=403)
        rules = DynamicPricingRule.objects.all()
        return Response(DynamicPricingRuleSerializer(rules, many=True).data)

    def post(self, request):
        if not request.user.is_staff:
            return Response({'error': 'Admin only'}, status=403)
        serializer = DynamicPricingRuleSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)


class GetPricingView(APIView):
    """
    POST /core/v1/payments/pricing/
    Returns dynamic pricing breakdown before payment.
    Body: { car_id, pickup_date, return_date, coupon_code (optional) }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        from core.models import Car  # update to your app name
        car_id = request.data.get('car_id')
        pickup_date = request.data.get('pickup_date')
        return_date = request.data.get('return_date')
        coupon_code = request.data.get('coupon_code', '')

        try:
            car = Car.objects.get(id=car_id)
        except Car.DoesNotExist:
            return Response({'error': 'Car not found'}, status=404)

        from datetime import datetime
        pickup = datetime.strptime(pickup_date, '%Y-%m-%d').date()
        ret = datetime.strptime(return_date, '%Y-%m-%d').date()
        rental_days = max((ret - pickup).days, 1)

        base_price = float(car.price_per_day) * rental_days

        # Apply dynamic pricing rules
        rules = DynamicPricingRule.objects.filter(is_active=True)
        multiplier = 1.0
        applied_rules = []

        for rule in rules:
            applies = False
            if rule.type == 'weekend' and rule.days_of_week:
                if pickup.weekday() in rule.days_of_week:
                    applies = True
            elif rule.type in ('peak_season', 'special_event'):
                if rule.start_date and rule.end_date:
                    if rule.start_date <= pickup <= rule.end_date:
                        applies = True
            elif rule.type == 'long_term':
                if rule.min_days and rental_days >= rule.min_days:
                    applies = True
            elif rule.type == 'early_bird':
                if rule.advance_days:
                    from django.utils import timezone
                    days_ahead = (pickup - timezone.now().date()).days
                    if days_ahead >= rule.advance_days:
                        applies = True
            elif rule.type == 'last_minute':
                from django.utils import timezone
                days_ahead = (pickup - timezone.now().date()).days
                if days_ahead <= 2:
                    applies = True

            if applies:
                multiplier = float(rule.multiplier)
                applied_rules.append({'rule': rule.name, 'multiplier': multiplier})
                break  # highest priority wins

        dynamic_price = round(base_price * multiplier, 2)

        # Apply coupon
        discount = 0.0
        coupon_message = ''
        if coupon_code:
            try:
                coupon = Coupon.objects.get(code=coupon_code.upper())
                valid, msg = coupon.is_valid()
                if valid:
                    user_usage = CouponUsage.objects.filter(
                        coupon=coupon, user=request.user
                    ).count()
                    if user_usage >= coupon.usage_limit_per_user:
                        coupon_message = 'You have already used this coupon'
                    else:
                        from decimal import Decimal
                        discount_amt, coupon_message = coupon.calculate_discount(
                            Decimal(str(dynamic_price)), rental_days
                        )
                        discount = float(discount_amt)
                else:
                    coupon_message = msg
            except Coupon.DoesNotExist:
                coupon_message = 'Invalid coupon code'

        price_after_discount = dynamic_price - discount
        tax = round(price_after_discount * 0.05, 2)
        security_deposit = round(max(20, min(price_after_discount * 0.20, 500)), 2)
        total = round(price_after_discount + tax + security_deposit, 2)

        return Response({
            'car_name': car.name,
            'rental_days': rental_days,
            'base_price': base_price,
            'dynamic_multiplier': multiplier,
            'dynamic_price': dynamic_price,
            'applied_rules': applied_rules,
            'discount': discount,
            'coupon_message': coupon_message,
            'price_after_discount': round(price_after_discount, 2),
            'tax': tax,
            'security_deposit': security_deposit,
            'total': total,
            'currency': 'OMR',
        })
    
class AdminMarkVendorPaidView(APIView):
    """Mark vendor split payment as paid out."""
    permission_classes = [IsAuthenticated]

    def post(self, request, split_id):
        if not request.user.is_staff:
            return Response({'error': 'Admin only'}, status=403)
        split = get_object_or_404(SplitPayment, id=split_id)
        split.vendor_paid = True
        split.vendor_paid_at = timezone.now()
        split.save()
        return Response(SplitPaymentSerializer(split).data)