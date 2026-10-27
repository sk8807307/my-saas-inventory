from django.db.models import Sum
from rest_framework import serializers

from .models import (
    Location,
    Product,
    ProductUnit,
    StockBalance,
    UnitOfMeasure,
    Warehouse,
    WarehouseReorderPoint,
)


class UnitOfMeasureSerializer(serializers.ModelSerializer):
    """Read or write measurement units used for stock quantities."""

    class Meta:
        model = UnitOfMeasure
        fields = ("id", "code", "name", "is_active")
        read_only_fields = ("id",)


class WarehouseSerializer(serializers.ModelSerializer):
    """Read or write a warehouse belonging to the active tenant."""

    class Meta:
        model = Warehouse
        fields = ("id", "name", "code", "is_active")
        read_only_fields = ("id",)


class LocationSerializer(serializers.ModelSerializer):
    """Validate and represent a bin or location inside a warehouse."""

    warehouse = serializers.PrimaryKeyRelatedField(queryset=Warehouse.objects.all())

    class Meta:
        model = Location
        fields = ("id", "warehouse", "code", "name")
        read_only_fields = ("id",)

    def validate_warehouse(self, warehouse):
        if warehouse.tenant_id != self.context["tenant"].id:
            raise serializers.ValidationError("Choose a warehouse in this tenant.")
        return warehouse


class ProductSerializer(serializers.ModelSerializer):
    """Validate product data and add stock totals to product responses."""

    base_uom = serializers.PrimaryKeyRelatedField(queryset=UnitOfMeasure.objects.all())

    # --- Refined Frontend Extensions ---
    base_uom_code = serializers.ReadOnlyField(source="base_uom.code")
    on_hand = serializers.SerializerMethodField()
    reserved = serializers.SerializerMethodField()
    available = serializers.SerializerMethodField()
    warehouse_bin = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = (
            "id",
            "sku",
            "name",
            "description",
            "base_uom",
            "base_uom_code",  # Added for Next.js Sublabel
            "reorder_point",
            "is_active",
            "on_hand",
            "reserved",
            "available",
            "warehouse_bin",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")

    def validate_base_uom(self, unit):
        if unit.tenant_id != self.context["tenant"].id:
            raise serializers.ValidationError("Choose a unit belonging to this tenant.")
        return unit

    # --- Next.js Frontend Aggregation Logic ---
    def get_on_hand(self, obj):
        result = obj.stock_balances.aggregate(total=Sum("on_hand"))
        return result["total"] or 0.000

    def get_reserved(self, obj):
        result = obj.stock_balances.aggregate(total=Sum("reserved"))
        return result["total"] or 0.000

    def get_available(self, obj):
        balances = obj.stock_balances.all()
        return sum(balance.available for balance in balances) or 0.000

    def get_warehouse_bin(self, obj):
        balances = obj.stock_balances.select_related("location__warehouse")
        if not balances.exists():
            return "No Stock / No Location Assigned"

        # Pulls out a unique set of string labels formatted as: "WH-CODE/LOC-CODE"
        locations = [f"{b.location.warehouse.code}/{b.location.code}" for b in balances]
        return ", ".join(sorted(list(set(locations))))


class ProductUnitSerializer(serializers.ModelSerializer):
    """Show a product package conversion into its base unit."""

    class Meta:
        model = ProductUnit
        fields = ("id", "unit", "factor")


class StockBalanceSerializer(serializers.ModelSerializer):
    """Show on-hand, reserved, and available stock for one location."""

    sku = serializers.CharField(source="product.sku", read_only=True)
    product_name = serializers.CharField(source="product.name", read_only=True)
    warehouse = serializers.CharField(source="location.warehouse.name", read_only=True)
    location_code = serializers.CharField(source="location.code", read_only=True)
    available = serializers.DecimalField(
        max_digits=14, decimal_places=3, read_only=True
    )

    class Meta:
        model = StockBalance
        fields = (
            "id",
            "product",
            "sku",
            "product_name",
            "location",
            "warehouse",
            "location_code",
            "on_hand",
            "reserved",
            "available",
        )
        read_only_fields = fields


class StockAdjustmentSerializer(serializers.Serializer):
    """Validate a stock change before the view records the movement."""

    product_id = serializers.IntegerField()
    location_id = serializers.IntegerField()
    quantity_change = serializers.DecimalField(max_digits=14, decimal_places=3)
    note = serializers.CharField(required=False, allow_blank=True, max_length=250)

    def validate(self, attrs):
        tenant = self.context["tenant"]
        try:
            product = Product.objects.get(pk=attrs["product_id"], tenant=tenant)
            location = Location.objects.get(
                pk=attrs["location_id"], warehouse__tenant=tenant
            )
        except (Product.DoesNotExist, Location.DoesNotExist):
            raise serializers.ValidationError(
                "Choose a product and location in this tenant."
            )
        if product.base_uom_id is None:
            raise serializers.ValidationError(
                "The product needs a base unit of measure."
            )
        attrs["product"] = product
        attrs["location"] = location
        if not attrs["quantity_change"]:
            raise serializers.ValidationError(
                {"quantity_change": "Enter a non-zero adjustment."}
            )
        return attrs


class ProductUnitWriteSerializer(serializers.ModelSerializer):
    """Validate input for adding a package conversion to a product."""

    class Meta:
        model = ProductUnit
        fields = ("unit", "factor")

    def validate_unit(self, unit):
        if unit.tenant_id != self.context["tenant"].id:
            raise serializers.ValidationError("Choose a unit belonging to this tenant.")
        return unit


class WarehouseReorderPointSerializer(serializers.ModelSerializer):
    """Validate and represent a product reorder level for a warehouse."""

    product = serializers.PrimaryKeyRelatedField(queryset=Product.objects.all())
    warehouse = serializers.PrimaryKeyRelatedField(queryset=Warehouse.objects.all())

    class Meta:
        model = WarehouseReorderPoint
        fields = ("id", "product", "warehouse", "quantity")
        read_only_fields = ("id",)

    def validate(self, attrs):
        tenant = self.context["tenant"]
        if (
            attrs["product"].tenant_id != tenant.id
            or attrs["warehouse"].tenant_id != tenant.id
        ):
            raise serializers.ValidationError(
                "Choose a product and warehouse in this tenant."
            )
        return attrs
