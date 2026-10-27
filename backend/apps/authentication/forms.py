from django.contrib.auth.forms import UserChangeForm as DjangoUserChangeForm
from django.contrib.auth.forms import UserCreationForm as DjangoUserCreationForm

from .models import User


class UserCreationForm(DjangoUserCreationForm):
    """Create a user with email as the login identifier."""

    class Meta(DjangoUserCreationForm.Meta):
        model = User
        fields = ("email",)


class UserChangeForm(DjangoUserChangeForm):
    """Edit a user without exposing the removed username field."""

    class Meta(DjangoUserChangeForm.Meta):
        model = User
        fields = ("email",)
