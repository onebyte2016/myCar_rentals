from django.contrib import admin
from django.utils import timezone
from .models import VendorProfile, VendorEarning


@admin.register(VendorProfile)
class VendorProfileAdmin(admin.ModelAdmin):
    list_display = [
        'business_name', 'user', 'city', 'country',
        'commission_rate', 'status', 'total_cars', 'total_bookings', 'created_at'
    ]
    list_filter = ['status', 'country', 'city']
    search_fields = ['business_name', 'user__email', 'phone_number']
    readonly_fields = ['approved_by', 'approved_at', 'created_at', 'updated_at']
    actions = ['approve_vendors', 'reject_vendors', 'suspend_vendors']

    def approve_vendors(self, request, queryset):
        queryset.update(
            status='approved',
            approved_by=request.user,
            approved_at=timezone.now()
        )
        self.message_user(request, f'{queryset.count()} vendor(s) approved.')
    approve_vendors.short_description = 'Approve selected vendors'

    def reject_vendors(self, request, queryset):
        queryset.update(status='rejected')
        self.message_user(request, f'{queryset.count()} vendor(s) rejected.')
    reject_vendors.short_description = 'Reject selected vendors'

    def suspend_vendors(self, request, queryset):
        queryset.update(status='suspended')
        self.message_user(request, f'{queryset.count()} vendor(s) suspended.')
    suspend_vendors.short_description = 'Suspend selected vendors'


@admin.register(VendorEarning)
class VendorEarningAdmin(admin.ModelAdmin):
    list_display = [
        'vendor', 'booking', 'booking_amount', 'commission_rate',
        'commission_amount', 'vendor_amount', 'status', 'created_at'
    ]
    list_filter = ['status', 'vendor']
    search_fields = ['vendor__business_name']
    readonly_fields = ['vendor', 'booking', 'booking_amount', 'commission_rate',
                       'commission_amount', 'vendor_amount', 'created_at']
    actions = ['mark_as_paid']

    def mark_as_paid(self, request, queryset):
        queryset.update(status='paid', paid_at=timezone.now())
        self.message_user(request, f'{queryset.count()} earning(s) marked as paid.')
    mark_as_paid.short_description = 'Mark selected earnings as paid'