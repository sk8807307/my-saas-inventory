from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from backend.api import require_manager, success, tenant_for
from .models import OrganizationSettings
from .serializers import OrganizationSettingsSerializer


@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def organization_settings_view(request):
    tenant, role = tenant_for(request)
    settings, _created = OrganizationSettings.objects.get_or_create(tenant=tenant)

    if request.method == "GET":
        return success(OrganizationSettingsSerializer(settings).data)

    require_manager(role, request, claim="settings:update")
    serializer = OrganizationSettingsSerializer(settings, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return success(serializer.data)
