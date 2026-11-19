from django.contrib.auth import get_user_model
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase
from .models import UserPreference

class AppearanceSettingsTests(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(username="appearance_user",password="TestPassword123!")
        token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")

    def test_preferences_update_and_persist(self):
        response=self.client.patch("/api/settings/",{"theme":"dark","language":"en","font_scale":"1.15"},format="json")
        self.assertEqual(response.status_code,200,response.data)
        prefs=UserPreference.objects.get(user=self.user)
        self.assertEqual(prefs.theme,"dark")
        self.assertEqual(prefs.language,"en")
        self.assertEqual(str(prefs.font_scale),"1.15")

    def test_invalid_language_rejected(self):
        response=self.client.patch("/api/settings/",{"language":"unsupported"},format="json")
        self.assertEqual(response.status_code,400)

    def test_invalid_font_scale_rejected(self):
        response=self.client.patch("/api/settings/",{"font_scale":"3.00"},format="json")
        self.assertEqual(response.status_code,400)
