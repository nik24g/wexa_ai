from drf_spectacular.utils import OpenApiResponse, extend_schema, inline_serializer
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from .serializers import SignupSerializer, UserSerializer, tokens_for_user


class SignupView(APIView):
    """Create an organization and its owner user, returning JWT tokens."""

    permission_classes = [AllowAny]

    @extend_schema(
        request=SignupSerializer,
        responses={
            201: inline_serializer(
                name="SignupResponse",
                fields={
                    "access": serializers.CharField(),
                    "refresh": serializers.CharField(),
                    "user": UserSerializer(),
                },
            )
        },
        summary="Sign up (creates org + user)",
        tags=["Auth"],
    )
    def post(self, request):
        serializer = SignupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        tokens = tokens_for_user(user)
        return Response(
            {**tokens, "user": UserSerializer(user).data},
            status=status.HTTP_201_CREATED,
        )


class EmailTokenObtainSerializer(serializers.Serializer):
    """Login serializer that authenticates by email + password."""

    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class LoginView(TokenObtainPairView):
    """Authenticate with email + password and return JWT tokens + user."""

    permission_classes = [AllowAny]

    @extend_schema(
        request=EmailTokenObtainSerializer,
        responses={
            200: inline_serializer(
                name="LoginResponse",
                fields={
                    "access": serializers.CharField(),
                    "refresh": serializers.CharField(),
                    "user": UserSerializer(),
                },
            )
        },
        summary="Log in",
        tags=["Auth"],
    )
    def post(self, request, *args, **kwargs):
        from django.contrib.auth import authenticate

        email = request.data.get("email", "").lower()
        password = request.data.get("password", "")
        user = authenticate(request, username=email, password=password)
        if user is None:
            return Response(
                {"detail": "Invalid email or password."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        tokens = tokens_for_user(user)
        return Response({**tokens, "user": UserSerializer(user).data})


class MeView(APIView):
    """Return the currently authenticated user and their organization."""

    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={200: UserSerializer}, summary="Current user", tags=["Auth"]
    )
    def get(self, request):
        return Response(UserSerializer(request.user).data)
