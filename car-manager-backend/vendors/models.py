from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from core.models import Booking 
from django.conf import settings


class VendorProfile(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending Approval'),
        ('approved', 'Approved'),
        ('suspended', 'Suspended'),
        ('rejected', 'Rejected'),
    ]

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='vendor_profile')
    business_name = models.CharField(max_length=255)
    business_email = models.EmailField()
    phone_number = models.CharField(max_length=20)
    address = models.TextField()
    city = models.CharField(max_length=100)
    country = models.CharField(max_length=100)
    business_registration_no = models.CharField(max_length=100, blank=True)
    id_document = models.ImageField(upload_to='vendor_docs/', blank=True, null=True)
    logo = models.ImageField(upload_to='vendor_logos/', blank=True, null=True)
    bio = models.TextField(blank=True)

    # Commission
    commission_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=15.00,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text='Percentage commission taken per booking (e.g. 15.00 = 15%)'
    )

    # Status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    rejection_reason = models.TextField(blank=True)
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='approved_vendors'
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.business_name} ({self.status})"

    @property
    def total_earnings(self):
        """Vendor's cut after commission is deducted."""
        bookings = Booking.objects.filter(
            car__vendor=self,
            status='completed'
        )
        total = sum(
            float(b.total_price) * (1 - float(self.commission_rate) / 100)
            for b in bookings
            if b.total_price
        )
        return round(total, 2)

    @property
    def total_commission(self):
        """Platform's commission cut."""
        bookings = Booking.objects.filter(
            car__vendor=self,
            status='completed'
        )
        total = sum(
            float(b.total_price) * (float(self.commission_rate) / 100)
            for b in bookings
            if b.total_price
        )
        return round(total, 2)

    @property
    def total_bookings(self):
        return Booking.objects.filter(car__vendor=self).count()

    @property
    def total_cars(self):
        return self.cars.count()


class VendorEarning(models.Model):
    """
    Auto-created when a booking is completed.
    Records the split between vendor earnings and platform commission.
    """
    STATUS_CHOICES = [
        ('pending', 'Pending Payout'),
        ('paid', 'Paid'),
    ]

    vendor = models.ForeignKey(VendorProfile, on_delete=models.CASCADE, related_name='earnings')
    booking = models.OneToOneField('core.Booking', on_delete=models.CASCADE, related_name='vendor_earning')
    booking_amount = models.DecimalField(max_digits=10, decimal_places=2)
    commission_rate = models.DecimalField(max_digits=5, decimal_places=2)
    commission_amount = models.DecimalField(max_digits=10, decimal_places=2)
    vendor_amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    paid_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.vendor.business_name} — {self.vendor_amount} ({self.status})"

    @classmethod
    def create_from_booking(cls, booking):
        """Call this when a booking is marked as completed."""
        vendor = booking.car.vendor
        if not vendor:
            return None

        booking_amount = float(booking.total_price)
        commission_rate = float(vendor.commission_rate)
        commission_amount = round(booking_amount * commission_rate / 100, 2)
        vendor_amount = round(booking_amount - commission_amount, 2)

        return cls.objects.create(
            vendor=vendor,
            booking=booking,
            booking_amount=booking_amount,
            commission_rate=commission_rate,
            commission_amount=commission_amount,
            vendor_amount=vendor_amount,
        )