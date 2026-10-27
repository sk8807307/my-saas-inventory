from django.db import transaction
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from backend.api import page_data, require_manager, success, tenant_for

from .models import (
    Location,
    Product,
    ProductUnit,
    StockBalance,
    StockMovement,
    UnitOfMeasure,
    Warehouse,
)
from .serializers import (
    LocationSerializer,
    ProductSerializer,
    StockAdjustmentSerializer,
    StockBalanceSerializer,
    UnitOfMeasureSerializer,
    WarehouseSerializer,
)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def units_view(request):
    tenant, role = tenant_for(request)
    if request.method == "POST":
        require_manager(role, request, claim="inventory:manage")
        serializer = UnitOfMeasureSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        unit = serializer.save(tenant=tenant)
        return success(
            UnitOfMeasureSerializer(unit).data, status_code=status.HTTP_201_CREATED
        )
    return page_data(
        UnitOfMeasure.objects.filter(tenant=tenant),
        request,
        UnitOfMeasureSerializer,
        ("code", "name"),
        ("code", "name"),
    )


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def warehouses_view(request):
    tenant, role = tenant_for(request)
    if request.method == "POST":
        require_manager(role, request, claim="inventory:manage")
        serializer = WarehouseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return success(
            WarehouseSerializer(serializer.save(tenant=tenant)).data,
            status_code=status.HTTP_201_CREATED,
        )
    return page_data(
        Warehouse.objects.filter(tenant=tenant),
        request,
        WarehouseSerializer,
        ("name", "code"),
        ("name", "code"),
    )


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def locations_view(request):
    tenant, role = tenant_for(request)
    if request.method == "POST":
        require_manager(role, request, claim="inventory:manage")
        serializer = LocationSerializer(data=request.data, context={"tenant": tenant})
        serializer.is_valid(raise_exception=True)
        return success(
            LocationSerializer(serializer.save()).data,
            status_code=status.HTTP_201_CREATED,
        )
    rows = Location.objects.filter(warehouse__tenant=tenant).select_related("warehouse")
    return page_data(
        rows, request, LocationSerializer, ("code", "name"), ("code", "name")
    )


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def products_view(request):
    tenant, role = tenant_for(request)
    if request.method == "POST":
        require_manager(role, request, claim="inventory:manage")
        serializer = ProductSerializer(data=request.data, context={"tenant": tenant})
        serializer.is_valid(raise_exception=True)
        return success(
            ProductSerializer(serializer.save(tenant=tenant)).data,
            status_code=status.HTTP_201_CREATED,
        )
    rows = Product.objects.filter(tenant=tenant).select_related("base_uom")
    return page_data(
        rows,
        request,
        ProductSerializer,
        ("sku", "name", "description"),
        ("sku", "name", "created_at"),
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def stock_balances_view(request):
    tenant, _role = tenant_for(request)
    rows = StockBalance.objects.filter(
        product__tenant=tenant, location__warehouse__tenant=tenant
    ).select_related("product", "location__warehouse")
    return page_data(
        rows,
        request,
        StockBalanceSerializer,
        ("product__sku", "product__name", "location__code"),
        ("product__name", "on_hand", "reserved"),
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def stock_adjustment_view(request):
    tenant, role = tenant_for(request)
    require_manager(role, request, claim="inventory:adjust")
    serializer = StockAdjustmentSerializer(
        data=request.data, context={"tenant": tenant}
    )
    serializer.is_valid(raise_exception=True)
    values = serializer.validated_data

    # Keep the quantity change and its audit record in one database transaction.
    with transaction.atomic():
        balance = (
            StockBalance.objects.select_for_update()
            .filter(product=values["product"], location=values["location"])
            .first()
        )
        if balance is None:
            if values["quantity_change"] < 0:
                return Response({"detail": "There is no stock to reduce."}, status=400)
            balance = StockBalance.objects.create(
                product=values["product"], location=values["location"]
            )

        new_on_hand = balance.on_hand + values["quantity_change"]
        if new_on_hand < balance.reserved:
            return Response(
                {
                    "detail": "Adjustment cannot reduce stock below the reserved quantity."
                },
                status=400,
            )
        balance.on_hand = new_on_hand
        balance.save(update_fields=["on_hand"])
        movement = StockMovement.objects.create(
            product=values["product"],
            location=values["location"],
            quantity_change=values["quantity_change"],
            kind=StockMovement.Kind.ADJUSTMENT,
            note=values.get("note", ""),
            created_by=request.user,
        )
    return success(
        {"movement_id": movement.id, "on_hand": balance.on_hand},
        status_code=status.HTTP_201_CREATED,
    )


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def product_units_view(request, product_id):
    from .serializers import ProductUnitWriteSerializer

    tenant, role = tenant_for(request)
    product = Product.objects.filter(tenant=tenant, pk=product_id).first()
    if product is None:
        return Response({"detail": "Product not found."}, status=404)
    if request.method == "POST":
        require_manager(role, request, claim="inventory:manage")
        serializer = ProductUnitWriteSerializer(
            data=request.data, context={"tenant": tenant}
        )
        serializer.is_valid(raise_exception=True)
        unit = serializer.save(product=product)
        return success(
            {"id": unit.id, "unit": unit.unit_id, "factor": unit.factor},
            status_code=201,
        )
    rows = ProductUnit.objects.filter(product=product).select_related("unit")
    data = [
        {
            "id": row.id,
            "unit": row.unit_id,
            "unit_code": row.unit.code,
            "factor": row.factor,
        }
        for row in rows
    ]
    return success(data)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def reorder_points_view(request):
    from .models import WarehouseReorderPoint
    from .serializers import WarehouseReorderPointSerializer

    tenant, role = tenant_for(request)
    if request.method == "POST":
        require_manager(role, request, claim="inventory:manage")
        serializer = WarehouseReorderPointSerializer(
            data=request.data, context={"tenant": tenant}
        )
        serializer.is_valid(raise_exception=True)
        row = serializer.save()
        return success(WarehouseReorderPointSerializer(row).data, status_code=201)
    rows = WarehouseReorderPoint.objects.filter(
        product__tenant=tenant, warehouse__tenant=tenant
    )
    return page_data(rows, request, WarehouseReorderPointSerializer, (), ("quantity",))


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def low_stock_view(request):
    from collections import defaultdict

    from .models import WarehouseReorderPoint

    tenant, _role = tenant_for(request)
    totals = defaultdict(
        lambda: {"on_hand": 0, "reserved": 0, "product": None, "warehouse": None}
    )
    balances = StockBalance.objects.filter(
        product__tenant=tenant, location__warehouse__tenant=tenant
    ).select_related("product", "location__warehouse")

    # Compare the total warehouse stock, not each individual bin.
    for balance in balances:
        key = (balance.product_id, balance.location.warehouse_id)
        total = totals[key]
        total["on_hand"] += balance.on_hand
        total["reserved"] += balance.reserved
        total["product"] = balance.product
        total["warehouse"] = balance.location.warehouse

    alerts = []
    for (product_id, warehouse_id), total in totals.items():
        product = total["product"]
        warehouse = total["warehouse"]
        override = WarehouseReorderPoint.objects.filter(
            product_id=product_id, warehouse_id=warehouse_id
        ).first()
        threshold = override.quantity if override else product.reorder_point
        available = total["on_hand"] - total["reserved"]
        if threshold is not None and available <= threshold:
            alerts.append(
                {
                    "product_id": product_id,
                    "sku": product.sku,
                    "product_name": product.name,
                    "warehouse_id": warehouse_id,
                    "warehouse": warehouse.name,
                    "available": available,
                    "reorder_point": threshold,
                }
            )
    return success(alerts)
