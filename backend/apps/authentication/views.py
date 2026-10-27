import binascii
import logging
from urllib.parse import urlencode

from django.conf import settings
from django.contrib.auth import get_user_model, login, logout
from django.contrib.auth.forms import PasswordResetForm, SetPasswordForm
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.middleware.csrf import get_token
from django.shortcuts import get_object_or_404
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .models import Membership
from .serializers import (
    LoginSerializer,
    MembershipSerializer,
    RegistrationSerializer,
    TenantSelectionSerializer,
    UserSerializer,
)

logger = logging.getLogger(__name__)
User = get_user_model()


def active_memberships_for(user):
    """Helper function to fetch ordered user memberships."""
    return (
        Membership.objects.filter(
            user=user,
            status=Membership.Status.ACTIVE,
            tenant__is_active=True,
        )
        .select_related("user", "tenant")
        .order_by("tenant__name", "tenant_id")
    )


@api_view(["GET"])
@permission_classes([AllowAny])
@ensure_csrf_cookie
def csrf_token_view(request):
    """Provides a CSRF cookie and returns token to the frontend."""
    return Response({"csrfToken": get_token(request)})


@api_view(["POST"])
@permission_classes([AllowAny])
@csrf_protect
def register_view(request):
    """Create a user account; workspace membership is assigned separately."""
    serializer = RegistrationSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = serializer.save()
    return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


@api_view(["POST"])
@permission_classes([AllowAny])
@csrf_protect
def login_view(request):
    """Logs a user in using DRF serializer tracking."""
    serializer = LoginSerializer(data=request.data, context={"request": request})
    serializer.is_valid(raise_exception=True)
    user = serializer.validated_data["user"]
    login(request, user)
    request.session.pop("active_tenant_id", None)

    return Response(
        {
            "user": UserSerializer(user).data,
            "memberships": MembershipSerializer(
                active_memberships_for(user), many=True
            ).data,
        }
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """Logs the authenticated user out."""
    logout(request)
    return Response({"detail": "Logged out successfully."})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def current_user_view(request):
    """Retrieves current user info alongside active tenant profiles."""
    return Response(
        {
            "user": UserSerializer(request.user).data,
            "memberships": MembershipSerializer(
                active_memberships_for(request.user), many=True
            ).data,
        }
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def memberships_view(request):
    """Lists current user's membership relations."""
    memberships = active_memberships_for(request.user)
    return Response(MembershipSerializer(memberships, many=True).data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def select_tenant_view(request):
    """Select one active tenant that belongs to the signed-in user."""
    serializer = TenantSelectionSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    membership = get_object_or_404(
        active_memberships_for(request.user),
        tenant_id=serializer.validated_data["tenant_id"],
    )
    request.session["active_tenant_id"] = membership.tenant_id
    return Response(MembershipSerializer(membership).data)


@api_view(["POST"])
@permission_classes([AllowAny])
@csrf_protect
def password_reset_request_view(request):
    """Triggers outbound secure email tokens for password updates safely."""
    email = request.data.get("email", "") if isinstance(request.data, dict) else ""
    form = PasswordResetForm(data={"email": email})

    if form.is_valid():
        for user in form.get_users(form.cleaned_data["email"]):
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            reset_url = (
                f"{settings.FRONTEND_BASE_URL.rstrip('/')}/reset-password?"
                f"{urlencode({'uid': uid, 'token': token})}"
            )
            message = (
                "We received a request to reset your password. Use this link to choose a new one:\n\n"
                f"{reset_url}\n\n"
                "If you did not request this, you can ignore this email."
            )
            try:
                send_mail(
                    subject="Reset your password",
                    message=message,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[user.email],
                    fail_silently=False,
                )
            except Exception:
                logger.exception("Password reset email delivery failed.")

    # Always return 200 for user safety to avoid user enumeration vulnerability
    return Response(
        {"detail": "If an account with that email exists, a reset link will be sent."}
    )


@api_view(["POST"])
@permission_classes([AllowAny])
def password_reset_confirm_view(request):
    """Processes newly submitted credential overrides using signed cryptographic tokens."""
    uidb64 = request.data.get("uid")
    token = request.data.get("token")
    new_password = request.data.get("new_password")
    password_confirmation = request.data.get("new_password_confirm")

    # Compact structural state validation strings check
    if not all(
        isinstance(v, str) and v
        for v in (uidb64, token, new_password, password_confirmation)
    ):
        return Response(
            {"detail": "The parameters provided are invalid or incomplete."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        user_id = force_str(urlsafe_base64_decode(uidb64))
        user = User.objects.get(pk=user_id, is_active=True)
    except (binascii.Error, TypeError, ValueError, UnicodeDecodeError, User.DoesNotExist):
        return Response(
            {"detail": "The reset link is invalid or expired."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not default_token_generator.check_token(user, token):
        return Response(
            {"detail": "The reset link is invalid or expired."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    form = SetPasswordForm(
        user,
        data={"new_password1": new_password, "new_password2": password_confirmation},
    )
    if not form.is_valid():
        return Response(form.errors, status=status.HTTP_400_BAD_REQUEST)

    form.save()
    return Response({"detail": "Password has been reset successfully."})

