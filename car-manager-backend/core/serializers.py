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

    def get_imageurl(self, obj):
        try:
            if obj.image:
                return obj.image.url.replace("http://", "https://")
        except Exception:
            return None

        return None
    
# class CarSerializer(serializers.ModelSerializer):
#     images = CarImageSerializer(many=True, read_only=True)

#     class Meta:
#         model = Car
#         fields = "__all__"

#     def get_car_image(self, obj):
#         if obj.car.image:
#             return str(obj.car.image)
#         return None

class BookingSerializer(serializers.ModelSerializer):
    car_name = serializers.CharField(source='car.name', read_only=True)
    car_brand = serializers.CharField(source='car.make', read_only=True)
    car_image = serializers.SerializerMethodField()
    username = serializers.CharField(source='user.username', read_only=True)
    plate_number = serializers.CharField(source='car.plate_number', read_only=True)  # ← add this


    class Meta:
        model = Booking
        fields = '__all__'
        read_only_fields = ['user', 'total_price', 'status', 'payment_status']

    def get_car_image(self, obj):
        try:
            if obj.car.image:
                return obj.car.image.url.replace("http://", "https://")
        except Exception:
            return None

        return None

    def validate(self, data):
        pickup_date = data.get('pickup_date')
        return_date = data.get('return_date')
        car = data.get('car')

        print("BOOKING DATA:", data)

        if not pickup_date or not return_date:
            return data

        if return_date < pickup_date:
            raise serializers.ValidationError(
                'Return date cannot be earlier than pickup date.'
            )

        overlapping_bookings = Booking.objects.filter(
            car=car,
            status__in=['pending', 'confirmed'],
            pickup_date__lte=return_date,
            return_date__gte=pickup_date
        )

        if self.instance:
            overlapping_bookings = overlapping_bookings.exclude(id=self.instance.id)

        if overlapping_bookings.exists():
            raise serializers.ValidationError(
                'Car is already booked for the selected dates.'
            )

        return data

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)