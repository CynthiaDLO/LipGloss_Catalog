from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from .models import Brand, Favorite, Lipgloss, UserPreference

User = get_user_model()


class CatalogApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="customer", email="customer@example.com", password="SafePass9856!"
        )
        self.admin = User.objects.create_superuser(
            username="manager", email="manager@example.com", password="SafePass9856!"
        )
        self.brand = Brand.objects.create(name="Sample Beauty")
        self.product = Lipgloss.objects.create(
            brand=self.brand, name="Gloss Shine", shade="Rose", price=Decimal("180.00")
        )

    def authenticate(self, user):
        token, _ = Token.objects.get_or_create(user=user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")

    def test_authentication_is_required(self):
        response = self.client.get("/api/lipglosses/")
        self.assertEqual(response.status_code, 401)

    def test_regular_user_can_read_but_cannot_create(self):
        self.authenticate(self.user)
        self.assertEqual(self.client.get("/api/lipglosses/").status_code, 200)
        response = self.client.post("/api/brands/", {"name": "Another"})
        self.assertEqual(response.status_code, 403)

    def test_admin_can_create_brand(self):
        self.authenticate(self.admin)
        response = self.client.post("/api/brands/", {"name": "Another"})
        self.assertEqual(response.status_code, 201)

    def test_invalid_price_is_rejected(self):
        self.authenticate(self.admin)
        response = self.client.post("/api/lipglosses/", {
            "brand_id": self.brand.pk, "name": "Extra Gloss", "shade": "Pink", "price": "-1"
        })
        self.assertEqual(response.status_code, 400)

    def test_duplicate_product_is_rejected(self):
        self.authenticate(self.admin)
        response = self.client.post("/api/lipglosses/", {
            "brand_id": self.brand.pk, "name": "gloss shine", "shade": "rose", "price": "20"
        })
        self.assertEqual(response.status_code, 400)

    def test_non_admin_cannot_promote_self(self):
        self.authenticate(self.user)
        response = self.client.patch("/api/auth/me/", {"is_staff": True}, format="json")
        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        self.assertFalse(self.user.is_staff)

    def test_invalid_filter_returns_400(self):
        self.authenticate(self.user)
        response = self.client.get("/api/lipglosses/?min_price=not-a-price")
        self.assertEqual(response.status_code, 400)

    def test_logout_invalidates_token(self):
        self.authenticate(self.user)
        self.assertEqual(self.client.post("/api/auth/logout/").status_code, 200)
        self.assertEqual(self.client.get("/api/auth/me/").status_code, 401)

    def test_existing_favorite_and_preference_models(self):
        Favorite.objects.create(user=self.user, lipgloss=self.product)
        UserPreference.objects.create(user=self.user, page_size=10)
        self.assertEqual(Favorite.objects.filter(user=self.user).count(), 1)
        self.assertEqual(self.user.preferences.page_size, 10)
