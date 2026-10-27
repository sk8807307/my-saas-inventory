from django.db.models import Count
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated

from backend.api import success, tenant_for
from apps.inventory.models import Product, StockBalance, Warehouse
from apps.purchasing.models import PurchaseOrder
from apps.sales.models import Customer, SalesOrder


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def dashboard_report_view(request):
    tenant, _role = tenant_for(request)
    balances = StockBalance.objects.filter(product__tenant=tenant, location__warehouse__tenant=tenant)
    order_totals = SalesOrder.objects.filter(tenant=tenant).values("status").annotate(total=Count("id"))
    po_totals = PurchaseOrder.objects.filter(tenant=tenant).values("approval_status", "receiving_status").annotate(total=Count("id"))
    return success({
        "products": Product.objects.filter(tenant=tenant).count(),
        "warehouses": Warehouse.objects.filter(tenant=tenant).count(),
        "customers": Customer.objects.filter(tenant=tenant).count(),
        # A combined stock quantity across unlike units would be misleading.
        "stock_balance_bins": balances.count(),
        "sales_orders": list(order_totals),
        "purchase_orders": list(po_totals),
    })
