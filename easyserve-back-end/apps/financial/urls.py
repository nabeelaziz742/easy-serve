from django.urls import path
from apps.financial.views import (
    FinancialOverviewView,
    FinancialTrendsView,
    FinancialRevenueBreakdownView,
    FinancialExpenseBreakdownView,
    FinancialWastageBreakdownView,
    FinancialProductPerformanceView,
    FinancialReconciliationView,
    CommandCenterView,
    ReportsDataView,
    ReportExportExcelView,
    ReportExportPdfView,
)

app_name = "financial"

urlpatterns = [
    path("overview/", FinancialOverviewView.as_view(), name="overview"),
    path("command-center/", CommandCenterView.as_view(), name="command-center"),
    path("trends/", FinancialTrendsView.as_view(), name="trends"),
    path("revenue-breakdown/", FinancialRevenueBreakdownView.as_view(), name="revenue-breakdown"),
    path("expense-breakdown/", FinancialExpenseBreakdownView.as_view(), name="expense-breakdown"),
    path("wastage-breakdown/", FinancialWastageBreakdownView.as_view(), name="wastage-breakdown"),
    path("product-performance/", FinancialProductPerformanceView.as_view(), name="product-performance"),
    path("reconciliation/", FinancialReconciliationView.as_view(), name="reconciliation"),
    # Phase 8: Reports & Export Foundation
    path("reports/", ReportsDataView.as_view(), name="reports-data"),
    path("reports/export-excel/", ReportExportExcelView.as_view(), name="reports-export-excel"),
    path("reports/export-pdf/", ReportExportPdfView.as_view(), name="reports-export-pdf"),
]


