from rest_framework import serializers
from .models import GPSLocation, CarGPSDevice


class GPSLocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = GPSLocation
        fields = [
            'id', 'car', 'latitude', 'longitude',
            'speed', 'heading', 'altitude', 'accuracy', 'timestamp'
        ]
        read_only_fields = ['id', 'timestamp']


class GPSUpdateSerializer(serializers.Serializer):
    """
    Used by GPS devices to POST their location.
    Does NOT require car field — car is resolved from the device's API key.
    """
    latitude = serializers.DecimalField(max_digits=9, decimal_places=6)
    longitude = serializers.DecimalField(max_digits=9, decimal_places=6)
    speed = serializers.FloatField(default=0.0)
    heading = serializers.FloatField(default=0.0)
    altitude = serializers.FloatField(required=False, allow_null=True)
    accuracy = serializers.FloatField(required=False, allow_null=True)


class CarLiveLocationSerializer(serializers.Serializer):
    """
    Returns the latest location of each car for the admin map view.
    """
    car_id = serializers.IntegerField()
    car_name = serializers.CharField()
    plate_number = serializers.CharField()
    car_image = serializers.CharField()
    status = serializers.CharField()
    latitude = serializers.DecimalField(max_digits=9, decimal_places=6, allow_null=True)
    longitude = serializers.DecimalField(max_digits=9, decimal_places=6, allow_null=True)
    speed = serializers.FloatField(allow_null=True)
    heading = serializers.FloatField(allow_null=True)
    last_seen = serializers.DateTimeField(allow_null=True)
    device_active = serializers.BooleanField()


class GPSHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = GPSLocation
        fields = ['latitude', 'longitude', 'speed', 'heading', 'timestamp']