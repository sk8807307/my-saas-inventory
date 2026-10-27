from decimal import Decimal, InvalidOperation, ROUND_HALF_UP

from django.db import transaction
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from backend.api import page_data, require_manager, success, tenant_for
from apps.authentication.models import Membership
from apps.inventory.models import StockBalance, StockMovement
from .models import Customer, SalesOrder, SalesOrderLine
from .serializers import (
    CustomerDetailSerializer,
    CustomerListSerializer,
    CustomerWriteSerializer,
    SalesOrderLineSerializer,
    SalesOrderSerializer,
)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def customers_view(request):
    tenant, role = tenant_for(request)
    if request.method == "POST":
        require_manager(role, request, claim="sales:customer:manage")
        serializer = CustomerWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        customer = serializer.save(tenant=tenant)
        return success(CustomerListSerializer(customer).data, status_code=status.HTTP_201_CREATED)

    rows = Customer.objects.filter(tenant=tenant)
    return page_data(rows, request, CustomerListSerializer, ("name", "company", "contact"), ("name", "account_status"))


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def customer_detail_view(request, customer_id):
    tenant, role = tenant_for(request)
    customer = Customer.objects.filter(tenant=tenant, pk=customer_id).first()
    if customer is None:
        return Response({"data": None, "meta": {}, "error": {"detail": "Customer not found."}}, status=404)

    # Financial and address details are visible to tenant managers only.
    serializer = CustomerDetailSerializer if role in (Membership.Role.OWNER, Membership.Role.ADMIN) else CustomerListSerializer
    return success(serializer(customer).data)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def orders_view(request):
    tenant, role = tenant_for(request)
    if request.method == "POST":
        require_manager(role, request, claim="sales:order:manage")
        serializer = SalesOrderSerializer(data=request.data, context={"tenant": tenant})
        serializer.is_valid(raise_exception=True)
        order = serializer.save(tenant=tenant)
        return success(SalesOrderSerializer(order).data, status_code=status.HTTP_201_CREATED)

    rows = SalesOrder.objects.filter(tenant=tenant).select_related("customer").prefetch_related("lines__product")
    return page_data(rows, request, SalesOrderSerializer, ("number", "customer__name"), ("number", "created_at", "status"))


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def add_order_line_view(request, order_id):
    tenant, role = tenant_for(request)
    require_manager(role, request, claim="sales:order:manage")
    order = SalesOrder.objects.filter(tenant=tenant, pk=order_id).first()
    if order is None:
        return Response({"detail": "Order not found."}, status=404)
    if order.status != SalesOrder.Status.DRAFT:
        return Response({"detail": "Only draft orders can be edited."}, status=400)

    serializer = SalesOrderLineSerializer(data=request.data, context={"tenant": tenant})
    serializer.is_valid(raise_exception=True)
    line = serializer.save(order=order)
    return success(SalesOrderLineSerializer(line).data, status_code=status.HTTP_201_CREATED)


