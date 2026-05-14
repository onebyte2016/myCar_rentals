
# Create your models here.
from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from cloudinary.models import CloudinaryField
from django.conf import settings
from decimal import Decimal

User = get_user_model()


class Car(models.Model):
    STATUS_CHOICES = [
        ('available', 'Available'),
        ('rented', 'Rented'),
        ('maintenance', 'Maintenance'),
    ]

    name = models.CharField(max_length=100)
    city_mpg = models.CharField(max_length=100, blank=True, null=True)
    fuel_type = models.CharField(max_length=100, blank=True, null=True)
    drive = models.CharField(max_length=100, blank=True, null=True)
    transmission = models.CharField(max_length=100, blank=True, null=True)
    make = models.CharField(max_length=100)
    model = models.CharField(max_length=100)
    year = models.PositiveIntegerField()
    plate_number = models.CharField(max_length=50, unique=True)
    cylinders = models.CharField(max_length=50, blank=True, null=True)
    highway_mpg = models.CharField(max_length=50, blank=True, null=True)
    displacement = models.CharField(max_length=50, blank=True, null=True)
    combination_mpg = models.CharField(max_length=50, blank=True, null=True)
    color = models.CharField(max_length=50, blank=True, null=True)
    price_per_day = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='available')
    # image = models.ImageField(upload_to='cars/', blank=True, null=True)
    image = CloudinaryField('image', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.make} {self.model} ({self.plate_number})"


# from django.db import models
# from django.contrib.auth.models import User
# 
# from core.models import Car


class Booking(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]

    PAYMENT_STATUS = [
        ('unpaid', 'Unpaid'),
        ('paid', 'Paid'),
        ('refunded', 'Refunded'),
    ]

    # user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='bookings')
    user = models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.CASCADE, related_name='bookings')
    car = models.ForeignKey(Car, on_delete=models.CASCADE, related_name='bookings')
    pickup_location = models.CharField(max_length=255, null=True, blank=True)
    dropoff_location = models.CharField(max_length=255, null=True, blank=True)
    passport_no = models.CharField(max_length=255, null=True, blank=True)
    address = models.CharField(max_length=255, null=True, blank=True)
    gsm = models.CharField(max_length=255, null=True, blank=True)
    drivers_licence_no = models.CharField(max_length=255, null=True, blank=True)
    issued_at = models.CharField(max_length=255, null=True, blank=True)
    issued_in = models.DateField(null=True, blank=True)
    valid_upto = models.DateField(null=True, blank=True)
    date_birth = models.DateField(null=True, blank=True)
    valid_upto = models.DateField(null=True, blank=True)
    pickup_date = models.DateField(null=True, blank=True)
    return_date = models.DateField(null=True, blank=True)
    pickup_time = models.TimeField(null=True, blank=True)
    return_time = models.TimeField(null=True, blank=True)
    total_price = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    payment_status = models.CharField(
        max_length=20,
        choices=PAYMENT_STATUS,
        default='unpaid'
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending'
    )
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        rental_days = (self.return_date - self.pickup_date).days
        rental_days = max(rental_days, 1)

        self.total_price = Decimal(rental_days) * self.car.price_per_day

        super().save(*args, **kwargs)

    def __str__(self):
        return f"Booking #{self.id} - {self.user.username}"

class CarImage(models.Model):
    car = models.ForeignKey(Car, on_delete=models.CASCADE, related_name="images")
    image = CloudinaryField('image')

    def __str__(self):
        return f"Image for {self.car}"