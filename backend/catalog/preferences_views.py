"""User-scoped favorites and UI preferences endpoints."""
from rest_framework import serializers, status
from rest_framework.authentication import TokenAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from decimal import Decimal
from django.shortcuts import get_object_or_404
from .models import Favorite, Lipgloss, UserPreference
from .serializers import LipglossSerializer


class PreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserPreference
        fields = ('theme', 'page_size', 'language', 'font_scale')

    def validate_font_scale(self, value):
        if value not in (Decimal("0.90"), Decimal("1.00"), Decimal("1.15"), Decimal("1.30")):
            raise serializers.ValidationError("Selecciona un tamaño de letra permitido.")
        return value

    def validate_page_size(self, value):
        if not 1 <= value <= 30:
            raise serializers.ValidationError('Selecciona entre 1 y 30 productos por página.')
        return value


class UserPreferencesView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get_object(self, request):
        preference, _ = UserPreference.objects.get_or_create(
            user=request.user,
            defaults={
                "theme": "system",
                "page_size": 10,
                "language": "es",
                "font_scale": Decimal("1.00"),
            },
        )
        return preference

    def get(self, request):
        return Response(PreferenceSerializer(self.get_object(request)).data)

    def patch(self, request):
        serializer = PreferenceSerializer(self.get_object(request), data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class FavoritesView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        products = Lipgloss.objects.select_related('brand').filter(
            favorites__user=request.user, is_active=True
        ).order_by('-favorites__created_at')
        return Response(LipglossSerializer(products, many=True, context={'request': request}).data)

    def post(self, request):
        product_id = request.data.get('product_id')
        if isinstance(product_id, bool) or not str(product_id).isdigit() or int(product_id) < 1:
            return Response({'product_id': ['Selecciona un producto válido.']}, status=status.HTTP_400_BAD_REQUEST)
        product = get_object_or_404(Lipgloss, pk=int(product_id), is_active=True)
        _, created = Favorite.objects.get_or_create(user=request.user, lipgloss=product)
        return Response({'product_id': product.pk, 'is_favorite': True}, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class FavoriteDetailView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def delete(self, request, product_id):
        deleted, _ = Favorite.objects.filter(user=request.user, lipgloss_id=product_id).delete()
        if not deleted:
            return Response({'detail': 'El producto no estaba en favoritos.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(status=status.HTTP_204_NO_CONTENT)
