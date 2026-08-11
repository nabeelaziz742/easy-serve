# from django.conf import settings
# from rest_framework.views import APIView
# from rest_framework.response import Response
# from allauth.socialaccount.models import SocialAccount
# from rest_framework_simplejwt.tokens import AccessToken
# from allauth.socialaccount.providers.google.views import GoogleOAuth2Adapter
# from allauth.socialaccount.providers.oauth2.client import OAuth2Client
#
#
# class GoogleLoginView(APIView):
#     def post(self, request):
#         adapter = GoogleOAuth2Adapter(client_id=settings.SOCIAL_AUTH_GOOGLE_CLIENT_ID,
#                                       client_secret=settings.SOCIAL_AUTH_GOOGLE_CLIENT_SECRET)
#         client = OAuth2Client(adapter)
#         token = request.data.get('access_token')
#         data = client.get_profile_info(token)
#         email = data.get('email')
#         if email is None:
#             return Response({'error': 'Email is required'}, status=400)
#         user = SocialAccount.objects.get(email=email).user
#         if user is None:
#             return Response({'error': 'User not found'}, status=404)
#         jwt_token = AccessToken.for_user(user)
#         return Response({'token': str(jwt_token)})
