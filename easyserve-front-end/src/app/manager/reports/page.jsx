"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  TrendingUp,
  DollarSign,
  Receipt,
  Trash2,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  FileText,
  Printer,
  PieChart as PieIcon,
  BarChart3,
  Search,
  ChevronRight,
  ShieldCheck,
  Building,
  CreditCard,
  Percent,
  SlidersHorizontal,
  ChevronDown,
  Info,
  Package,
  ShoppingBag,
  History,
  FileCheck,
  Download,
} from "lucide-react";
import {
  useGetReportDataQuery,
  useGetFinancialOverviewQuery,
  downloadReportExcel,
  downloadReportPdf,
} from "@/services/private/financial";
import { toast } from "sonner";

// Currency formatter
const formatCurrency = (amount) => {
  const val = Number(amount) || 0;
  return `Rs. ${val.toLocaleString("en-PK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

// Report Definitions
const REPORT_TYPES = [
  { id: "pnl", name: "P&L Statement", icon: TrendingUp, desc: "Revenue, Costs, Margins & Operating Result" },
  { id: "sales", name: "Sales Ledger", icon: DollarSign, desc: "Order transactions, table, payment & profit" },
  { id: "cogs", name: "COGS / Food Cost", icon: PieIcon, desc: "Item-level food cost % and historical COGS" },
  { id: "products", name: "Menu Performance", icon: BarChart3, desc: "Units sold, profitability & health status" },
  { id: "expenses", name: "Operating Expenses", icon: Receipt, desc: "Expenses by category, payee & payment method" },
  { id: "wastage", name: "Stock Wastage", icon: Trash2, desc: "Spoilage logs, reasons & financial loss" },
  { id: "inventory", name: "Inventory Valuation", icon: Package, desc: "Current stock, WAC unit cost & reorder status" },
  { id: "movements", name: "Stock Ledger", icon: History, desc: "Audit trail of all inventory quantity adjustments" },
  { id: "purchases", name: "Purchases & Suppliers", icon: ShoppingBag, desc: "PO records, supplier spend & taxes" },
  { id: "reconciliation", name: "Audit Reconciliation", icon: ShieldCheck, desc: "Discrepancy audit across orders, expenses & stock" },
];

export default function FinancialReportsPage() {
  // Active Report
  const [activeReport, setActiveReport] = useState("pnl");

  // Global Filter State
  const [periodPreset, setPeriodPreset] = useState("this_month");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Search & Sorting (for tabular reports)
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState("default");

  // Export Loading States
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Preset Change Handler
  const handlePresetChange = (preset) => {
    setPeriodPreset(preset);
    if (preset !== "custom") {
      setStartDate("");
      setEndDate("");
    }
  };

  // Query Params
  const queryParams = useMemo(() => {
    const params = { type: activeReport, period: periodPreset };
    if (periodPreset === "custom" && startDate && endDate) {
      params.start_date = startDate;
      params.end_date = endDate;
    }
    return params;
  }, [activeReport, periodPreset, startDate, endDate]);

  // Fetch Report Dataset
  const {
    data: reportData,
    isLoading: isReportLoading,
    isFetching: isReportFetching,
    refetch: refetchReport,
  } = useGetReportDataQuery(queryParams);

  // Optional Overview query for P&L comparison metrics
  const { data: pnlOverview } = useGetFinancialOverviewQuery(
    activeReport === "pnl" ? queryParams : { period: "this_month" },
    { skip: activeReport !== "pnl" }
  );

  // Excel Export Handler
  const handleExportExcel = async () => {
    try {
      setIsExportingExcel(true);
      toast.info(`Preparing Excel export for ${activeReport.toUpperCase()} report...`);
      await downloadReportExcel(activeReport, {
        period: periodPreset,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      });
      toast.success("Excel spreadsheet downloaded successfully!");
    } catch (err) {
      toast.error(err.message || "Failed to download Excel export");
    } finally {
      setIsExportingExcel(false);
    }
  };

  // PDF Export Handler
  const handleExportPdf = async () => {
    try {
      setIsExportingPdf(true);
      toast.info(`Preparing print-ready PDF for ${activeReport.toUpperCase()} report...`);
      await downloadReportPdf(activeReport, {
        period: periodPreset,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      });
      toast.success("PDF report downloaded successfully!");
    } catch (err) {
      toast.error(err.message || "Failed to download PDF export");
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Browser Print Handler
  const handlePrint = () => {
    window.print();
  };

  const activeReportMeta = REPORT_TYPES.find((r) => r.id === activeReport) || REPORT_TYPES[0];

  return (
    <div className="space-y-6 pb-16 px-1 sm:px-2 md:px-0">
      {/* 1. Header & Title Banner */}
      <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm print:border-none print:shadow-none print:p-0">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#063B2E]/10 text-[#063B2E]">
                Phase 8 • Commercial Intelligence
              </span>
              <span className="text-xs text-stone-600 font-medium">Multi-Tenant Verified</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
              Report Center & Financial Intelligence
            </h1>
            <p className="text-sm text-stone-600 mt-1">
              Authoritative database-backed audit reports, P&L statements, and audit-ready Excel/PDF exports.
            </p>
          </div>

          {/* Quick Action Export Buttons */}
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <button
              onClick={() => refetchReport()}
              disabled={isReportFetching}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-medium transition-colors disabled:opacity-50"
              title="Refresh Report Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isReportFetching ? "animate-spin text-[#063B2E]" : ""}`} />
              Refresh
            </button>

            <button
              onClick={handleExportExcel}
              disabled={isExportingExcel || isReportLoading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100 rounded-xl text-xs font-semibold transition-all disabled:opacity-50 shadow-sm"
              title="Download formatted Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              {isExportingExcel ? "Generating..." : "Export Excel"}
            </button>

            <button
              onClick={handleExportPdf}
              disabled={isExportingPdf || isReportLoading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#063B2E] hover:bg-[#084c3b] text-white rounded-xl text-xs font-semibold transition-all disabled:opacity-50 shadow-sm"
              title="Download styled PDF (.pdf)"
            >
              <FileText className="w-3.5 h-3.5 text-[#D4A72C]" />
              {isExportingPdf ? "Building PDF..." : "Export PDF"}
            </button>

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-stone-800 hover:bg-black text-white rounded-xl text-xs font-medium transition-colors"
              title="Print Current Report"
            >
              <Printer className="w-3.5 h-3.5 text-stone-300" />
              Print
            </button>
          </div>
        </div>
      </div>

      {/* 2. Report Selector Navigation Grid */}
      <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm print:hidden">
        <div className="text-xs font-bold text-stone-600 uppercase tracking-wider mb-3 px-1">
          Select Report Type (10 Available)
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {REPORT_TYPES.map((rep) => {
            const Icon = rep.icon;
            const isSelected = activeReport === rep.id;
            return (
              <button
                key={rep.id}
                onClick={() => {
                  setActiveReport(rep.id);
                  setSearchTerm("");
                }}
                className={`flex items-start gap-2.5 p-3 rounded-xl text-left transition-all border ${
                  isSelected
                    ? "bg-[#063B2E] text-white border-[#063B2E] shadow-md ring-2 ring-[#063B2E]/20"
                    : "bg-[#F7F7F4] hover:bg-stone-100 text-stone-700 border-stone-200"
                }`}
              >
                <div
                  className={`p-2 rounded-lg shrink-0 ${
                    isSelected ? "bg-white/15 text-[#D4A72C]" : "bg-white text-[#063B2E] border border-stone-200 shadow-xs"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold truncate">{rep.name}</div>
                  <div className={`text-[10px] line-clamp-1 ${isSelected ? "text-stone-300" : "text-stone-600"}`}>
                    {rep.desc}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Global Filter Bar */}
      <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm print:hidden">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-stone-600 mr-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-[#063B2E]" />
              Period:
            </span>
            {[
              { key: "today", label: "Today" },
              { key: "yesterday", label: "Yesterday" },
              { key: "this_week", label: "Last 7 Days" },
              { key: "last_30_days", label: "Last 30 Days" },
              { key: "this_month", label: "This Month" },
              { key: "last_month", label: "Last Month" },
              { key: "custom", label: "Custom Range" },
            ].map((preset) => (
              <button
                key={preset.key}
                onClick={() => handlePresetChange(preset.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  periodPreset === preset.key
                    ? "bg-[#063B2E] text-white shadow-xs"
                    : "bg-[#F7F7F4] hover:bg-stone-200 text-stone-700 border border-stone-200"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Custom Date Pickers */}
          {periodPreset === "custom" && (
            <div className="flex flex-wrap items-center gap-2 bg-[#F7F7F4] p-2 rounded-xl border border-stone-200">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-stone-600 font-medium">From:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-2.5 py-1 text-xs bg-white border border-stone-300 rounded-lg text-stone-800 focus:outline-none focus:ring-1 focus:ring-[#063B2E]"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-stone-600 font-medium">To:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-2.5 py-1 text-xs bg-white border border-stone-300 rounded-lg text-stone-800 focus:outline-none focus:ring-1 focus:ring-[#063B2E]"
                />
              </div>
            </div>
          )}

          {/* Active Period Display */}
          <div className="text-xs font-semibold text-stone-600 bg-stone-100 px-3 py-1.5 rounded-lg shrink-0">
            Active: <span className="text-stone-900">{reportData?.period?.start_date || "Start"}</span> to{" "}
            <span className="text-stone-900">{reportData?.period?.end_date || "End"}</span>
          </div>
        </div>
      </div>

      {/* Printable Header (Visible only when printed) */}
      <div className="hidden print:block mb-6 p-4 border-b-2 border-stone-800">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-stone-900">{reportData?.metadata?.restaurant_name || "EasyServe Restaurant"}</h1>
            <h2 className="text-lg font-semibold text-[#063B2E] mt-1">{reportData?.title || activeReportMeta.name}</h2>
          </div>
          <div className="text-right text-xs text-stone-600 space-y-1">
            <div><b>Period:</b> {reportData?.period?.start_date} to {reportData?.period?.end_date}</div>
            <div><b>Generated:</b> {reportData?.metadata?.generated_at}</div>
            <div><b>System:</b> EasyServe SaaS (Confidential)</div>
          </div>
        </div>
      </div>

      {/* 4. Report Content Body */}
      {isReportLoading ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-stone-200">
          <RefreshCw className="w-8 h-8 text-[#063B2E] animate-spin mx-auto mb-3" />
          <h3 className="text-base font-semibold text-stone-800">Compiling database report...</h3>
          <p className="text-xs text-stone-600 mt-1">Aggregating historical transactions and calculating financial totals.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* ========================================================================= */}
          {/* REPORT 1: P&L FINANCIAL REPORT */}
          {/* ========================================================================= */}
          {activeReport === "pnl" && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-sm">
                  <div className="text-xs font-semibold text-stone-600 uppercase">Gross Sales</div>
                  <div className="text-xl font-bold text-stone-900 mt-1">
                    {formatCurrency(reportData?.overview?.revenue?.gross_sales || 0)}
                  </div>
                  <div className="text-xs text-stone-600 mt-1">
                    {reportData?.overview?.revenue?.orders_count || 0} confirmed orders
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-sm">
                  <div className="text-xs font-semibold text-stone-600 uppercase">Historical COGS</div>
                  <div className="text-xl font-bold text-amber-700 mt-1">
                    {formatCurrency(reportData?.overview?.costs?.cogs || 0)}
                  </div>
                  <div className="text-xs text-stone-600 mt-1">
                    Food Cost: {reportData?.overview?.costs?.food_cost_percentage || 0}%
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-sm">
                  <div className="text-xs font-semibold text-stone-600 uppercase">Operating Expenses</div>
                  <div className="text-xl font-bold text-rose-700 mt-1">
                    {formatCurrency(reportData?.overview?.costs?.operating_expenses || 0)}
                  </div>
                  <div className="text-xs text-stone-600 mt-1">
                    Wastage: {formatCurrency(reportData?.overview?.costs?.wastage_cost || 0)}
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-[#063B2E]/20 shadow-sm bg-gradient-to-br from-white to-[#063B2E]/5">
                  <div className="text-xs font-semibold text-[#063B2E] uppercase">Net Operating Result</div>
                  <div className="text-2xl font-bold text-[#063B2E] mt-1">
                    {formatCurrency(reportData?.overview?.profitability?.operating_result || 0)}
                  </div>
                  <div className="text-xs font-semibold text-[#063B2E] mt-1">
                    Net Margin: {reportData?.overview?.profitability?.net_margin || 0}%
                  </div>
                </div>
              </div>

              {/* Comprehensive P&L Statement Table */}
              <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-stone-200 bg-[#F7F7F4] flex justify-between items-center">
                  <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider">
                    Executive Profit & Loss Statement (P&L)
                  </h3>
                  <span className="text-xs text-stone-600 font-medium">PKR Standard Accounting</span>
                </div>
                <div className="divide-y divide-stone-200 text-sm">
                  {/* Revenue */}
                  <div className="p-4 bg-emerald-50/50">
                    <div className="flex justify-between items-center font-bold text-[#063B2E]">
                      <span>1. REVENUE</span>
                      <span>{formatCurrency(reportData?.overview?.revenue?.net_sales || 0)}</span>
                    </div>
                    <div className="pl-4 mt-2 space-y-1 text-xs text-stone-600">
                      <div className="flex justify-between">
                        <span>Gross Sales ({reportData?.overview?.revenue?.orders_count || 0} Orders)</span>
                        <span className="font-medium text-stone-800">
                          {formatCurrency(reportData?.overview?.revenue?.gross_sales || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Discounts & Adjustments</span>
                        <span className="font-medium text-stone-800">{formatCurrency(0)}</span>
                      </div>
                      <div className="flex justify-between font-semibold text-stone-900 pt-1 border-t border-emerald-100">
                        <span>Net Sales</span>
                        <span>{formatCurrency(reportData?.overview?.revenue?.net_sales || 0)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Cost of Sales */}
                  <div className="p-4">
                    <div className="flex justify-between items-center font-bold text-stone-900">
                      <span>2. COST OF GOODS SOLD (COGS)</span>
                      <span className="text-amber-800">
                        ({formatCurrency(reportData?.overview?.costs?.cogs || 0)})
                      </span>
                    </div>
                    <div className="pl-4 mt-2 space-y-1 text-xs text-stone-600">
                      <div className="flex justify-between">
                        <span>Historical Recipe Consumption</span>
                        <span className="font-medium text-stone-800">
                          {formatCurrency(reportData?.overview?.costs?.cogs || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Food Cost Ratio</span>
                        <span className="font-medium text-stone-800">
                          {reportData?.overview?.costs?.food_cost_percentage || 0}% of Net Sales
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Gross Profit */}
                  <div className="p-4 bg-stone-50 font-bold text-stone-900 flex justify-between items-center">
                    <div>
                      <span>GROSS PROFIT</span>
                      <span className="text-xs text-stone-600 font-normal ml-2">
                        (Gross Margin: {reportData?.overview?.profitability?.gross_margin || 0}%)
                      </span>
                    </div>
                    <span className="text-base text-[#063B2E]">
                      {formatCurrency(reportData?.overview?.profitability?.gross_profit || 0)}
                    </span>
                  </div>

                  {/* Operating Costs */}
                  <div className="p-4">
                    <div className="flex justify-between items-center font-bold text-stone-900">
                      <span>3. OPERATING OVERHEAD & LOSSES</span>
                      <span className="text-rose-700">
                        (
                        {formatCurrency(
                          (reportData?.overview?.costs?.operating_expenses || 0) +
                            (reportData?.overview?.costs?.wastage_cost || 0)
                        )}
                        )
                      </span>
                    </div>
                    <div className="pl-4 mt-2 space-y-1 text-xs text-stone-600">
                      <div className="flex justify-between">
                        <span>Active Operating Expenses</span>
                        <span className="font-medium text-stone-800">
                          {formatCurrency(reportData?.overview?.costs?.operating_expenses || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Recorded Stock Wastage & Spoilage</span>
                        <span className="font-medium text-stone-800">
                          {formatCurrency(reportData?.overview?.costs?.wastage_cost || 0)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Net Operating Result */}
                  <div className="p-5 bg-[#063B2E] text-white flex justify-between items-center">
                    <div>
                      <div className="font-bold text-base tracking-wide">NET OPERATING RESULT</div>
                      <div className="text-xs text-stone-300 mt-0.5">
                        Net Operating Margin: {reportData?.overview?.profitability?.net_margin || 0}%
                      </div>
                    </div>
                    <div className="text-2xl font-black text-[#D4A72C]">
                      {formatCurrency(reportData?.overview?.profitability?.operating_result || 0)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* REPORT 2: SALES REPORT */}
          {/* ========================================================================= */}
          {activeReport === "sales" && (
            <div className="space-y-6">
              {/* KPI Summary */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-stone-200">
                  <div className="text-xs text-stone-600 font-medium">Total Orders</div>
                  <div className="text-xl font-bold text-stone-900">{reportData?.summary?.total_orders || 0}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-stone-200">
                  <div className="text-xs text-stone-600 font-medium">Total Sales Revenue</div>
                  <div className="text-xl font-bold text-[#063B2E]">
                    {formatCurrency(reportData?.summary?.total_gross_sales || 0)}
                  </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-stone-200">
                  <div className="text-xs text-stone-600 font-medium">Historical COGS</div>
                  <div className="text-xl font-bold text-amber-700">
                    {formatCurrency(reportData?.summary?.total_cogs || 0)}
                  </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-stone-200">
                  <div className="text-xs text-stone-600 font-medium">Gross Profit (Margin)</div>
                  <div className="text-xl font-bold text-emerald-700">
                    {formatCurrency(reportData?.summary?.total_gross_profit || 0)}{" "}
                    <span className="text-xs text-stone-600">({reportData?.summary?.overall_margin || 0}%)</span>
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-stone-200 bg-[#F7F7F4] flex justify-between items-center">
                  <h3 className="text-sm font-bold text-stone-900">Sales & Order Transaction Ledger</h3>
                  <span className="text-xs text-stone-600">{reportData?.orders?.length || 0} records</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-stone-700">
                    <thead className="bg-stone-100 text-stone-800 font-semibold uppercase tracking-wider text-[11px] border-b border-stone-200">
                      <tr>
                        <th className="py-3 px-3">Order #</th>
                        <th className="py-3 px-3">Date / Time</th>
                        <th className="py-3 px-3">Type</th>
                        <th className="py-3 px-3">Table</th>
                        <th className="py-3 px-3">Payment</th>
                        <th className="py-3 px-3">Status</th>
                        <th className="py-3 px-3 text-right">Gross Amount</th>
                        <th className="py-3 px-3 text-right">COGS</th>
                        <th className="py-3 px-3 text-right">Gross Profit</th>
                        <th className="py-3 px-3 text-right">Margin %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200 font-medium">
                      {(reportData?.orders || []).length === 0 ? (
                        <tr>
                          <td colSpan={10} className="py-8 text-center text-stone-600">
                            No sales recorded for the selected period.
                          </td>
                        </tr>
                      ) : (
                        reportData.orders.map((ord) => (
                          <tr key={ord.id} className="hover:bg-stone-50">
                            <td className="py-2.5 px-3 font-bold text-stone-900">{ord.order_number}</td>
                            <td className="py-2.5 px-3 text-stone-600">{ord.date} {ord.time}</td>
                            <td className="py-2.5 px-3">{ord.order_type}</td>
                            <td className="py-2.5 px-3">{ord.table_number}</td>
                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 rounded-full text-[10px] bg-stone-100 text-stone-800 font-medium">
                                {ord.payment_mode}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-semibold">
                                {ord.status}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right font-semibold text-stone-900">
                              {formatCurrency(ord.gross_amount)}
                            </td>
                            <td className="py-2.5 px-3 text-right text-amber-700">{formatCurrency(ord.cogs)}</td>
                            <td className="py-2.5 px-3 text-right text-emerald-700 font-semibold">
                              {formatCurrency(ord.gross_profit)}
                            </td>
                            <td className="py-2.5 px-3 text-right">{ord.gross_margin}%</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* REPORT 3: COGS / FOOD COST REPORT */}
          {/* ========================================================================= */}
          {activeReport === "cogs" && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-stone-200">
                  <div className="text-xs text-stone-600 font-medium">Total Food Sales</div>
                  <div className="text-xl font-bold text-stone-900">{formatCurrency(reportData?.summary?.total_revenue || 0)}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-stone-200">
                  <div className="text-xs text-stone-600 font-medium">Total Historical COGS</div>
                  <div className="text-xl font-bold text-amber-700">{formatCurrency(reportData?.summary?.total_cogs || 0)}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-stone-200">
                  <div className="text-xs text-stone-600 font-medium">Overall Food Cost %</div>
                  <div className="text-xl font-bold text-stone-900">{reportData?.summary?.overall_food_cost_percentage || 0}%</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-stone-200">
                  <div className="text-xs text-stone-600 font-medium">Gross Food Profit</div>
                  <div className="text-xl font-bold text-emerald-700">{formatCurrency(reportData?.summary?.total_gross_profit || 0)}</div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-stone-200 bg-[#F7F7F4] flex justify-between items-center">
                  <h3 className="text-sm font-bold text-stone-900">Historical Recipe COGS Breakdown</h3>
                  <span className="text-xs text-stone-600">{reportData?.items?.length || 0} menu items sold</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-stone-700">
                    <thead className="bg-stone-100 text-stone-800 font-semibold uppercase tracking-wider text-[11px] border-b border-stone-200">
                      <tr>
                        <th className="py-3 px-3">Menu Item</th>
                        <th className="py-3 px-3">Category</th>
                        <th className="py-3 px-3 text-right">Units Sold</th>
                        <th className="py-3 px-3 text-right">Revenue</th>
                        <th className="py-3 px-3 text-right">COGS</th>
                        <th className="py-3 px-3 text-right">Food Cost %</th>
                        <th className="py-3 px-3 text-right">Gross Profit</th>
                        <th className="py-3 px-3 text-right">Margin %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200 font-medium">
                      {(reportData?.items || []).length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-stone-600">
                            No menu item sales recorded for the selected period.
                          </td>
                        </tr>
                      ) : (
                        reportData.items.map((it, idx) => (
                          <tr key={idx} className="hover:bg-stone-50">
                            <td className="py-2.5 px-3 font-bold text-stone-900">{it.name}</td>
                            <td className="py-2.5 px-3 text-stone-600">{it.category}</td>
                            <td className="py-2.5 px-3 text-right font-semibold">{it.units_sold}</td>
                            <td className="py-2.5 px-3 text-right font-medium text-stone-900">{formatCurrency(it.revenue)}</td>
                            <td className="py-2.5 px-3 text-right text-amber-700 font-medium">{formatCurrency(it.cogs)}</td>
                            <td className="py-2.5 px-3 text-right font-bold">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] ${
                                  it.food_cost_percentage > 35
                                    ? "bg-rose-100 text-rose-800"
                                    : "bg-emerald-100 text-emerald-800"
                                }`}
                              >
                                {it.food_cost_percentage}%
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right text-emerald-700 font-semibold">{formatCurrency(it.gross_profit)}</td>
                            <td className="py-2.5 px-3 text-right">{it.gross_margin_percentage}%</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* REPORT 4: MENU & PRODUCT PERFORMANCE */}
          {/* ========================================================================= */}
          {activeReport === "products" && (
            <div className="space-y-6">
              {/* Search Bar */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search menu items..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#063B2E]"
                  />
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-stone-200 bg-[#F7F7F4] flex justify-between items-center">
                  <h3 className="text-sm font-bold text-stone-900">Product Profitability & Volume Performance</h3>
                  <span className="text-xs text-stone-600">{reportData?.products?.length || 0} products</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-stone-700">
                    <thead className="bg-stone-100 text-stone-800 font-semibold uppercase tracking-wider text-[11px] border-b border-stone-200">
                      <tr>
                        <th className="py-3 px-3">Item</th>
                        <th className="py-3 px-3">Category</th>
                        <th className="py-3 px-3 text-right">Units Sold</th>
                        <th className="py-3 px-3 text-right">Revenue</th>
                        <th className="py-3 px-3 text-right">COGS</th>
                        <th className="py-3 px-3 text-right">Gross Profit</th>
                        <th className="py-3 px-3 text-right">Food Cost %</th>
                        <th className="py-3 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200 font-medium">
                      {(reportData?.products || [])
                        .filter((p) => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
                        .map((p, idx) => (
                          <tr key={idx} className="hover:bg-stone-50">
                            <td className="py-2.5 px-3 font-bold text-stone-900">{p.name}</td>
                            <td className="py-2.5 px-3 text-stone-600">{p.category}</td>
                            <td className="py-2.5 px-3 text-right font-semibold">{p.units_sold}</td>
                            <td className="py-2.5 px-3 text-right text-stone-900">{formatCurrency(p.revenue)}</td>
                            <td className="py-2.5 px-3 text-right text-amber-700">{formatCurrency(p.cogs)}</td>
                            <td className="py-2.5 px-3 text-right text-emerald-700 font-semibold">{formatCurrency(p.gross_profit)}</td>
                            <td className="py-2.5 px-3 text-right font-medium">{p.food_cost_percentage}%</td>
                            <td className="py-2.5 px-3 text-center">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                  p.status === "HEALTHY"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : p.status === "ATTENTION"
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-rose-100 text-rose-800"
                                }`}
                              >
                                {p.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* REPORT 5: EXPENSE REPORT */}
          {/* ========================================================================= */}
          {activeReport === "expenses" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border border-stone-200">
                  <div className="text-xs text-stone-600 font-medium">Total Operating Expenses</div>
                  <div className="text-2xl font-bold text-rose-700 mt-1">
                    {formatCurrency(reportData?.summary?.total_expenses || 0)}
                  </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-stone-200">
                  <div className="text-xs text-stone-600 font-medium">Active Expense Entries</div>
                  <div className="text-2xl font-bold text-stone-900 mt-1">
                    {reportData?.summary?.expense_count || 0}
                  </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-stone-200">
                  <div className="text-xs text-stone-600 font-medium">Top Category</div>
                  <div className="text-base font-bold text-stone-900 mt-1 truncate">
                    {reportData?.summary?.category_breakdown?.[0]?.category || "None"}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-stone-200 bg-[#F7F7F4] flex justify-between items-center">
                  <h3 className="text-sm font-bold text-stone-900">Operating Expense Audit Ledger</h3>
                  <span className="text-xs text-stone-600">{reportData?.expenses?.length || 0} expenses</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-stone-700">
                    <thead className="bg-stone-100 text-stone-800 font-semibold uppercase tracking-wider text-[11px] border-b border-stone-200">
                      <tr>
                        <th className="py-3 px-3">Expense #</th>
                        <th className="py-3 px-3">Date</th>
                        <th className="py-3 px-3">Category</th>
                        <th className="py-3 px-3">Title / Description</th>
                        <th className="py-3 px-3">Vendor / Payee</th>
                        <th className="py-3 px-3">Payment Method</th>
                        <th className="py-3 px-3">Ref #</th>
                        <th className="py-3 px-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200 font-medium">
                      {(reportData?.expenses || []).length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-stone-600">
                            No active expenses found for the selected period.
                          </td>
                        </tr>
                      ) : (
                        reportData.expenses.map((e) => (
                          <tr key={e.id} className="hover:bg-stone-50">
                            <td className="py-2.5 px-3 font-bold text-stone-900">{e.expense_number}</td>
                            <td className="py-2.5 px-3 text-stone-600">{e.expense_date}</td>
                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 rounded-md text-[10px] bg-stone-100 text-stone-800 font-semibold">
                                {e.category_name}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-stone-900">{e.title}</td>
                            <td className="py-2.5 px-3 text-stone-600">{e.vendor_payee || "N/A"}</td>
                            <td className="py-2.5 px-3">{e.payment_method}</td>
                            <td className="py-2.5 px-3 text-stone-600">{e.reference_number || "—"}</td>
                            <td className="py-2.5 px-3 text-right font-bold text-rose-700">
                              {formatCurrency(e.amount)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* REPORT 6: WASTAGE REPORT */}
          {/* ========================================================================= */}
          {activeReport === "wastage" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border border-stone-200">
                  <div className="text-xs text-stone-600 font-medium">Total Wastage Loss</div>
                  <div className="text-2xl font-bold text-rose-700 mt-1">
                    {formatCurrency(reportData?.summary?.total_loss || 0)}
                  </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-stone-200">
                  <div className="text-xs text-stone-600 font-medium">Incident Count</div>
                  <div className="text-2xl font-bold text-stone-900 mt-1">
                    {reportData?.summary?.incident_count || 0}
                  </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-stone-200">
                  <div className="text-xs text-stone-600 font-medium">Top Waste Reason</div>
                  <div className="text-base font-bold text-stone-900 mt-1 truncate">
                    {reportData?.summary?.by_reason?.[0]?.reason || "None"}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-stone-200 bg-[#F7F7F4] flex justify-between items-center">
                  <h3 className="text-sm font-bold text-stone-900">Stock Spoilage & Wastage Log</h3>
                  <span className="text-xs text-stone-600">{reportData?.wastage_logs?.length || 0} records</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-stone-700">
                    <thead className="bg-stone-100 text-stone-800 font-semibold uppercase tracking-wider text-[11px] border-b border-stone-200">
                      <tr>
                        <th className="py-3 px-3">Date</th>
                        <th className="py-3 px-3">Item Name</th>
                        <th className="py-3 px-3 text-right">Quantity</th>
                        <th className="py-3 px-3">UOM</th>
                        <th className="py-3 px-3">Reason</th>
                        <th className="py-3 px-3 text-right">Unit Cost</th>
                        <th className="py-3 px-3 text-right">Total Loss</th>
                        <th className="py-3 px-3">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200 font-medium">
                      {(reportData?.wastage_logs || []).length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-stone-600">
                            No stock wastage recorded for the selected period.
                          </td>
                        </tr>
                      ) : (
                        reportData.wastage_logs.map((w) => (
                          <tr key={w.id} className="hover:bg-stone-50">
                            <td className="py-2.5 px-3 text-stone-600">{w.date}</td>
                            <td className="py-2.5 px-3 font-bold text-stone-900">{w.item_name}</td>
                            <td className="py-2.5 px-3 text-right font-semibold">{w.quantity}</td>
                            <td className="py-2.5 px-3">{w.uom}</td>
                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-100 text-rose-800 font-semibold">
                                {w.reason}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right">{formatCurrency(w.unit_cost)}</td>
                            <td className="py-2.5 px-3 text-right font-bold text-rose-700">
                              {formatCurrency(w.total_cost)}
                            </td>
                            <td className="py-2.5 px-3 text-stone-600 max-w-xs truncate">{w.notes || "—"}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* REPORT 7: INVENTORY REPORT */}
          {/* ========================================================================= */}
          {activeReport === "inventory" && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-stone-200">
                  <div className="text-xs text-stone-600 font-medium">Total Inventory Value</div>
                  <div className="text-xl font-bold text-[#063B2E]">
                    {formatCurrency(reportData?.summary?.total_stock_value || 0)}
                  </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-stone-200">
                  <div className="text-xs text-stone-600 font-medium">Total Tracked Items</div>
                  <div className="text-xl font-bold text-stone-900">{reportData?.summary?.total_items || 0}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-stone-200">
                  <div className="text-xs text-stone-600 font-medium">Low Stock Alerts</div>
                  <div className="text-xl font-bold text-amber-600">{reportData?.summary?.low_stock_count || 0}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-stone-200">
                  <div className="text-xs text-stone-600 font-medium">Out of Stock</div>
                  <div className="text-xl font-bold text-rose-700">{reportData?.summary?.out_of_stock_count || 0}</div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-stone-200 bg-[#F7F7F4] flex justify-between items-center">
                  <h3 className="text-sm font-bold text-stone-900">Current Stock Valuation Ledger</h3>
                  <span className="text-xs text-stone-600">{reportData?.items?.length || 0} inventory items</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-stone-700">
                    <thead className="bg-stone-100 text-stone-800 font-semibold uppercase tracking-wider text-[11px] border-b border-stone-200">
                      <tr>
                        <th className="py-3 px-3">Item Name</th>
                        <th className="py-3 px-3">SKU</th>
                        <th className="py-3 px-3">Category</th>
                        <th className="py-3 px-3 text-right">Current Stock</th>
                        <th className="py-3 px-3">UOM</th>
                        <th className="py-3 px-3 text-right">WAC Unit Cost</th>
                        <th className="py-3 px-3 text-right">Stock Valuation</th>
                        <th className="py-3 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200 font-medium">
                      {(reportData?.items || []).map((it) => (
                        <tr key={it.id} className="hover:bg-stone-50">
                          <td className="py-2.5 px-3 font-bold text-stone-900">{it.name}</td>
                          <td className="py-2.5 px-3 text-stone-600">{it.sku}</td>
                          <td className="py-2.5 px-3 text-stone-600">{it.category_name}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-stone-900">{it.current_stock}</td>
                          <td className="py-2.5 px-3">{it.uom}</td>
                          <td className="py-2.5 px-3 text-right">{formatCurrency(it.cost_per_unit)}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-[#063B2E]">
                            {formatCurrency(it.stock_value)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                it.status === "IN_STOCK"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : it.status === "LOW_STOCK"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-rose-100 text-rose-800"
                              }`}
                            >
                              {it.status.replace("_", " ")}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* REPORT 8: STOCK MOVEMENT LEDGER */}
          {/* ========================================================================= */}
          {activeReport === "movements" && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-stone-200 bg-[#F7F7F4] flex justify-between items-center">
                  <h3 className="text-sm font-bold text-stone-900">Stock Movement Audit Trail</h3>
                  <span className="text-xs text-stone-600">{reportData?.movements?.length || 0} movements</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-stone-700">
                    <thead className="bg-stone-100 text-stone-800 font-semibold uppercase tracking-wider text-[11px] border-b border-stone-200">
                      <tr>
                        <th className="py-3 px-3">Date / Time</th>
                        <th className="py-3 px-3">Inventory Item</th>
                        <th className="py-3 px-3">Movement Type</th>
                        <th className="py-3 px-3 text-right">Delta</th>
                        <th className="py-3 px-3 text-right">Balance After</th>
                        <th className="py-3 px-3">UOM</th>
                        <th className="py-3 px-3 text-right">Unit Cost</th>
                        <th className="py-3 px-3 text-right">Total Value</th>
                        <th className="py-3 px-3">Reference</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200 font-medium">
                      {(reportData?.movements || []).length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-8 text-center text-stone-600">
                            No stock movements logged in this period.
                          </td>
                        </tr>
                      ) : (
                        reportData.movements.map((m) => (
                          <tr key={m.id} className="hover:bg-stone-50">
                            <td className="py-2.5 px-3 text-stone-600">{m.date} {m.time}</td>
                            <td className="py-2.5 px-3 font-bold text-stone-900">{m.item_name}</td>
                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 rounded-full text-[10px] bg-stone-100 text-stone-800 font-semibold">
                                {m.movement_type}
                              </span>
                            </td>
                            <td
                              className={`py-2.5 px-3 text-right font-bold ${
                                m.quantity_delta > 0 ? "text-emerald-700" : "text-rose-700"
                              }`}
                            >
                              {m.quantity_delta > 0 ? `+${m.quantity_delta}` : m.quantity_delta}
                            </td>
                            <td className="py-2.5 px-3 text-right font-semibold text-stone-900">{m.balance_after}</td>
                            <td className="py-2.5 px-3">{m.uom}</td>
                            <td className="py-2.5 px-3 text-right">{formatCurrency(m.unit_cost)}</td>
                            <td className="py-2.5 px-3 text-right font-semibold">{formatCurrency(m.total_value)}</td>
                            <td className="py-2.5 px-3 text-stone-600 max-w-xs truncate">{m.reference_note || "—"}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* REPORT 9: PURCHASE / SUPPLIER REPORT */}
          {/* ========================================================================= */}
          {activeReport === "purchases" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border border-stone-200">
                  <div className="text-xs text-stone-600 font-medium">Total Purchase Spend</div>
                  <div className="text-2xl font-bold text-[#063B2E] mt-1">
                    {formatCurrency(reportData?.summary?.total_spend || 0)}
                  </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-stone-200">
                  <div className="text-xs text-stone-600 font-medium">Total POs Created</div>
                  <div className="text-2xl font-bold text-stone-900 mt-1">
                    {reportData?.summary?.total_purchase_count || 0}
                  </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-stone-200">
                  <div className="text-xs text-stone-600 font-medium">Top Supplier</div>
                  <div className="text-base font-bold text-stone-900 mt-1 truncate">
                    {reportData?.summary?.supplier_breakdown?.[0]?.supplier || "None"}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-stone-200 bg-[#F7F7F4] flex justify-between items-center">
                  <h3 className="text-sm font-bold text-stone-900">Purchase Order Transaction Register</h3>
                  <span className="text-xs text-stone-600">{reportData?.purchases?.length || 0} orders</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-stone-700">
                    <thead className="bg-stone-100 text-stone-800 font-semibold uppercase tracking-wider text-[11px] border-b border-stone-200">
                      <tr>
                        <th className="py-3 px-3">PO #</th>
                        <th className="py-3 px-3">Invoice #</th>
                        <th className="py-3 px-3">Supplier Name</th>
                        <th className="py-3 px-3">Date</th>
                        <th className="py-3 px-3">Status</th>
                        <th className="py-3 px-3 text-right">Subtotal</th>
                        <th className="py-3 px-3 text-right">Tax</th>
                        <th className="py-3 px-3 text-right">Total Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200 font-medium">
                      {(reportData?.purchases || []).length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-stone-600">
                            No purchases recorded for the selected period.
                          </td>
                        </tr>
                      ) : (
                        reportData.purchases.map((po) => (
                          <tr key={po.id} className="hover:bg-stone-50">
                            <td className="py-2.5 px-3 font-bold text-stone-900">{po.purchase_number}</td>
                            <td className="py-2.5 px-3 text-stone-600">{po.invoice_number || "—"}</td>
                            <td className="py-2.5 px-3 font-semibold text-stone-900">{po.supplier_name}</td>
                            <td className="py-2.5 px-3 text-stone-600">{po.purchase_date}</td>
                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 rounded-full text-[10px] bg-stone-100 text-stone-800 font-semibold">
                                {po.status}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right">{formatCurrency(po.subtotal)}</td>
                            <td className="py-2.5 px-3 text-right text-stone-600">{formatCurrency(po.tax_amount)}</td>
                            <td className="py-2.5 px-3 text-right font-bold text-[#063B2E]">
                              {formatCurrency(po.total_amount)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* REPORT 10: CASH & AUDIT RECONCILIATION */}
          {/* ========================================================================= */}
          {activeReport === "reconciliation" && (
            <div className="space-y-6">
              <div
                className={`p-5 rounded-2xl border ${
                  (reportData?.reconciliation?.revenue?.difference || 0) === 0 &&
                  (reportData?.reconciliation?.cogs?.difference || 0) === 0
                    ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                    : "bg-amber-50 border-amber-200 text-amber-900"
                }`}
              >
                <div className="flex items-center gap-3">
                  <ShieldCheck
                    className={`w-6 h-6 ${
                      (reportData?.reconciliation?.revenue?.difference || 0) === 0
                        ? "text-emerald-700"
                        : "text-amber-700"
                    }`}
                  />
                  <div>
                    <h4 className="font-bold text-sm">
                      {(reportData?.reconciliation?.revenue?.difference || 0) === 0 &&
                      (reportData?.reconciliation?.cogs?.difference || 0) === 0
                        ? "Zero Discrepancy — General Ledger Fully Reconciled"
                        : "Audit Discrepancies Detected"}
                    </h4>
                    <p className="text-xs mt-0.5 opacity-90">
                      Cross-verifying transactional order headers against itemized recipe snapshots and expense categories.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-3">
                  <h4 className="text-xs font-bold text-stone-600 uppercase">Revenue Audit Match</h4>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-stone-600">Order Header Total:</span>
                      <span className="font-semibold text-stone-900">
                        {formatCurrency(reportData?.reconciliation?.revenue?.orders_revenue || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-600">Item Quantity Sum:</span>
                      <span className="font-semibold text-stone-900">
                        {formatCurrency(reportData?.reconciliation?.revenue?.item_revenue || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-stone-200 font-bold">
                      <span>Audit Variance:</span>
                      <span
                        className={
                          (reportData?.reconciliation?.revenue?.difference || 0) === 0
                            ? "text-emerald-700"
                            : "text-amber-700"
                        }
                      >
                        {formatCurrency(reportData?.reconciliation?.revenue?.difference || 0)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-3">
                  <h4 className="text-xs font-bold text-stone-600 uppercase">COGS Audit Match</h4>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-stone-600">Order Header COGS:</span>
                      <span className="font-semibold text-stone-900">
                        {formatCurrency(reportData?.reconciliation?.cogs?.orders_cogs || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-600">Item Unit Cost Sum:</span>
                      <span className="font-semibold text-stone-900">
                        {formatCurrency(reportData?.reconciliation?.cogs?.item_cogs || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-stone-200 font-bold">
                      <span>Audit Variance:</span>
                      <span
                        className={
                          (reportData?.reconciliation?.cogs?.difference || 0) === 0
                            ? "text-emerald-700"
                            : "text-amber-700"
                        }
                      >
                        {formatCurrency(reportData?.reconciliation?.cogs?.difference || 0)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Global CSS for Print Optimization */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
            font-size: 10pt;
          }
          aside,
          nav,
          header,
          button,
          .print\\:hidden {
            display: none !important;
          }
          .print\\:block {
            display: block !important;
          }
          table {
            width: 100% !important;
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          thead {
            display: table-header-group;
          }
        }
      `}</style>
    </div>
  );
}
