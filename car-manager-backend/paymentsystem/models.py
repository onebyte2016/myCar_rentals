from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from decimal import Decimal
import uuid
from django.conf import settings


# ── Wallet ────────────────────────────────────────────────────────────────────

class Wallet(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='wallet')
    balance = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    currency = models.CharField(max_length=10, default='OMR')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.email} — {self.balance} {self.currency}"

    def deposit(self, amount, description='Deposit', reference=''):
        self.balance += Decimal(str(amount))
        self.save()
        WalletTransaction.objects.create(
            wallet=self, type='credit', amount=amount,
            description=description, balance_after=self.balance,
            reference=reference,
        )

    def withdraw(self, amount, description='Withdrawal', reference=''):
        if self.balance < Decimal(str(amount)):
            raise ValueError('Insufficient wallet balance')
        self.balance -= Decimal(str(amount))
        self.save()
        WalletTransaction.objects.create(
            wallet=self, type='debit', amount=amount,
            description=description, balance_after=self.balance,
            reference=reference,
        )


class WalletTransaction(models.Model):
    TYPE_CHOICES = [('credit', 'Credit'), ('debit', 'Debit')]
    wallet = models.ForeignKey(Wallet, on_delete=models.CASCADE, related_name='transactions')
    type = models.CharField(max_length=10, choices=TYPE_CHOICES)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    balance_after = models.DecimalField(max_digits=12, decimal_places=2)
    description = models.CharField(max_length=255)
    reference = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']


# ── Coupon ────────────────────────────────────────────────────────────────────

class Coupon(models.Model):
    TYPE_CHOICES = [
        ('percentage', 'Percentage Off'),
        ('fixed_amount', 'Fixed Amount Off'),
        ('free_days', 'Free Days'),
    ]
    code = models.CharField(max_length=50, unique=True, db_index=True)
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    value = models.DecimalField(max_digits=10, decimal_places=2)
    min_booking_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    max_discount_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    usage_limit = models.PositiveIntegerField(null=True, blank=True)
    usage_limit_per_user = models.PositiveIntegerField(default=1)
    times_used = models.PositiveIntegerField(default=0)
    valid_from = models.DateTimeField(default=timezone.now)
    valid_until = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.code} ({self.type}: {self.value})"

    def is_valid(self):
        now = timezone.now()
        if not self.is_active:
            return False, 'Coupon is inactive'
        if now < self.valid_from:
            return False, 'Coupon is not yet valid'
        if self.valid_until and now > self.valid_until:
            return False, 'Coupon has expired'
        if self.usage_limit and self.times_used >= self.usage_limit:
            return False, 'Coupon usage limit reached'
        return True, 'Valid'

    def calculate_discount(self, booking_amount, rental_days=1):
        booking_amount = Decimal(str(booking_amount))
        if booking_amount < self.min_booking_amount:
            return Decimal('0'), f'Minimum booking amount is {self.min_booking_amount}'
        if self.type == 'percentage':
            discount = booking_amount * (self.value / 100)
            if self.max_discount_amount:
                discount = min(discount, self.max_discount_amount)
        elif self.type == 'fixed_amount':
            discount = min(self.value, booking_amount)
        elif self.type == 'free_days':
            daily_rate = booking_amount / rental_days if rental_days > 0 else booking_amount
            discount = min(daily_rate * self.value, booking_amount)
        else:
            discount = Decimal('0')
        return discount, 'Discount applied'


class CouponUsage(models.Model):
    coupon = models.ForeignKey(Coupon, on_delete=models.CASCADE, related_name='usages')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    booking = models.ForeignKey('core.Booking', on_delete=models.CASCADE, null=True, blank=True)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2)
    used_at = models.DateTimeField(auto_now_add=True)


# ── Dynamic Pricing ───────────────────────────────────────────────────────────

class DynamicPricingRule(models.Model):
    TYPE_CHOICES = [
        ('peak_season', 'Peak Season'),
        ('weekend', 'Weekend'),
        ('last_minute', 'Last Minute'),
        ('early_bird', 'Early Bird'),
        ('long_term', 'Long Term Rental'),
        ('special_event', 'Special Event'),
    ]
    name = models.CharField(max_length=100)
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    multiplier = models.DecimalField(max_digits=5, decimal_places=2, default=1.00)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    days_of_week = models.JSONField(default=list, help_text='[0-6] where 0=Monday')
    min_days = models.PositiveIntegerField(null=True, blank=True)
    advance_days = models.PositiveIntegerField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    priority = models.PositiveIntegerField(default=1)

    class Meta:
        ordering = ['-priority']

    def __str__(self):
        return f"{self.name} (x{self.multiplier})"


# ── Payment ───────────────────────────────────────────────────────────────────

