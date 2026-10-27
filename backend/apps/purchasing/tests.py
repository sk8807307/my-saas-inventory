from django.test import TestCase

from apps.authentication.models import Membership, Tenant, User
from apps.inventory.models import Location, Product, ProductUnit, StockBalance, UnitOfMeasure, Warehouse
from .models import PurchaseOrder, PurchaseOrderLine, Supplier


class PurchaseReceivingTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(email="owner@example.com", password="Test-password-123")
        self.tenant = Tenant.objects.create(name="Northwind", slug="northwind")
        Membership.objects.create(tenant=self.tenant, user=self.user, role=Membership.Role.OWNER, status=Membership.Status.ACTIVE)
        self.client.force_login(self.user)
        session = self.client.session
        session["active_tenant_id"] = self.tenant.id
        session.save()

        unit = UnitOfMeasure.objects.create(tenant=self.tenant, code="EA", name="Each")
        warehouse = Warehouse.objects.create(tenant=self.tenant, name="Main", code="MAIN")
        self.location = Location.objects.create(warehouse=warehouse, code="A1")
        self.product = Product.objects.create(tenant=self.tenant, sku="WIDGET", name="Widget", base_uom=unit)
        self.case = UnitOfMeasure.objects.create(tenant=self.tenant, code="CASE", name="Case")
        ProductUnit.objects.create(product=self.product, unit=self.case, factor=6)
        self.supplier = Supplier.objects.create(tenant=self.tenant, name="Supplier", status=Supplier.Status.ACTIVE)
        self.order = PurchaseOrder.objects.create(tenant=self.tenant, supplier=self.supplier, number="PO-1")
        self.line = PurchaseOrderLine.objects.create(order=self.order, product=self.product, location=self.location, unit=self.case, unit_factor=6, quantity=3)

    def test_receiving_is_blocked_until_approved_then_updates_stock(self):
        blocked = self.client.post(f"/api/purchasing/orders/{self.order.id}/receive/", {
            "lines": [{"line_id": self.line.id, "quantity": "2"}]
        }, content_type="application/json")
        self.assertEqual(blocked.status_code, 400)

        for action in ("submit", "approve"):
            response = self.client.post(f"/api/purchasing/orders/{self.order.id}/{action}/")
            self.assertEqual(response.status_code, 200, response.content)

        response = self.client.post(f"/api/purchasing/orders/{self.order.id}/receive/", {
            "lines": [{"line_id": self.line.id, "quantity": "2"}]
        }, content_type="application/json")
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(StockBalance.objects.get(product=self.product, location=self.location).on_hand, 12)
