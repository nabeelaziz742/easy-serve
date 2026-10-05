from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied

from apps.recipes.permissions import HasRecipesAccess
from apps.recipes.services import RecipeService


class RecipeSummaryAPIView(APIView):
    permission_classes = [HasRecipesAccess]

    def get(self, request):
        explicit_id = request.query_params.get('restaurant_id')
        restaurant = RecipeService.resolve_user_restaurant(request.user, explicit_id)
        if not restaurant:
            raise PermissionDenied("You do not have an active restaurant assigned.")

        summary_data = RecipeService.get_recipe_summary(restaurant)
        return Response(summary_data)
