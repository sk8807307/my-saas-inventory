from django.contrib.auth import get_user_model
from django.contrib.auth.backends import ModelBackend

User = get_user_model()


class EmailAuthBackend(ModelBackend):
    """
    Custom authentication backend that authenticates users using their
    email address instead of a username.
    """

    def authenticate(self, request, username=None, password=None, **kwargs):
        # Fallback to check 'email' keyword argument if passed instead of username
        email = username or kwargs.get("email")
        if not email:
            return None

        try:
            # Query your user model using the exact casing logic from your UserManager
            user = User.objects.get(email__iexact=email.strip())
        except User.DoesNotExist:
            return None

        # Check if the password matches and the user is allowed to log in
        if user.check_password(password) and self.user_can_authenticate(user):
            return user
        return None
