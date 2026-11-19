from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from decimal import Decimal
from django.db import IntegrityError, transaction
from PIL import Image, UnidentifiedImageError
from .models import Brand, Lipgloss

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(required=True)

    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password]
    )

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "password"
        ]
        read_only_fields = ["id"]

    def validate_email(self, value):
        email = value.strip().lower()

        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError(
                "Este correo electrónico ya está registrado."
            )

        return email

    def validate_username(self, value):
        username = value.strip()

        if len(username) < 3:
            raise serializers.ValidationError(
                "El usuario debe tener al menos 3 caracteres."
            )

        if User.objects.filter(username__iexact=username).exists():
            raise serializers.ValidationError(
                "Este nombre de usuario ya existe."
            )

        return username

    def create(self, validated_data):
        try:
            with transaction.atomic():
                return User.objects.create_user(**validated_data)
        except IntegrityError:
            raise serializers.ValidationError({
                "username": "Este nombre de usuario ya está registrado."
            })


class ProfileSerializer(serializers.ModelSerializer):

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "is_staff"
        ]

        read_only_fields = [
            "id",
            "is_staff"
        ]

    def validate_email(self, value):
        email = value.strip().lower()

        users = User.objects.filter(email__iexact=email)

        if self.instance:
            users = users.exclude(pk=self.instance.pk)

        if users.exists():
            raise serializers.ValidationError(
                "Este correo electrónico ya está registrado."
            )

        return email

    def validate_username(self, value):
        username = value.strip()

        if len(username) < 3:
            raise serializers.ValidationError(
                "El usuario debe tener al menos 3 caracteres."
            )

        users = User.objects.filter(
            username__iexact=username
        )

        if self.instance:
            users = users.exclude(pk=self.instance.pk)

        if users.exists():
            raise serializers.ValidationError(
                "Este nombre de usuario ya existe."
            )

        return username
    
    
class BrandSerializer(serializers.ModelSerializer):
    class Meta:
        model = Brand
        fields = [
            "id",
            "name",
            "description"
        ]
        read_only_fields = ["id"]

    def validate_name(self, value):
        name = value.strip()

        if len(name) < 2:
            raise serializers.ValidationError(
                "La marca debe tener al menos 2 caracteres."
            )

        brands = Brand.objects.filter(
            name__iexact=name
        )

        if self.instance:
            brands = brands.exclude(
                pk=self.instance.pk
            )

        if brands.exists():
            raise serializers.ValidationError(
                "Esta marca ya está registrada."
            )

        return name


class LipglossSerializer(serializers.ModelSerializer):
    brand = BrandSerializer(read_only=True)

    brand_id = serializers.PrimaryKeyRelatedField(
        queryset=Brand.objects.all(),
        source="brand",
        write_only=True
    )

    class Meta:
        model = Lipgloss
        fields = [
            "id",
            "brand",
            "brand_id",
            "name",
            "shade",
            "price",
            "description",
            "image",
            "is_active",
            "stock",
            "created_at"
        ]

        read_only_fields = [
            "id",
            "created_at"
        ]

    def validate_name(self, value):
        name = value.strip()

        if len(name) < 3:
            raise serializers.ValidationError(
                "El nombre debe tener al menos 3 caracteres."
            )

        return name

    def validate_shade(self, value):
        shade = value.strip()

        if len(shade) < 2:
            raise serializers.ValidationError(
                "El tono debe tener al menos 2 caracteres."
            )

        return shade

    def validate_price(self, value):
        if value < Decimal("0.01"):
            raise serializers.ValidationError(
                "El precio debe ser mayor que cero."
            )

        return value

    def validate_image(self, value):
        if value is None:
            return value

        max_size = 5 * 1024 * 1024

        if value.size > max_size:
            raise serializers.ValidationError(
                "La imagen no puede superar los 5 MB."
            )

        try:
            image = Image.open(value)
            image_format = image.format
            image.verify()
        except (
            UnidentifiedImageError,
            OSError,
            ValueError
        ):
            raise serializers.ValidationError(
                "El archivo no es una imagen válida."
            )
        finally:
            value.seek(0)

        if image_format not in ["JPEG", "PNG", "WEBP"]:
            raise serializers.ValidationError(
                "Solo se permiten imágenes JPG, PNG o WEBP."
            )

        return value

    def validate(self, data):
        brand = data.get(
            "brand",
            getattr(self.instance, "brand", None)
        )

        name = data.get(
            "name",
            getattr(self.instance, "name", None)
        )

        shade = data.get(
            "shade",
            getattr(self.instance, "shade", None)
        )

        if brand and name and shade:
            products = Lipgloss.objects.filter(
                brand=brand,
                name__iexact=name,
                shade__iexact=shade
            )

            if self.instance:
                products = products.exclude(
                    pk=self.instance.pk
                )

            if products.exists():
                raise serializers.ValidationError({
                    "non_field_errors": [
                        "Ya existe este producto con el mismo tono y marca."
                    ]
                })

        return data
