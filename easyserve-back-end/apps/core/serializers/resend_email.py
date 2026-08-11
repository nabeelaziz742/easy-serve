from rest_framework import serializers


class ResendEmailSerializer(serializers.Serializer):
    email = serializers.EmailField()