class Payment(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
        ('partially_refunded', 'Partially Refunded'),
        ('cancelled', 'Cancelled'),
    ]
    METHOD_CHOICES = [
        ('card', 'Credit/Debit Card'),
        ('bank_transfer', 'Bank Transfer'),
        ('wallet', 'Wallet'),
        ('mobile_money', 'Mobile Money'),
        ('thawani', 'Thawani'),
        ('stripe', 'Stripe'),
        ('flutterwave', 'Flutterwave'),
    ]
    CURRENCY_CHOICES = [
        ('OMR', 'Omani Rial'),
        ('USD', 'US Dollar'),
        ('NGN', 'Nigerian Naira'),
        ('GHS', 'Ghanaian Cedi'),
        ('KES', 'Kenyan Shilling'),
        ('ZAR', 'South African Rand'),
    ]

    reference = models.CharField(max_length=100, unique=True, db_index=True)
    booking = models.ForeignKey('core.Booking', on_delete=models.CASCADE, related_name='payments')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='payments')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=10, choices=CURRENCY_CHOICES, default='OMR')
    method = models.CharField(max_length=20, choices=METHOD_CHOICES)
    status = models.CharField(max_length=25, choices=STATUS_CHOICES, default='pending')
    gateway_reference = models.CharField(max_length=200, blank=True)
    gateway_response = models.JSONField(default=dict, blank=True)
    base_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    discount_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    security_deposit = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    coupon = models.ForeignKey(Coupon, null=True, blank=True, on_delete=models.SET_NULL, related_name='payments')
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.reference:
            self.reference = f"PAY-{uuid.uuid4().hex[:12].upper()}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Payment {self.reference} — {self.amount} {self.currency} ({self.status})"


# ── Security Deposit ──────────────────────────────────────────────────────────

class SecurityDeposit(models.Model):
    STATUS_CHOICES = [
        ('held', 'Held'),
        ('released', 'Released'),
        ('forfeited', 'Forfeited'),
        ('partial_release', 'Partially Released'),
    ]
    booking = models.OneToOneField('core.Booking', on_delete=models.CASCADE, related_name='security_deposit')
    payment = models.ForeignKey(Payment, on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='held')
    held_at = models.DateTimeField(auto_now_add=True)
    released_at = models.DateTimeField(null=True, blank=True)
    release_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    forfeiture_reason = models.TextField(blank=True)
    notes = models.TextField(blank=True)

    def __str__(self):
        return f"Deposit for Booking #{self.booking.id} — {self.amount} ({self.status})"


# ── Refund ────────────────────────────────────────────────────────────────────

class Refund(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]
    METHOD_CHOICES = [
        ('original', 'Original Payment Method'),
        ('wallet', 'Wallet Credit'),
        ('bank_transfer', 'Bank Transfer'),
    ]
    payment = models.ForeignKey(Payment, on_delete=models.CASCADE, related_name='refunds')
    reference = models.CharField(max_length=100, unique=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    method = models.CharField(max_length=20, choices=METHOD_CHOICES, default='original')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    reason = models.TextField()
    gateway_reference = models.CharField(max_length=200, blank=True)
    gateway_response = models.JSONField(default=dict, blank=True)
    processed_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    def save(self, *args, **kwargs):
        if not self.reference:
            self.reference = f"REF-{uuid.uuid4().hex[:12].upper()}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Refund {self.reference} — {self.amount} ({self.status})"


# ── Invoice ───────────────────────────────────────────────────────────────────

class Invoice(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('issued', 'Issued'),
        ('paid', 'Paid'),
        ('void', 'Void'),
    ]
    invoice_number = models.CharField(max_length=50, unique=True)
    booking = models.OneToOneField('core.Booking', on_delete=models.CASCADE, related_name='invoice')
    payment = models.ForeignKey(Payment, null=True, blank=True, on_delete=models.SET_NULL)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='draft')
    line_items = models.JSONField(default=list)
    subtotal = models.DecimalField(max_digits=12, decimal_places=2)
    discount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tax = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    security_deposit = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=10, default='OMR')
    issued_at = models.DateTimeField(null=True, blank=True)
    due_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.invoice_number:
            count = Invoice.objects.count() + 1
            self.invoice_number = f"INV-{timezone.now().year}-{count:05d}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Invoice {self.invoice_number} — {self.total} {self.currency}"


# ── Split Payment ─────────────────────────────────────────────────────────────

class SplitPayment(models.Model):
    payment = models.OneToOneField(Payment, on_delete=models.CASCADE, related_name='split')
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    vendor_amount = models.DecimalField(max_digits=12, decimal_places=2)
    platform_amount = models.DecimalField(max_digits=12, decimal_places=2)
    commission_rate = models.DecimalField(max_digits=5, decimal_places=2)
    vendor_paid = models.BooleanField(default=False)
    vendor_paid_at = models.DateTimeField(null=True, blank=True)
    vendor_payment_reference = models.CharField(max_length=200, blank=True)

    def __str__(self):
        return f"Split: vendor={self.vendor_amount} platform={self.platform_amount}"