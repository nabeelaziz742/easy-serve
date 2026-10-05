"use client";

import React, { useState, useMemo, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Boxes,
  Plus,
  Search,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  History,
  Edit2,
  Trash2,
  SlidersHorizontal,
  RefreshCw,
  DollarSign,
  Package,
  Layers,
  Scale,
  X,
  Info,
  AlertCircle,
  Flame,
  ClipboardList,
  TrendingDown,
  Calendar,
  Check,
  ArrowUpDown,
  HelpCircle,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import RoleGuard from "@/components/auth/RoleGuard";
import { useGetMeQuery } from "@/services/private/me";
import {
  useGetInventorySummaryQuery,
  useGetInventoryItemsQuery,
  useGetInventoryCategoriesQuery,
  useGetInventoryUnitsQuery,
  useGetInventoryMovementsQuery,
  useAddInventoryItemMutation,
  useUpdateInventoryItemMutation,
  useDeleteInventoryItemMutation,
  useAdjustInventoryStockMutation,
  useAddInventoryCategoryMutation,
  useDeleteInventoryCategoryMutation,
  useAddInventoryUnitMutation,
  useGetInventoryWastageQuery,
  useGetInventoryWastageSummaryQuery,
  useRecordInventoryWastageMutation,
  useSubmitPhysicalStockCountMutation,
} from "@/services/private/inventory";

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.22 } },
};

