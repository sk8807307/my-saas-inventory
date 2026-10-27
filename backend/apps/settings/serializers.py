from rest_framework import serializers

from .models import OrganizationSettings


class OrganizationSettingsSerializer(serializers.ModelSerializer):
    """Read or update locale, time zone, and currency settings."""

    class Meta:
        model = OrganizationSettings
        fields = ("locale", "time_zone", "currency", "updated_at")
        read_only_fields = ("updated_at",)