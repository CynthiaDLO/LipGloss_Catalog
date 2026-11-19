from decimal import Decimal
from uuid import uuid4
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient
from .models import Brand, Lipgloss, Order

User = get_user_model()


class Phase5Tests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_superuser(username="phase5admin", password="SafePass123!")
        self.customer = User.objects.create_user(username="phase5buyer", password="SafePass123!")
        self.brand = Brand.objects.create(name="Phase5Brand")
        self.product = Lipgloss.objects.create(brand=self.brand, name="Sample Gloss", shade="Pink", price=Decimal("100.00"), stock=3)

    def auth(self, user):
        token, _ = Token.objects.get_or_create(user=user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")

    def test_admin_permissions_and_user_lock(self):
        self.auth(self.customer)
        self.assertEqual(self.client.get("/api/admin/dashboard/").status_code, 403)
        self.assertEqual(self.client.get("/api/admin/users/").status_code, 403)
        self.auth(self.admin)
        self.assertEqual(self.client.get("/api/admin/dashboard/").status_code, 200)
        self.assertEqual(self.client.get("/api/admin/users/").status_code, 200)
        self.assertEqual(self.client.patch(f"/api/admin/users/{self.admin.id}/status/", {"is_active": False}, format="json").status_code, 403)
        self.assertEqual(self.client.patch(f"/api/admin/users/{self.customer.id}/status/", {"is_staff": True}, format="json").status_code, 400)
        self.assertEqual(self.client.patch(f"/api/admin/users/{self.customer.id}/status/", {"is_active": False}, format="json").status_code, 200)

    def test_stock_rejects_over_limit_and_decrements(self):
        self.auth(self.customer)
        response = self.client.post("/api/cart/items/", {"product_id": self.product.id, "quantity": 4}, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(self.client.post("/api/cart/items/", {"product_id": self.product.id, "quantity": 2}, format="json").status_code, 201)
        key = str(uuid4())
        response = self.client.post("/api/orders/checkout/", {"idempotency_key": key}, format="json")
        self.assertEqual(response.status_code, 201)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 1)
        self.assertEqual(self.client.post("/api/orders/checkout/", {"idempotency_key": key}, format="json").status_code, 200)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 1)
        self.assertEqual(Order.objects.count(), 1)

    def test_out_of_stock_existing_cart_checkout_fails(self):
        self.auth(self.customer)
        self.client.post("/api/cart/items/", {"product_id": self.product.id, "quantity": 3}, format="json")
        self.product.stock = 1
        self.product.save(update_fields=["stock"])
        self.assertEqual(self.client.post("/api/orders/checkout/", {"idempotency_key": str(uuid4())}, format="json").status_code, 400)
        self.assertEqual(Order.objects.count(), 0)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 1)
