from django.test import TestCase

from apps.authentication.models import Membership, Tenant, User
from apps.inventory.models import Location, Product, ProductUnit, StockBalance, UnitOfMeasure, Warehouse
from .models import Customer, SalesOrder, SalesOrderLine


class SalesOrderFlowTests(TestCase):
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
        self.box = UnitOfMeasure.objects.create(tenant=self.tenant, code="BOX", name="Box")
        ProductUnit.objects.create(product=self.product, unit=self.box, factor=4)
        self.balance = StockBalance.objects.create(product=self.product, location=self.location, on_hand=40)
        self.customer = Customer.objects.create(tenant=self.tenant, name="Acme")
        self.order = SalesOrder.objects.create(tenant=self.tenant, customer=self.customer, number="SO-1")
        SalesOrderLine.objects.create(order=self.order, product=self.product, location=self.location, unit=self.box, unit_factor=4, quantity=5, unit_price_minor=100)

    def test_confirmation_reserves_stock_and_partial_shipments_reduce_it(self):
        response = self.client.post(f"/api/sales/orders/{self.order.id}/confirm/")
        self.assertEqual(response.status_code, 200, response.content)
        self.balance.refresh_from_db()
        self.assertEqual(self.balance.reserved, 20)

        response = self.client.post(f"/api/sales/orders/{self.order.id}/process/")
        self.assertEqual(response.status_code, 200, response.content)
        response = self.client.post(
            f"/api/sales/orders/{self.order.id}/ship/",
            {"lines": [{"line_id": self.order.lines.get().id, "quantity": "2"}]},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.balance.refresh_from_db()
        self.assertEqual(self.balance.on_hand, 32)
        self.assertEqual(self.balance.reserved, 12)
        self.order.refresh_from_db()
        self.assertEqual(self.order.fulfillment_status, SalesOrder.FulfillmentStatus.PARTIAL)

        response = self.client.post(f"/api/sales/orders/{self.order.id}/ship/")
        self.assertEqual(response.status_code, 200, response.content)
        self.balance.refresh_from_db()
        self.order.refresh_from_db()
        self.assertEqual(self.balance.on_hand, 20)
        self.assertEqual(self.balance.reserved, 0)
        self.assertEqual(self.order.status, SalesOrder.Status.COMPLETED)
