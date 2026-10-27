# backend/urls.py
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    # API Router Endpoints
    path("api/auth/", include("apps.authentication.urls")),
    path("api/inventory/", include("apps.inventory.urls")),
    path("api/sales/", include("apps.sales.urls")),
    path("api/purchasing/", include("apps.purchasing.urls")),
    path("api/reports/", include("apps.reports.urls")),
    path("api/settings/", include("apps.settings.urls")),
]

# Nexa ERP Custom Admin Branding
admin.site.site_header = "Nexa ERP Admin Portal"
admin.site.site_title = "Nexa ERP Portal"
admin.site.index_title = "Welcome to Nexa SaaS ERP Backend"

# TODO: Keep authentication endpoints grouped under /api/auth/ and require explicit permission/CSRF policy per endpoint.
