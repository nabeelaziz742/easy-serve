from rest_framework import status
from rest_framework.response import Response

from apps.financial.permissions import HasFinancialAccess, get_request_restaurant
from apps.financial.services.financial_service import FinancialReportService
from apps.financial.services.reports_service import ReportsService
from apps.financial.services.export_service import ExportService
from apps.financial.views.financial_views import BaseFinancialAPIView


class ReportsDataView(BaseFinancialAPIView):
    """
    GET /api/manager/financial/reports/?type=pnl&period=this_month&start_date=...&end_date=...
    Returns authoritative, structured report data for manager preview and UI table rendering.
    Supports all 10 report types:
    - pnl (Financial / P&L)
    - sales (Sales & Order Ledger)
    - cogs (COGS / Food Cost)
    - products (Menu / Product Performance)
    - expenses (Expenses Ledger)
    - wastage (Stock Wastage)
    - inventory (Current Valuation & Stock Status)
    - movements (Stock Movement Ledger)
    - purchases (Purchase Orders & Supplier Spend)
    - reconciliation (Cash & Payment Reconciliation)
    """
    def get(self, request):
        restaurant, start_date, end_date, _, _, preset_name = self.get_restaurant_and_dates(request)
        if not restaurant:
            return Response(
                {"detail": "No restaurant association found for the authenticated account."},
                status=status.HTTP_400_BAD_REQUEST
            )

        report_type = request.query_params.get("type", "pnl").lower().strip()
        valid_types = {
            "pnl", "sales", "cogs", "products", "expenses",
            "wastage", "inventory", "movements", "purchases", "reconciliation"
        }

        if report_type not in valid_types:
            return Response(
                {"detail": f"Invalid report type '{report_type}'. Valid types: {', '.join(sorted(valid_types))}."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            data = ExportService.get_report_dataset(
                report_type=report_type,
                restaurant=restaurant,
                start_date=start_date,
                end_date=end_date
            )
            # Attach metadata
            data["metadata"] = {
                "restaurant_name": restaurant.name,
                "restaurant_id": restaurant.id,
                "currency": "PKR",
                "generated_at": FinancialReportService.get_local_now().strftime("%Y-%m-%d %H:%M:%S"),
            }
            return Response(data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {"detail": f"Error generating report data: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ReportExportExcelView(BaseFinancialAPIView):
    """
    GET /api/manager/financial/reports/export-excel/?type=sales&period=last_30_days
    Streams a professionally styled openpyxl Excel spreadsheet (.xlsx).
    """
    def get(self, request):
        restaurant, start_date, end_date, _, _, _ = self.get_restaurant_and_dates(request)
        if not restaurant:
            return Response(
                {"detail": "No restaurant association found for the authenticated account."},
                status=status.HTTP_400_BAD_REQUEST
            )

        report_type = request.query_params.get("type", "pnl").lower().strip()
        valid_types = {
            "pnl", "sales", "cogs", "products", "expenses",
            "wastage", "inventory", "movements", "purchases", "reconciliation"
        }

        if report_type not in valid_types:
            return Response(
                {"detail": f"Invalid report type '{report_type}'."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            return ExportService.generate_excel(
                report_type=report_type,
                restaurant=restaurant,
                start_date=start_date,
                end_date=end_date
            )
        except Exception as e:
            return Response(
                {"detail": f"Error exporting Excel report: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ReportExportPdfView(BaseFinancialAPIView):
    """
    GET /api/manager/financial/reports/export-pdf/?type=pnl&period=this_month
    Streams a professional, branded, print-ready PDF document (.pdf).
    """
    def get(self, request):
        restaurant, start_date, end_date, _, _, _ = self.get_restaurant_and_dates(request)
        if not restaurant:
            return Response(
                {"detail": "No restaurant association found for the authenticated account."},
                status=status.HTTP_400_BAD_REQUEST
            )

        report_type = request.query_params.get("type", "pnl").lower().strip()
        valid_types = {
            "pnl", "sales", "cogs", "products", "expenses",
            "wastage", "inventory", "movements", "purchases", "reconciliation"
        }

        if report_type not in valid_types:
            return Response(
                {"detail": f"Invalid report type '{report_type}'."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            return ExportService.generate_pdf(
                report_type=report_type,
                restaurant=restaurant,
                start_date=start_date,
                end_date=end_date
            )
        except Exception as e:
            return Response(
                {"detail": f"Error exporting PDF report: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
