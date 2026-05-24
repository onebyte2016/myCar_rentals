from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import VendorProfile, VendorEarning

User = get_user_model()

class VendorRegisterSerializer(serializers.Serializer):
    """Registers a new vendor — creates User + VendorProfile."""
    # User fields
    full_name = serializers.CharField()
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    password2 = serializers.CharField(write_only=True)

    # Vendor fields
    business_name = serializers.CharField()
    business_email = serializers.EmailField()
    phone_number = serializers.CharField()
    address = serializers.CharField()
    city = serializers.CharField()
    country = serializers.CharField()
    business_registration_no = serializers.CharField(required=False, allow_blank=True)
    bio = serializers.CharField(required=False, allow_blank=True)

    def validate(self, data):
        if data['password'] != data['password2']:
            raise serializers.ValidationError({'password': 'Passwords do not match.'})
        if User.objects.filter(email=data['email']).exists():
            raise serializers.ValidationError({'email': 'Email already in use.'})
        return data

    def create(self, validated_data):
        validated_data.pop('password2')
        password = validated_data.pop('password')
        full_name = validated_data.pop('full_name')
        email = validated_data.pop('email')

        # Create user
        user = User.objects.create_user(
            username=email,
            email=email,
            password=password,
            first_name=full_name.split(' ')[0],
            last_name=' '.join(full_name.split(' ')[1:]) if ' ' in full_name else '',
        )

        # Create vendor profile
        VendorProfile.objects.create(user=user, **validated_data)
        return user


class VendorProfileSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_name = serializers.SerializerMethodField()
    total_earnings = serializers.FloatField(read_only=True)
    total_commission = serializers.FloatField(read_only=True)
    total_bookings = serializers.IntegerField(read_only=True)
    total_cars = serializers.IntegerField(read_only=True)

    class Meta:
        model = VendorProfile
        fields = [
            'id', 'user_email', 'user_name', 'business_name', 'business_email',
            'phone_number', 'address', 'city', 'country', 'business_registration_no',
            'logo', 'bio', 'commission_rate', 'status', 'rejection_reason',
            'approved_at', 'created_at', 'total_earnings', 'total_commission',
            'total_bookings', 'total_cars',
        ]
        read_only_fields = [
            'status', 'commission_rate', 'rejection_reason',
            'approved_at', 'created_at',
        ]

    def get_user_name(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}".strip()


class AdminVendorSerializer(serializers.ModelSerializer):
    """Full vendor details for admin — includes commission editing."""
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_name = serializers.SerializerMethodField()
    total_earnings = serializers.FloatField(read_only=True)
    total_commission = serializers.FloatField(read_only=True)
    total_bookings = serializers.IntegerField(read_only=True)
    total_cars = serializers.IntegerField(read_only=True)

    class Meta:
        model = VendorProfile
        fields = '__all__'

    def get_user_name(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}".strip()


class VendorEarningSerializer(serializers.ModelSerializer):
    booking_id = serializers.IntegerField(source='booking.id', read_only=True)
    car_name = serializers.CharField(source='booking.car.name', read_only=True)
    customer = serializers.CharField(source='booking.user.email', read_only=True)
    pickup_date = serializers.DateField(source='booking.pickup_date', read_only=True)
    return_date = serializers.DateField(source='booking.return_date', read_only=True)

    class Meta:
        model = VendorEarning
        fields = [
            'id', 'booking_id', 'car_name', 'customer', 'pickup_date', 'return_date',
            'booking_amount', 'commission_rate', 'commission_amount',
            'vendor_amount', 'status', 'created_at', 'paid_at',
        ]