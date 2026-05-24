from django.db import models
from django.utils import timezone
from datetime import timedelta
from core.models import Car 


class GPSLocation(models.Model):
    """
    Stores real-time and historical GPS data sent by GPS devices in cars.
    Each car's GPS device POSTs to /api/gps/update/ with its data.
    """
    car = models.ForeignKey(Car, on_delete=models.CASCADE, related_name='gps_locations')
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)
    speed = models.FloatField(default=0.0, help_text='Speed in km/h')
    heading = models.FloatField(default=0.0, help_text='Direction in degrees (0-360)')
    altitude = models.FloatField(null=True, blank=True, help_text='Altitude in meters')
    accuracy = models.FloatField(null=True, blank=True, help_text='GPS accuracy in meters')
    timestamp = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['car', '-timestamp']),
        ]

    def __str__(self):
        return f"{self.car} @ ({self.latitude}, {self.longitude}) — {self.timestamp}"


class CarGPSDevice(models.Model):
    """
    Links a GPS device (identified by device_id / API key) to a car.
    The GPS device uses its api_key in the Authorization header when posting data.
    """
    
    car = models.OneToOneField(Car, on_delete=models.CASCADE, related_name='gps_device')
    device_id = models.CharField(max_length=100, unique=True)
    api_key = models.CharField(max_length=64, unique=True)
    is_active = models.BooleanField(default=True)
    last_seen = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Device {self.device_id} → {self.car}"

    def update_last_seen(self):
        self.last_seen = timezone.now()
        self.save(update_fields=['last_seen'])