from django.shortcuts import render

# Create your views here.
from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Car, Booking
from .serializers import CarSerializer, BookingSerializer
from drf_yasg.utils import swagger_auto_schema


class CarViewSet(viewsets.ModelViewSet):
    queryset = Car.objects.all().order_by('-created_at')
    serializer_class = CarSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    @action(detail=False, methods=['get'])
    def available(self, request):
        cars = Car.objects.filter(status='available')
        serializer = self.get_serializer(cars, many=True)
        return Response(serializer.data)


from .models import Booking
from .serializers import BookingSerializer


class BookingViewSet(viewsets.ModelViewSet):
    queryset = Booking.objects.all()
    serializer_class = BookingSerializer
    permission_classes = [IsAuthenticated]
    # permission_classes = [AllowAny]

    def get_queryset(self):
        user = self.request.user

        if user.is_staff:
            return Booking.objects.all().order_by('-created_at')

        return Booking.objects.filter(user=user).order_by('-created_at')

    @swagger_auto_schema(request_body=BookingSerializer)
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)
    # def perform_create(self, serializer):
    #     serializer.save(user=self.request.user)

    @action(detail=True, methods=['post'])
    def confirm_booking(self, request, pk=None):
        booking = self.get_object()
        booking.status = 'confirmed'
        booking.save()

        return Response({
            'message': 'Booking confirmed successfully.'
        })

    @action(detail=True, methods=['post'])
    def cancel_booking(self, request, pk=None):
        booking = self.get_object()
        booking.status = 'cancelled'
        booking.save()

        return Response({
            'message': 'Booking cancelled successfully.'
        })

    @action(detail=True, methods=['post'])
    def complete_booking(self, request, pk=None):
        booking = self.get_object()
        booking.status = 'completed'
        booking.save()

        return Response({
            'message': 'Booking completed successfully.'
        })