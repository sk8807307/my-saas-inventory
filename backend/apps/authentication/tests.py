from django.test import RequestFactory, TestCase
from django.utils import timezone

from .models import Membership, Tenant, User
from .serializers import LoginSerializer, MembershipSerializer, UserSerializer


class LoginSerializerTests(TestCase):
    def setUp(self):
        self.request = RequestFactory().post("/api/auth/login/")
        self.user = User.objects.create_user(
            email="owner@example.com",
            password="Strong-password-123",
            first_name="Ari",
            last_name="Owner",
        )

    def test_accepts_valid_email_and_password(self):
        serializer = LoginSerializer(
            data={"email": "OWNER@EXAMPLE.COM", "password": "Strong-password-123"},
            context={"request": self.request},
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(serializer.validated_data["user"], self.user)

    def test_rejects_invalid_credentials_with_generic_error(self):
        serializer = LoginSerializer(
            data={"email": "owner@example.com", "password": "wrong-password"},
            context={"request": self.request},
        )

        self.assertFalse(serializer.is_valid())
        self.assertEqual(
            serializer.errors["non_field_errors"][0],
            "Invalid email or password.",
        )

    def test_rejects_inactive_users(self):
        self.user.is_active = False
        self.user.save(update_fields=["is_active"])
        serializer = LoginSerializer(
            data={"email": "owner@example.com", "password": "Strong-password-123"},
            context={"request": self.request},
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("Invalid email or password.", serializer.errors["non_field_errors"])

    def test_password_is_not_in_serializer_output(self):
        serializer = LoginSerializer(
            data={"email": "owner@example.com", "password": "Strong-password-123"},
            context={"request": self.request},
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)

        self.assertNotIn("password", serializer.data)

    def test_requires_email_and_password(self):
        serializer = LoginSerializer(data={}, context={"request": self.request})

        self.assertFalse(serializer.is_valid())
        self.assertIn("email", serializer.errors)
        self.assertIn("password", serializer.errors)


class UserAndMembershipSerializerTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="member@example.com",
            password="Strong-password-123",
            first_name="Sam",
        )
        self.tenant = Tenant.objects.create(name="Northwind", slug="northwind")
        self.membership = Membership.objects.create(
            tenant=self.tenant,
            user=self.user,
            role=Membership.Role.OWNER,
            status=Membership.Status.ACTIVE,
            activated_at=timezone.now(),
        )

    def test_user_serializer_exposes_only_safe_profile_fields(self):
        data = UserSerializer(self.user).data

        self.assertEqual(data["email"], "member@example.com")
        self.assertNotIn("password", data)
        self.assertNotIn("is_superuser", data)
        self.assertNotIn("is_staff", data)

    def test_membership_serializer_includes_tenant_scoped_role_and_user(self):
        data = MembershipSerializer(self.membership).data

        self.assertEqual(data["tenant"]["slug"], "northwind")
        self.assertEqual(data["user"]["email"], "member@example.com")
        self.assertEqual(data["role"], Membership.Role.OWNER)
        self.assertEqual(data["status"], Membership.Status.ACTIVE)
        self.assertNotIn("password", data["user"])


