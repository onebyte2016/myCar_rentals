
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.permissions import IsAdminUser, AllowAny
from rest_framework import status
from django.utils import timezone
from datetime import timedelta
from core.models import Car

from .models import GPSLocation, CarGPSDevice
from .serializers import (
    GPSUpdateSerializer,
    CarLiveLocationSerializer,
    GPSHistorySerializer,
)


class GPSDeviceAuthentication:
    """
    Helper: resolves a CarGPSDevice from the Authorization header.
    GPS devices send: Authorization: GPSKey <api_key>
    """
    @staticmethod
    def get_device(request):
        auth = request.headers.get('Authorization', '')
        if not auth.startswith('GPSKey '):
            return None
        api_key = auth.split(' ', 1)[1].strip()
        try:
            return CarGPSDevice.objects.select_related('car').get(
                api_key=api_key,
                is_active=True
            )
        except CarGPSDevice.DoesNotExist:
            return None


class GPSUpdateView(APIView):
    permission_classes = []  # no auth — GPS device uses GPSKey header

    def post(self, request):
        from .views import GPSDeviceAuthentication
        device = GPSDeviceAuthentication.get_device(request)
        if not device:
            return Response({'error': 'Invalid or missing GPS device API key'}, status=401)

        # from .serializers import GPSUpdateSerializer
        serializer = GPSUpdateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        GPSLocation.objects.create(car=device.car, **serializer.validated_data)
        device.update_last_seen()
        return Response({'status': 'ok'}, status=status.HTTP_200_OK)
    

# class GPSUpdateView(APIView):
#     """
#     POST /api/gps/update/
#     Called by the GPS device in the car every N seconds.
#     Header: Authorization: GPSKey <api_key>

#     Body:
#     {
#         "latitude": 17.015385,
#         "longitude": 54.090359,
#         "speed": 60.5,
#         "heading": 180.0,
#         "altitude": 12.0,
#         "accuracy": 5.0
#     }
#     """
#     permission_classes = [AllowAny]  # Auth handled by GPSKey header

#     def post(self, request):
#         device = GPSDeviceAuthentication.get_device(request)
#         if not device:
#             return Response(
#                 {'error': 'Invalid or missing GPS device API key'},
#                 status=status.HTTP_401_UNAUTHORIZED
#             )

#         serializer = GPSUpdateSerializer(data=request.data)
#         if not serializer.is_valid():
#             return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

#         # Save location record
#         GPSLocation.objects.create(
#             car=device.car,
#             **serializer.validated_data
#         )

#         # Update device last_seen
#         device.update_last_seen()

#         return Response({'status': 'ok'}, status=status.HTTP_200_OK)


class LiveLocationsView(APIView):
    permission_classes = [IsAuthenticated]  # ← matches your other views

    def get(self, request):
        if not request.user.is_staff:
            return Response({'error': 'Admin access required'}, status=403)

          # update to your app name
        cars = Car.objects.all().select_related('gps_device')
        results = []

        for car in cars:
            latest = (
                GPSLocation.objects
                .filter(car=car)
                .order_by('-timestamp')
                .first()
            )
            device = getattr(car, 'gps_device', None)
            results.append({
                'car_id': car.id,
                'car_name': getattr(car, 'name', str(car)),
                'plate_number': getattr(car, 'plate_number', ''),
                'car_image': str(getattr(car, 'image', '')),
                'status': getattr(car, 'status', 'unknown'),
                'latitude': float(latest.latitude) if latest else None,
                'longitude': float(latest.longitude) if latest else None,
                'speed': latest.speed if latest else None,
                'heading': latest.heading if latest else None,
                'last_seen': latest.timestamp if latest else None,
                'device_active': device.is_active if device else False,
            })

        serializer = CarLiveLocationSerializer(results, many=True)
        return Response(serializer.data)
# class LiveLocationsView(APIView):
#     """
#     GET /api/gps/live/
#     Returns the latest GPS location for every registered car.
#     Admin only.
#     """
#     authentication_classes = [JWTAuthentication]
#     permission_classes = [AllowAny]

#     def get(self, request):
#         from core.models import Car  # adjust import to your app

#         cars = Car.objects.all().select_related('gps_device')
#         results = []

#         for car in cars:
#             # Get latest location
#             latest = (
#                 GPSLocation.objects
#                 .filter(car=car)
#                 .order_by('-timestamp')
#                 .first()
#             )

#             device = getattr(car, 'gps_device', None)

#             results.append({
#                 'car_id': car.id,
#                 'car_name': getattr(car, 'name', str(car)),
#                 'plate_number': getattr(car, 'plate_number', ''),
#                 'car_image': str(getattr(car, 'image', '')),
#                 'status': getattr(car, 'status', 'unknown'),
#                 'latitude': float(latest.latitude) if latest else None,
#                 'longitude': float(latest.longitude) if latest else None,
#                 'speed': latest.speed if latest else None,
#                 'heading': latest.heading if latest else None,
#                 'last_seen': latest.timestamp if latest else None,
#                 'device_active': device.is_active if device else False,
#             })

#         serializer = CarLiveLocationSerializer(results, many=True)
#         return Response(serializer.data)





class CarGPSHistoryView(APIView):
    permission_classes = [IsAuthenticated]  # ← matches your other views

    def get(self, request, car_id):
        if not request.user.is_staff:
            return Response({'error': 'Admin access required'}, status=403)

        since = timezone.now() - timedelta(hours=24)
        locations = (
            GPSLocation.objects
            .filter(car_id=car_id, timestamp__gte=since)
            .order_by('timestamp')
        )

        serializer = GPSHistorySerializer(locations, many=True)
        return Response({
            'car_id': car_id,
            'count': locations.count(),
            'history': serializer.data,
        })
# class CarGPSHistoryView(APIView):
#     """
#     GET /api/gps/history/<car_id>/
#     Returns last 24 hours of GPS points for a specific car.
#     Admin only.
#     """
#     authentication_classes = [JWTAuthentication]
#     permission_classes = [IsAdminUser]

#     def get(self, request, car_id):
#         since = timezone.now() - timedelta(hours=24)

#         locations = (
#             GPSLocation.objects
#             .filter(car_id=car_id, timestamp__gte=since)
#             .order_by('timestamp')
#         )

#         serializer = GPSHistorySerializer(locations, many=True)
#         return Response({
#             'car_id': car_id,
#             'count': locations.count(),
#             'history': serializer.data,
#         })