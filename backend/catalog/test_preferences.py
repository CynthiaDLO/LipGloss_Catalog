"""API tests for favorites, user-scoped settings, and pagination."""
from django.contrib.auth import get_user_model
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase
from .models import Brand, Lipgloss, Favorite


class DiscoveryTests(APITestCase):
    def setUp(self):
        user_model = get_user_model()
        self.user = user_model.objects.create_user(username='shopper1', password='strong-test-pass-11')
        self.other = user_model.objects.create_user(username='shopper2', password='strong-test-pass-22')
        self.brand = Brand.objects.create(name='Test Brand')
        self.product = Lipgloss.objects.create(brand=self.brand, name='Shine', shade='Pink', price='99.50')
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {Token.objects.create(user=self.user).key}')

    def test_favorites_private(self):
        response = self.client.post('/api/favorites/', {'product_id': self.product.pk}, format='json')
        self.assertEqual(response.status_code, 201)
        self.assertEqual(self.client.get('/api/favorites/').status_code, 200)
        self.assertEqual(len(self.client.get('/api/favorites/').data), 1)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {Token.objects.create(user=self.other).key}')
        self.assertEqual(len(self.client.get('/api/favorites/').data), 0)

    def test_duplicate_favorite_idempotent(self):
        self.client.post('/api/favorites/', {'product_id': self.product.pk}, format='json')
        self.assertEqual(self.client.post('/api/favorites/', {'product_id': self.product.pk}, format='json').status_code, 200)
        self.assertEqual(Favorite.objects.count(), 1)

    def test_invalid_favorite(self):
        self.assertEqual(self.client.post('/api/favorites/', {'product_id': 'none'}, format='json').status_code, 400)

    def test_settings_validation(self):
        self.assertEqual(self.client.get('/api/settings/').status_code, 200)
        self.assertEqual(self.client.patch('/api/settings/', {'page_size': 31}, format='json').status_code, 400)
        response = self.client.patch('/api/settings/', {'page_size': 15}, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['page_size'], 15)

    def test_catalog_pagination(self):
        response = self.client.get('/api/lipglosses/?page=1&page_size=1')
        self.assertEqual(response.status_code, 200)
        self.assertIn('results', response.data)
        self.assertEqual(len(response.data['results']), 1)

    def test_unauthenticated_favorites(self):
        self.client.credentials()
        self.assertEqual(self.client.get('/api/favorites/').status_code, 401)