const WASTAGE_REASONS = [
  { value: 1, label: "Expired Stock", color: "bg-rose-100 text-rose-800 border-rose-200" },
  { value: 2, label: "Spoiled / Rotten", color: "bg-amber-100 text-amber-800 border-amber-200" },
  { value: 3, label: "Damaged in Handling", color: "bg-orange-100 text-orange-800 border-orange-200" },
  { value: 4, label: "Preparation Loss / Trimming", color: "bg-blue-100 text-blue-800 border-blue-200" },
  { value: 5, label: "Overproduction / Unsold", color: "bg-purple-100 text-purple-800 border-purple-200" },
  { value: 6, label: "Spillage / Dropped", color: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  { value: 7, label: "Theft / Loss", color: "bg-red-100 text-red-900 border-red-300" },
  { value: 8, label: "Quality Issue / Rejected", color: "bg-pink-100 text-pink-800 border-pink-200" },
  { value: 9, label: "Other Operational Loss", color: "bg-stone-100 text-stone-800 border-stone-200" },
];

const ADJUSTMENT_REASONS = [
  { value: 2, label: "Physical Stock Count / Audit" },
  { value: 6, label: "Stock Correction (Increase)" },
  { value: 7, label: "Stock Correction (Decrease)" },
  { value: 3, label: "Damaged in Handling" },
  { value: 4, label: "Expired / Discarded" },
  { value: 1, label: "Opening Stock Initial Count" },
  { value: 8, label: "Other Operational Adjustment" },
];

function InventoryContent() {
  const searchParams = useSearchParams();
  const actionParam = searchParams ? searchParams.get("action") : null;

  const { data: me } = useGetMeQuery();
  const profile = me?.profile;
  const restaurantId =
    profile?.restaurant?.id ||
    profile?.selected_restaurant ||
    profile?.owned_restaurants?.[0]?.id ||
    null;

  // Active Navigation Tab: items | wastage | stock_count | movements | categories_units
  const [activeTab, setActiveTab] = useState("items");

  // Search & Filter state for Items
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  // Search & Filter state for Wastage
  const [wastageSearch, setWastageSearch] = useState("");
  const [wastageReasonFilter, setWastageReasonFilter] = useState("all");
  const [wastageStartDate, setWastageStartDate] = useState("");
  const [wastageEndDate, setWastageEndDate] = useState("");

  // Ledger Filter state
  const [movementSearch, setMovementSearch] = useState("");
  const [movementTypeFilter, setMovementTypeFilter] = useState("all");

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [adjustingItem, setAdjustingItem] = useState(null);
  const [historyItem, setHistoryItem] = useState(null);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [isAddUnitOpen, setIsAddUnitOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState(null);
  const [deletingCategory, setDeletingCategory] = useState(null);

  // Phase 4: Wastage Modal State
  const [isWastageModalOpen, setIsWastageModalOpen] = useState(false);
  const [wastageTargetItem, setWastageTargetItem] = useState(null);
  const [wastageForm, setWastageForm] = useState({
    inventory_item_id: "",
    quantity: "",
    uom_id: "",
    reason: 1,
    notes: "",
    wastage_date: new Date().toISOString().split("T")[0],
  });
  const [wastageConfirmStep, setWastageConfirmStep] = useState(false);

  // Phase 4: Stock Count Reconciliation Sheet State
  const [stockCounts, setStockCounts] = useState({}); // { [itemId]: { physical: "", notes: "" } }
  const [stockCountFilterCategory, setStockCountFilterCategory] = useState("all");
  const [stockCountSearch, setStockCountSearch] = useState("");
  const [isStockCountConfirmOpen, setIsStockCountConfirmOpen] = useState(false);
  const [stockCountAuditNotes, setStockCountAuditNotes] = useState("");

  // Notification Banner
  const [notification, setNotification] = useState(null);

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // Quick Action Routing from URL params
  useEffect(() => {
    if (actionParam === "add") {
      setIsAddModalOpen(true);
    } else if (actionParam === "wastage") {
      setActiveTab("wastage");
      setIsWastageModalOpen(true);
    } else if (actionParam === "stock-count") {
      setActiveTab("stock_count");
    } else if (actionParam === "ledger") {
      setActiveTab("movements");
    }
  }, [actionParam]);

  // RTK Queries
  const queryParams = useMemo(() => {
    const params = {};
    if (restaurantId) params.restaurant_id = restaurantId;
    if (selectedCategory !== "all") params.category_id = selectedCategory;
    if (selectedStatus !== "all") params.status = selectedStatus;
    if (searchQuery.trim()) params.search = searchQuery.trim();
    return params;
  }, [restaurantId, selectedCategory, selectedStatus, searchQuery]);

  const {
    data: summaryData,
    isLoading: isLoadingSummary,
    refetch: refetchSummary,
  } = useGetInventorySummaryQuery(
    restaurantId ? { restaurant_id: restaurantId } : undefined,
    { skip: !restaurantId, pollingInterval: 12000 }
  );

  const {
    data: itemsData,
    isLoading: isLoadingItems,
    isFetching: isFetchingItems,
    refetch: refetchItems,
  } = useGetInventoryItemsQuery(queryParams, { skip: !restaurantId });

  const { data: categoriesData, refetch: refetchCategories } =
    useGetInventoryCategoriesQuery(
      restaurantId ? { restaurant_id: restaurantId } : undefined,
      { skip: !restaurantId }
    );

  const { data: unitsData } = useGetInventoryUnitsQuery(
    restaurantId ? { restaurant_id: restaurantId } : undefined,
    { skip: !restaurantId }
  );

  // Wastage queries
  const wastageQueryParams = useMemo(() => {
    const params = {};
    if (restaurantId) params.restaurant_id = restaurantId;
    if (wastageSearch.trim()) params.search = wastageSearch.trim();
    if (wastageReasonFilter !== "all") params.reason = wastageReasonFilter;
    if (wastageStartDate) params.start_date = wastageStartDate;
    if (wastageEndDate) params.end_date = wastageEndDate;
    return params;
  }, [restaurantId, wastageSearch, wastageReasonFilter, wastageStartDate, wastageEndDate]);

  const {
    data: wastageData,
    isLoading: isLoadingWastage,
    refetch: refetchWastage,
  } = useGetInventoryWastageQuery(wastageQueryParams, {
    skip: !restaurantId || activeTab !== "wastage",
  });

  const {
    data: wastageSummaryData,
    isLoading: isLoadingWastageSummary,
    refetch: refetchWastageSummary,
  } = useGetInventoryWastageSummaryQuery(
    restaurantId ? { restaurant_id: restaurantId } : undefined,
    { skip: !restaurantId }
  );

  // Movement ledger query
  const movementParams = useMemo(() => {
    const params = {};
    if (restaurantId) params.restaurant_id = restaurantId;
    if (movementSearch.trim()) params.search = movementSearch.trim();
    if (movementTypeFilter !== "all") params.movement_type = movementTypeFilter;
    if (historyItem) params.item_id = historyItem.id;
    return params;
  }, [restaurantId, movementSearch, movementTypeFilter, historyItem]);

  const {
    data: movementsData,
    isLoading: isLoadingMovements,
    refetch: refetchMovements,
  } = useGetInventoryMovementsQuery(movementParams, { skip: !restaurantId });

  // Mutations
  const [addInventoryItem, { isLoading: isAddingItem }] = useAddInventoryItemMutation();
  const [updateInventoryItem, { isLoading: isUpdatingItem }] = useUpdateInventoryItemMutation();
  const [deleteInventoryItem, { isLoading: isDeletingItem }] = useDeleteInventoryItemMutation();
  const [adjustInventoryStock, { isLoading: isAdjustingStock }] = useAdjustInventoryStockMutation();
  const [addInventoryCategory, { isLoading: isAddingCategory }] = useAddInventoryCategoryMutation();
  const [deleteInventoryCategory, { isLoading: isDeletingCategory }] = useDeleteInventoryCategoryMutation();
  const [addInventoryUnit, { isLoading: isAddingUnit }] = useAddInventoryUnitMutation();
  const [recordInventoryWastage, { isLoading: isRecordingWastage }] = useRecordInventoryWastageMutation();
  const [submitPhysicalStockCount, { isLoading: isSubmittingStockCount }] = useSubmitPhysicalStockCountMutation();

  // Safe data arrays
  const items = Array.isArray(itemsData) ? itemsData : itemsData?.results || [];
  const categories = Array.isArray(categoriesData) ? categoriesData : categoriesData?.results || [];
  const units = Array.isArray(unitsData) ? unitsData : unitsData?.results || [];
  const movements = Array.isArray(movementsData) ? movementsData : movementsData?.results || [];
  const wastageList = Array.isArray(wastageData) ? wastageData : wastageData?.results || [];

  const summary = summaryData || {
    total_items: items.length,
    total_stock_value: "0.00",
    low_stock_count: 0,
    out_of_stock_count: 0,
    categories_count: categories.length,
    this_month_wastage_cost: "0.00",
  };

  const wastageSummary = wastageSummaryData || {
    today_cost: "0.00",
    this_week_cost: "0.00",
    this_month_cost: "0.00",
    total_records: 0,
    total_quantity: "0.000",
    top_wasted_items: [],
    top_reasons: [],
  };

  const handleRefreshAll = () => {
    refetchSummary();
    refetchItems();
    refetchMovements();
    if (activeTab === "wastage") {
      refetchWastage();
      refetchWastageSummary();
    }
    showNotification("success", "Inventory data refreshed.");
  };

  // Helper: Open Record Wastage modal for a specific item
  const handleOpenWastageForItem = (item) => {
    setWastageTargetItem(item);
    setWastageForm({
      inventory_item_id: item.id,
      quantity: "",
      uom_id: item.uom || "",
      reason: 1,
      notes: "",
      wastage_date: new Date().toISOString().split("T")[0],
    });
    setWastageConfirmStep(false);
    setIsWastageModalOpen(true);
  };

  // Handle Wastage Form Submit
  const handleRecordWastageSubmit = async (e) => {
    e.preventDefault();
    if (!wastageForm.inventory_item_id) {
      showNotification("error", "Please select an inventory item.");
      return;
    }
    if (!wastageForm.quantity || Number(wastageForm.quantity) <= 0) {
      showNotification("error", "Please enter a valid wastage quantity > 0.");
      return;
    }

    if (!wastageConfirmStep) {
      setWastageConfirmStep(true);
      return;
    }

    try {
      const payload = {
        restaurant_id: restaurantId,
        inventory_item_id: Number(wastageForm.inventory_item_id),
        quantity: Number(wastageForm.quantity).toFixed(3),
        reason: Number(wastageForm.reason),
        notes: wastageForm.notes,
        wastage_date: wastageForm.wastage_date,
      };
      if (wastageForm.uom_id) payload.uom_id = Number(wastageForm.uom_id);

      await recordInventoryWastage(payload).unwrap();
      showNotification("success", "Wastage recorded and stock deducted successfully.");
      setIsWastageModalOpen(false);
      setWastageConfirmStep(false);
      setWastageForm({
        inventory_item_id: "",
        quantity: "",
        uom_id: "",
        reason: 1,
        notes: "",
        wastage_date: new Date().toISOString().split("T")[0],
      });
      setWastageTargetItem(null);
    } catch (err) {
      const msg = err?.data?.message || err?.data?.detail || err?.data?.quantity?.[0] || "Failed to record wastage.";
      showNotification("error", msg);
      setWastageConfirmStep(false);
    }
  };

  // Stock Count Worksheet Logic
  const filteredStockCountItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        !stockCountSearch.trim() ||
        item.name.toLowerCase().includes(stockCountSearch.toLowerCase()) ||
        (item.sku && item.sku.toLowerCase().includes(stockCountSearch.toLowerCase()));
      const matchesCategory =
        stockCountFilterCategory === "all" ||
        item.category === Number(stockCountFilterCategory) ||
        item.category?.id === Number(stockCountFilterCategory);
      return matchesSearch && matchesCategory;
    });
  }, [items, stockCountSearch, stockCountFilterCategory]);

  const stockCountDiscrepancies = useMemo(() => {
    const list = [];
    filteredStockCountItems.forEach((item) => {
      const entry = stockCounts[item.id];
      if (entry && entry.physical !== "" && !isNaN(Number(entry.physical))) {
        const physical = Number(entry.physical);
        const system = Number(item.current_stock || 0);
        const variance = physical - system;
        const unitCost = Number(item.cost_per_unit || 0);
        const varianceValue = Math.abs(variance) * unitCost;

        if (Math.abs(variance) > 0.0001) {
          list.push({
            item,
            system,
            physical,
            variance,
            unitCost,
            varianceValue,
            notes: entry.notes || "",
          });
        }
      }
    });
    return list;
  }, [filteredStockCountItems, stockCounts]);

  const totalVarianceImpactValue = useMemo(() => {
    return stockCountDiscrepancies.reduce((sum, d) => sum + d.varianceValue, 0);
  }, [stockCountDiscrepancies]);

  const handleStockCountPhysicalChange = (itemId, val) => {
    setStockCounts((prev) => ({
      ...prev,
      [itemId]: {
        ...(prev[itemId] || {}),
        physical: val,
      },
    }));
  };

  const handleStockCountNotesChange = (itemId, val) => {
    setStockCounts((prev) => ({
      ...prev,
      [itemId]: {
        ...(prev[itemId] || {}),
        notes: val,
      },
    }));
  };

  const handleSubmitPhysicalStockCount = async () => {
    const itemsPayload = [];
    Object.entries(stockCounts).forEach(([itemId, entry]) => {
      if (entry.physical !== "" && !isNaN(Number(entry.physical))) {
        itemsPayload.push({
          inventory_item_id: Number(itemId),
          physical_count: Number(entry.physical).toFixed(3),
          notes: entry.notes || "",
        });
      }
    });

    if (itemsPayload.length === 0) {
      showNotification("error", "No physical stock counts entered.");
      return;
    }

    try {
      const res = await submitPhysicalStockCount({
        restaurant_id: restaurantId,
        items: itemsPayload,
        audit_notes: stockCountAuditNotes,
      }).unwrap();

      showNotification("success", res.message || "Physical stock count processed successfully.");
      setIsStockCountConfirmOpen(false);
      setStockCounts({});
      setStockCountAuditNotes("");
    } catch (err) {
      const msg = err?.data?.message || err?.data?.detail || "Failed to process stock count.";
      showNotification("error", msg);
    }
  };

  return (
    <RoleGuard allowedRoles={["manager", "restaurant_owner", "super_admin", "chef"]}>
      <div className="min-h-full bg-[#F7F7F4] p-4 sm:p-6 lg:p-8 text-stone-900 font-sans">
        {/* NOTIFICATION TOAST */}
        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`fixed top-20 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border text-sm font-semibold ${
                notification.type === "success"
                  ? "bg-[#063B2E] text-white border-yellow-400/40"
                  : "bg-rose-900 text-white border-rose-500/40"
              }`}
            >
              {notification.type === "success" ? (
                <CheckCircle2 className="w-5 h-5 text-yellow-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-rose-300 shrink-0" />
              )}
              <span>{notification.message}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-xl bg-[#063B2E] text-yellow-400 flex items-center justify-center shadow-md">
                <Boxes size={18} />
              </div>
              <span className="text-xs uppercase tracking-widest font-bold text-[#063B2E]/70">
                Commercial Kitchen SaaS
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#063B2E]">
              Inventory, Wastage &amp; Stock Control
            </h1>
            <p className="text-xs sm:text-sm text-stone-600">
              Manage stock levels, record food wastage &amp; spoilage, perform physical counts, and audit inventory movements.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={handleRefreshAll}
              className="p-2.5 rounded-xl border border-stone-300 bg-white text-stone-700 hover:bg-stone-100 hover:text-stone-900 shadow-sm transition-all"
              title="Refresh Data"
            >
              <RefreshCw size={16} className={isFetchingItems ? "animate-spin text-[#063B2E]" : ""} />
            </button>

            <button
              type="button"
              onClick={() => {
                setWastageTargetItem(null);
                setWastageForm({
                  inventory_item_id: "",
                  quantity: "",
                  uom_id: "",
                  reason: 1,
                  notes: "",
                  wastage_date: new Date().toISOString().split("T")[0],
                });
                setWastageConfirmStep(false);
                setIsWastageModalOpen(true);
              }}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-900 font-bold text-sm shadow-sm transition-all"
            >
              <Flame size={16} className="text-rose-600" />
              <span>Record Wastage</span>
            </button>

            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#063B2E] hover:bg-[#084c3b] text-white font-bold text-sm shadow-md hover:shadow-lg transition-all"
            >
              <Plus size={17} className="text-yellow-400" />
              <span>Add Item</span>
            </button>
          </div>
        </div>

        {/* TOP KPI CARDS */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
        >
          {/* Card 1: Total Stock Value */}
          <motion.div variants={itemVariants}>
            <Card className="p-4 rounded-2xl border-none bg-gradient-to-br from-[#063B2E] via-[#084838] to-[#0a5744] text-white shadow-md relative overflow-hidden">
              <div className="absolute -right-4 -bottom-4 opacity-10">
                <DollarSign className="w-20 h-20 text-yellow-400" />
              </div>
              <div className="flex justify-between items-start mb-2 relative z-10">
                <div className="p-2 bg-yellow-400/20 rounded-xl text-yellow-400 ring-1 ring-yellow-400/30">
                  <DollarSign className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold text-black bg-yellow-400 px-2 py-0.5 rounded-full">
                  Live Valuation
                </span>
              </div>
              <p className="text-stone-300 font-semibold tracking-wider text-[10px] uppercase">
                Total Stock Value
              </p>
              {isLoadingSummary ? (
                <Skeleton className="h-7 w-28 mt-1 bg-white/20" />
              ) : (
                <h2 className="text-2xl font-black tracking-tight text-white">
                  Rs. {Number(summary.total_stock_value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h2>
              )}
            </Card>
          </motion.div>

          {/* Card 2: Tracked Items */}
          <motion.div variants={itemVariants}>
            <Card className="p-4 rounded-2xl border-stone-200/80 bg-white shadow-sm hover:shadow-md transition-all">
              <div className="flex justify-between items-start mb-2">
                <div className="p-2 bg-stone-100 rounded-xl text-[#063B2E] ring-1 ring-stone-200">
                  <Package className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold text-[#063B2E] bg-stone-100 px-2 py-0.5 rounded-full">
                  {summary.categories_count} Categories
                </span>
              </div>
              <p className="text-stone-500 font-semibold tracking-wider text-[10px] uppercase">
                Tracked Items
              </p>
              {isLoadingSummary ? (
                <Skeleton className="h-7 w-20 mt-1" />
              ) : (
                <h2 className="text-2xl font-black tracking-tight text-stone-900">
                  {summary.total_items}
                </h2>
              )}
            </Card>
          </motion.div>

          {/* Card 3: Month Wastage Cost */}
          <motion.div variants={itemVariants}>
            <Card
              onClick={() => setActiveTab("wastage")}
              className="p-4 rounded-2xl border-rose-200/80 bg-white hover:bg-rose-50/40 shadow-sm hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex justify-between items-start mb-2">
                <div className="p-2 rounded-xl bg-rose-100 text-rose-700 ring-1 ring-rose-300">
                  <Flame className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded-full">
                  This Month
                </span>
              </div>
              <p className="text-stone-500 font-semibold tracking-wider text-[10px] uppercase">
                Monthly Wastage Loss
              </p>
              {isLoadingSummary || isLoadingWastageSummary ? (
                <Skeleton className="h-7 w-24 mt-1" />
              ) : (
                <h2 className="text-2xl font-black tracking-tight text-rose-950">
                  Rs. {Number(wastageSummary.this_month_cost || summary.this_month_wastage_cost || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h2>
              )}
            </Card>
          </motion.div>

          {/* Card 4: Low / Out of Stock Alerts */}
          <motion.div variants={itemVariants}>
            <Card
              onClick={() => {
                setSelectedStatus(Number(summary.out_of_stock_count) > 0 ? "out_of_stock" : "low_stock");
                setActiveTab("items");
              }}
              className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                Number(summary.out_of_stock_count) > 0
                  ? "border-rose-300 bg-rose-50/50 hover:bg-rose-50"
                  : Number(summary.low_stock_count) > 0
                  ? "border-amber-300 bg-amber-50/50 hover:bg-amber-50"
                  : "border-stone-200 bg-white"
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <div className={`p-2 rounded-xl ring-1 ${
                  Number(summary.out_of_stock_count) > 0
                    ? "bg-rose-100 text-rose-700 ring-rose-300"
                    : Number(summary.low_stock_count) > 0
                    ? "bg-amber-100 text-amber-700 ring-amber-300"
                    : "bg-stone-100 text-stone-600 ring-stone-200"
                }`}>
                  <AlertTriangle className="w-5 h-5" />
                </div>
                {(Number(summary.low_stock_count) > 0 || Number(summary.out_of_stock_count) > 0) && (
                  <span className="text-[10px] font-bold text-amber-900 bg-amber-200 px-2 py-0.5 rounded-full">
                    Action Required
                  </span>
                )}
              </div>
              <p className="text-stone-500 font-semibold tracking-wider text-[10px] uppercase">
                Stock Warnings
              </p>
              {isLoadingSummary ? (
                <Skeleton className="h-7 w-20 mt-1" />
              ) : (
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xl font-black text-amber-950">
                    {summary.low_stock_count} Low
                  </span>
                  <span className="text-stone-300 font-bold">|</span>
                  <span className="text-xl font-black text-rose-950">
                    {summary.out_of_stock_count} Depleted
                  </span>
                </div>
              )}
            </Card>
          </motion.div>
        </motion.div>

        {/* NAVIGATION TABS */}
        <div className="flex items-center gap-2 border-b border-stone-200 mb-6 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setActiveTab("items")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
              activeTab === "items"
                ? "bg-[#063B2E] text-white shadow-sm"
                : "text-stone-600 hover:text-stone-900 hover:bg-stone-200/60"
            }`}
          >
            <Boxes size={16} className={activeTab === "items" ? "text-yellow-400" : ""} />
            <span>Inventory Items ({items.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("wastage")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
              activeTab === "wastage"
                ? "bg-[#063B2E] text-white shadow-sm"
                : "text-stone-600 hover:text-stone-900 hover:bg-stone-200/60"
            }`}
          >
            <Flame size={16} className={activeTab === "wastage" ? "text-yellow-400" : ""} />
            <span>Wastage &amp; Loss</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("stock_count")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
              activeTab === "stock_count"
                ? "bg-[#063B2E] text-white shadow-sm"
                : "text-stone-600 hover:text-stone-900 hover:bg-stone-200/60"
            }`}
          >
            <ClipboardList size={16} className={activeTab === "stock_count" ? "text-yellow-400" : ""} />
            <span>Physical Stock Count / Audit</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("movements")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
              activeTab === "movements"
                ? "bg-[#063B2E] text-white shadow-sm"
                : "text-stone-600 hover:text-stone-900 hover:bg-stone-200/60"
            }`}
          >
            <History size={16} className={activeTab === "movements" ? "text-yellow-400" : ""} />
            <span>Movement Audit Ledger</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("categories_units")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
              activeTab === "categories_units"
                ? "bg-[#063B2E] text-white shadow-sm"
                : "text-stone-600 hover:text-stone-900 hover:bg-stone-200/60"
            }`}
          >
            <Layers size={16} className={activeTab === "categories_units" ? "text-yellow-400" : ""} />
            <span>Categories &amp; Units</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: INVENTORY ITEMS */}
        {/* ========================================================================= */}
        {activeTab === "items" && (
          <div>
            {/* SEARCH & FILTERS BAR */}
            <div className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-sm mb-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by item name or SKU..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#063B2E]/20 focus:border-[#063B2E]"
                />
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="text-xs sm:text-sm bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#063B2E]/20"
                >
                  <option value="all">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="text-xs sm:text-sm bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#063B2E]/20"
                >
                  <option value="all">All Stock Statuses</option>
                  <option value="in_stock">In Stock</option>
                  <option value="low_stock">Low Stock Alerts</option>
                  <option value="out_of_stock">Out of Stock</option>
                </select>
              </div>
            </div>

            {/* ITEMS TABLE */}
            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 text-xs uppercase tracking-wider font-bold">
                      <th className="py-3.5 px-4">Item Details</th>
                      <th className="py-3.5 px-4">Category</th>
                      <th className="py-3.5 px-4 text-right">Current Stock</th>
                      <th className="py-3.5 px-4 text-right">Unit Cost (WAC)</th>
                      <th className="py-3.5 px-4 text-right">Stock Valuation</th>
                      <th className="py-3.5 px-4 text-center">Status</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {isLoadingItems ? (
                      [...Array(5)].map((_, idx) => (
                        <tr key={idx}>
                          <td colSpan={7} className="py-3.5 px-4">
                            <Skeleton className="h-6 w-full" />
                          </td>
                        </tr>
                      ))
                    ) : items.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-stone-500">
                          <Package className="w-12 h-12 text-stone-300 mx-auto mb-3" />
                          <p className="font-bold text-base text-stone-700">No Inventory Items Found</p>
                          <p className="text-xs text-stone-500 mt-1">
                            Add your raw ingredients, beverages, or packaging items to start tracking stock.
                          </p>
                          <button
                            type="button"
                            onClick={() => setIsAddModalOpen(true)}
                            className="mt-4 px-4 py-2 rounded-xl bg-[#063B2E] text-white font-bold text-xs shadow-sm hover:bg-[#084c3b]"
                          >
                            + Add First Item
                          </button>
                        </td>
                      </tr>
                    ) : (
                      items.map((item) => {
                        const isDepleted = Number(item.current_stock) <= 0;
                        const isLow = !isDepleted && Number(item.current_stock) <= Number(item.min_reorder_level);
                        const unitCode = item.uom_code || item.uom_short_code || "";

                        return (
                          <tr key={item.id} className="hover:bg-stone-50/80 transition-colors group">
                            <td className="py-3.5 px-4 font-semibold text-stone-900">
                              <div className="font-bold text-sm text-stone-900">{item.name}</div>
                              <div className="text-[11px] text-stone-500 font-mono">
                                SKU: {item.sku || "N/A"}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-stone-600 text-xs">
                              <span className="px-2 py-0.5 bg-stone-100 text-stone-700 rounded-md font-medium">
                                {item.category_name || "Uncategorized"}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right font-black text-sm">
                              <span className={isDepleted ? "text-rose-600" : isLow ? "text-amber-700" : "text-stone-900"}>
                                {Number(item.current_stock || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 3 })}
                              </span>{" "}
                              <span className="text-stone-500 text-xs font-normal">{unitCode}</span>
                            </td>
                            <td className="py-3.5 px-4 text-right text-stone-700 text-sm font-medium">
                              Rs. {Number(item.cost_per_unit || 0).toFixed(2)}
                            </td>
                            <td className="py-3.5 px-4 text-right font-bold text-stone-900 text-sm">
                              Rs. {Number(item.stock_value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              {isDepleted ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                  <XCircle size={12} /> Depleted
                                </span>
                              ) : isLow ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                  <AlertTriangle size={12} /> Low Stock
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  <CheckCircle2 size={12} /> In Stock
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleOpenWastageForItem(item)}
                                  className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 transition-all"
                                  title="Record Food Waste / Spoilage"
                                >
                                  <Flame size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setAdjustingItem(item)}
                                  className="p-1.5 rounded-lg border border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100 transition-all"
                                  title="Manual Stock Adjustment"
                                >
                                  <SlidersHorizontal size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setHistoryItem(item)}
                                  className="p-1.5 rounded-lg border border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100 transition-all"
                                  title="View Movement History"
                                >
                                  <History size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingItem(item)}
                                  className="p-1.5 rounded-lg border border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100 transition-all"
                                  title="Edit Item"
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeletingItem(item)}
                                  className="p-1.5 rounded-lg border border-stone-200 bg-stone-50 text-rose-600 hover:bg-rose-50 transition-all"
                                  title="Delete Item"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: WASTAGE & LOSS DASHBOARD */}
        {/* ========================================================================= */}
        {activeTab === "wastage" && (
          <div>
            {/* WASTAGE SUMMARY CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card className="p-4 rounded-2xl bg-white border border-rose-200/80 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <div className="p-2 bg-rose-100 rounded-xl text-rose-700 ring-1 ring-rose-200">
                    <Flame className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded-full">
                    Today
                  </span>
                </div>
                <p className="text-stone-500 font-semibold tracking-wider text-[10px] uppercase">
                  Today's Wastage Loss
                </p>
                <h3 className="text-2xl font-black text-rose-950 mt-1">
                  Rs. {Number(wastageSummary.today_cost || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h3>
              </Card>

              <Card className="p-4 rounded-2xl bg-white border border-rose-200/80 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <div className="p-2 bg-amber-100 rounded-xl text-amber-700 ring-1 ring-amber-200">
                    <TrendingDown className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                    This Week
                  </span>
                </div>
                <p className="text-stone-500 font-semibold tracking-wider text-[10px] uppercase">
                  Week-to-Date Loss
                </p>
                <h3 className="text-2xl font-black text-amber-950 mt-1">
                  Rs. {Number(wastageSummary.this_week_cost || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h3>
              </Card>

              <Card className="p-4 rounded-2xl bg-white border border-rose-200/80 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <div className="p-2 bg-purple-100 rounded-xl text-purple-700 ring-1 ring-purple-200">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold text-purple-800 bg-purple-100 px-2 py-0.5 rounded-full">
                    This Month
                  </span>
                </div>
                <p className="text-stone-500 font-semibold tracking-wider text-[10px] uppercase">
                  Month-to-Date Loss
                </p>
                <h3 className="text-2xl font-black text-purple-950 mt-1">
                  Rs. {Number(wastageSummary.this_month_cost || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h3>
              </Card>

              <Card className="p-4 rounded-2xl bg-white border border-stone-200 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <div className="p-2 bg-stone-100 rounded-xl text-stone-700 ring-1 ring-stone-200">
                    <ClipboardList className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold text-stone-700 bg-stone-100 px-2 py-0.5 rounded-full">
                    Audited Records
                  </span>
                </div>
                <p className="text-stone-500 font-semibold tracking-wider text-[10px] uppercase">
                  Total Discard Incidents
                </p>
                <h3 className="text-2xl font-black text-stone-900 mt-1">
                  {wastageSummary.total_records}
                </h3>
              </Card>
            </div>

            {/* TOP WASTED ITEMS & TOP REASONS HIGHLIGHT */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
              <Card className="p-4 rounded-2xl bg-white border border-stone-200 shadow-sm">
                <h4 className="text-xs uppercase tracking-wider font-bold text-[#063B2E] mb-3 flex items-center gap-2">
                  <Flame size={15} className="text-rose-600" />
                  Top Wasted Ingredients
                </h4>
                {wastageSummary.top_wasted_items && wastageSummary.top_wasted_items.length > 0 ? (
                  <div className="space-y-2.5">
                    {wastageSummary.top_wasted_items.map((itm, i) => (
                      <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50 border border-stone-100">
                        <div>
                          <p className="font-bold text-xs text-stone-900">{itm.item_name}</p>
                          <p className="text-[11px] text-stone-500">
                            {itm.total_qty} {itm.unit_code} ({itm.incidents} incidents)
                          </p>
                        </div>
                        <span className="font-black text-xs text-rose-900">
                          Rs. {Number(itm.total_loss).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-stone-500 italic py-4 text-center">
                    No wastage incidents logged yet.
                  </p>
                )}
              </Card>

              <Card className="p-4 rounded-2xl bg-white border border-stone-200 shadow-sm">
                <h4 className="text-xs uppercase tracking-wider font-bold text-[#063B2E] mb-3 flex items-center gap-2">
                  <TrendingDown size={15} className="text-amber-600" />
                  Loss Breakdown by Category / Reason
                </h4>
                {wastageSummary.top_reasons && wastageSummary.top_reasons.length > 0 ? (
                  <div className="space-y-2.5">
                    {wastageSummary.top_reasons.map((r, i) => (
                      <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50 border border-stone-100">
                        <span className="font-bold text-xs text-stone-800">{r.reason_label}</span>
                        <div className="text-right">
                          <span className="font-black text-xs text-rose-900 block">
                            Rs. {Number(r.total_loss).toFixed(2)}
                          </span>
                          <span className="text-[10px] text-stone-500">
                            {r.incidents} incidents
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-stone-500 italic py-4 text-center">
                    No categorized losses logged.
                  </p>
                )}
              </Card>
            </div>

            {/* WASTAGE FILTER BAR */}
            <div className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-sm mb-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search wastage by item, sku, notes..."
                  value={wastageSearch}
                  onChange={(e) => setWastageSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#063B2E]/20"
                />
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                <select
                  value={wastageReasonFilter}
                  onChange={(e) => setWastageReasonFilter(e.target.value)}
                  className="text-xs sm:text-sm bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-700 font-medium focus:outline-none"
                >
                  <option value="all">All Wastage Reasons</option>
                  {WASTAGE_REASONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>

                <input
                  type="date"
                  value={wastageStartDate}
                  onChange={(e) => setWastageStartDate(e.target.value)}
                  className="text-xs bg-stone-50 border border-stone-200 rounded-xl px-2.5 py-2 text-stone-700 font-medium focus:outline-none"
                  title="Filter From Date"
                />
                <input
                  type="date"
                  value={wastageEndDate}
                  onChange={(e) => setWastageEndDate(e.target.value)}
                  className="text-xs bg-stone-50 border border-stone-200 rounded-xl px-2.5 py-2 text-stone-700 font-medium focus:outline-none"
                  title="Filter To Date"
                />

                {(wastageSearch || wastageReasonFilter !== "all" || wastageStartDate || wastageEndDate) && (
                  <button
                    type="button"
                    onClick={() => {
                      setWastageSearch("");
                      setWastageReasonFilter("all");
                      setWastageStartDate("");
                      setWastageEndDate("");
                    }}
                    className="text-xs text-rose-700 font-bold px-2 py-1.5 hover:underline"
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            </div>

            {/* WASTAGE AUDIT TABLE */}
            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 text-xs uppercase tracking-wider font-bold">
                      <th className="py-3.5 px-4">Date</th>
                      <th className="py-3.5 px-4">Item</th>
                      <th className="py-3.5 px-4">Reason / Category</th>
                      <th className="py-3.5 px-4 text-right">Qty Wasted</th>
                      <th className="py-3.5 px-4 text-right">Unit Cost (WAC)</th>
                      <th className="py-3.5 px-4 text-right">Total Loss Value</th>
                      <th className="py-3.5 px-4">Recorded By</th>
                      <th className="py-3.5 px-4">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {isLoadingWastage ? (
                      [...Array(5)].map((_, idx) => (
                        <tr key={idx}>
                          <td colSpan={8} className="py-3.5 px-4">
                            <Skeleton className="h-6 w-full" />
                          </td>
                        </tr>
                      ))
                    ) : wastageList.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-stone-500">
                          <Flame className="w-12 h-12 text-stone-300 mx-auto mb-3" />
                          <p className="font-bold text-base text-stone-700">No Wastage Logged</p>
                          <p className="text-xs text-stone-500 mt-1">
                            Use the "Record Wastage" button to record spoiled, expired, or damaged kitchen stock.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      wastageList.map((w) => {
                        const reasonObj = WASTAGE_REASONS.find((r) => r.value === w.reason);
                        const badgeColor = reasonObj ? reasonObj.color : "bg-stone-100 text-stone-800 border-stone-200";

                        return (
                          <tr key={w.id} className="hover:bg-stone-50/80 transition-colors">
                            <td className="py-3.5 px-4 text-xs font-semibold text-stone-800 whitespace-nowrap">
                              {w.wastage_date}
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-sm text-stone-900">{w.item_name}</div>
                              <div className="text-[11px] text-stone-500 font-mono">
                                SKU: {w.item_sku || "N/A"}
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${badgeColor}`}>
                                {w.reason_display || reasonObj?.label || "Wastage"}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right font-black text-rose-950 text-sm">
                              -{Number(w.quantity).toFixed(3)}{" "}
                              <span className="text-stone-500 text-xs font-normal">{w.unit_code}</span>
                            </td>
                            <td className="py-3.5 px-4 text-right text-stone-700 text-xs font-medium">
                              Rs. {Number(w.unit_cost || 0).toFixed(2)}
                            </td>
                            <td className="py-3.5 px-4 text-right font-black text-rose-900 text-sm">
                              Rs. {Number(w.total_cost || 0).toFixed(2)}
                            </td>
                            <td className="py-3.5 px-4 text-xs text-stone-600">
                              {w.created_by_name || "System"}
                            </td>
                            <td className="py-3.5 px-4 text-xs text-stone-600 max-w-xs truncate">
                              {w.notes || "-"}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: PHYSICAL STOCK COUNT / AUDIT */}
        {/* ========================================================================= */}
        {activeTab === "stock_count" && (
          <div>
            {/* INSTRUCTIONS & ACTION BAR */}
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm mb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-base text-[#063B2E] flex items-center gap-2">
                  <ClipboardList size={18} className="text-yellow-500" />
                  Physical Stock Count Worksheet
                </h3>
                <p className="text-xs text-stone-600 mt-0.5">
                  Enter counted quantities. The system calculates real-time variances and financial impact.
                </p>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <div className="bg-stone-50 border border-stone-200 rounded-xl px-3 py-1.5 text-xs">
                  <span className="text-stone-500">Discrepancies: </span>
                  <span className="font-bold text-stone-900">{stockCountDiscrepancies.length} items</span>
                  {totalVarianceImpactValue > 0 && (
                    <span className="ml-2 text-rose-700 font-black">
                      (± Rs. {totalVarianceImpactValue.toFixed(2)})
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  disabled={stockCountDiscrepancies.length === 0 || isSubmittingStockCount}
                  onClick={() => setIsStockCountConfirmOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#063B2E] hover:bg-[#084c3b] disabled:bg-stone-300 disabled:cursor-not-allowed text-white font-bold text-xs shadow-md transition-all"
                >
                  <Check size={14} className="text-yellow-400" />
                  <span>Review &amp; Reconcile ({stockCountDiscrepancies.length})</span>
                </button>
              </div>
            </div>

            {/* WORKSHEET FILTERS */}
            <div className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-sm mb-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter items for stock count..."
                  value={stockCountSearch}
                  onChange={(e) => setStockCountSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-none"
                />
              </div>

              <select
                value={stockCountFilterCategory}
                onChange={(e) => setStockCountFilterCategory(e.target.value)}
                className="text-xs sm:text-sm bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-700 font-medium focus:outline-none"
              >
                <option value="all">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* PHYSICAL COUNT TABLE */}
            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 text-xs uppercase tracking-wider font-bold">
                      <th className="py-3.5 px-4">Item Details</th>
                      <th className="py-3.5 px-4 text-right">System Stock</th>
                      <th className="py-3.5 px-4 text-center w-36">Physical Count</th>
                      <th className="py-3.5 px-4 text-right">Variance</th>
                      <th className="py-3.5 px-4 text-right">Unit Cost</th>
                      <th className="py-3.5 px-4 text-right">Variance Value</th>
                      <th className="py-3.5 px-4 w-48">Audit Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {filteredStockCountItems.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-stone-500">
                          <p className="font-bold text-sm">No items matching criteria.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredStockCountItems.map((item) => {
                        const entry = stockCounts[item.id] || { physical: "", notes: "" };
                        const system = Number(item.current_stock || 0);
                        const hasInput = entry.physical !== "" && !isNaN(Number(entry.physical));
                        const physical = hasInput ? Number(entry.physical) : null;
                        const variance = hasInput ? physical - system : 0;
                        const unitCost = Number(item.cost_per_unit || 0);
                        const varianceValue = Math.abs(variance) * unitCost;
                        const unitCode = item.uom_code || item.uom_short_code || "";

                        return (
                          <tr key={item.id} className="hover:bg-stone-50/80 transition-colors">
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-sm text-stone-900">{item.name}</div>
                              <div className="text-[11px] text-stone-500 font-mono">
                                SKU: {item.sku || "N/A"}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-right font-black text-stone-800 text-sm">
                              {system.toFixed(3)} <span className="text-stone-500 text-xs font-normal">{unitCode}</span>
                            </td>
                            <td className="py-2.5 px-4 text-center">
                              <input
                                type="number"
                                step="0.001"
                                min="0"
                                placeholder={system.toFixed(2)}
                                value={entry.physical}
                                onChange={(e) => handleStockCountPhysicalChange(item.id, e.target.value)}
                                className="w-28 px-2.5 py-1.5 text-center text-sm font-bold bg-stone-50 border border-stone-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#063B2E]/20"
                              />
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              {hasInput ? (
                                Math.abs(variance) < 0.0001 ? (
                                  <span className="text-stone-400 font-medium text-xs">0.000 (Match)</span>
                                ) : variance > 0 ? (
                                  <span className="font-black text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                                    +{variance.toFixed(3)} {unitCode}
                                  </span>
                                ) : (
                                  <span className="font-black text-xs text-rose-800 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">
                                    {variance.toFixed(3)} {unitCode}
                                  </span>
                                )
                              ) : (
                                <span className="text-stone-300 text-xs">-</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-right text-xs text-stone-700 font-medium">
                              Rs. {unitCost.toFixed(2)}
                            </td>
                            <td className="py-3.5 px-4 text-right font-bold text-xs">
                              {hasInput && Math.abs(variance) > 0.0001 ? (
                                <span className={variance > 0 ? "text-emerald-700" : "text-rose-700"}>
                                  Rs. {varianceValue.toFixed(2)}
                                </span>
                              ) : (
                                <span className="text-stone-400">-</span>
                              )}
                            </td>
                            <td className="py-2.5 px-4">
                              <input
                                type="text"
                                placeholder="Audit note..."
                                value={entry.notes}
                                onChange={(e) => handleStockCountNotesChange(item.id, e.target.value)}
                                className="w-full px-2 py-1 text-xs bg-stone-50 border border-stone-200 rounded-lg"
                              />
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: MOVEMENT AUDIT LEDGER */}
        {/* ========================================================================= */}
        {activeTab === "movements" && (
          <div>
            {/* LEDGER FILTERS BAR */}
            <div className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-sm mb-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search ledger by item, note, or reference..."
                  value={movementSearch}
                  onChange={(e) => setMovementSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                <select
                  value={movementTypeFilter}
                  onChange={(e) => setMovementTypeFilter(e.target.value)}
                  className="text-xs sm:text-sm bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-700 font-medium focus:outline-none"
                >
                  <option value="all">All Movement Types</option>
                  <option value="1">Adjustment / Audit (1)</option>
                  <option value="2">Purchase Stock In (2)</option>
                  <option value="3">Order Consumption (3)</option>
                  <option value="4">Wastage / Spoilage (4)</option>
                  <option value="5">Purchase Return (5)</option>
                </select>

                {historyItem && (
                  <button
                    type="button"
                    onClick={() => setHistoryItem(null)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-200 text-stone-800 text-xs font-bold"
                  >
                    <span>Filtered: {historyItem.name}</span>
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>

            {/* MOVEMENTS TABLE */}
            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 text-xs uppercase tracking-wider font-bold">
                      <th className="py-3.5 px-4">Date &amp; Time</th>
                      <th className="py-3.5 px-4">Item</th>
                      <th className="py-3.5 px-4">Movement Type</th>
                      <th className="py-3.5 px-4 text-right">Quantity Delta</th>
                      <th className="py-3.5 px-4 text-right">Balance After</th>
                      <th className="py-3.5 px-4 text-right">Unit Cost</th>
                      <th className="py-3.5 px-4 text-right">Total Value</th>
                      <th className="py-3.5 px-4">Reference / Audit Note</th>
                      <th className="py-3.5 px-4">Logged By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {isLoadingMovements ? (
                      [...Array(6)].map((_, idx) => (
                        <tr key={idx}>
                          <td colSpan={9} className="py-3.5 px-4">
                            <Skeleton className="h-6 w-full" />
                          </td>
                        </tr>
                      ))
                    ) : movements.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-12 text-center text-stone-500">
                          <History className="w-12 h-12 text-stone-300 mx-auto mb-3" />
                          <p className="font-bold text-base text-stone-700">No Movement Records Found</p>
                          <p className="text-xs text-stone-500 mt-1">
                            Every purchase receiving, recipe order consumption, stock adjustment, and wastage will appear here.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      movements.map((m) => {
                        const isPositive = Number(m.quantity_delta) > 0;
                        const movementType = Number(m.movement_type);

                        let badgeStyle = "bg-stone-100 text-stone-800 border-stone-200";
                        if (movementType === 2) badgeStyle = "bg-emerald-100 text-emerald-900 border-emerald-200";
                        else if (movementType === 3) badgeStyle = "bg-blue-100 text-blue-900 border-blue-200";
                        else if (movementType === 4) badgeStyle = "bg-rose-100 text-rose-900 border-rose-200";
                        else if (movementType === 1) badgeStyle = "bg-amber-100 text-amber-900 border-amber-200";

                        return (
                          <tr key={m.id} className="hover:bg-stone-50/80 transition-colors">
                            <td className="py-3.5 px-4 text-xs font-medium text-stone-600 whitespace-nowrap">
                              {new Date(m.created_at).toLocaleString()}
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-sm text-stone-900">{m.item_name}</div>
                              <div className="text-[11px] text-stone-500 font-mono">
                                SKU: {m.item_sku || "N/A"}
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${badgeStyle}`}>
                                {m.movement_type_display || "Movement"}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right font-black text-sm">
                              <span className={isPositive ? "text-emerald-700" : "text-rose-700"}>
                                {isPositive ? "+" : ""}
                                {Number(m.quantity_delta).toFixed(3)}
                              </span>{" "}
                              <span className="text-stone-500 text-xs font-normal">{m.unit_code}</span>
                            </td>
                            <td className="py-3.5 px-4 text-right font-bold text-stone-900 text-sm">
                              {Number(m.balance_after).toFixed(3)}{" "}
                              <span className="text-stone-500 text-xs font-normal">{m.unit_code}</span>
                            </td>
                            <td className="py-3.5 px-4 text-right text-stone-700 text-xs font-medium">
                              Rs. {Number(m.unit_cost || 0).toFixed(2)}
                            </td>
                            <td className="py-3.5 px-4 text-right font-bold text-stone-900 text-sm">
                              Rs. {Number(m.total_value || 0).toFixed(2)}
                            </td>
                            <td className="py-3.5 px-4 text-xs text-stone-700 max-w-xs truncate">
                              {m.reference_note || "-"}
                            </td>
                            <td className="py-3.5 px-4 text-xs text-stone-600">
                              {m.logged_by_name || "System"}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: CATEGORIES & UNITS */}
        {/* ========================================================================= */}
        {activeTab === "categories_units" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* CATEGORIES CARD */}
            <Card className="p-5 rounded-2xl bg-white border border-stone-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-[#063B2E] flex items-center gap-2">
                  <Layers size={18} />
                  Inventory Categories ({categories.length})
                </h3>
                <button
                  type="button"
                  onClick={() => setIsAddCategoryOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-[#063B2E] text-white font-bold text-xs hover:bg-[#084c3b]"
                >
                  + Add Category
                </button>
              </div>

              <div className="divide-y divide-stone-100">
                {categories.length === 0 ? (
                  <p className="text-xs text-stone-500 py-6 text-center">No categories configured.</p>
                ) : (
                  categories.map((cat) => (
                    <div key={cat.id} className="py-3 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-sm text-stone-900">{cat.name}</p>
                        <p className="text-xs text-stone-500">{cat.description || "No description provided."}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setDeletingCategory(cat)}
                        className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg hover:bg-stone-100"
                        title="Delete Category"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </Card>

            {/* UNITS OF MEASURE CARD */}
            <Card className="p-5 rounded-2xl bg-white border border-stone-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-[#063B2E] flex items-center gap-2">
                  <Scale size={18} />
                  Units of Measure ({units.length})
                </h3>
                <button
                  type="button"
                  onClick={() => setIsAddUnitOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-[#063B2E] text-white font-bold text-xs hover:bg-[#084c3b]"
                >
                  + Add Unit
                </button>
              </div>

              <div className="divide-y divide-stone-100">
                {units.length === 0 ? (
                  <p className="text-xs text-stone-500 py-6 text-center">No units configured.</p>
                ) : (
                  units.map((u) => (
                    <div key={u.id} className="py-3 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-sm text-stone-900">{u.name}</p>
                          <span className="px-2 py-0.5 bg-stone-100 font-mono text-[11px] font-bold text-stone-700 rounded">
                            {u.short_code}
                          </span>
                        </div>
                        <p className="text-xs text-stone-500">
                          {u.base_unit_name ? `Base unit: ${u.base_unit_name} (Factor: ${u.conversion_factor})` : "Base measurement standard"}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL: RECORD WASTAGE */}
        {/* ========================================================================= */}
        <AnimatePresence>
          {isWastageModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-3xl shadow-2xl border border-stone-200 max-w-lg w-full overflow-hidden"
              >
                <div className="p-6 border-b border-stone-200 flex items-center justify-between bg-gradient-to-r from-rose-900 to-[#063B2E] text-white">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-white/10 rounded-xl">
                      <Flame className="w-5 h-5 text-yellow-400" />
                    </div>
                    <div>
                      <h3 className="font-black text-lg">Record Food Wastage &amp; Loss</h3>
                      <p className="text-xs text-stone-200">Log spoiled, expired, or damaged inventory stock.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsWastageModalOpen(false);
                      setWastageConfirmStep(false);
                    }}
                    className="p-2 text-stone-300 hover:text-white rounded-xl hover:bg-white/10"
                  >
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleRecordWastageSubmit} className="p-6 space-y-4">
                  {/* Select Item */}
                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                      Inventory Item <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={wastageForm.inventory_item_id}
                      disabled={!!wastageTargetItem}
                      onChange={(e) => {
                        const selId = Number(e.target.value);
                        const selItem = items.find((itm) => itm.id === selId);
                        setWastageForm((prev) => ({
                          ...prev,
                          inventory_item_id: selId,
                          uom_id: selItem?.uom || "",
                        }));
                      }}
                      className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#063B2E]/20"
                      required
                    >
                      <option value="">-- Choose Inventory Item --</option>
                      {items.map((itm) => (
                        <option key={itm.id} value={itm.id}>
                          {itm.name} (Stock: {Number(itm.current_stock).toFixed(2)} {itm.uom_code || ""}) - Rs. {Number(itm.cost_per_unit).toFixed(2)}/unit
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Quantity & Date */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                        Wasted Quantity <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        min="0.001"
                        placeholder="e.g. 2.500"
                        value={wastageForm.quantity}
                        onChange={(e) => setWastageForm((prev) => ({ ...prev, quantity: e.target.value }))}
                        className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#063B2E]/20"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                        Incident Date <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={wastageForm.wastage_date}
                        onChange={(e) => setWastageForm((prev) => ({ ...prev, wastage_date: e.target.value }))}
                        className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#063B2E]/20"
                        required
                      />
                    </div>
                  </div>

                  {/* Reason */}
                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                      Wastage Reason / Category <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={wastageForm.reason}
                      onChange={(e) => setWastageForm((prev) => ({ ...prev, reason: Number(e.target.value) }))}
                      className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#063B2E]/20"
                    >
                      {WASTAGE_REASONS.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                      Audit Notes / Incident Explanation
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Fridge temperature fluctuation caused spoilage in batch #402..."
                      value={wastageForm.notes}
                      onChange={(e) => setWastageForm((prev) => ({ ...prev, notes: e.target.value }))}
                      className="w-full px-3.5 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#063B2E]/20"
                    />
                  </div>

                  {/* Live Loss Preview */}
                  {(() => {
                    const selItem = items.find((itm) => itm.id === Number(wastageForm.inventory_item_id));
                    const estLoss =
                      selItem && wastageForm.quantity && Number(wastageForm.quantity) > 0
                        ? Number(wastageForm.quantity) * Number(selItem.cost_per_unit || 0)
                        : 0;

                    return (
                      <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-950 flex items-center justify-between">
                        <div className="text-xs">
                          <span className="font-bold block">Estimated Financial Loss</span>
                          <span className="text-[11px] text-rose-700">
                            Unit Cost Basis: Rs. {Number(selItem?.cost_per_unit || 0).toFixed(2)}
                          </span>
                        </div>
                        <span className="text-lg font-black text-rose-900">
                          Rs. {estLoss.toFixed(2)}
                        </span>
                      </div>
                    );
                  })()}

                  {/* Confirmation Warning before final submit */}
                  {wastageConfirmStep && (
                    <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 text-xs font-semibold flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0" />
                      <span>
                        Please confirm: This action will deduct stock and write an immutable financial loss entry to the ledger.
                      </span>
                    </div>
                  )}

                  <div className="pt-2 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setIsWastageModalOpen(false);
                        setWastageConfirmStep(false);
                      }}
                      className="px-4 py-2.5 rounded-xl border border-stone-300 text-stone-700 font-bold text-xs hover:bg-stone-100"
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={isRecordingWastage}
                      className="px-5 py-2.5 rounded-xl bg-rose-800 hover:bg-rose-900 text-white font-bold text-xs shadow-md disabled:bg-stone-300"
                    >
                      {isRecordingWastage
                        ? "Recording..."
                        : wastageConfirmStep
                        ? "Confirm & Record Wastage"
                        : "Review & Confirm"}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ========================================================================= */}
        {/* MODAL: PHYSICAL STOCK COUNT CONFIRMATION */}
        {/* ========================================================================= */}
        <AnimatePresence>
          {isStockCountConfirmOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-3xl shadow-2xl border border-stone-200 max-w-xl w-full overflow-hidden"
              >
                <div className="p-6 border-b border-stone-200 bg-[#063B2E] text-white flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-yellow-400" />
                    <h3 className="font-black text-lg">Confirm Stock Count Reconciliation</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsStockCountConfirmOpen(false)}
                    className="p-1.5 text-stone-300 hover:text-white"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="p-6 space-y-4">
                  <p className="text-xs text-stone-600">
                    The following <span className="font-bold text-stone-900">{stockCountDiscrepancies.length} item variances</span> will be reconciled and recorded to the audit ledger:
                  </p>

                  <div className="max-h-60 overflow-y-auto divide-y divide-stone-100 border border-stone-200 rounded-2xl p-2 bg-stone-50">
                    {stockCountDiscrepancies.map((d, i) => (
                      <div key={i} className="py-2.5 px-3 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-stone-900 block">{d.item.name}</span>
                          <span className="text-[11px] text-stone-500">
                            System: {d.system.toFixed(2)} → Physical: {d.physical.toFixed(2)}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className={`font-black block ${d.variance > 0 ? "text-emerald-700" : "text-rose-700"}`}>
                            {d.variance > 0 ? "+" : ""}{d.variance.toFixed(3)}
                          </span>
                          <span className="text-[10px] text-stone-500">
                            Rs. {d.varianceValue.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                      Reconciliation Audit Reference / Notes
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. End of Week Physical Audit Reconciliation..."
                      value={stockCountAuditNotes}
                      onChange={(e) => setStockCountAuditNotes(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs focus:outline-none"
                    />
                  </div>

                  <div className="pt-3 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setIsStockCountConfirmOpen(false)}
                      className="px-4 py-2.5 rounded-xl border border-stone-300 text-stone-700 font-bold text-xs hover:bg-stone-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isSubmittingStockCount}
                      onClick={handleSubmitPhysicalStockCount}
                      className="px-5 py-2.5 rounded-xl bg-[#063B2E] hover:bg-[#084c3b] text-white font-bold text-xs shadow-md"
                    >
                      {isSubmittingStockCount ? "Reconciling..." : "Commit Stock Adjustments"}
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ========================================================================= */}
        {/* MODAL: SINGLE ITEM STOCK ADJUSTMENT */}
        {/* ========================================================================= */}
        <AnimatePresence>
          {adjustingItem && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-3xl shadow-2xl border border-stone-200 max-w-md w-full overflow-hidden"
              >
                <div className="p-6 border-b border-stone-200 bg-[#063B2E] text-white flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-5 h-5 text-yellow-400" />
                    <div>
                      <h3 className="font-black text-lg">Adjust Stock</h3>
                      <p className="text-xs text-stone-200">{adjustingItem.name}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAdjustingItem(null)}
                    className="p-1.5 text-stone-300 hover:text-white"
                  >
                    <X size={18} />
                  </button>
                </div>

                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    const mode = formData.get("mode");
                    const qtyVal = formData.get("quantity");
                    const reason = formData.get("reason");
                    const notes = formData.get("notes");

                    if (!qtyVal || isNaN(Number(qtyVal))) {
                      showNotification("error", "Please enter a valid quantity.");
                      return;
                    }

                    try {
                      const payload = {
                        restaurant_id: restaurantId,
                        inventory_item_id: adjustingItem.id,
                        reason: Number(reason),
                        notes: notes,
                      };

                      if (mode === "new_quantity") {
                        payload.new_quantity = Number(qtyVal).toFixed(3);
                      } else {
                        payload.quantity_delta = Number(qtyVal).toFixed(3);
                      }

                      await adjustInventoryStock(payload).unwrap();
                      showNotification("success", "Stock adjusted successfully.");
                      setAdjustingItem(null);
                    } catch (err) {
                      const msg = err?.data?.message || err?.data?.detail || "Failed to adjust stock.";
                      showNotification("error", msg);
                    }
                  }}
                  className="p-6 space-y-4"
                >
                  <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 text-xs">
                    <div className="flex justify-between">
                      <span className="text-stone-500">Current Stock:</span>
                      <span className="font-bold text-stone-900">
                        {Number(adjustingItem.current_stock).toFixed(3)} {adjustingItem.uom_code || ""}
                      </span>
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-stone-500">Unit Cost (WAC):</span>
                      <span className="font-bold text-stone-900">
                        Rs. {Number(adjustingItem.cost_per_unit).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                      Adjustment Mode
                    </label>
                    <select
                      name="mode"
                      defaultValue="new_quantity"
                      className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs font-semibold focus:outline-none"
                    >
                      <option value="new_quantity">Set Exact New Physical Stock Count</option>
                      <option value="quantity_delta">Apply Relative Change (+ / - Delta)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                      Quantity <span className="text-rose-500">*</span>
                    </label>
                    <input
                      name="quantity"
                      type="number"
                      step="0.001"
                      placeholder="e.g. 15.000 or -2.500"
                      className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-sm font-bold focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                      Adjustment Reason <span className="text-rose-500">*</span>
                    </label>
                    <select
                      name="reason"
                      defaultValue={2}
                      className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs font-semibold focus:outline-none"
                    >
                      {ADJUSTMENT_REASONS.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                      Notes / Audit Explanation
                    </label>
                    <textarea
                      name="notes"
                      rows={2}
                      placeholder="e.g. Weekly physical inventory count..."
                      className="w-full px-3.5 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs focus:outline-none"
                    />
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setAdjustingItem(null)}
                      className="px-4 py-2.5 rounded-xl border border-stone-300 text-stone-700 font-bold text-xs hover:bg-stone-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isAdjustingStock}
                      className="px-5 py-2.5 rounded-xl bg-[#063B2E] hover:bg-[#084c3b] text-white font-bold text-xs shadow-md"
                    >
                      {isAdjustingStock ? "Saving..." : "Save Adjustment"}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ========================================================================= */}
        {/* MODAL: ADD / EDIT INVENTORY ITEM */}
        {/* ========================================================================= */}
        <AnimatePresence>
          {(isAddModalOpen || editingItem) && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-3xl shadow-2xl border border-stone-200 max-w-lg w-full overflow-hidden"
              >
                <div className="p-6 border-b border-stone-200 bg-[#063B2E] text-white flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-yellow-400" />
                    <h3 className="font-black text-lg">
                      {editingItem ? "Edit Inventory Item" : "Add Inventory Item"}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddModalOpen(false);
                      setEditingItem(null);
                    }}
                    className="p-1.5 text-stone-300 hover:text-white"
                  >
                    <X size={18} />
                  </button>
                </div>

                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    const payload = {
                      restaurant: restaurantId,
                      name: formData.get("name"),
                      sku: formData.get("sku") || undefined,
                      category: Number(formData.get("category")),
                      uom: Number(formData.get("uom")),
                      min_reorder_level: Number(formData.get("min_reorder_level")).toFixed(3),
                      cost_per_unit: Number(formData.get("cost_per_unit")).toFixed(2),
                    };

                    if (!editingItem) {
                      payload.current_stock = Number(formData.get("current_stock") || 0).toFixed(3);
                    }

                    try {
                      if (editingItem) {
                        await updateInventoryItem({ id: editingItem.id, ...payload }).unwrap();
                        showNotification("success", "Item updated successfully.");
                      } else {
                        await addInventoryItem(payload).unwrap();
                        showNotification("success", "Item added to inventory.");
                      }
                      setIsAddModalOpen(false);
                      setEditingItem(null);
                    } catch (err) {
                      const msg = err?.data?.message || err?.data?.name?.[0] || "Failed to save item.";
                      showNotification("error", msg);
                    }
                  }}
                  className="p-6 space-y-4"
                >
                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                      Item Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      name="name"
                      type="text"
                      defaultValue={editingItem?.name || ""}
                      placeholder="e.g. Fresh Chicken Breast, Olive Oil"
                      className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-sm font-semibold focus:outline-none"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                        Category <span className="text-rose-500">*</span>
                      </label>
                      <select
                        name="category"
                        defaultValue={editingItem?.category || ""}
                        className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs font-semibold focus:outline-none"
                        required
                      >
                        <option value="">-- Select Category --</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                        Unit of Measure <span className="text-rose-500">*</span>
                      </label>
                      <select
                        name="uom"
                        defaultValue={editingItem?.uom || ""}
                        className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs font-semibold focus:outline-none"
                        required
                      >
                        <option value="">-- Select Unit --</option>
                        {units.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name} ({u.short_code})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                        Cost Per Unit (Rs.) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        name="cost_per_unit"
                        type="number"
                        step="0.01"
                        min="0"
                        defaultValue={editingItem?.cost_per_unit || "0.00"}
                        className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-sm font-semibold focus:outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                        Min Reorder Level <span className="text-rose-500">*</span>
                      </label>
                      <input
                        name="min_reorder_level"
                        type="number"
                        step="0.001"
                        min="0"
                        defaultValue={editingItem?.min_reorder_level || "5.000"}
                        className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-sm font-semibold focus:outline-none"
                        required
                      />
                    </div>
                  </div>

                  {!editingItem && (
                    <div>
                      <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                        Initial Opening Stock
                      </label>
                      <input
                        name="current_stock"
                        type="number"
                        step="0.001"
                        min="0"
                        defaultValue="0.000"
                        className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-sm font-semibold focus:outline-none"
                      />
                      <p className="text-[11px] text-stone-500 mt-1">
                        An automatic opening stock ledger transaction will be recorded if &gt; 0.
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                      SKU Code (Optional)
                    </label>
                    <input
                      name="sku"
                      type="text"
                      defaultValue={editingItem?.sku || ""}
                      placeholder="Auto-generated if left blank"
                      className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs font-mono focus:outline-none"
                    />
                  </div>

                  <div className="pt-3 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddModalOpen(false);
                        setEditingItem(null);
                      }}
                      className="px-4 py-2.5 rounded-xl border border-stone-300 text-stone-700 font-bold text-xs hover:bg-stone-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isAddingItem || isUpdatingItem}
                      className="px-5 py-2.5 rounded-xl bg-[#063B2E] hover:bg-[#084c3b] text-white font-bold text-xs shadow-md"
                    >
                      {editingItem ? "Save Changes" : "Create Item"}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ========================================================================= */}
        {/* MODAL: ADD CATEGORY */}
        {/* ========================================================================= */}
        <AnimatePresence>
          {isAddCategoryOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-3xl shadow-2xl border border-stone-200 max-w-md w-full p-6 space-y-4"
              >
                <div className="flex items-center justify-between pb-3 border-b border-stone-200">
                  <h3 className="font-bold text-base text-[#063B2E] flex items-center gap-2">
                    <Layers size={18} />
                    Add Inventory Category
                  </h3>
                  <button type="button" onClick={() => setIsAddCategoryOpen(false)} className="p-1 text-stone-400 hover:text-stone-700">
                    <X size={18} />
                  </button>
                </div>

                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    try {
                      await addInventoryCategory({
                        restaurant: restaurantId,
                        name: formData.get("name"),
                        description: formData.get("description"),
                      }).unwrap();
                      showNotification("success", "Category created.");
                      setIsAddCategoryOpen(false);
                    } catch (err) {
                      showNotification("error", "Failed to create category.");
                    }
                  }}
                  className="space-y-3"
                >
                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                      Category Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      name="name"
                      type="text"
                      placeholder="e.g. Dairy, Poultry, Packaging"
                      className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-sm font-semibold focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                      Description
                    </label>
                    <textarea
                      name="description"
                      rows={2}
                      placeholder="Optional details..."
                      className="w-full px-3.5 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs focus:outline-none"
                    />
                  </div>
                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAddCategoryOpen(false)}
                      className="px-4 py-2 rounded-xl border border-stone-300 text-xs font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isAddingCategory}
                      className="px-4 py-2 rounded-xl bg-[#063B2E] text-white text-xs font-bold"
                    >
                      Save Category
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ========================================================================= */}
        {/* MODAL: ADD UNIT OF MEASURE */}
        {/* ========================================================================= */}
        <AnimatePresence>
          {isAddUnitOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-3xl shadow-2xl border border-stone-200 max-w-md w-full p-6 space-y-4"
              >
                <div className="flex items-center justify-between pb-3 border-b border-stone-200">
                  <h3 className="font-bold text-base text-[#063B2E] flex items-center gap-2">
                    <Scale size={18} />
                    Add Unit of Measure
                  </h3>
                  <button type="button" onClick={() => setIsAddUnitOpen(false)} className="p-1 text-stone-400 hover:text-stone-700">
                    <X size={18} />
                  </button>
                </div>

                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    try {
                      await addInventoryUnit({
                        restaurant: restaurantId,
                        name: formData.get("name"),
                        short_code: formData.get("short_code"),
                        conversion_factor: formData.get("conversion_factor") || "1.0000",
                      }).unwrap();
                      showNotification("success", "Unit created.");
                      setIsAddUnitOpen(false);
                    } catch (err) {
                      showNotification("error", "Failed to create unit.");
                    }
                  }}
                  className="space-y-3"
                >
                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                      Unit Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      name="name"
                      type="text"
                      placeholder="e.g. Gram, Milliliter, Box"
                      className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-sm font-semibold focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                      Short Code <span className="text-rose-500">*</span>
                    </label>
                    <input
                      name="short_code"
                      type="text"
                      placeholder="e.g. g, ml, box"
                      className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-sm font-semibold focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                      Conversion Factor to Base Unit
                    </label>
                    <input
                      name="conversion_factor"
                      type="number"
                      step="0.0001"
                      defaultValue="1.0000"
                      className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-sm font-semibold focus:outline-none"
                    />
                  </div>
                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAddUnitOpen(false)}
                      className="px-4 py-2 rounded-xl border border-stone-300 text-xs font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isAddingUnit}
                      className="px-4 py-2 rounded-xl bg-[#063B2E] text-white text-xs font-bold"
                    >
                      Save Unit
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ========================================================================= */}
        {/* MODAL: DELETE ITEM CONFIRMATION */}
        {/* ========================================================================= */}
        <AnimatePresence>
          {deletingItem && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-3xl shadow-2xl border border-stone-200 max-w-sm w-full p-6 text-center space-y-4"
              >
                <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                  <Trash2 size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-base text-stone-900">Delete Item?</h3>
                  <p className="text-xs text-stone-600 mt-1">
                    Are you sure you want to remove <span className="font-bold text-stone-900">{deletingItem.name}</span>?
                  </p>
                </div>
                <div className="flex justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setDeletingItem(null)}
                    className="px-4 py-2 rounded-xl border border-stone-300 text-xs font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isDeletingItem}
                    onClick={async () => {
                      try {
                        await deleteInventoryItem(deletingItem.id).unwrap();
                        showNotification("success", "Item deleted.");
                        setDeletingItem(null);
                      } catch (err) {
                        showNotification("error", "Cannot delete item with active movement history.");
                      }
                    }}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
                  >
                    {isDeletingItem ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </RoleGuard>
  );
}

export default function ManagerInventoryPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-stone-500">Loading Inventory System...</div>}>
      <InventoryContent />
    </Suspense>
  );
}
