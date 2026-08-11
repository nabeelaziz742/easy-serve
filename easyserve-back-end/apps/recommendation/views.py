from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import (
    IsAuthenticated,
    AllowAny
)

from rest_framework import status

from .services import (
    recommend_menu_item,
    get_content_based_recommendations
)

from apps.restaurants.models import (
    MenuItem
)

from apps.restaurants.serializers import (
    MenuItemSerializer
)


# ==================================================
# RECOMMEND SIMILAR MENU ITEMS
# ==================================================

class RecommendMenuItemAPIView(APIView):

    permission_classes = [AllowAny]

    def get(self, request, item_id):

        try:

            top_n = int(
                request.query_params.get(
                    "top_n",
                    5
                )
            )

        except ValueError:

            return Response(
                {
                    "error": "Invalid top_n value"
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        recommended_item_ids = recommend_menu_item(
            item_id=item_id,
            top_n=top_n
        )

        if not recommended_item_ids:

            return Response(
                [],
                status=status.HTTP_200_OK
            )

        menu_items = MenuItem.objects.filter(
            id__in=recommended_item_ids
        )

        serializer = MenuItemSerializer(
            menu_items,
            many=True
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK
        )


# ==================================================
# USER BASED RECOMMENDATION
# ==================================================

class RecommendUserBaseMenuItemAPIView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):

        try:

            top_n = int(
                request.query_params.get(
                    "top_n",
                    5
                )
            )

        except ValueError:

            return Response(
                {
                    "error": "Invalid top_n value"
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        recommended_item_ids = (
            get_content_based_recommendations(
                user_id=request.user.id,
                top_n=top_n
            )
        )

        if not recommended_item_ids:

            return Response(
                [],
                status=status.HTTP_200_OK
            )

        menu_items = MenuItem.objects.filter(
            id__in=recommended_item_ids
        ).distinct()

        # REMOVE DUPLICATE NAMES

        unique_items = []

        item_names = set()

        for item in menu_items:

            if item.name not in item_names:

                unique_items.append(item)

                item_names.add(item.name)

        serializer = MenuItemSerializer(
            unique_items,
            many=True
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK
        )

