from django.shortcuts import render

# Create your views here.
from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Car, Booking
from .serializers import CarSerializer, BookingSerializer


class CarViewSet(viewsets.ModelViewSet):
    queryset = Car.objects.all().order_by('-created_at')
    serializer_class = CarSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    @action(detail=False, methods=['get'])
    def available(self, request):
        cars = Car.objects.filter(status='available')
        serializer = self.get_serializer(cars, many=True)
        return Response(serializer.data)


class BookingViewSet(viewsets.ModelViewSet):
    serializer_class = BookingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Prevent Swagger crash
        if getattr(self, 'swagger_fake_view', False):
            return Booking.objects.none()

        # Prevent AnonymousUser error
        if not self.request.user.is_authenticated:
            return Booking.objects.none()

        return Booking.objects.filter(user=self.request.user).order_by('-created_at')
        
    def perform_create(self, serializer):
        booking = serializer.save(user=self.request.user)
        booking.car.status = 'rented'
        booking.car.save()

    def perform_update(self, serializer):
        booking = serializer.save()
        if booking.status == 'completed':
            booking.car.status = 'available'
            booking.car.save()