from rest_framework import serializers


class ForgetPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
