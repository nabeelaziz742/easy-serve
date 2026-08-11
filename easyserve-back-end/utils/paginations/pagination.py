from rest_framework.pagination import LimitOffsetPagination


class OurLimitOffsetPagination(LimitOffsetPagination):
    default_limit = 100
    limit_query_param = 'limit'
    offset_query_param = 'offset'
    max_limit = 100

class LimitOffsetOf10Pagination(LimitOffsetPagination):
    default_limit = 10
    limit_query_param = 'limit'
    offset_query_param = 'offset'
    max_limit = 100
    
class NotificationOurLimitOffsetPagination(LimitOffsetPagination):
    default_limit = 20
    limit_query_param = 'limit'
    offset_query_param = 'offset'
    max_limit = 30