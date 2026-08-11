import logging
from typing import List

from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from apps.restaurants.ai.utils import top_restaurant_ids, load_restaurant_ratings
from apps.restaurants.serializers import MenuItemSerializer, TopRestaurantSerializer


logger = logging.getLogger(__name__)

class RestaurantTopSuggestionsView(APIView):
    """
    Suggest top restaurants using easyserve-analyzer outputs (restaurant_ratings.csv).

    Query params:
    - n: number of suggestions to return (default 10, max 100)
    - include_scores: if truthy, also include avg_rating alongside each restaurant
    """

    def get(self, request):

        n_param = request.query_params.get("n", "3")
        # include_scores = request.query_params.get("include_scores")
        include_scores = True
        try:
            n = max(1, min(int(n_param), 100))
        except Exception as exc:
            logger.warning(exc)
            n = 10

        ids: List[int] = top_restaurant_ids(n)
        # Fetch active restaurants by those IDs
        qs = TopRestaurantSerializer.Meta.model.objects.filter(id__in=ids, is_active=True)

        # Preserve order by rating rank
        order_index = {rid: idx for idx, rid in enumerate(ids)}
        restaurants = sorted(list(qs), key=lambda r: order_index.get(r.id, 10**9))

        if not include_scores:
            data = TopRestaurantSerializer(restaurants, many=True).data
            return Response(data)

        # Attach scores
        rating_pairs = dict(load_restaurant_ratings())
        data = [
            {
                "restaurant": TopRestaurantSerializer(r).data,
                "avg_rating": round(float(rating_pairs.get(r.id, 0.0)), 3),
            }
            for r in restaurants
        ]
        return Response({"count": len(data), "results": data})


class RestaurantMenuSuggestionsView(APIView):
    """
    Suggest menu items for a given restaurant.

    For now, this returns available items of the restaurant ordered by price desc
    as a reasonable fallback, and can later incorporate easyserve-analyzer outputs.

    Path params:
    - restaurant_id: the target restaurant
    Query params:
    - n: number of items (default 10, max 50)
    """

    def get(self, request, restaurant_id: int):
        try:
            n = int(request.query_params.get("n", "10"))
        except Exception as exc:
            n = 10
            logger.warning(exc)
        n = max(1, min(n, 50))

        # Available items for menus belonging to the restaurant
        qs = (
            MenuItemSerializer.Meta.model.objects
            .filter(menu__restaurant_id=restaurant_id, is_available=True)
            .select_related("menu")
            .order_by("-price", "name")[:n]
        )
        data = MenuItemSerializer(qs, many=True).data
        return Response(data, status=status.HTTP_200_OK)
