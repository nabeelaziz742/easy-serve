"use client";

import React, { useState, useMemo } from "react";
import {
  Receipt,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Edit2,
  Trash2,
  X,
  Calendar,
  DollarSign,
  TrendingDown,
  CreditCard,
  Building,
  Tag,
  AlertTriangle,
  FileText,
  Paperclip,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ArrowUpRight,
  ExternalLink,
} from "lucide-react";
import {
  useGetExpenseSummaryQuery,
  useGetExpenseBreakdownQuery,
  useGetExpensesQuery,
  useGetExpenseDetailQuery,
  useCreateExpenseMutation,
  useUpdateExpenseMutation,
  useVoidExpenseMutation,
  useGetExpenseCategoriesQuery,
  useAddExpenseCategoryMutation,
  useUpdateExpenseCategoryMutation,
} from "@/services/private/expenses";
import { toast } from "sonner";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";

// Helper function to format currency
const formatCurrency = (amount) => {
  const val = Number(amount) || 0;
  return `Rs. ${val.toLocaleString("en-PK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

// Payment Method Labels & Badge Styles
const PAYMENT_METHOD_INFO = {
  CASH: { label: "Cash", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  CARD: { label: "Card", color: "bg-blue-50 text-blue-700 border-blue-200" },
  BANK_TRANSFER: { label: "Bank Transfer", color: "bg-purple-50 text-purple-700 border-purple-200" },
  ONLINE: { label: "Online", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  OTHER: { label: "Other", color: "bg-zinc-100 text-zinc-700 border-zinc-200" },
};

export default function ExpensesPage() {
  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [page, setPage] = useState(1);

  // Quick Date Range Preset
  const [quickDateRange, setQuickDateRange] = useState("all"); // 'all' | 'today' | 'this_week' | 'this_month' | 'custom'

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isVoidModalOpen, setIsVoidModalOpen] = useState(false);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  // Active item tracking
  const [selectedExpenseId, setSelectedExpenseId] = useState(null);
  const [expenseToEdit, setExpenseToEdit] = useState(null);
  const [expenseToVoid, setExpenseToVoid] = useState(null);

  // Quick Preset handler
  const handleQuickPresetChange = (preset) => {
    setQuickDateRange(preset);
    setPage(1);
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

    if (preset === "all") {
      setStartDate("");
      setEndDate("");
    } else if (preset === "today") {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === "this_week") {
      const day = now.getDay();
      const diffToMonday = (day + 6) % 7;
      const monday = new Date(now);
      monday.setDate(now.getDate() - diffToMonday);
      const monStr = `${monday.getFullYear()}-${pad(monday.getMonth() + 1)}-${pad(monday.getDate())}`;
      setStartDate(monStr);
      setEndDate(todayStr);
    } else if (preset === "this_month") {
      const monthStart = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
      setStartDate(monthStart);
      setEndDate(todayStr);
    }
  };

  // Queries
  const summaryQueryParams = useMemo(() => {
    const params = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    return params;
  }, [startDate, endDate]);

  const {
    data: summaryData,
    isLoading: isSummaryLoading,
    refetch: refetchSummary,
  } = useGetExpenseSummaryQuery(summaryQueryParams);

  const {
    data: breakdownData,
    isLoading: isBreakdownLoading,
    refetch: refetchBreakdown,
  } = useGetExpenseBreakdownQuery(summaryQueryParams);

  const {
    data: categoriesData = [],
    isLoading: isCategoriesLoading,
    refetch: refetchCategories,
  } = useGetExpenseCategoriesQuery();

  const expenseQueryParams = useMemo(() => {
    const params = { page };
    if (searchQuery.trim()) params.search = searchQuery.trim();
    if (selectedCategory !== "all") params.category = selectedCategory;
    if (selectedPaymentMethod !== "all") params.payment_method = selectedPaymentMethod;
    if (selectedStatus !== "all") params.status = selectedStatus;
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    if (minAmount) params.min_amount = minAmount;
    if (maxAmount) params.max_amount = maxAmount;
    return params;
  }, [
    page,
    searchQuery,
    selectedCategory,
    selectedPaymentMethod,
    selectedStatus,
    startDate,
    endDate,
    minAmount,
    maxAmount,
  ]);

  const {
    data: expensesResponse,
    isLoading: isExpensesLoading,
    isFetching: isExpensesFetching,
    refetch: refetchExpenses,
  } = useGetExpensesQuery(expenseQueryParams);

  // Selected Detail Query
  const { data: expenseDetail, isLoading: isDetailLoading } = useGetExpenseDetailQuery(
    { id: selectedExpenseId },
    { skip: !selectedExpenseId }
  );

  // Mutations
  const [createExpense, { isLoading: isCreating }] = useCreateExpenseMutation();
  const [updateExpense, { isLoading: isUpdating }] = useUpdateExpenseMutation();
  const [voidExpense, { isLoading: isVoiding }] = useVoidExpenseMutation();
  const [addCategory, { isLoading: isAddingCategory }] = useAddExpenseCategoryMutation();
  const [updateCategory, { isLoading: isUpdatingCategory }] = useUpdateExpenseCategoryMutation();

  // Reset Filters
  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedCategory("all");
    setSelectedPaymentMethod("all");
    setSelectedStatus("all");
    setStartDate("");
    setEndDate("");
    setMinAmount("");
    setMaxAmount("");
    setQuickDateRange("all");
    setPage(1);
  };

  // Trigger all refetches
  const handleRefreshAll = () => {
    refetchSummary();
    refetchBreakdown();
    refetchCategories();
    refetchExpenses();
    toast.success("Expense data refreshed");
  };

  const expenseList = expensesResponse?.results || [];
  const totalCount = expensesResponse?.count || 0;
  const totalPages = Math.ceil(totalCount / (expensesResponse?.page_size || 20)) || 1;

  // Chart data preparation for categories
  const categoryChartData = useMemo(() => {
    if (!breakdownData?.categories?.length) return [];
    return breakdownData.categories.map((c) => ({
      name: c.name,
      amount: Number(c.total_amount) || 0,
      count: c.count,
      percentage: c.percentage,
    }));
  }, [breakdownData]);

  const CHART_COLORS = ["#063B2E", "#D4A72C", "#10B981", "#3B82F6", "#8B5CF6", "#F59E0B", "#EC4899", "#6B7280"];

  return (
    <div className="min-h-screen bg-[#F7F7F4] text-zinc-900 p-4 sm:p-6 lg:p-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#063B2E] text-yellow-400 flex items-center justify-center shadow-md">
              <Receipt size={22} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-[#063B2E] tracking-tight">
                Expenses
              </h1>
              <p className="text-xs sm:text-sm text-zinc-600 font-medium">
                Track, categorize, and analyze restaurant operating expenses
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            onClick={handleRefreshAll}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 hover:border-zinc-400 transition-all text-xs sm:text-sm font-semibold shadow-sm"
          >
            <RefreshCw size={15} className={isExpensesFetching ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => setIsCategoryModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-zinc-300 bg-white text-[#063B2E] hover:bg-emerald-50/50 hover:border-emerald-300 transition-all text-xs sm:text-sm font-semibold shadow-sm"
          >
            <Tag size={15} />
            <span>Categories</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#063B2E] hover:bg-[#084D3C] text-yellow-400 hover:text-yellow-300 font-bold text-xs sm:text-sm shadow-md transition-all active:scale-95"
          >
            <Plus size={18} />
            <span>Record Expense</span>
          </button>
        </div>
      </div>

      {/* Quick Date Presets */}
      <div className="flex flex-wrap items-center gap-2 mb-6 bg-white p-2 rounded-2xl border border-zinc-200/80 shadow-sm">
        <span className="text-xs font-bold text-zinc-600 uppercase tracking-wider px-3">
          Period:
        </span>
        {[
          { key: "all", label: "All Time" },
          { key: "today", label: "Today" },
          { key: "this_week", label: "This Week" },
          { key: "this_month", label: "This Month" },
          { key: "custom", label: "Custom Range" },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => handleQuickPresetChange(key)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              quickDateRange === key
                ? "bg-[#063B2E] text-yellow-400 shadow-sm"
                : "text-zinc-600 hover:bg-zinc-100"
            }`}
          >
            {label}
          </button>
        ))}

        {quickDateRange === "custom" && (
          <div className="flex items-center gap-2 ml-auto flex-wrap">
            <div className="flex items-center gap-1.5 bg-zinc-50 border border-zinc-200 rounded-lg px-2.5 py-1 text-xs">
              <Calendar size={13} className="text-zinc-500" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
                className="bg-transparent border-none text-zinc-800 text-xs focus:outline-none"
              />
            </div>
            <span className="text-zinc-400 text-xs">to</span>
            <div className="flex items-center gap-1.5 bg-zinc-50 border border-zinc-200 rounded-lg px-2.5 py-1 text-xs">
              <Calendar size={13} className="text-zinc-500" />
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(1);
                }}
                className="bg-transparent border-none text-zinc-800 text-xs focus:outline-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Today's Expenses */}
        <div className="bg-white rounded-2xl p-5 border border-zinc-200/80 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-600">
              Today's Expenses
            </p>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <TrendingDown size={18} />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-[#063B2E]">
              {isSummaryLoading ? (
                <span className="animate-pulse">...</span>
              ) : (
                formatCurrency(summaryData?.today_total)
              )}
            </h3>
            <p className="text-[11px] text-zinc-600 font-medium mt-1">
              Active expenses logged today
            </p>
          </div>
        </div>

        {/* This Week */}
        <div className="bg-white rounded-2xl p-5 border border-zinc-200/80 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-600">
              This Week
            </p>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <Calendar size={18} />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-[#063B2E]">
              {isSummaryLoading ? (
                <span className="animate-pulse">...</span>
              ) : (
                formatCurrency(summaryData?.this_week_total)
              )}
            </h3>
            <p className="text-[11px] text-zinc-600 font-medium mt-1">
              Current week (Mon - Sun)
            </p>
          </div>
        </div>

        {/* This Month */}
        <div className="bg-white rounded-2xl p-5 border border-zinc-200/80 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-600">
              This Month
            </p>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <DollarSign size={18} />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-[#063B2E]">
              {isSummaryLoading ? (
                <span className="animate-pulse">...</span>
              ) : (
                formatCurrency(summaryData?.this_month_total)
              )}
            </h3>
            <p className="text-[11px] text-zinc-600 font-medium mt-1">
              Current calendar month
            </p>
          </div>
        </div>

        {/* Filter Period Total */}
        <div className="bg-gradient-to-br from-[#063B2E] to-[#0A4E3D] rounded-2xl p-5 text-white shadow-md">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-300">
              Filtered Period Total
            </p>
            <div className="w-8 h-8 rounded-lg bg-yellow-400 text-[#063B2E] flex items-center justify-center font-bold">
              <Receipt size={16} />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-yellow-400">
              {isSummaryLoading ? (
                <span className="animate-pulse">...</span>
              ) : (
                formatCurrency(summaryData?.filter_total)
              )}
            </h3>
            <p className="text-[11px] text-emerald-200/80 font-medium mt-1">
              {summaryData?.active_expense_count ?? 0} active records in period
            </p>
          </div>
        </div>
      </div>

      {/* Analytics & Breakdowns (2 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Category Breakdown (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-zinc-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-[#063B2E] flex items-center gap-2">
                <Tag size={18} className="text-yellow-500" />
                Category Breakdown
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Expense distribution by operating category
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-zinc-100 rounded-lg text-zinc-600">
              {breakdownData?.categories?.length || 0} Categories
            </span>
          </div>

          {isBreakdownLoading ? (
            <div className="h-48 flex items-center justify-center text-xs text-zinc-400 animate-pulse">
              Loading category breakdown...
            </div>
          ) : !categoryChartData.length ? (
            <div className="h-48 flex flex-col items-center justify-center text-center p-4">
              <Tag size={32} className="text-zinc-300 mb-2" />
              <p className="text-sm font-semibold text-zinc-700">No category breakdown data</p>
              <p className="text-xs text-zinc-500 mt-1">
                Record expenses to see category distribution charts.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Category Bar Chart */}
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: "#6B7280" }}
                      axisLine={{ stroke: "#E5E7EB" }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#6B7280" }}
                      axisLine={{ stroke: "#E5E7EB" }}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(val) => [formatCurrency(val), "Amount"]}
                      contentStyle={{
                        backgroundColor: "#063B2E",
                        borderRadius: "12px",
                        border: "none",
                        color: "#fff",
                        fontSize: "12px",
                      }}
                      itemStyle={{ color: "#FACC15" }}
                    />
                    <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                      {categoryChartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Progress bars list for top categories */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-zinc-100">
                {breakdownData.categories.slice(0, 6).map((cat, idx) => (
                  <div key={cat.category_id || idx} className="bg-zinc-50/80 rounded-xl p-3 border border-zinc-100">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-bold text-zinc-800 truncate">{cat.name}</span>
                      <span className="font-bold text-[#063B2E]">{formatCurrency(cat.total_amount)}</span>
                    </div>
                    <div className="w-full bg-zinc-200 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(cat.percentage, 100)}%`,
                          backgroundColor: CHART_COLORS[idx % CHART_COLORS.length],
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-zinc-600 font-medium mt-1">
                      <span>{cat.count} expenses</span>
                      <span>{cat.percentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Payment Method Breakdown (1 Col) */}
        <div className="bg-white rounded-2xl p-5 border border-zinc-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-[#063B2E] flex items-center gap-2">
                  <CreditCard size={18} className="text-emerald-600" />
                  Payment Methods
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">Distribution by settlement type</p>
              </div>
            </div>

            {isBreakdownLoading ? (
              <div className="h-48 flex items-center justify-center text-xs text-zinc-400 animate-pulse">
                Loading payment breakdown...
              </div>
            ) : !breakdownData?.payment_methods?.length ? (
              <div className="h-48 flex flex-col items-center justify-center text-center p-4">
                <CreditCard size={32} className="text-zinc-300 mb-2" />
                <p className="text-sm font-semibold text-zinc-700">No payment data</p>
                <p className="text-xs text-zinc-500 mt-1">
                  Expenses recorded will appear grouped by payment method.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {breakdownData.payment_methods.map((pm) => {
                  const meta = PAYMENT_METHOD_INFO[pm.payment_method] || PAYMENT_METHOD_INFO.OTHER;
                  return (
                    <div
                      key={pm.payment_method}
                      className="p-3.5 rounded-xl border border-zinc-100 bg-zinc-50/50 hover:bg-zinc-50 transition-all flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${meta.color}`}>
                          {meta.label}
                        </span>
                        <div>
                          <p className="text-xs font-bold text-zinc-800">
                            {formatCurrency(pm.total_amount)}
                          </p>
                          <p className="text-[10px] text-zinc-600 font-medium">
                            {pm.count} transactions ({pm.percentage}%)
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-zinc-100 text-center">
            <p className="text-xs text-zinc-500">
              Total Active Period Amount:{" "}
              <strong className="text-[#063B2E]">
                {formatCurrency(summaryData?.filter_total)}
              </strong>
            </p>
          </div>
        </div>
      </div>

      {/* Filter Toolbar & Expense Table Section */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-sm overflow-hidden">
        {/* Filter Toolbar */}
        <div className="p-4 sm:p-5 border-b border-zinc-200/80 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
              />
              <input
                type="text"
                placeholder="Search by title, payee, ref # or notes..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#063B2E]/20 focus:border-[#063B2E] transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Quick Filter Selects */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Category Filter */}
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setPage(1);
                }}
                aria-label="Filter by Category"
                className="px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-700 font-semibold focus:outline-none focus:ring-2 focus:ring-[#063B2E]/20"
              >
                <option value="all">All Categories</option>
                {categoriesData.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>

              {/* Payment Method Filter */}
              <select
                value={selectedPaymentMethod}
                onChange={(e) => {
                  setSelectedPaymentMethod(e.target.value);
                  setPage(1);
                }}
                aria-label="Filter by Payment Method"
                className="px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-700 font-semibold focus:outline-none focus:ring-2 focus:ring-[#063B2E]/20"
              >
                <option value="all">All Payment Methods</option>
                <option value="CASH">Cash</option>
                <option value="CARD">Card</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="ONLINE">Online</option>
                <option value="OTHER">Other</option>
              </select>

              {/* Status Filter */}
              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setPage(1);
                }}
                aria-label="Filter by Status"
                className="px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-700 font-semibold focus:outline-none focus:ring-2 focus:ring-[#063B2E]/20"
              >
                <option value="all">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="VOIDED">Voided</option>
              </select>

              {/* Reset Filters */}
              {(searchQuery ||
                selectedCategory !== "all" ||
                selectedPaymentMethod !== "all" ||
                selectedStatus !== "all" ||
                startDate ||
                endDate ||
                minAmount ||
                maxAmount) && (
                <button
                  onClick={handleResetFilters}
                  className="px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl border border-red-200 transition-all"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          {/* Amount range filters (expandable/compact) */}
          <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-zinc-500">
            <span className="font-semibold text-zinc-600">Amount Range:</span>
            <input
              type="number"
              placeholder="Min Rs."
              value={minAmount}
              onChange={(e) => {
                setMinAmount(e.target.value);
                setPage(1);
              }}
              className="w-24 px-2.5 py-1 bg-zinc-50 border border-zinc-200 rounded-lg text-xs focus:outline-none focus:border-[#063B2E]"
            />
            <span>-</span>
            <input
              type="number"
              placeholder="Max Rs."
              value={maxAmount}
              onChange={(e) => {
                setMaxAmount(e.target.value);
                setPage(1);
              }}
              className="w-24 px-2.5 py-1 bg-zinc-50 border border-zinc-200 rounded-lg text-xs focus:outline-none focus:border-[#063B2E]"
            />
          </div>
        </div>

        {/* Expenses Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50/75 border-b border-zinc-200/80 text-[11px] uppercase tracking-wider font-bold text-zinc-500">
                <th className="py-3 px-4">Expense #</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Title & Vendor</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Payment Method</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4">Recorded By</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-xs sm:text-sm">
              {isExpensesLoading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-zinc-400 font-medium animate-pulse">
                    Loading expenses...
                  </td>
                </tr>
              ) : expenseList.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-14 text-center">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#063B2E] flex items-center justify-center mb-3 shadow-inner">
                        <Receipt size={24} />
                      </div>
                      <p className="text-sm font-bold text-zinc-800">No expenses recorded yet</p>
                      <p className="text-xs text-zinc-500 mt-1">
                        Start tracking your restaurant's operating expenses by clicking "+ Record Expense".
                      </p>
                      <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="mt-4 px-4 py-2 bg-[#063B2E] text-yellow-400 rounded-xl text-xs font-bold shadow hover:bg-[#084D3C] transition-all"
                      >
                        + Record First Expense
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                expenseList.map((exp) => {
                  const pm = PAYMENT_METHOD_INFO[exp.payment_method] || PAYMENT_METHOD_INFO.OTHER;
                  const isVoided = exp.status === "VOIDED";

                  return (
                    <tr
                      key={exp.id}
                      className={`hover:bg-zinc-50/80 transition-colors ${
                        isVoided ? "bg-red-50/20 opacity-75" : ""
                      }`}
                    >
                      {/* Expense # */}
                      <td className="py-3.5 px-4 font-mono font-bold text-xs text-[#063B2E]">
                        {exp.expense_number}
                      </td>

                      {/* Expense Date */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-zinc-700 font-medium">
                        {exp.expense_date}
                      </td>

                      {/* Title & Payee */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-zinc-900">{exp.title}</div>
                        {exp.vendor_payee && (
                          <div className="text-[11px] text-zinc-500 flex items-center gap-1 mt-0.5">
                            <Building size={11} />
                            <span>{exp.vendor_payee}</span>
                          </div>
                        )}
                        {exp.reference_number && (
                          <div className="text-[10px] text-zinc-400">
                            Ref: {exp.reference_number}
                          </div>
                        )}
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-zinc-100 text-zinc-800 border border-zinc-200">
                          {exp.category_name}
                        </span>
                      </td>

                      {/* Payment Method */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${pm.color}`}>
                          {pm.label}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <span
                          className={`font-black ${
                            isVoided ? "line-through text-zinc-400" : "text-[#063B2E]"
                          }`}
                        >
                          {formatCurrency(exp.amount)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {isVoided ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-700 border border-red-200">
                            <XCircle size={12} />
                            Voided
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 size={12} />
                            Active
                          </span>
                        )}
                      </td>

                      {/* Recorded By */}
                      <td className="py-3.5 px-4 text-xs text-zinc-500 whitespace-nowrap">
                        {exp.created_by_name || "Staff"}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* View Detail Drawer */}
                          <button
                            onClick={() => {
                              setSelectedExpenseId(exp.id);
                              setIsDetailDrawerOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-[#063B2E] hover:bg-emerald-50 transition-all"
                            title="View Details"
                          >
                            <Eye size={15} />
                          </button>

                          {!isVoided && (
                            <>
                              {/* Edit Button */}
                              <button
                                onClick={() => {
                                  setExpenseToEdit(exp);
                                  setIsEditModalOpen(true);
                                }}
                                className="p-1.5 rounded-lg text-zinc-500 hover:text-blue-600 hover:bg-blue-50 transition-all"
                                title="Edit Expense"
                              >
                                <Edit2 size={15} />
                              </button>

                              {/* Void Button */}
                              <button
                                onClick={() => {
                                  setExpenseToVoid(exp);
                                  setIsVoidModalOpen(true);
                                }}
                                className="p-1.5 rounded-lg text-zinc-500 hover:text-red-600 hover:bg-red-50 transition-all"
                                title="Void Expense"
                              >
                                <Trash2 size={15} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-zinc-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-600">
          <div>
            Showing <strong className="text-zinc-800">{expenseList.length}</strong> of{" "}
            <strong className="text-zinc-800">{totalCount}</strong> recorded expenses
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || isExpensesLoading}
              className="px-3 py-1.5 rounded-lg border border-zinc-200 text-zinc-700 font-bold hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1"
            >
              <ChevronLeft size={14} />
              <span>Previous</span>
            </button>
            <span className="px-3 py-1.5 font-bold text-zinc-800 bg-zinc-100 rounded-lg">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || isExpensesLoading}
              className="px-3 py-1.5 rounded-lg border border-zinc-200 text-zinc-700 font-bold hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1"
            >
              <span>Next</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ADD EXPENSE MODAL */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <AddExpenseModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          categories={categoriesData}
          onOpenCategoryModal={() => setIsCategoryModalOpen(true)}
          onSubmit={async (formData) => {
            try {
              await createExpense(formData).unwrap();
              toast.success("Expense recorded successfully");
              setIsAddModalOpen(false);
            } catch (err) {
              const errMsg =
                err?.data?.detail ||
                err?.data?.amount?.[0] ||
                err?.data?.title?.[0] ||
                "Failed to record expense";
              toast.error(errMsg);
            }
          }}
          isLoading={isCreating}
        />
      )}

      {/* ========================================================================= */}
      {/* EDIT EXPENSE MODAL */}
      {/* ========================================================================= */}
      {isEditModalOpen && expenseToEdit && (
        <EditExpenseModal
          isOpen={isEditModalOpen}
          expense={expenseToEdit}
          categories={categoriesData}
          onClose={() => {
            setIsEditModalOpen(false);
            setExpenseToEdit(null);
          }}
          onSubmit={async (id, data) => {
            try {
              await updateExpense({ id, body: data }).unwrap();
              toast.success("Expense updated successfully");
              setIsEditModalOpen(false);
              setExpenseToEdit(null);
            } catch (err) {
              const errMsg =
                err?.data?.detail ||
                err?.data?.amount?.[0] ||
                "Failed to update expense";
              toast.error(errMsg);
            }
          }}
          isLoading={isUpdating}
        />
      )}

      {/* ========================================================================= */}
      {/* VOID EXPENSE MODAL */}
      {/* ========================================================================= */}
      {isVoidModalOpen && expenseToVoid && (
        <VoidExpenseModal
          isOpen={isVoidModalOpen}
          expense={expenseToVoid}
          onClose={() => {
            setIsVoidModalOpen(false);
            setExpenseToVoid(null);
          }}
          onSubmit={async (id, reason) => {
            try {
              await voidExpense({ id, void_reason: reason }).unwrap();
              toast.success("Expense voided successfully");
              setIsVoidModalOpen(false);
              setExpenseToVoid(null);
            } catch (err) {
              toast.error(err?.data?.error || err?.data?.detail || "Failed to void expense");
            }
          }}
          isLoading={isVoiding}
        />
      )}

      {/* ========================================================================= */}
      {/* EXPENSE DETAIL DRAWER */}
      {/* ========================================================================= */}
      {isDetailDrawerOpen && (
        <ExpenseDetailDrawer
          isOpen={isDetailDrawerOpen}
          expense={expenseDetail}
          isLoading={isDetailLoading}
          onClose={() => {
            setIsDetailDrawerOpen(false);
            setSelectedExpenseId(null);
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* CATEGORIES MANAGEMENT MODAL */}
      {/* ========================================================================= */}
      {isCategoryModalOpen && (
        <CategoriesModal
          isOpen={isCategoryModalOpen}
          categories={categoriesData}
          onClose={() => setIsCategoryModalOpen(false)}
          onAdd={async (catData) => {
            try {
              await addCategory(catData).unwrap();
              toast.success("Category added successfully");
            } catch (err) {
              toast.error(err?.data?.name?.[0] || "Failed to add category");
            }
          }}
          onUpdate={async (id, catData) => {
            try {
              await updateCategory({ id, ...catData }).unwrap();
              toast.success("Category updated");
            } catch (err) {
              toast.error(err?.data?.name?.[0] || "Failed to update category");
            }
          }}
          isAdding={isAddingCategory}
          isUpdating={isUpdatingCategory}
        />
      )}
    </div>
  );
}

// ============================================================================
// ADD EXPENSE MODAL COMPONENT
// ============================================================================
function AddExpenseModal({ isOpen, onClose, categories, onOpenCategoryModal, onSubmit, isLoading }) {
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(() => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  });
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [vendorPayee, setVendorPayee] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [description, setDescription] = useState("");
  const [receiptFile, setReceiptFile] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Please enter an expense title");
      return;
    }
    if (!categoryId) {
      toast.error("Please select an expense category");
      return;
    }
    if (!amount || Number(amount) <= 0) {
      toast.error("Please enter a valid amount greater than 0");
      return;
    }
    if (!expenseDate) {
      toast.error("Please select the expense date");
      return;
    }

    const formData = new FormData();
    formData.append("title", title.trim());
    formData.append("category", categoryId);
    formData.append("amount", amount);
    formData.append("expense_date", expenseDate);
    formData.append("payment_method", paymentMethod);
    if (vendorPayee.trim()) formData.append("vendor_payee", vendorPayee.trim());
    if (referenceNumber.trim()) formData.append("reference_number", referenceNumber.trim());
    if (description.trim()) formData.append("description", description.trim());
    if (receiptFile) formData.append("receipt", receiptFile);

    onSubmit(formData);
  };

  const selectedCatObj = categories.find((c) => String(c.id) === String(categoryId));

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl border border-zinc-100 my-8">
        {/* Header */}
        <div className="bg-[#063B2E] text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-400 text-[#063B2E] flex items-center justify-center font-bold">
              <Plus size={22} />
            </div>
            <div>
              <h2 className="text-xl font-black">Record Expense</h2>
              <p className="text-xs text-emerald-200">Log restaurant operating expense with live preview</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white p-1 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Title & Category Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">
                Expense Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. October Rent, Electricity Bill"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2 text-xs sm:text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#063B2E]/20"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-zinc-700">
                  Category <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={onOpenCategoryModal}
                  className="text-[11px] font-bold text-[#063B2E] hover:underline"
                >
                  + Manage
                </button>
              </div>
              <select
                required
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3.5 py-2 text-xs sm:text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#063B2E]/20 font-medium"
              >
                <option value="">-- Select Category --</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Amount & Date Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">
                Amount (PKR) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">
                  Rs.
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2 text-xs sm:text-sm bg-zinc-50 border border-zinc-200 rounded-xl font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#063B2E]/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">
                Expense Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="w-full px-3.5 py-2 text-xs sm:text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#063B2E]/20"
              />
            </div>
          </div>

          {/* Payment Method & Vendor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">
                Payment Method <span className="text-red-500">*</span>
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3.5 py-2 text-xs sm:text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#063B2E]/20 font-medium"
              >
                <option value="CASH">Cash</option>
                <option value="CARD">Card</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="ONLINE">Online</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">
                Vendor / Payee <span className="text-zinc-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Electric Company, Landlord"
                value={vendorPayee}
                onChange={(e) => setVendorPayee(e.target.value)}
                className="w-full px-3.5 py-2 text-xs sm:text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#063B2E]/20"
              />
            </div>
          </div>

          {/* Reference # & Receipt Attachment */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">
                Bill / Reference # <span className="text-zinc-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. INV-98723, CHQ-1044"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                className="w-full px-3.5 py-2 text-xs sm:text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#063B2E]/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">
                Attach Receipt / Bill <span className="text-zinc-400 font-normal">(Optional)</span>
              </label>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-zinc-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-[#063B2E] hover:file:bg-emerald-100"
              />
            </div>
          </div>

          {/* Notes / Description */}
          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1">
              Description / Notes <span className="text-zinc-400 font-normal">(Optional)</span>
            </label>
            <textarea
              rows={2}
              placeholder="Additional details about this transaction..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 text-xs sm:text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#063B2E]/20"
            />
          </div>

          {/* Pre-Submission Live Summary Card */}
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 text-xs">
            <p className="font-bold text-[#063B2E] uppercase tracking-wider text-[11px] mb-2 flex items-center gap-1.5">
              <Sparkles size={14} className="text-yellow-600" />
              Live Expense Summary
            </p>
            <div className="grid grid-cols-2 gap-2 text-zinc-700">
              <div>
                Category: <strong>{selectedCatObj?.name || "Not Selected"}</strong>
              </div>
              <div>
                Amount: <strong className="text-[#063B2E] font-black">{formatCurrency(amount)}</strong>
              </div>
              <div>
                Payment Method: <strong>{PAYMENT_METHOD_INFO[paymentMethod]?.label || paymentMethod}</strong>
              </div>
              <div>
                Date: <strong>{expenseDate || "Not Set"}</strong>
              </div>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-100 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2.5 bg-[#063B2E] hover:bg-[#084D3C] text-yellow-400 font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50"
            >
              {isLoading ? "Saving Expense..." : "Save Expense"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// EDIT EXPENSE MODAL COMPONENT
// ============================================================================
function EditExpenseModal({ isOpen, expense, categories, onClose, onSubmit, isLoading }) {
  const [title, setTitle] = useState(expense.title || "");
  const [categoryId, setCategoryId] = useState(expense.category || "");
  const [amount, setAmount] = useState(expense.amount || "");
  const [expenseDate, setExpenseDate] = useState(expense.expense_date || "");
  const [paymentMethod, setPaymentMethod] = useState(expense.payment_method || "CASH");
  const [vendorPayee, setVendorPayee] = useState(expense.vendor_payee || "");
  const [referenceNumber, setReferenceNumber] = useState(expense.reference_number || "");
  const [description, setDescription] = useState(expense.description || "");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim() || !categoryId || !amount || Number(amount) <= 0 || !expenseDate) {
      toast.error("Please fill in all required fields");
      return;
    }

    const payload = {
      title: title.trim(),
      category: categoryId,
      amount,
      expense_date: expenseDate,
      payment_method: paymentMethod,
      vendor_payee: vendorPayee.trim(),
      reference_number: referenceNumber.trim(),
      description: description.trim(),
    };

    onSubmit(expense.id, payload);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl border border-zinc-100 my-8">
        <div className="bg-[#063B2E] text-white p-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black">Edit Expense</h2>
            <p className="text-xs text-emerald-200">Update record {expense.expense_number}</p>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white p-1 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">Expense Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">Category</label>
              <select
                required
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl font-medium"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">Amount (PKR)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl font-bold text-[#063B2E]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">Expense Date</label>
              <input
                type="date"
                required
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl"
              >
                <option value="CASH">Cash</option>
                <option value="CARD">Card</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="ONLINE">Online</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">Vendor / Payee</label>
              <input
                type="text"
                value={vendorPayee}
                onChange={(e) => setVendorPayee(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1">Bill / Ref #</label>
            <input
              type="text"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              className="w-full px-3.5 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1">Description / Notes</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2.5 bg-[#063B2E] text-yellow-400 font-bold text-xs rounded-xl hover:bg-[#084D3C] disabled:opacity-50"
            >
              {isLoading ? "Saving Changes..." : "Update Expense"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// VOID EXPENSE MODAL COMPONENT
// ============================================================================
function VoidExpenseModal({ isOpen, expense, onClose, onSubmit, isLoading }) {
  const [voidReason, setVoidReason] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!voidReason.trim()) {
      toast.error("Please provide a reason for voiding this expense");
      return;
    }
    onSubmit(expense.id, voidReason.trim());
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-zinc-100">
        <div className="bg-red-600 text-white p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <AlertTriangle size={22} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-black">Void Expense?</h2>
              <p className="text-xs text-red-100">{expense.expense_number}</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-800">
            <p className="font-bold">Notice regarding financial records:</p>
            <p className="mt-0.5">
              Voiding this expense will exclude it from all financial totals and summaries while preserving the audit record.
            </p>
          </div>

          <div className="text-xs text-zinc-700 space-y-1">
            <p>
              Title: <strong>{expense.title}</strong>
            </p>
            <p>
              Amount: <strong className="text-red-600">{formatCurrency(expense.amount)}</strong>
            </p>
            <p>
              Date: <strong>{expense.expense_date}</strong>
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1">
              Void Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              placeholder="e.g. Duplicate entry, incorrect amount, refunded..."
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              className="w-full px-3.5 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow transition-all disabled:opacity-50"
            >
              {isLoading ? "Voiding..." : "Void Expense"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// EXPENSE DETAIL DRAWER COMPONENT
// ============================================================================
function ExpenseDetailDrawer({ isOpen, expense, isLoading, onClose }) {
  if (!isOpen) return null;

  const isVoided = expense?.status === "VOIDED";
  const pm = expense ? PAYMENT_METHOD_INFO[expense.payment_method] || PAYMENT_METHOD_INFO.OTHER : null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex justify-end">
      <div className="bg-white w-full max-w-lg h-full overflow-y-auto shadow-2xl border-l border-zinc-200 flex flex-col justify-between">
        <div>
          {/* Drawer Top Header */}
          <div className="bg-[#063B2E] text-white p-6 flex items-center justify-between sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-yellow-400 text-[#063B2E] flex items-center justify-center font-bold">
                <Receipt size={20} />
              </div>
              <div>
                <h2 className="text-lg font-black">Expense Details</h2>
                <p className="text-xs text-emerald-200">{expense?.expense_number || "Loading..."}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-white/70 hover:text-white p-1 rounded-lg">
              <X size={20} />
            </button>
          </div>

          {isLoading || !expense ? (
            <div className="p-8 text-center text-xs text-zinc-400 animate-pulse">
              Loading expense detail...
            </div>
          ) : (
            <div className="p-6 space-y-6">
              {/* Status Banner if Voided */}
              {isVoided && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-xs text-red-800">
                  <div className="flex items-center gap-2 font-bold text-red-700">
                    <XCircle size={16} />
                    <span>This expense has been VOIDED</span>
                  </div>
                  <p className="mt-2 text-zinc-700">
                    <strong>Reason:</strong> {expense.void_reason || "No reason specified"}
                  </p>
                  <p className="text-[11px] text-zinc-500 mt-1">
                    Voided by {expense.voided_by_name || "Staff"} on {expense.voided_at}
                  </p>
                </div>
              )}

              {/* Amount Card */}
              <div className="bg-zinc-50 rounded-2xl p-4 border border-zinc-200/80">
                <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Amount</p>
                <p className={`text-3xl font-black mt-1 ${isVoided ? "line-through text-zinc-400" : "text-[#063B2E]"}`}>
                  {formatCurrency(expense.amount)}
                </p>
              </div>

              {/* Core Information Grid */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-zinc-500 font-semibold">Title</span>
                  <p className="font-bold text-zinc-900 mt-0.5">{expense.title}</p>
                </div>

                <div>
                  <span className="text-zinc-500 font-semibold">Category</span>
                  <p className="font-bold text-zinc-900 mt-0.5">{expense.category_name}</p>
                </div>

                <div>
                  <span className="text-zinc-500 font-semibold">Expense Date</span>
                  <p className="font-bold text-zinc-900 mt-0.5">{expense.expense_date}</p>
                </div>

                <div>
                  <span className="text-zinc-500 font-semibold">Payment Method</span>
                  <p className="font-bold text-zinc-900 mt-0.5">{pm?.label || expense.payment_method}</p>
                </div>

                <div>
                  <span className="text-zinc-500 font-semibold">Vendor / Payee</span>
                  <p className="font-bold text-zinc-900 mt-0.5">{expense.vendor_payee || "—"}</p>
                </div>

                <div>
                  <span className="text-zinc-500 font-semibold">Reference #</span>
                  <p className="font-bold text-zinc-900 mt-0.5">{expense.reference_number || "—"}</p>
                </div>
              </div>

              {/* Notes */}
              {expense.description && (
                <div className="text-xs">
                  <span className="text-zinc-500 font-semibold">Notes / Description</span>
                  <div className="mt-1 p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-800">
                    {expense.description}
                  </div>
                </div>
              )}

              {/* Receipt Preview */}
              {expense.receipt && (
                <div className="text-xs">
                  <span className="text-zinc-500 font-semibold">Attached Receipt</span>
                  <div className="mt-2 p-3 bg-zinc-50 border border-zinc-200 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2 text-zinc-700">
                      <Paperclip size={16} className="text-[#063B2E]" />
                      <span className="font-bold truncate max-w-xs">Receipt Document</span>
                    </div>
                    <a
                      href={expense.receipt}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-xs font-bold text-[#063B2E] hover:underline"
                    >
                      <span>View</span>
                      <ExternalLink size={13} />
                    </a>
                  </div>
                </div>
              )}

              {/* Audit Timestamps */}
              <div className="border-t border-zinc-100 pt-4 text-[11px] text-zinc-500 space-y-1">
                <p>
                  Recorded by: <strong>{expense.created_by_name || "Staff"}</strong>
                </p>
                <p>Recorded at: {new Date(expense.created_at).toLocaleString()}</p>
                <p>Last updated: {new Date(expense.updated_at).toLocaleString()}</p>
              </div>
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-zinc-200 bg-zinc-50 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#063B2E] text-yellow-400 rounded-xl font-bold text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// CATEGORIES MANAGEMENT MODAL
// ============================================================================
function CategoriesModal({ isOpen, categories, onClose, onAdd, onUpdate, isAdding, isUpdating }) {
  const [newCatName, setNewCatName] = useState("");
  const [newCatDesc, setNewCatDesc] = useState("");
  const [editingCatId, setEditingCatId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");

  const handleCreate = (e) => {
    e.preventDefault();
    if (!newCatName.trim()) {
      toast.error("Category name is required");
      return;
    }
    onAdd({ name: newCatName.trim(), description: newCatDesc.trim() });
    setNewCatName("");
    setNewCatDesc("");
  };

  const handleStartEdit = (cat) => {
    setEditingCatId(cat.id);
    setEditName(cat.name);
    setEditDesc(cat.description || "");
  };

  const handleSaveEdit = (catId) => {
    if (!editName.trim()) {
      toast.error("Category name cannot be blank");
      return;
    }
    onUpdate(catId, { name: editName.trim(), description: editDesc.trim() });
    setEditingCatId(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-zinc-100 max-h-[85vh] flex flex-col justify-between">
        {/* Header */}
        <div className="bg-[#063B2E] text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-400 text-[#063B2E] flex items-center justify-center font-bold">
              <Tag size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black">Expense Categories</h2>
              <p className="text-xs text-emerald-200">Manage categories for your restaurant</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white p-1 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Add Category Form */}
          <form onSubmit={handleCreate} className="p-4 bg-zinc-50 border border-zinc-200 rounded-2xl space-y-3">
            <p className="text-xs font-bold text-[#063B2E] uppercase tracking-wider">Add New Category</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                required
                placeholder="Category Name (e.g. Packaging)"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-zinc-200 rounded-xl focus:outline-none"
              />
              <input
                type="text"
                placeholder="Description (optional)"
                value={newCatDesc}
                onChange={(e) => setNewCatDesc(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-zinc-200 rounded-xl focus:outline-none"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isAdding}
                className="px-4 py-2 bg-[#063B2E] text-yellow-400 rounded-xl text-xs font-bold hover:bg-[#084D3C] disabled:opacity-50"
              >
                {isAdding ? "Adding..." : "+ Add Category"}
              </button>
            </div>
          </form>

          {/* Existing Categories List */}
          <div>
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">
              Existing Categories ({categories.length})
            </p>
            <div className="divide-y divide-zinc-100 max-h-60 overflow-y-auto border border-zinc-200 rounded-2xl">
              {categories.map((cat) => (
                <div key={cat.id} className="p-3.5 flex items-center justify-between hover:bg-zinc-50 text-xs">
                  {editingCatId === cat.id ? (
                    <div className="flex-1 flex items-center gap-2 mr-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="px-2 py-1 bg-white border border-zinc-300 rounded-lg text-xs flex-1"
                      />
                      <button
                        onClick={() => handleSaveEdit(cat.id)}
                        disabled={isUpdating}
                        className="px-2.5 py-1 bg-emerald-600 text-white font-bold rounded-lg text-xs"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingCatId(null)}
                        className="px-2 py-1 text-zinc-500 hover:text-zinc-700"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div>
                      <p className="font-bold text-zinc-900">{cat.name}</p>
                      {cat.description && <p className="text-[11px] text-zinc-500 mt-0.5">{cat.description}</p>}
                    </div>
                  )}

                  {editingCatId !== cat.id && (
                    <button
                      onClick={() => handleStartEdit(cat)}
                      className="p-1.5 text-zinc-400 hover:text-[#063B2E] hover:bg-zinc-100 rounded-lg"
                    >
                      <Edit2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-200 bg-zinc-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#063B2E] text-yellow-400 rounded-xl font-bold text-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
