from django.db import models

from apps.authentication.models import Tenant


class OrganizationSettings(models.Model):
    """Locale and display preferences owned by one tenant."""
    tenant = models.OneToOneField(Tenant, on_delete=models.CASCADE, related_name="organization_settings")
    locale = models.CharField(max_length=20, default="en-US")
    time_zone = models.CharField(max_length=64, default="UTC")
    currency = models.CharField(max_length=3, default="USD")
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Settings for {self.tenant.name}"
