from django.contrib import admin
from .models import GPSLocation, CarGPSDevice
import secrets


@admin.register(CarGPSDevice)
class CarGPSDeviceAdmin(admin.ModelAdmin):
    list_display = ['device_id', 'car', 'is_active', 'last_seen', 'created_at']
    list_filter = ['is_active']
    search_fields = ['device_id', 'car__name', 'car__plate_number']
    readonly_fields = ['api_key', 'last_seen', 'created_at']

    def save_model(self, request, obj, form, change):
        # Auto-generate API key on first save
        if not obj.api_key:
            obj.api_key = secrets.token_hex(32)
        super().save_model(request, obj, form, change)


@admin.register(GPSLocation)
class GPSLocationAdmin(admin.ModelAdmin):
    list_display = ['car', 'latitude', 'longitude', 'speed', 'timestamp']
    list_filter = ['car']
    search_fields = ['car__name', 'car__plate_number']
    readonly_fields = ['car', 'latitude', 'longitude', 'speed', 'heading', 'timestamp']
    ordering = ['-timestamp']

    def has_add_permission(self, request):
        return False  # Only GPS devices should create records