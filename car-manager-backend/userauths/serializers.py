import datetime
from rest_framework import serializers
from rest_framework.response import Response
from rest_framework import status
from .models import User, Profile, Role
from core import models as api_models
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from django.contrib.auth.models import Group
from django.forms.models import model_to_dict
from django.contrib.auth.models import Permission
from rest_framework.exceptions import ValidationError
from django.shortcuts import get_object_or_404
from rest_framework_simplejwt.tokens import RefreshToken
from datetime import datetime
from django.utils import timezone
from django.contrib.auth import get_user_model


User = get_user_model()


class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    username_field = "email"

    def validate(self, attrs):
        data = super().validate(attrs)

        # Add extra response data (optional)
        data["user"] = {
            "id": self.user.id,
            "email": self.user.email,
            "username": self.user.username,
            "full_name": self.user.full_name,
        }

        return data
# class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
#     username_field = User.EMAIL_FIELD
#     @classmethod
#     def get_token(cls, user):
#         token = super().get_token(user)
#         # Add custom user fields
#         token['full_name'] = user.full_name
#         token['email'] = user.email
#         token['username'] = user.username

#         # Include all fields from the Company model
#         if hasattr(user, 'company') and user.company:
#             token['company'] = model_to_dict(user.company)
#         else:
#             token['company'] = None  # Handle cases where the user has no associated company

#         return token

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = '__all__'

class ProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer()
    class Meta:
        model = Profile
        fields = '__all__'


class RoleSerializer(serializers.ModelSerializer):
    permissions = serializers.PrimaryKeyRelatedField(
        queryset=Permission.objects.all(),
        many=True,
        required=False
    )

    class Meta:
        model = Role
        fields = ['id', 'name', 'description', 'permissions']

    def create(self, validated_data):
        permissions_data = validated_data.pop('permissions', [])
        role = Role.objects.create(**validated_data)
        role.permissions.set(permissions_data)  # Set permissions
        return role

    def update(self, instance, validated_data):
        permissions_data = validated_data.pop('permissions', None)
        instance = super().update(instance, validated_data)
        if permissions_data is not None:
            instance.permissions.set(permissions_data)  # Update permissions
        return instance


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True)
    password2 = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ['full_name', 'email', 'password', 'password2']

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({
                "password": "Passwords do not match"
            })
        return attrs

    def create(self, validated_data):
        validated_data.pop('password2')

        user = User.objects.create(
            full_name=validated_data['full_name'],
            email=validated_data['email'],
            username=validated_data['email'].split('@')[0],
            is_active=False,  # 👈 required for email verification
        )

        user.set_password(validated_data['password'])
        user.save()

        return user


# class PermissionSerializer(serializers.ModelSerializer):
#     class Meta:
#         model = Permission
#         fields = '__all__'

# class GroupSerializer(serializers.ModelSerializer):
#     permissions = serializers.PrimaryKeyRelatedField(queryset=Permission.objects.all(), many=True)
#     user_count = serializers.IntegerField(read_only=True)  # Read-only field for user count

#     class Meta:
#         model = Group
#         fields = ['id', 'name','permissions', 'user_count']