def _line_receipts(request, lines):
    """Read a requested partial shipment; an empty list means ship all remaining."""
    payload = request.data.get("lines")
    if payload is None:
        return [(line, line.quantity - line.shipped_quantity) for line in lines]
    if not isinstance(payload, list) or not payload:
        raise ValueError("Provide at least one line and quantity to ship.")

    by_id = {line.id: line for line in lines}
    receipts = []
    seen = set()
    for item in payload:
        try:
            line_id = int(item["line_id"])
            quantity = Decimal(str(item["quantity"]))
        except (KeyError, TypeError, ValueError, InvalidOperation):
            raise ValueError("Each shipment needs a valid line_id and quantity.")
        line = by_id.get(line_id)
        if line is None or line_id in seen:
            raise ValueError("Shipment lines must be unique lines from this order.")
        remaining = line.quantity - line.shipped_quantity
        if quantity <= 0 or quantity > remaining:
            raise ValueError("Shipment quantity must be positive and within the remaining quantity.")
        seen.add(line_id)
        receipts.append((line, quantity))
    return receipts


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def order_action_view(request, order_id, action):
    tenant, role = tenant_for(request)
    claim = {"ship": "sales:fulfill"}.get(action, f"sales:order:{action}")
    require_manager(role, request, claim=claim)

    with transaction.atomic():
        order = SalesOrder.objects.select_for_update().filter(tenant=tenant, pk=order_id).first()
        if order is None:
            return Response({"detail": "Order not found."}, status=404)
        lines = list(order.lines.select_related("product", "location"))

        if action == "confirm":
            if order.status != SalesOrder.Status.DRAFT or not lines:
                return Response({"detail": "Only a draft order with lines can be confirmed."}, status=400)
            balances = []
            for line in lines:
                balance = StockBalance.objects.select_for_update().filter(product=line.product, location=line.location).first()
                if balance is None or balance.available < line.quantity:
                    return Response({"detail": f"Not enough available stock for {line.product.sku}."}, status=400)
                balances.append((balance, line.base_quantity))
            # Reserve only after every line has passed the stock check.
            for balance, quantity in balances:
                balance.reserved += quantity
                balance.save(update_fields=["reserved"])
            order.status = SalesOrder.Status.CONFIRMED

        elif action == "process":
            if order.status != SalesOrder.Status.CONFIRMED:
                return Response({"detail": "Only confirmed orders can start processing."}, status=400)
            order.status = SalesOrder.Status.PROCESSING

        elif action == "ship":
            if order.status != SalesOrder.Status.PROCESSING:
                return Response({"detail": "Only processing orders can be shipped."}, status=400)
            try:
                shipments = _line_receipts(request, lines)
            except ValueError as error:
                return Response({"detail": str(error)}, status=400)

            updates = []
            for line, quantity in shipments:
                balance = StockBalance.objects.select_for_update().filter(product=line.product, location=line.location).first()
                base_quantity = quantity * line.unit_factor
                if balance is None or quantity <= 0 or balance.reserved < base_quantity:
                    return Response({"detail": f"No reserved stock is available for {line.product.sku}."}, status=400)
                updates.append((line, balance, quantity, base_quantity))
            for line, balance, quantity, base_quantity in updates:
                balance.on_hand -= base_quantity
                balance.reserved -= base_quantity
                balance.save(update_fields=["on_hand", "reserved"])
                line.shipped_quantity += quantity
                line.save(update_fields=["shipped_quantity"])
                StockMovement.objects.create(
                    product=line.product,
                    location=line.location,
                    quantity_change=-base_quantity,
                    kind=StockMovement.Kind.SHIPMENT,
                    note=f"Sales order {order.number}",
                    created_by=request.user,
                )

            fully_shipped = all(line.shipped_quantity >= line.quantity for line in order.lines.all())
            order.fulfillment_status = SalesOrder.FulfillmentStatus.SHIPPED if fully_shipped else SalesOrder.FulfillmentStatus.PARTIAL
            if fully_shipped:
                order.status = SalesOrder.Status.COMPLETED

        elif action == "cancel":
            if order.status not in (SalesOrder.Status.DRAFT, SalesOrder.Status.CONFIRMED):
                return Response({"detail": "Only unshipped orders can be cancelled."}, status=400)
            if order.status == SalesOrder.Status.CONFIRMED:
                for line in lines:
                    balance = StockBalance.objects.select_for_update().get(product=line.product, location=line.location)
                    balance.reserved -= line.base_quantity
                    balance.save(update_fields=["reserved"])
            order.status = SalesOrder.Status.CANCELLED

        else:
            return Response({"detail": "Unknown order action."}, status=404)

        order.save(update_fields=["status", "fulfillment_status", "updated_at"])

    return success(SalesOrderSerializer(order).data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def record_payment_view(request, order_id):
    tenant, role = tenant_for(request)
    require_manager(role, request, claim="sales:payment:record")
    try:
        amount = int(request.data.get("amount_minor"))
    except (TypeError, ValueError):
        return Response({"detail": "amount_minor must be a positive whole number."}, status=400)
    if amount <= 0:
        return Response({"detail": "amount_minor must be greater than zero."}, status=400)

    order = SalesOrder.objects.filter(tenant=tenant, pk=order_id).first()
    if order is None:
        return Response({"detail": "Order not found."}, status=404)
    order = SalesOrder.objects.prefetch_related("lines").get(pk=order.pk)
    total_minor = sum(
        int((line.quantity * line.unit_price_minor).quantize(Decimal("1"), rounding=ROUND_HALF_UP))
        for line in order.lines.all()
    )
    if order.paid_minor + amount > total_minor:
        return Response({"detail": "Payment cannot exceed the sales order total."}, status=400)

    order.paid_minor += amount
    if order.paid_minor == 0:
        order.payment_status = SalesOrder.PaymentStatus.UNPAID
    elif order.paid_minor < total_minor:
        order.payment_status = SalesOrder.PaymentStatus.PARTIAL
    else:
        order.payment_status = SalesOrder.PaymentStatus.PAID
    order.save(update_fields=["paid_minor", "payment_status", "updated_at"])
    return success({"paid_minor": order.paid_minor, "total_minor": total_minor, "payment_status": order.payment_status})
