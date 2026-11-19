
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.authentication import TokenAuthentication
from rest_framework.decorators import (
    api_view,
    authentication_classes,
    permission_classes
)
from rest_framework.permissions import (
    AllowAny,
    IsAuthenticated
)
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from .serializers import (
    RegisterSerializer,
    ProfileSerializer,
    BrandSerializer, 
    LipglossSerializer
)

from decimal import Decimal, InvalidOperation
from rest_framework import filters, viewsets
from rest_framework.exceptions import ValidationError
from django.db.models.deletion import ProtectedError


from rest_framework.parsers import (
    JSONParser,
    MultiPartParser,
    FormParser
)

from .models import Brand, Lipgloss
from .permissions import IsAdminOrReadOnly
from .pagination import CatalogPagination


class RegisterView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "login"

    def post(self, request):
        serializer = RegisterSerializer(
            data=request.data
        )

        if serializer.is_valid():
            user = serializer.save()

            return Response({
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "message": "Usuario registrado correctamente."
            }, status=status.HTTP_201_CREATED)

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )

class CustomAuthToken(ObtainAuthToken):
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "login"

    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(
            data=request.data,
            context={"request": request}
        )

        serializer.is_valid(raise_exception=True)

        user = serializer.validated_data["user"]

        token, created = Token.objects.get_or_create(
            user=user
        )

        return Response({
            "token": token.key,
            "user_id": user.pk,
            "email": user.email,
            "message": "Inicio de sesión exitoso."
        }, status=status.HTTP_200_OK)

@api_view(["GET", "PATCH"])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def me(request):
    user = request.user

    if request.method == "GET":
        serializer = ProfileSerializer(user)

        return Response(
            serializer.data,
            status=status.HTTP_200_OK
        )

    serializer = ProfileSerializer(
        user,
        data=request.data,
        partial=True
    )

    if serializer.is_valid():
        serializer.save()

        return Response(
            serializer.data,
            status=status.HTTP_200_OK
        )

    return Response(
        serializer.errors,
        status=status.HTTP_400_BAD_REQUEST
    )

class LogoutView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        request.auth.delete()

        return Response({
            "message": "Sesión cerrada correctamente."
        }, status=status.HTTP_200_OK)

class ResetTokenView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        # Revoke the previous token and issue a replacement atomically.
        from django.db import transaction
        with transaction.atomic():
            Token.objects.filter(user=request.user).delete()
            token = Token.objects.create(user=request.user)

        return Response({
            "token": token.key,
            "message": "Token regenerado correctamente."
        }, status=status.HTTP_200_OK)
        
        
class BrandViewSet(viewsets.ModelViewSet):
    queryset = Brand.objects.all().order_by("name")
    serializer_class = BrandSerializer

    authentication_classes = [TokenAuthentication]
    permission_classes = [
        IsAuthenticated,
        IsAdminOrReadOnly
    ]

    filter_backends = [
        filters.SearchFilter,
        filters.OrderingFilter
    ]

    search_fields = ["name"]
    ordering_fields = ["name"]
    ordering = ["name"]

    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response({"detail": "No se puede eliminar una marca con productos asociados."}, status=status.HTTP_409_CONFLICT)


class LipglossViewSet(viewsets.ModelViewSet):
    pagination_class = CatalogPagination
    serializer_class = LipglossSerializer

    authentication_classes = [TokenAuthentication]
    permission_classes = [
        IsAuthenticated,
        IsAdminOrReadOnly
    ]

    parser_classes = [
        JSONParser,
        MultiPartParser,
        FormParser
    ]

    filter_backends = [
        filters.SearchFilter,
        filters.OrderingFilter
    ]

    search_fields = [
        "name",
        "shade",
        "brand__name"
    ]

    ordering_fields = [
        "name",
        "price",
        "created_at"
    ]

    ordering = ["name"]

    def get_queryset(self):
        queryset = Lipgloss.objects.select_related(
            "brand"
        ).all()

        if not self.request.user.is_staff:
            queryset = queryset.filter(is_active=True)

        brand_id = self.request.query_params.get("brand")
        min_price = self.request.query_params.get("min_price")
        max_price = self.request.query_params.get("max_price")

        if brand_id is not None:
            if not brand_id.isdigit() or int(brand_id) < 1:
                raise ValidationError({
                    "brand": "La marca seleccionada no es válida."
                })

            queryset = queryset.filter(
                brand_id=int(brand_id)
            )

        def parse_price(value, field):
            if value is None:
                return None

            try:
                number = Decimal(value)
            except InvalidOperation:
                raise ValidationError({
                    field: "Ingresa un precio válido."
                })

            if not number.is_finite() or number < 0:
                raise ValidationError({
                    field: "El precio no puede ser negativo."
                })

            return number

        minimum = parse_price(min_price, "min_price")
        maximum = parse_price(max_price, "max_price")

        if (
            minimum is not None
            and maximum is not None
            and minimum > maximum
        ):
            raise ValidationError({
                "price": "El precio mínimo no puede superar al máximo."
            })

        if minimum is not None:
            queryset = queryset.filter(price__gte=minimum)

        if maximum is not None:
            queryset = queryset.filter(price__lte=maximum)

        return queryset
