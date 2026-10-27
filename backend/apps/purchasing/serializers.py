from rest_framework import serializers

from apps.inventory.models import Location, Product, ProductUnit, UnitOfMeasure
from .models import PurchaseOrder, PurchaseOrderLine, Supplier


class SupplierSerializer(serializers.ModelSerializer):
    """Validate supplier records, including their financial details."""
    class Meta:
        model = Supplier
        fields = ("id", "name", "primary_contact", "lead_time_days", "currency", "status", "bank_details", "tax_id", "payment_terms")
        read_only_fields = ("id",)


class SupplierListSerializer(serializers.ModelSerializer):
    """Expose operational supplier fields for list screens."""
    class Meta:
        model = Supplier
        fields = ("id", "name", "primary_contact", "lead_time_days", "currency", "status")


class PurchaseOrderLineSerializer(serializers.ModelSerializer):
    """Validate ordered items, unit conversions, and received quantities."""
    unit = serializers.PrimaryKeyRelatedField(queryset=UnitOfMeasure.objects.all(), required=False, allow_null=True)
    unit_factor = serializers.DecimalField(max_digits=14, decimal_places=4, read_only=True)
    product_name = serializers.CharField(source="product.name", read_only=True)

    class Meta:
        model = PurchaseOrderLine
        fields = ("id", "product", "product_name", "location", "unit", "unit_factor", "quantity", "received_quantity", "unit_cost_minor")
        read_only_fields = ("id", "received_quantity")

    def validate(self, attrs):
        tenant = self.context["tenant"]
        if attrs["product"].tenant_id != tenant.id or attrs["location"].warehouse.tenant_id != tenant.id:
            raise serializers.ValidationError("Choose a product and location in this tenant.")
        product = attrs["product"]
        unit = attrs.get("unit") or product.base_uom
        if unit.tenant_id != tenant.id:
            raise serializers.ValidationError({"unit": "Choose a unit in this tenant."})
        if unit == product.base_uom:
            factor = 1
        else:
            conversion = ProductUnit.objects.filter(product=product, unit=unit).first()
            if conversion is None:
                raise serializers.ValidationError({"unit": "This product has no conversion for that unit."})
            factor = conversion.factor
        attrs["unit"] = unit
        attrs["unit_factor"] = factor
        return attrs


class PurchaseOrderSerializer(serializers.ModelSerializer):
    """Validate and represent a purchase order and its delivery status."""
    lines = PurchaseOrderLineSerializer(many=True, read_only=True)
    supplier_name = serializers.CharField(source="supplier.name", read_only=True)
    delivery_health = serializers.CharField(read_only=True)

    class Meta:
        model = PurchaseOrder
        fields = ("id", "number", "supplier", "supplier_name", "approval_status", "receiving_status", "delivery_health", "expected_date", "lines", "created_at")
        read_only_fields = ("id", "approval_status", "receiving_status", "created_at")

    def validate_supplier(self, supplier):
        if supplier.tenant_id != self.context["tenant"].id:
            raise serializers.ValidationError("Choose a supplier in this tenant.")
        if supplier.status != Supplier.Status.ACTIVE:
            raise serializers.ValidationError("Purchase orders require an active supplier.")
        return supplier
