from django.db import IntegrityError, transaction
from django.test import TestCase

from apps.authentication.models import Membership, Tenant, User
from .models import Location, Product, StockBalance, UnitOfMeasure, Warehouse


class InventoryModelTests(TestCase):
    def setUp(self):
        self.tenant = Tenant.objects.create(name="Northwind", slug="northwind")
        self.unit = UnitOfMeasure.objects.create(tenant=self.tenant, code="EA", name="Each")

    def test_product_sku_is_trimmed_and_uppercase(self):
        product = Product.objects.create(tenant=self.tenant, sku="  item-01 ", name="Item", base_uom=self.unit)
        self.assertEqual(product.sku, "ITEM-01")

    def test_sku_is_unique_without_case_for_each_tenant(self):
        Product.objects.create(tenant=self.tenant, sku="ITEM-01", name="One", base_uom=self.unit)
        with self.assertRaises(IntegrityError), transaction.atomic():
            Product.objects.create(tenant=self.tenant, sku="item-01", name="Two", base_uom=self.unit)

    def test_available_stock_is_on_hand_minus_reserved(self):
        warehouse = Warehouse.objects.create(tenant=self.tenant, name="Main", code="MAIN")
        location = Location.objects.create(warehouse=warehouse, code="A1")
        product = Product.objects.create(tenant=self.tenant, sku="ITEM-01", name="Item", base_uom=self.unit)
        balance = StockBalance.objects.create(product=product, location=location, on_hand=12, reserved=4)
        self.assertEqual(balance.available, 8)


class InventoryEndpointTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(email="owner@example.com", password="Test-password-123")
        self.tenant = Tenant.objects.create(name="Northwind", slug="northwind")
        Membership.objects.create(tenant=self.tenant, user=self.user, role=Membership.Role.OWNER, status=Membership.Status.ACTIVE)
        self.client.force_login(self.user)
        session = self.client.session
        session["active_tenant_id"] = self.tenant.id
        session.save()

    def test_product_create_is_scoped_to_selected_tenant(self):
        unit = UnitOfMeasure.objects.create(tenant=self.tenant, code="EA", name="Each")
        response = self.client.post("/api/inventory/products/", {
            "sku": "sku-01", "name": "Widget", "base_uom": unit.id
        }, content_type="application/json")
        self.assertEqual(response.status_code, 201, response.content)
        self.assertEqual(response.json()["data"]["sku"], "SKU-01")

    def test_member_needs_the_matching_claim_to_create_a_product(self):
        member = User.objects.create_user(email="member@example.com", password="Test-password-123")
        membership = Membership.objects.create(
            tenant=self.tenant,
            user=member,
            role=Membership.Role.MEMBER,
            status=Membership.Status.ACTIVE,
        )
        unit = UnitOfMeasure.objects.create(tenant=self.tenant, code="EA", name="Each")
        payload = {"sku": "sku-02", "name": "Widget", "base_uom": unit.id}

        self.client.force_login(member)
        session = self.client.session
        session["active_tenant_id"] = self.tenant.id
        session.save()
        denied = self.client.post("/api/inventory/products/", payload, content_type="application/json")
        self.assertEqual(denied.status_code, 403)

        membership.permissions = ["inventory:manage"]
        membership.save(update_fields=["permissions"])
        allowed = self.client.post("/api/inventory/products/", payload, content_type="application/json")
        self.assertEqual(allowed.status_code, 201, allowed.content)
