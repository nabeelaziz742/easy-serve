from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response

from apps.financial.permissions import HasFinancialAccess, get_request_restaurant
from apps.financial.services.financial_service import FinancialReportService


class BaseFinancialAPIView(APIView):
    permission_classes = [HasFinancialAccess]

    def get_restaurant_and_dates(self, request):
        restaurant = get_request_restaurant(request)
        if not restaurant:
            return None, None, None, None, None, None

        preset = request.query_params.get("period") or request.query_params.get("preset")
        start_param = request.query_params.get("start_date") or request.query_params.get("start")
        end_param = request.query_params.get("end_date") or request.query_params.get("end")

        start_date, end_date, prev_start, prev_end, preset_name = FinancialReportService.resolve_period_dates(
            preset=preset,
            start_date=start_param,
            end_date=end_param
        )

        return restaurant, start_date, end_date, prev_start, prev_end, preset_name


class FinancialOverviewView(BaseFinancialAPIView):
    """
    GET /api/manager/financial/overview/
    Returns authoritative executive P&L metrics, gross profit, net operating result, and margins.
    """
    def get(self, request):
        restaurant, start_date, end_date, prev_start, prev_end, preset_name = self.get_restaurant_and_dates(request)
        if not restaurant:
            return Response(
                {"detail": "No restaurant association found for the authenticated account."},
                status=status.HTTP_400_BAD_REQUEST
            )

        data = FinancialReportService.calculate_overview(
            restaurant=restaurant,
            start_date=start_date,
            end_date=end_date,
            prev_start_date=prev_start,
            prev_end_date=prev_end,
            preset_name=preset_name
        )
        return Response(data, status=status.HTTP_200_OK)


class FinancialTrendsView(BaseFinancialAPIView):
    """
    GET /api/manager/financial/trends/
    Returns daily time-series financial trend data (Sales, COGS, Expenses, Wastage, Profit).
    """
    def get(self, request):
        restaurant, start_date, end_date, _, _, _ = self.get_restaurant_and_dates(request)
        if not restaurant:
            return Response(
                {"detail": "No restaurant association found for the authenticated account."},
                status=status.HTTP_400_BAD_REQUEST
            )

        data = FinancialReportService.calculate_trends(
            restaurant=restaurant,
            start_date=start_date,
            end_date=end_date
        )
        return Response(data, status=status.HTTP_200_OK)


class FinancialRevenueBreakdownView(BaseFinancialAPIView):
    """
    GET /api/manager/financial/revenue-breakdown/
    Returns revenue distribution by payment method and order type.
    """
    def get(self, request):
        restaurant, start_date, end_date, _, _, _ = self.get_restaurant_and_dates(request)
        if not restaurant:
            return Response(
                {"detail": "No restaurant association found for the authenticated account."},
                status=status.HTTP_400_BAD_REQUEST
            )

        data = FinancialReportService.calculate_revenue_breakdown(
            restaurant=restaurant,
            start_date=start_date,
            end_date=end_date
        )
        return Response(data, status=status.HTTP_200_OK)


class FinancialExpenseBreakdownView(BaseFinancialAPIView):
    """
    GET /api/manager/financial/expense-breakdown/
    Returns active operating expense breakdown by category.
    """
    def get(self, request):
        restaurant, start_date, end_date, _, _, _ = self.get_restaurant_and_dates(request)
        if not restaurant:
            return Response(
                {"detail": "No restaurant association found for the authenticated account."},
                status=status.HTTP_400_BAD_REQUEST
            )

        data = FinancialReportService.calculate_expense_breakdown(
            restaurant=restaurant,
            start_date=start_date,
            end_date=end_date
        )
        return Response(data, status=status.HTTP_200_OK)


class FinancialWastageBreakdownView(BaseFinancialAPIView):
    """
    GET /api/manager/financial/wastage-breakdown/
    Returns operational stock wastage distribution by reason and top lost items.
    """
    def get(self, request):
        restaurant, start_date, end_date, _, _, _ = self.get_restaurant_and_dates(request)
        if not restaurant:
            return Response(
                {"detail": "No restaurant association found for the authenticated account."},
                status=status.HTTP_400_BAD_REQUEST
            )

        data = FinancialReportService.calculate_wastage_breakdown(
            restaurant=restaurant,
            start_date=start_date,
            end_date=end_date
        )
        return Response(data, status=status.HTTP_200_OK)


class FinancialProductPerformanceView(BaseFinancialAPIView):
    """
    GET /api/manager/financial/product-performance/
    Returns menu item profitability, units sold, revenue, COGS, food cost %, and margins.
    """
    def get(self, request):
        restaurant, start_date, end_date, _, _, _ = self.get_restaurant_and_dates(request)
        if not restaurant:
            return Response(
                {"detail": "No restaurant association found for the authenticated account."},
                status=status.HTTP_400_BAD_REQUEST
            )

        sort_by = request.query_params.get("sort_by", "revenue")
        try:
            limit = int(request.query_params.get("limit", 50))
        except (ValueError, TypeError):
            limit = 50

        data = FinancialReportService.calculate_product_performance(
            restaurant=restaurant,
            start_date=start_date,
            end_date=end_date,
            sort_by=sort_by,
            limit=limit
        )
        return Response(data, status=status.HTTP_200_OK)


class FinancialReconciliationView(BaseFinancialAPIView):
    """
    GET /api/manager/financial/reconciliation/
    Performs full cross-ledger audit reconciliation.
    """
    def get(self, request):
        restaurant, start_date, end_date, _, _, _ = self.get_restaurant_and_dates(request)
        if not restaurant:
            return Response(
                {"detail": "No restaurant association found for the authenticated account."},
                status=status.HTTP_400_BAD_REQUEST
            )

        data = FinancialReportService.calculate_reconciliation(
            restaurant=restaurant,
            start_date=start_date,
            end_date=end_date
        )
        return Response(data, status=status.HTTP_200_OK)


class CommandCenterView(BaseFinancialAPIView):
    """
    GET /api/manager/financial/command-center/
    Aggregates full executive command center data: live financial KPIs, order pipeline,
    staff telemetry, attention alerts, inventory warnings, recent purchases, recent expenses,
    top selling items, recent activity feed, and performance trends.
    """
    def get(self, request):
        restaurant = get_request_restaurant(request)
        if not restaurant:
            return Response(
                {"detail": "No restaurant association found for the authenticated account."},
                status=status.HTTP_400_BAD_REQUEST
            )

        preset = request.query_params.get("period") or request.query_params.get("preset")
        start_param = request.query_params.get("start_date") or request.query_params.get("start")
        end_param = request.query_params.get("end_date") or request.query_params.get("end")

        from apps.financial.services.command_center_service import CommandCenterService

        data = CommandCenterService.get_command_center_data(
            restaurant=restaurant,
            preset=preset,
            start_date=start_param,
            end_date=end_param
        )
        return Response(data, status=status.HTTP_200_OK)

