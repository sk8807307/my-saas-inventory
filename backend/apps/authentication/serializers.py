from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import Membership, Tenant, User


class LoginSerializer(serializers.Serializer):
    """Validate credentials and make the authenticated user available to the view."""

    email = serializers.EmailField(write_only=True, trim_whitespace=True)
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate(self, attrs):
        user = authenticate(
            request=self.context.get("request"),
            email=attrs["email"].strip().lower(),
            password=attrs["password"],
        )
        if user is None:
            raise serializers.ValidationError("Invalid email or password.")

        attrs["user"] = user
        return attrs


class UserSerializer(serializers.ModelSerializer):
    """Expose only safe profile fields; never include password or admin flags."""

    class Meta:
        model = User
        fields = ("id", "email", "first_name", "last_name", "is_active")
        read_only_fields = fields


class RegistrationSerializer(serializers.Serializer):
    """Validate public account details and create a regular user safely."""

    email = serializers.EmailField(trim_whitespace=True)
    first_name = serializers.CharField(
        max_length=150, required=False, allow_blank=True
    )
    last_name = serializers.CharField(
        max_length=150, required=False, allow_blank=True
    )
    password = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
        style={"input_type": "password"},
    )

    def validate_email(self, value):
        email = value.strip().lower()
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError(
                "An account with this email already exists."
            )
        return email

    def validate(self, attrs):
        # Apply the password rules configured in Django settings.
        validate_password(attrs["password"])
        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password")
        return User.objects.create_user(password=password, **validated_data)


class TenantSerializer(serializers.ModelSerializer):
    """Read-only tenant details for tenants the signed-in user may access."""

    class Meta:
        model = Tenant
        fields = ("id", "name", "slug", "is_active")
        read_only_fields = fields


class MembershipSerializer(serializers.ModelSerializer):
    """Return a user access role with the related tenant details."""

    user = UserSerializer(read_only=True)
    tenant = TenantSerializer(read_only=True)

    class Meta:
        model = Membership
        fields = (
            "id",
            "user",
            "tenant",
            "role",
            "status",
            "permissions",
            "created_at",
            "updated_at",
            "activated_at",
        )
        read_only_fields = fields


class TenantSelectionSerializer(serializers.Serializer):
    """Validate the tenant ID requested for the current session."""
    tenant_id = serializers.IntegerField(min_value=1)


