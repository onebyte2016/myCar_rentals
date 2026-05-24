from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import VendorEarning


@receiver(post_save, sender='core.Booking')
def create_vendor_earning_on_completion(sender, instance, **kwargs):
    """
    Automatically creates a VendorEarning record when a booking
    is marked as completed and the car belongs to a vendor.
    """
    if instance.status == 'completed':
        if hasattr(instance.car, 'vendor') and instance.car.vendor:
            # Only create if not already exists
            if not hasattr(instance, 'vendor_earning'):
                VendorEarning.create_from_booking(instance)


