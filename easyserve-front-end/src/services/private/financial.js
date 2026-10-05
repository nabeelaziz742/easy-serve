import { privateAPi } from ".";

export const financialApi = privateAPi.injectEndpoints({
  endpoints: (builder) => ({
    getFinancialOverview: builder.query({
      query: (params) => ({
        url: "/manager/financial/overview/",
        method: "GET",
        params,
      }),
      providesTags: ["FinancialOverview"],
    }),

    getFinancialTrends: builder.query({
      query: (params) => ({
        url: "/manager/financial/trends/",
        method: "GET",
        params,
      }),
      providesTags: ["FinancialTrends"],
    }),

    getFinancialRevenueBreakdown: builder.query({
      query: (params) => ({
        url: "/manager/financial/revenue-breakdown/",
        method: "GET",
        params,
      }),
      providesTags: ["FinancialBreakdown"],
    }),

    getFinancialExpenseBreakdown: builder.query({
      query: (params) => ({
        url: "/manager/financial/expense-breakdown/",
        method: "GET",
        params,
      }),
      providesTags: ["FinancialBreakdown"],
    }),

    getFinancialWastageBreakdown: builder.query({
      query: (params) => ({
        url: "/manager/financial/wastage-breakdown/",
        method: "GET",
        params,
      }),
      providesTags: ["FinancialBreakdown"],
    }),

    getFinancialProductPerformance: builder.query({
      query: (params) => ({
        url: "/manager/financial/product-performance/",
        method: "GET",
        params,
      }),
      providesTags: ["FinancialProductPerformance"],
    }),

    getFinancialReconciliation: builder.query({
      query: (params) => ({
        url: "/manager/financial/reconciliation/",
        method: "GET",
        params,
      }),
      providesTags: ["FinancialReconciliation"],
    }),

    getCommandCenter: builder.query({
      query: (params) => ({
        url: "/manager/financial/command-center/",
        method: "GET",
        params,
      }),
      providesTags: ["CommandCenter", "FinancialOverview", "FinancialTrends", "Inventory", "Purchases", "Expenses"],
    }),

    getReportData: builder.query({
      query: (params) => ({
        url: "/manager/financial/reports/",
        method: "GET",
        params,
      }),
      providesTags: ["FinancialReports"],
    }),
  }),
});

export const {
  useGetFinancialOverviewQuery,
  useGetFinancialTrendsQuery,
  useGetFinancialRevenueBreakdownQuery,
  useGetFinancialExpenseBreakdownQuery,
  useGetFinancialWastageBreakdownQuery,
  useGetFinancialProductPerformanceQuery,
  useGetFinancialReconciliationQuery,
  useGetCommandCenterQuery,
  useGetReportDataQuery,
} = financialApi;

import API_URL from "@/utilities/apiConfig";

/**
 * Triggers an authenticated backend export download for Excel (.xlsx)
 */
export const downloadReportExcel = async (reportType, params = {}) => {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const searchParams = new URLSearchParams({ type: reportType, ...params });
  const url = `${API_URL}/manager/financial/reports/export-excel/?${searchParams.toString()}`;

  const response = await fetch(url, {
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
    },
  });

  if (!response.ok) {
    let errorDetail = "Failed to export Excel report";
    try {
      const err = await response.json();
      errorDetail = err.detail || errorDetail;
    } catch (_) {}
    throw new Error(errorDetail);
  }

  const blob = await response.blob();
  const filename =
    response.headers.get("Content-Disposition")?.match(/filename="?([^"]+)"?/)?.[1] ||
    `EasyServe_${reportType.toUpperCase()}_Report.xlsx`;

  const downloadUrl = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = downloadUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(downloadUrl);
};

/**
 * Triggers an authenticated backend export download for PDF (.pdf)
 */
export const downloadReportPdf = async (reportType, params = {}) => {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const searchParams = new URLSearchParams({ type: reportType, ...params });
  const url = `${API_URL}/manager/financial/reports/export-pdf/?${searchParams.toString()}`;

  const response = await fetch(url, {
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
    },
  });

  if (!response.ok) {
    let errorDetail = "Failed to export PDF report";
    try {
      const err = await response.json();
      errorDetail = err.detail || errorDetail;
    } catch (_) {}
    throw new Error(errorDetail);
  }

  const blob = await response.blob();
  const filename =
    response.headers.get("Content-Disposition")?.match(/filename="?([^"]+)"?/)?.[1] ||
    `EasyServe_${reportType.toUpperCase()}_Report.pdf`;

  const downloadUrl = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = downloadUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(downloadUrl);
};


