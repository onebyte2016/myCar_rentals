# Register your models here.
from django.contrib import admin
from .models import Car, Booking, CarImage


@admin.register(Car)
class CarAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "make",
        "model",
        "plate_number",
        "price_per_day",
        "status",
        "created_at",
    )
    search_fields = ("make", "model", "plate_number")
    list_filter = ("status", "make")

@admin.register(CarImage)
class CarImageAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "car",
        "image",
     
    )
    search_fields = ("car", 'id')
    list_filter = ("car", 'id')


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user",
        "car",
        "pickup_date",
        "return_date",
        "total_price",
        "status",
    )
    search_fields = ("user__username", "car__plate_number")
    list_filter = ("status", "pickup_date")