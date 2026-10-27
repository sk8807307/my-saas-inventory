from decimal import Decimal, InvalidOperation

from django.db import transaction
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from backend.api import page_data, require_manager, success, tenant_for
from apps.inventory.models import StockBalance, StockMovement
from .models import PurchaseOrder, PurchaseOrderLine, Supplier
from .serializers import (
    PurchaseOrderLineSerializer,
    PurchaseOrderSerializer,
    SupplierListSerializer,
    SupplierSerializer,
)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def suppliers_view(request):
    tenant, role = tenant_for(request)
    if request.method == "POST":
        require_manager(role, request, claim="purchasing:supplier:manage")
        serializer = SupplierSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        supplier = serializer.save(tenant=tenant)
        return success(SupplierListSerializer(supplier).data, status_code=status.HTTP_201_CREATED)

    rows = Supplier.objects.filter(tenant=tenant)
    return page_data(rows, request, SupplierListSerializer, ("name", "primary_contact"), ("name", "status"))


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def supplier_detail_view(request, supplier_id):
    tenant, role = tenant_for(request)
    supplier = Supplier.objects.filter(tenant=tenant, pk=supplier_id).first()
    if supplier is None:
        return Response({"detail": "Supplier not found."}, status=404)

    # Only owners and admins can see payment, bank and tax details.
    serializer = SupplierSerializer if role in ("owner", "admin") else SupplierListSerializer
    return success(serializer(supplier).data)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def purchase_orders_view(request):
    tenant, role = tenant_for(request)
    if request.method == "POST":
        require_manager(role, request, claim="purchasing:order:manage")
        serializer = PurchaseOrderSerializer(data=request.data, context={"tenant": tenant})
        serializer.is_valid(raise_exception=True)
        order = serializer.save(tenant=tenant)
        return success(PurchaseOrderSerializer(order).data, status_code=status.HTTP_201_CREATED)

    rows = PurchaseOrder.objects.filter(tenant=tenant).select_related("supplier").prefetch_related("lines__product")
    return page_data(rows, request, PurchaseOrderSerializer, ("number", "supplier__name"), ("number", "created_at", "expected_date", "approval_status"))


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def add_purchase_order_line_view(request, order_id):
    tenant, role = tenant_for(request)
    require_manager(role, request, claim="purchasing:order:manage")
    order = PurchaseOrder.objects.filter(tenant=tenant, pk=order_id).first()
    if order is None:
        return Response({"detail": "Purchase order not found."}, status=404)
    if order.approval_status != PurchaseOrder.ApprovalStatus.DRAFT:
        return Response({"detail": "Only draft purchase orders can be edited."}, status=400)

    serializer = PurchaseOrderLineSerializer(data=request.data, context={"tenant": tenant})
    serializer.is_valid(raise_exception=True)
    line = serializer.save(order=order)
    return success(PurchaseOrderLineSerializer(line).data, status_code=status.HTTP_201_CREATED)


def receipt_lines_for(order, payload):
    """Validate the whole receipt before changing any stock quantities."""
    if not isinstance(payload, list) or not payload:
        raise ValueError("Provide at least one line receipt.")

    order_lines = {line.id: line for line in order.lines.select_related("product", "location")}
    receipts = []
    seen = set()
    for item in payload:
        try:
            line_id = int(item["line_id"])
            quantity = Decimal(str(item["quantity"]))
        except (KeyError, TypeError, ValueError, InvalidOperation):
            raise ValueError("Each receipt needs a valid line_id and quantity.")

        line = order_lines.get(line_id)
        if line is None or line_id in seen:
            raise ValueError("Receipt lines must be unique lines from this purchase order.")
        remaining = line.quantity - line.received_quantity
        if quantity <= 0 or quantity > remaining:
            raise ValueError("Receipt quantity must be positive and no greater than the remaining quantity.")
        seen.add(line_id)
        receipts.append((line, quantity))
    return receipts


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def purchase_order_action_view(request, order_id, action):
    tenant, role = tenant_for(request)
    claim = "purchasing:receive" if action == "receive" else ("purchasing:approve" if action in ("approve", "reject") else f"purchasing:order:{action}")
    require_manager(role, request, claim=claim)

    with transaction.atomic():
        order = PurchaseOrder.objects.select_for_update().filter(tenant=tenant, pk=order_id).first()
        if order is None:
            return Response({"detail": "Purchase order not found."}, status=404)

        if action == "submit":
            if order.approval_status != PurchaseOrder.ApprovalStatus.DRAFT or not order.lines.exists():
                return Response({"detail": "A draft purchase order with lines is required."}, status=400)
            order.approval_status = PurchaseOrder.ApprovalStatus.PENDING

        elif action in ("approve", "reject"):
            if order.approval_status != PurchaseOrder.ApprovalStatus.PENDING:
                return Response({"detail": "Only pending orders can be approved or rejected."}, status=400)
            order.approval_status = (
                PurchaseOrder.ApprovalStatus.APPROVED
                if action == "approve"
                else PurchaseOrder.ApprovalStatus.REJECTED
            )

        elif action == "receive":
            if order.approval_status != PurchaseOrder.ApprovalStatus.APPROVED:
                return Response({"detail": "Receiving is available only after approval."}, status=400)
            try:
                receipts = receipt_lines_for(order, request.data.get("lines"))
            except ValueError as error:
                return Response({"detail": str(error)}, status=400)

            # All receipt lines are valid before any stock or audit rows are changed.
            for line, quantity in receipts:
                balance, _created = StockBalance.objects.select_for_update().get_or_create(
                    product=line.product, location=line.location
                )
                base_quantity = quantity * line.unit_factor
                balance.on_hand += base_quantity
                balance.save(update_fields=["on_hand"])
                line.received_quantity += quantity
                line.save(update_fields=["received_quantity"])
                StockMovement.objects.create(
                    product=line.product,
                    location=line.location,
                    quantity_change=base_quantity,
                    kind=StockMovement.Kind.RECEIPT,
                    note=f"Purchase order {order.number}",
                    created_by=request.user,
                )

            all_lines = list(order.lines.all())
            order.receiving_status = (
                PurchaseOrder.ReceivingStatus.RECEIVED
                if all(line.received_quantity >= line.quantity for line in all_lines)
                else PurchaseOrder.ReceivingStatus.PARTIAL
            )
        else:
            return Response({"detail": "Unknown purchase order action."}, status=404)

        order.save(update_fields=["approval_status", "receiving_status"])

    return success(PurchaseOrderSerializer(order).data)
