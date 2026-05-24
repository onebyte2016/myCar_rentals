from django.urls import path
from .views import (
    VendorRegisterView,
    VendorProfileView,
    VendorEarningsView,
    VendorCarsView,
    VendorBookingsView,
    AdminVendorListView,
    AdminVendorDetailView,
    AdminVendorApproveView,
    AdminVendorRejectView,
    AdminVendorSuspendView,
    AdminCommissionSummaryView,
)

urlpatterns = [
    # ── Public ──────────────────────────────────────────
    path('register/', VendorRegisterView.as_view(), name='vendor-register'),

    # ── Vendor (authenticated) ───────────────────────────
    path('me/', VendorProfileView.as_view(), name='vendor-profile'),
    path('earnings/', VendorEarningsView.as_view(), name='vendor-earnings'),
    path('cars/', VendorCarsView.as_view(), name='vendor-cars'),
    path('bookings/', VendorBookingsView.as_view(), name='vendor-bookings'),

    # ── Admin ────────────────────────────────────────────
    path('admin/vendors/', AdminVendorListView.as_view(), name='admin-vendor-list'),
    path('admin/vendors/commission-summary/', AdminCommissionSummaryView.as_view(), name='admin-commission-summary'),
    path('admin/vendors/<int:pk>/', AdminVendorDetailView.as_view(), name='admin-vendor-detail'),
    path('admin/vendors/<int:pk>/approve/', AdminVendorApproveView.as_view(), name='admin-vendor-approve'),
    path('admin/vendors/<int:pk>/reject/', AdminVendorRejectView.as_view(), name='admin-vendor-reject'),
    path('admin/vendors/<int:pk>/suspend/', AdminVendorSuspendView.as_view(), name='admin-vendor-suspend'),
]