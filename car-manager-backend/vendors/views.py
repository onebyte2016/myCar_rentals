from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser, AllowAny
from rest_framework import status
from django.utils import timezone
from django.shortcuts import get_object_or_404
from core.models import Booking, Car
from core.serializers import BookingSerializer, CarSerializer


from .models import VendorProfile, VendorEarning
from .serializers import (
    VendorRegisterSerializer,
    VendorProfileSerializer,
    AdminVendorSerializer,
    VendorEarningSerializer,
)


# ── PUBLIC ────────────────────────────────────────────────────────────────────

class VendorRegisterView(APIView):
    """
    POST /api/vendors/register/
    Anyone can apply to become a vendor.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = VendorRegisterSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(
                {'message': 'Vendor application submitted. Awaiting admin approval.'},
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ── VENDOR ────────────────────────────────────────────────────────────────────

class VendorProfileView(APIView):
    """
    GET  /api/vendors/me/       — get own profile
    PATCH /api/vendors/me/      — update own profile
    """
    permission_classes = [IsAuthenticated]

    def get_vendor(self, user):
        return get_object_or_404(VendorProfile, user=user)

    def get(self, request):
        vendor = self.get_vendor(request.user)
        serializer = VendorProfileSerializer(vendor)
        return Response(serializer.data)

    def patch(self, request):
        vendor = self.get_vendor(request.user)
        if vendor.status != 'approved':
            return Response(
                {'error': 'Only approved vendors can update their profile.'},
                status=status.HTTP_403_FORBIDDEN
            )
        serializer = VendorProfileSerializer(vendor, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class VendorEarningsView(APIView):
    """
    GET /api/vendors/earnings/
    Returns the vendor's earnings history + summary.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        vendor = get_object_or_404(VendorProfile, user=request.user)

        if vendor.status != 'approved':
            return Response({'error': 'Vendor not approved.'}, status=403)

        earnings = VendorEarning.objects.filter(vendor=vendor).order_by('-created_at')
        serializer = VendorEarningSerializer(earnings, many=True)

        return Response({
            'summary': {
                'total_earnings': vendor.total_earnings,
                'total_commission': vendor.total_commission,
                'total_bookings': vendor.total_bookings,
                'total_cars': vendor.total_cars,
                'commission_rate': float(vendor.commission_rate),
                'pending_payout': sum(
                    float(e.vendor_amount) for e in earnings if e.status == 'pending'
                ),
            },
            'earnings': serializer.data,
        })


class VendorCarsView(APIView):
    """
    GET  /api/vendors/cars/      — list vendor's cars
    POST /api/vendors/cars/      — add a new car
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        vendor = get_object_or_404(VendorProfile, user=request.user)
        if vendor.status != 'approved':
            return Response({'error': 'Vendor not approved.'}, status=403)
        cars = Car.objects.filter(vendor=vendor)
        serializer = CarSerializer(cars, many=True)
        return Response(serializer.data)

    def post(self, request):
        vendor = get_object_or_404(VendorProfile, user=request.user)
        if vendor.status != 'approved':
            return Response({'error': 'Vendor not approved.'}, status=403)
        serializer = CarSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(vendor=vendor)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class VendorBookingsView(APIView):
    """
    GET /api/vendors/bookings/
    Returns all bookings for the vendor's cars.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        vendor = get_object_or_404(VendorProfile, user=request.user)
        if vendor.status != 'approved':
            return Response({'error': 'Vendor not approved.'}, status=403)
        bookings = Booking.objects.filter(car__vendor=vendor).order_by('-created_at')
        serializer = BookingSerializer(bookings, many=True)
        return Response(serializer.data)


# ── ADMIN ─────────────────────────────────────────────────────────────────────

class AdminVendorListView(APIView):
    """
    GET /api/admin/vendors/             — list all vendors
    Supports ?status=pending filter
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not request.user.is_staff:
            return Response({'error': 'Admin only.'}, status=403)

        status_filter = request.query_params.get('status')
        vendors = VendorProfile.objects.all().order_by('-created_at')
        if status_filter:
            vendors = vendors.filter(status=status_filter)

        serializer = AdminVendorSerializer(vendors, many=True)
        return Response(serializer.data)


class AdminVendorDetailView(APIView):
    """
    GET   /api/admin/vendors/<id>/     — vendor detail
    PATCH /api/admin/vendors/<id>/     — update commission rate
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        if not request.user.is_staff:
            return Response({'error': 'Admin only.'}, status=403)
        vendor = get_object_or_404(VendorProfile, pk=pk)
        serializer = AdminVendorSerializer(vendor)
        return Response(serializer.data)

    def patch(self, request, pk):
        if not request.user.is_staff:
            return Response({'error': 'Admin only.'}, status=403)
        vendor = get_object_or_404(VendorProfile, pk=pk)
        serializer = AdminVendorSerializer(vendor, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)


class AdminVendorApproveView(APIView):
    """
    POST /api/admin/vendors/<id>/approve/
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        if not request.user.is_staff:
            return Response({'error': 'Admin only.'}, status=403)
        vendor = get_object_or_404(VendorProfile, pk=pk)
        vendor.status = 'approved'
        vendor.approved_by = request.user
        vendor.approved_at = timezone.now()
        vendor.rejection_reason = ''
        vendor.save()
        return Response({'message': f'{vendor.business_name} approved successfully.'})


class AdminVendorRejectView(APIView):
    """
    POST /api/admin/vendors/<id>/reject/
    Body: { "reason": "Documents incomplete" }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        if not request.user.is_staff:
            return Response({'error': 'Admin only.'}, status=403)
        vendor = get_object_or_404(VendorProfile, pk=pk)
        reason = request.data.get('reason', '')
        vendor.status = 'rejected'
        vendor.rejection_reason = reason
        vendor.save()
        return Response({'message': f'{vendor.business_name} rejected.'})


class AdminVendorSuspendView(APIView):
    """
    POST /api/admin/vendors/<id>/suspend/
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        if not request.user.is_staff:
            return Response({'error': 'Admin only.'}, status=403)
        vendor = get_object_or_404(VendorProfile, pk=pk)
        vendor.status = 'suspended'
        vendor.save()
        return Response({'message': f'{vendor.business_name} suspended.'})


class AdminCommissionSummaryView(APIView):
    """
    GET /api/admin/vendors/commission-summary/
    Returns platform-wide commission totals.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not request.user.is_staff:
            return Response({'error': 'Admin only.'}, status=403)

        earnings = VendorEarning.objects.all()
        total_revenue = sum(float(e.booking_amount) for e in earnings)
        total_commission = sum(float(e.commission_amount) for e in earnings)
        total_vendor_payout = sum(float(e.vendor_amount) for e in earnings)
        pending_payout = sum(
            float(e.vendor_amount) for e in earnings if e.status == 'pending'
        )

        return Response({
            'total_revenue': round(total_revenue, 2),
            'total_commission_earned': round(total_commission, 2),
            'total_vendor_payout': round(total_vendor_payout, 2),
            'pending_payout': round(pending_payout, 2),
            'total_vendors': VendorProfile.objects.count(),
            'approved_vendors': VendorProfile.objects.filter(status='approved').count(),
            'pending_vendors': VendorProfile.objects.filter(status='pending').count(),
        })