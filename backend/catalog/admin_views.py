from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Sum
from django.shortcuts import get_object_or_404
from rest_framework import serializers, status
from rest_framework.authentication import TokenAuthentication
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Brand, Lipgloss, Order

User = get_user_model()


class AdminUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "email", "first_name", "last_name", "is_active", "is_staff", "date_joined"]
        read_only_fields = fields


class UserStatusSerializer(serializers.Serializer):
    is_active = serializers.BooleanField()

    def validate(self, attrs):
        if set(self.initial_data.keys()) != {"is_active"}:
            raise serializers.ValidationError({"detail": "Solo se permite modificar el estado de la cuenta."})
        return attrs


class AdminDashboardView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAdminUser]

    def get(self, request):
        return Response({
            "brands": Brand.objects.count(),
            "products": Lipgloss.objects.count(),
            "active_products": Lipgloss.objects.filter(is_active=True).count(),
            "low_stock_products": Lipgloss.objects.filter(stock__isnull=False, stock__lte=5).count(),
            "users": User.objects.count(),
            "orders": Order.objects.count(),
            "pending_orders": Order.objects.filter(status=Order.Status.PLACED).count(),
            "sales_total": str(Order.objects.exclude(status=Order.Status.CANCELLED).aggregate(total=Sum("total"))["total"] or 0),
        })


class AdminUserListView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAdminUser]

    def get(self, request):
        users = User.objects.order_by("id")[:200]
        return Response(AdminUserSerializer(users, many=True).data)


class AdminUserStatusView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAdminUser]

    @transaction.atomic
    def patch(self, request, user_id):
        serializer = UserStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        target = get_object_or_404(User.objects.select_for_update(), pk=user_id)
        if target.pk == request.user.pk or target.is_staff or target.is_superuser:
            return Response({"detail": "No puedes cambiar el estado de esta cuenta administrativa."}, status=status.HTTP_403_FORBIDDEN)
        target.is_active = serializer.validated_data["is_active"]
        target.save(update_fields=["is_active"])
        if not target.is_active:
            # Revoke existing tokens immediately.
            from rest_framework.authtoken.models import Token
            Token.objects.filter(user=target).delete()
        return Response(AdminUserSerializer(target).data)
