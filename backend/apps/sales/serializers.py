from rest_framework import serializers

from apps.inventory.models import Location, Product, ProductUnit, UnitOfMeasure
from .models import Customer, SalesOrder, SalesOrderLine


class CustomerListSerializer(serializers.ModelSerializer):
    """Expose operational customer fields used in list screens."""
    class Meta:
        model = Customer
        fields = ("id", "name", "company", "contact", "account_status")


class CustomerDetailSerializer(CustomerListSerializer):
    """Add sensitive customer fields for authorized detail views."""
    class Meta(CustomerListSerializer.Meta):
        fields = CustomerListSerializer.Meta.fields + ("tax_id", "credit_limit_minor", "billing_address", "shipping_address")


class CustomerWriteSerializer(serializers.ModelSerializer):
    """Validate customer fields submitted on create or edit."""
    class Meta:
        model = Customer
        fields = ("name", "company", "contact", "account_status", "tax_id", "credit_limit_minor", "billing_address", "shipping_address")


class SalesOrderLineSerializer(serializers.ModelSerializer):
    """Validate order items and resolve the selected unit conversion."""
    unit = serializers.PrimaryKeyRelatedField(queryset=UnitOfMeasure.objects.all(), required=False, allow_null=True)
    unit_factor = serializers.DecimalField(max_digits=14, decimal_places=4, read_only=True)
    product_name = serializers.CharField(source="product.name", read_only=True)

    class Meta:
        model = SalesOrderLine
        fields = ("id", "product", "product_name", "location", "unit", "unit_factor", "quantity", "unit_price_minor", "shipped_quantity")
        read_only_fields = ("id", "shipped_quantity")

    def validate(self, attrs):
        tenant = self.context["tenant"]
        if attrs["product"].tenant_id != tenant.id or attrs["location"].warehouse.tenant_id != tenant.id:
            raise serializers.ValidationError("Choose a product and location in this tenant.")
        if attrs["product"].tenant_id != attrs["location"].warehouse.tenant_id:
            raise serializers.ValidationError("Product and location must belong to the same tenant.")
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


class SalesOrderSerializer(serializers.ModelSerializer):
    """Validate and represent an order with its read-only line items."""
    lines = SalesOrderLineSerializer(many=True, read_only=True)
    customer_name = serializers.CharField(source="customer.name", read_only=True)

    class Meta:
        model = SalesOrder
        fields = ("id", "number", "customer", "customer_name", "status", "payment_status", "fulfillment_status", "currency", "paid_minor", "lines", "created_at", "updated_at")
        read_only_fields = ("id", "status", "payment_status", "fulfillment_status", "paid_minor", "created_at", "updated_at")

    def validate_customer(self, customer):
        if customer.tenant_id != self.context["tenant"].id:
            raise serializers.ValidationError("Choose a customer in this tenant.")
        return customer
