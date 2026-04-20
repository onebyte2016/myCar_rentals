from rest_framework import serializers
from .models import Car, Booking, CarImage

class CarImageSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()

    class Meta:
        model = CarImage
        fields = ["id", "image"]

    def get_image(self, obj):
        if obj.image:
            return obj.image.url
        return None
        
class CarSerializer(serializers.ModelSerializer):
    imageurl = serializers.SerializerMethodField()
    images = CarImageSerializer(many=True, read_only=True)

    class Meta:
        model = Car
        fields = "__all__"

    def get_image(self, obj):
        if obj.imageurl:
            return obj.imageurl.url
        return None




class BookingSerializer(serializers.ModelSerializer):
    car_details = CarSerializer(source='car', read_only=True)

    class Meta:
        model = Booking
        fields = '__all__'
        read_only_fields = ['user', 'total_price']

    def validate(self, attrs):
        pickup_date = attrs.get('pickup_date')
        return_date = attrs.get('return_date')
        car = attrs.get('car')

        if pickup_date >= return_date:
            raise serializers.ValidationError('Return date must be after pickup date.')

        overlapping = Booking.objects.filter(
            car=car,
            status__in=['pending', 'confirmed'],
            pickup_date__lt=return_date,
            return_date__gt=pickup_date,
        ).exists()

        if overlapping:
            raise serializers.ValidationError('This car is already booked for the selected dates.')

        return attrs