from decimal import Decimal
from datetime import date
from django.utils import timezone


def get_security_deposit_amount(rental_amount: float) -> float:
    """Security deposit = 20% of rental amount, min 20, max 500."""
    deposit = rental_amount * 0.20
    return round(max(20, min(deposit, 500)), 2)


def calculate_dynamic_price(base_price: float, pickup: date, return_date: date, rental_days: int) -> dict:
    """Apply dynamic pricing rules and return breakdown."""
    from .models import DynamicPricingRule
    rules = DynamicPricingRule.objects.filter(is_active=True)

    applied_rules = []
    final_multiplier = Decimal('1.00')

    for rule in rules:
        applies = False

        if rule.type == 'weekend':
            if pickup.weekday() in rule.days_of_week or return_date.weekday() in rule.days_of_week:
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
                days_in_advance = (pickup - timezone.now().date()).days
                if days_in_advance >= rule.advance_days:
                    applies = True

        elif rule.type == 'last_minute':
            days_in_advance = (pickup - timezone.now().date()).days
            if days_in_advance <= 2:
                applies = True

        if applies:
            final_multiplier = rule.multiplier
            applied_rules.append({'rule': rule.name, 'multiplier': float(rule.multiplier)})
            break  # highest priority rule wins

    final_price = round(float(Decimal(str(base_price)) * final_multiplier), 2)

    return {
        'base_price': base_price,
        'multiplier': float(final_multiplier),
        'final_price': final_price,
        'applied_rules': applied_rules,
    }


def generate_invoice(payment) -> object:
    """Auto-generate invoice from a completed payment."""
    from .models import Invoice

    # Don't duplicate
    try:
        return payment.booking.invoice
    except Exception:
        pass

    booking = payment.booking
    line_items = [
        {
            'description': f'Car Rental — {booking.car.name}',
            'quantity': 1,
            'unit_price': float(payment.base_amount),
            'total': float(payment.base_amount),
        }
    ]

    if payment.security_deposit > 0:
        line_items.append({
            'description': 'Security Deposit (refundable)',
            'quantity': 1,
            'unit_price': float(payment.security_deposit),
            'total': float(payment.security_deposit),
        })

    invoice = Invoice.objects.create(
        booking=booking,
        payment=payment,
        user=payment.user,
        status='paid',
        line_items=line_items,
        subtotal=payment.base_amount,
        discount=payment.discount_amount,
        tax=payment.tax_amount,
        security_deposit=payment.security_deposit,
        total=payment.amount,
        currency=payment.currency,
        issued_at=timezone.now(),
    )
    return invoice


def create_split_payment(payment) -> object:
    """Split payment between vendor and platform based on commission rate."""
    from .models import SplitPayment
    vendor = payment.booking.car.vendor

    if not vendor:
        return None

    commission_rate = vendor.commission_rate
    platform_amount = round(payment.amount * commission_rate / 100, 2)
    vendor_amount = round(payment.amount - platform_amount, 2)

    split, _ = SplitPayment.objects.get_or_create(
        payment=payment,
        defaults={
            'total_amount': payment.amount,
            'vendor_amount': vendor_amount,
            'platform_amount': platform_amount,
            'commission_rate': commission_rate,
        }
    )

    # Credit vendor wallet
    try:
        from .models import Wallet
        vendor_wallet, _ = Wallet.objects.get_or_create(user=vendor.user)
        vendor_wallet.deposit(
            vendor_amount,
            f'Payment for Booking #{payment.booking.id}',
            reference=payment.reference,
        )
    except Exception:
        pass

    return split



# # utils.py

# import uuid
# from django.utils import timezone


# def generate_payment_reference():
#     return f"PAY-{uuid.uuid4().hex[:12].upper()}"


# def generate_invoice_number():
#     return f"INV-{timezone.now().strftime('%Y%m')}-{uuid.uuid4().hex[:6].upper()}"


# def generate_refund_reference():
#     return f"REF-{uuid.uuid4().hex[:10].upper()}"

# def generate_vendor_payout_reference():
#     return f'POUT-{uuid.uuid4().hex[:10].upper()}'