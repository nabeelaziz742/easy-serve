"use client";

import React, { useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  ShoppingCart,
  Truck,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  Building2,
  Phone,
  Mail,
  MapPin,
  Calendar,
  DollarSign,
  AlertTriangle,
  ArrowRight,
  Trash2,
  X,
  FileText,
  FileSpreadsheet,
  Layers,
  ChevronDown,
  Edit2,
  Check,
} from "lucide-react";
import {
  useGetPurchasesSummaryQuery,
  useGetPurchasesQuery,
  useGetPurchaseDetailQuery,
  useCreatePurchaseMutation,
  useUpdatePurchaseMutation,
  useReceivePurchaseMutation,
  useCancelPurchaseMutation,
  useGetSuppliersQuery,
  useAddSupplierMutation,
  useUpdateSupplierMutation,
  useDeleteSupplierMutation,
} from "@/services/private/purchases";
import { useGetInventoryItemsQuery } from "@/services/private/inventory";
import { toast } from "sonner";

function PurchasesContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "suppliers" ? "suppliers" : "purchases";

  // Tab State
  const [activeTab, setActiveTab] = useState(initialTab); // 'purchases' | 'suppliers'

  // Purchase Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Supplier Filters
  const [supplierSearch, setSupplierSearch] = useState("");
  const [supplierActiveFilter, setSupplierActiveFilter] = useState("all");

  // Modal States
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);

  // Active Selected IDs
  const [selectedPurchaseId, setSelectedPurchaseId] = useState(null);
  const [editingSupplier, setEditingSupplier] = useState(null);

  // Queries
  const {
    data: summaryData,
    isLoading: isSummaryLoading,
    refetch: refetchSummary,
  } = useGetPurchasesSummaryQuery();

  const purchaseQueryParams = useMemo(() => {
    const params = {};
    if (searchQuery.trim()) params.search = searchQuery.trim();
    if (statusFilter !== "all") params.status = statusFilter;
    if (supplierFilter !== "all") params.supplier_id = supplierFilter;
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;
    return params;
  }, [searchQuery, statusFilter, supplierFilter, dateFrom, dateTo]);

  const {
    data: purchasesData = [],
    isLoading: isPurchasesLoading,
    isFetching: isPurchasesFetching,
    refetch: refetchPurchases,
  } = useGetPurchasesQuery(purchaseQueryParams);

  const supplierQueryParams = useMemo(() => {
    const params = {};
    if (supplierSearch.trim()) params.search = supplierSearch.trim();
    if (supplierActiveFilter === "active") params.is_active = true;
    if (supplierActiveFilter === "inactive") params.is_active = false;
    return params;
  }, [supplierSearch, supplierActiveFilter]);

  const {
    data: suppliersData = [],
    isLoading: isSuppliersLoading,
    refetch: refetchSuppliers,
  } = useGetSuppliersQuery(supplierQueryParams);

  const { data: inventoryItemsData = [] } = useGetInventoryItemsQuery({});

  const {
    data: selectedPurchaseDetail,
    isLoading: isDetailLoading,
    refetch: refetchDetail,
  } = useGetPurchaseDetailQuery(
    { id: selectedPurchaseId },
    { skip: !selectedPurchaseId }
  );

  // Mutations
  const [createPurchase, { isLoading: isCreatingPurchase }] = useCreatePurchaseMutation();
  const [receivePurchase, { isLoading: isReceivingPurchase }] = useReceivePurchaseMutation();
  const [cancelPurchase, { isLoading: isCancellingPurchase }] = useCancelPurchaseMutation();
  const [addSupplier, { isLoading: isAddingSupplier }] = useAddSupplierMutation();
  const [updateSupplier, { isLoading: isUpdatingSupplier }] = useUpdateSupplierMutation();
  const [deleteSupplier, { isLoading: isDeletingSupplier }] = useDeleteSupplierMutation();

  // Create Purchase Form State
  const [purchaseForm, setPurchaseForm] = useState({
    supplier_id: "",
    purchase_date: new Date().toISOString().split("T")[0],
    invoice_number: "",
    tax_amount: "0.00",
    notes: "",
    items: [
      {
        inventory_item_id: "",
        quantity: "1",
        unit_cost: "0.00",
      },
    ],
  });

  // Supplier Form State
  const [supplierForm, setSupplierForm] = useState({
    name: "",
    contact_person: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
    is_active: true,
  });

  // Purchase Form Calculations
  const calculatedSubtotal = useMemo(() => {
    return purchaseForm.items.reduce((acc, row) => {
      const q = parseFloat(row.quantity) || 0;
      const c = parseFloat(row.unit_cost) || 0;
      return acc + q * c;
    }, 0);
  }, [purchaseForm.items]);

  const calculatedTax = parseFloat(purchaseForm.tax_amount) || 0;
  const calculatedGrandTotal = calculatedSubtotal + calculatedTax;

  const handleOpenNewPurchase = () => {
    setPurchaseForm({
      supplier_id: suppliersData.length > 0 ? suppliersData[0].id : "",
      purchase_date: new Date().toISOString().split("T")[0],
      invoice_number: "",
      tax_amount: "0.00",
      notes: "",
      items: [
        {
          inventory_item_id: inventoryItemsData.length > 0 ? inventoryItemsData[0].id : "",
          quantity: "1",
          unit_cost: inventoryItemsData.length > 0 ? inventoryItemsData[0].cost_per_unit || "0.00" : "0.00",
        },
      ],
    });
    setShowPurchaseModal(true);
  };

  const handleAddItemRow = () => {
    const defaultItem = inventoryItemsData.length > 0 ? inventoryItemsData[0] : null;
    setPurchaseForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          inventory_item_id: defaultItem ? defaultItem.id : "",
          quantity: "1",
          unit_cost: defaultItem ? defaultItem.cost_per_unit || "0.00" : "0.00",
        },
      ],
    }));
  };

  const handleRemoveItemRow = (idx) => {
    if (purchaseForm.items.length <= 1) {
      toast.error("At least one purchase item is required.");
      return;
    }
    setPurchaseForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx),
    }));
  };

  const handleItemChange = (idx, field, value) => {
    setPurchaseForm((prev) => {
      const newItems = [...prev.items];
      newItems[idx] = { ...newItems[idx], [field]: value };

      // If user changed inventory_item_id, update unit_cost default
      if (field === "inventory_item_id") {
        const found = inventoryItemsData.find((it) => it.id === parseInt(value));
        if (found && found.cost_per_unit) {
          newItems[idx].unit_cost = found.cost_per_unit;
        }
      }

      return { ...prev, items: newItems };
    });
  };

  const handleSavePurchase = async (e) => {
    e.preventDefault();
    if (!purchaseForm.supplier_id) {
      toast.error("Please select a supplier.");
      return;
    }
    if (!purchaseForm.items.length) {
      toast.error("Please add at least one line item.");
      return;
    }

    for (let i = 0; i < purchaseForm.items.length; i++) {
      const itm = purchaseForm.items[i];
      if (!itm.inventory_item_id) {
        toast.error(`Please choose an inventory item for line #${i + 1}`);
        return;
      }
      if (parseFloat(itm.quantity) <= 0 || isNaN(parseFloat(itm.quantity))) {
        toast.error(`Quantity for line #${i + 1} must be greater than 0`);
        return;
      }
      if (parseFloat(itm.unit_cost) < 0 || isNaN(parseFloat(itm.unit_cost))) {
        toast.error(`Unit cost for line #${i + 1} cannot be negative`);
        return;
      }
    }

    try {
      const payload = {
        supplier_id: parseInt(purchaseForm.supplier_id),
        purchase_date: purchaseForm.purchase_date,
        invoice_number: purchaseForm.invoice_number.trim(),
        tax_amount: parseFloat(purchaseForm.tax_amount || 0).toFixed(2),
        notes: purchaseForm.notes.trim(),
        items: purchaseForm.items.map((it) => ({
          inventory_item_id: parseInt(it.inventory_item_id),
          quantity: parseFloat(it.quantity).toFixed(3),
          unit_cost: parseFloat(it.unit_cost).toFixed(2),
        })),
      };

      await createPurchase(payload).unwrap();
      toast.success("Purchase order created as Draft.");
      setShowPurchaseModal(false);
      refetchPurchases();
      refetchSummary();
    } catch (err) {
      console.error(err);
      const errMsg =
        err?.data?.error ||
        err?.data?.detail ||
        (typeof err?.data === "object"
          ? Object.entries(err.data)
              .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(" ") : v}`)
              .join(" | ")
          : null) ||
        "Failed to create purchase order.";
      toast.error(errMsg);
    }
  };

  const handleConfirmReceive = async () => {
    if (!selectedPurchaseId) return;
    try {
      const res = await receivePurchase(selectedPurchaseId).unwrap();
      toast.success(res?.message || "Stock received successfully into inventory!");
      setShowReceiveModal(false);
      setShowDetailModal(false);
      refetchPurchases();
      refetchSummary();
    } catch (err) {
      console.error(err);
      toast.error(err?.data?.error || err?.data?.detail || "Failed to receive purchase order.");
    }
  };

  const handleConfirmCancel = async () => {
    if (!selectedPurchaseId) return;
    try {
      const res = await cancelPurchase(selectedPurchaseId).unwrap();
      toast.success(res?.message || "Purchase order cancelled.");
      setShowCancelModal(false);
      setShowDetailModal(false);
      refetchPurchases();
      refetchSummary();
    } catch (err) {
      console.error(err);
      toast.error(err?.data?.error || err?.data?.detail || "Failed to cancel purchase order.");
    }
  };

  // Supplier Handlers
  const handleOpenAddSupplier = () => {
    setEditingSupplier(null);
    setSupplierForm({
      name: "",
      contact_person: "",
      phone: "",
      email: "",
      address: "",
      notes: "",
      is_active: true,
    });
    setShowSupplierModal(true);
  };

  const handleOpenEditSupplier = (sup) => {
    setEditingSupplier(sup);
    setSupplierForm({
      name: sup.name,
      contact_person: sup.contact_person || "",
      phone: sup.phone || "",
      email: sup.email || "",
      address: sup.address || "",
      notes: sup.notes || "",
      is_active: sup.is_active,
    });
    setShowSupplierModal(true);
  };

  const handleSaveSupplier = async (e) => {
    e.preventDefault();
    if (!supplierForm.name.trim()) {
      toast.error("Supplier name is required.");
      return;
    }

    try {
      if (editingSupplier) {
        await updateSupplier({
          id: editingSupplier.id,
          ...supplierForm,
        }).unwrap();
        toast.success("Supplier updated successfully.");
      } else {
        await addSupplier(supplierForm).unwrap();
        toast.success("Supplier added successfully.");
      }
      setShowSupplierModal(false);
      refetchSuppliers();
      refetchSummary();
    } catch (err) {
      console.error(err);
      const errMsg =
        err?.data?.name?.[0] ||
        err?.data?.error ||
        err?.data?.detail ||
        "Failed to save supplier.";
      toast.error(errMsg);
    }
  };

  const handleToggleSupplierActive = async (sup) => {
    try {
      await updateSupplier({
        id: sup.id,
        is_active: !sup.is_active,
      }).unwrap();
      toast.success(
        sup.is_active ? "Supplier deactivated." : "Supplier activated."
      );
      refetchSuppliers();
      refetchSummary();
    } catch (err) {
      toast.error("Failed to update supplier status.");
    }
  };

  const getStatusBadge = (statusNum) => {
    switch (statusNum) {
      case 1:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock size={12} className="text-amber-500" />
            Draft
          </span>
        );
      case 2:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 size={12} className="text-emerald-600" />
            Received
          </span>
        );
      case 3:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700 border border-gray-200">
            <XCircle size={12} className="text-gray-400" />
            Cancelled
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#063B2E] text-yellow-400 flex items-center justify-center shadow-md">
              <ShoppingCart size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">
                Purchases & Stock In
              </h1>
              <p className="text-sm text-gray-500 font-medium">
                Manage supplier purchase orders, stock arrivals, and inventory cost adjustments
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => {
              refetchSummary();
              refetchPurchases();
              refetchSuppliers();
              toast.success("Purchases data refreshed");
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-all duration-150"
            title="Refresh"
          >
            <RefreshCw size={14} className={isPurchasesFetching ? "animate-spin" : ""} />
            Refresh
          </button>

          <button
            onClick={handleOpenAddSupplier}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-gray-800 bg-white border border-gray-200 hover:bg-gray-50 shadow-sm transition-all duration-150"
          >
            <Building2 size={14} className="text-emerald-800" />
            + Add Supplier
          </button>

          <button
            onClick={handleOpenNewPurchase}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-black bg-yellow-400 hover:bg-yellow-500 shadow-md transition-all duration-150 active:scale-95"
          >
            <Plus size={15} />
            + New Purchase Order
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Purchases */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Received</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-800">
              <DollarSign size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-gray-900 tracking-tight">
            Rs. {isSummaryLoading ? "..." : parseFloat(summaryData?.total_purchase_value || 0).toLocaleString()}
          </p>
          <span className="text-[11px] font-semibold text-emerald-700">Cumulative stock in</span>
        </div>

        {/* This Month */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">This Month</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-700">
              <Calendar size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-gray-900 tracking-tight">
            Rs. {isSummaryLoading ? "..." : parseFloat(summaryData?.this_month_value || 0).toLocaleString()}
          </p>
          <span className="text-[11px] font-semibold text-amber-600">Current calendar month</span>
        </div>

        {/* Draft Orders */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Draft Orders</span>
            <div className="p-2 rounded-xl bg-yellow-50 text-yellow-700">
              <Clock size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-yellow-700 tracking-tight">
            {isSummaryLoading ? "..." : summaryData?.draft_count || 0}
          </p>
          <span className="text-[11px] font-semibold text-yellow-600">Pending stock arrival</span>
        </div>

        {/* Received Orders */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Received Orders</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-700">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-blue-800 tracking-tight">
            {isSummaryLoading ? "..." : summaryData?.received_count || 0}
          </p>
          <span className="text-[11px] font-semibold text-blue-600">Completed & costed</span>
        </div>

        {/* Active Suppliers */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Active Suppliers</span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-700">
              <Building2 size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-purple-900 tracking-tight">
            {isSummaryLoading ? "..." : summaryData?.suppliers_count || 0}
          </p>
          <span className="text-[11px] font-semibold text-purple-600">Registered vendors</span>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex items-center gap-3 border-b border-gray-200">
        <button
          onClick={() => setActiveTab("purchases")}
          className={`
            pb-3 px-2 text-sm font-bold flex items-center gap-2 border-b-2 transition-all duration-150
            ${
              activeTab === "purchases"
                ? "border-[#063B2E] text-[#063B2E]"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }
          `}
        >
          <ShoppingCart size={16} />
          Purchases & Stock In
          <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700 font-semibold">
            {purchasesData.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("suppliers")}
          className={`
            pb-3 px-2 text-sm font-bold flex items-center gap-2 border-b-2 transition-all duration-150
            ${
              activeTab === "suppliers"
                ? "border-[#063B2E] text-[#063B2E]"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }
          `}
        >
          <Building2 size={16} />
          Suppliers Directory
          <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700 font-semibold">
            {suppliersData.length}
          </span>
        </button>
      </div>

      {/* TAB 1: PURCHASES */}
      {activeTab === "purchases" && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row items-center gap-3 justify-between">
            {/* Search */}
            <div className="relative w-full md:w-80">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search PO #, Invoice #, Supplier..."
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#063B2E] focus:bg-white transition-all"
              />
            </div>

            {/* Status Pills */}
            <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
              {[
                { label: "All", val: "all" },
                { label: "Draft", val: "1" },
                { label: "Received", val: "2" },
                { label: "Cancelled", val: "3" },
              ].map((st) => (
                <button
                  key={st.val}
                  onClick={() => setStatusFilter(st.val)}
                  className={`
                    px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-150
                    ${
                      statusFilter === st.val
                        ? "bg-[#063B2E] text-yellow-400 shadow-sm"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }
                  `}
                >
                  {st.label}
                </button>
              ))}
            </div>

            {/* Supplier Filter */}
            <div className="w-full md:w-56">
              <select
                value={supplierFilter}
                onChange={(e) => setSupplierFilter(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#063B2E]"
              >
                <option value="all">All Suppliers</option>
                {suppliersData.map((sup) => (
                  <option key={sup.id} value={sup.id}>
                    {sup.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Purchases Table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Purchase #</th>
                    <th className="py-3.5 px-4">Supplier</th>
                    <th className="py-3.5 px-4">Invoice #</th>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4">Items</th>
                    <th className="py-3.5 px-4">Subtotal</th>
                    <th className="py-3.5 px-4">Tax</th>
                    <th className="py-3.5 px-4">Grand Total</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-sm">
                  {isPurchasesLoading ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-gray-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <RefreshCw size={24} className="animate-spin text-[#063B2E]" />
                          <span className="text-xs font-semibold">Loading purchase orders...</span>
                        </div>
                      </td>
                    </tr>
                  ) : purchasesData.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-gray-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <ShoppingCart size={32} className="text-gray-300" />
                          <p className="font-bold text-gray-700">No purchase orders found</p>
                          <p className="text-xs text-gray-500 max-w-sm">
                            Create your first purchase order to record stock replenishment from suppliers.
                          </p>
                          <button
                            onClick={handleOpenNewPurchase}
                            className="mt-2 px-4 py-2 rounded-xl text-xs font-bold text-black bg-yellow-400 hover:bg-yellow-500 shadow-md"
                          >
                            + Create Purchase Order
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    purchasesData.map((po) => (
                      <tr
                        key={po.id}
                        className="hover:bg-gray-50/60 transition-colors group"
                      >
                        <td className="py-3.5 px-4 font-black text-gray-900">
                          <span className="px-2 py-1 bg-gray-100 rounded-lg text-xs font-mono">
                            {po.purchase_number}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-gray-800">{po.supplier_name}</div>
                          {po.created_by_name && (
                            <div className="text-[11px] text-gray-400">By: {po.created_by_name}</div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-gray-600 text-xs">
                          {po.invoice_number ? (
                            <span className="font-mono bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                              {po.invoice_number}
                            </span>
                          ) : (
                            <span className="text-gray-400 italic">None</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-gray-600 text-xs whitespace-nowrap">
                          {po.purchase_date}
                        </td>
                        <td className="py-3.5 px-4 text-xs font-semibold text-gray-700">
                          {po.items_count} {po.items_count === 1 ? "item" : "items"}
                        </td>
                        <td className="py-3.5 px-4 text-xs font-medium text-gray-600">
                          Rs. {parseFloat(po.subtotal || 0).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-xs font-medium text-gray-500">
                          Rs. {parseFloat(po.tax_amount || 0).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-[#063B2E]">
                          Rs. {parseFloat(po.total_amount || 0).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {getStatusBadge(po.status)}
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* View Detail Button */}
                            <button
                              onClick={() => {
                                setSelectedPurchaseId(po.id);
                                setShowDetailModal(true);
                              }}
                              className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                              title="View Purchase Details"
                            >
                              <Eye size={16} />
                            </button>

                            {/* Receive Button (Only for Draft) */}
                            {po.status === 1 && (
                              <button
                                onClick={() => {
                                  setSelectedPurchaseId(po.id);
                                  setShowReceiveModal(true);
                                }}
                                className="px-2.5 py-1 rounded-lg text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 shadow-sm transition-all"
                              >
                                Receive
                              </button>
                            )}

                            {/* Cancel Button (Only for Draft) */}
                            {po.status === 1 && (
                              <button
                                onClick={() => {
                                  setSelectedPurchaseId(po.id);
                                  setShowCancelModal(true);
                                }}
                                className="p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors"
                                title="Cancel Purchase Order"
                              >
                                <XCircle size={16} />
                              </button>
                            )}
                          </div>
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

      {/* TAB 2: SUPPLIERS */}
      {activeTab === "suppliers" && (
        <div className="space-y-4">
          {/* Supplier Filters */}
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row items-center gap-3 justify-between">
            <div className="relative w-full md:w-80">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={supplierSearch}
                onChange={(e) => setSupplierSearch(e.target.value)}
                placeholder="Search supplier name, contact, phone..."
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#063B2E] focus:bg-white transition-all"
              />
            </div>

            <div className="flex items-center gap-1.5">
              {[
                { label: "All", val: "all" },
                { label: "Active", val: "active" },
                { label: "Inactive", val: "inactive" },
              ].map((st) => (
                <button
                  key={st.val}
                  onClick={() => setSupplierActiveFilter(st.val)}
                  className={`
                    px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-150
                    ${
                      supplierActiveFilter === st.val
                        ? "bg-[#063B2E] text-yellow-400 shadow-sm"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }
                  `}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          {/* Supplier Table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Supplier</th>
                    <th className="py-3.5 px-4">Contact Person</th>
                    <th className="py-3.5 px-4">Phone / Email</th>
                    <th className="py-3.5 px-4">Address</th>
                    <th className="py-3.5 px-4">Orders</th>
                    <th className="py-3.5 px-4">Last Purchase</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-sm">
                  {isSuppliersLoading ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-gray-400">
                        <RefreshCw size={24} className="animate-spin text-[#063B2E] mx-auto mb-2" />
                        <span className="text-xs font-semibold">Loading suppliers...</span>
                      </td>
                    </tr>
                  ) : suppliersData.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-gray-400">
                        <Building2 size={32} className="text-gray-300 mx-auto mb-2" />
                        <p className="font-bold text-gray-700">No suppliers registered yet</p>
                        <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
                          Add your vendor partners to start ordering and receiving inventory items.
                        </p>
                        <button
                          onClick={handleOpenAddSupplier}
                          className="mt-3 px-4 py-2 rounded-xl text-xs font-bold text-black bg-yellow-400 hover:bg-yellow-500 shadow-md"
                        >
                          + Add Supplier
                        </button>
                      </td>
                    </tr>
                  ) : (
                    suppliersData.map((sup) => (
                      <tr key={sup.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-gray-900">{sup.name}</div>
                          {sup.notes && (
                            <div className="text-[11px] text-gray-400 truncate max-w-xs">{sup.notes}</div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-gray-700 text-xs font-medium">
                          {sup.contact_person || <span className="text-gray-400 italic">—</span>}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-gray-600">
                          {sup.phone && (
                            <div className="flex items-center gap-1">
                              <Phone size={11} className="text-gray-400" />
                              {sup.phone}
                            </div>
                          )}
                          {sup.email && (
                            <div className="flex items-center gap-1 text-gray-500">
                              <Mail size={11} className="text-gray-400" />
                              {sup.email}
                            </div>
                          )}
                          {!sup.phone && !sup.email && <span className="text-gray-400 italic">—</span>}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-gray-600 max-w-xs truncate">
                          {sup.address || <span className="text-gray-400 italic">—</span>}
                        </td>
                        <td className="py-3.5 px-4 text-xs font-bold text-gray-800">
                          {sup.purchase_count || 0}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-gray-500 whitespace-nowrap">
                          {sup.last_purchase_date || <span className="text-gray-400 italic">Never</span>}
                        </td>
                        <td className="py-3.5 px-4">
                          {sup.is_active ? (
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Active
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-600 border border-gray-200">
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEditSupplier(sup)}
                              className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                              title="Edit Supplier"
                            >
                              <Edit2 size={15} />
                            </button>
                            <button
                              onClick={() => handleToggleSupplierActive(sup)}
                              className={`
                                px-2 py-1 rounded-lg text-xs font-bold transition-colors
                                ${
                                  sup.is_active
                                    ? "text-amber-700 hover:bg-amber-50"
                                    : "text-emerald-700 hover:bg-emerald-50"
                                }
                              `}
                            >
                              {sup.is_active ? "Deactivate" : "Activate"}
                            </button>
                          </div>
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

      {/* ========================================================= */}
      {/* MODAL: CREATE NEW PURCHASE ORDER */}
      {/* ========================================================= */}
      {showPurchaseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-4xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-[#063B2E] text-white px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-yellow-400 flex items-center justify-center text-[#063B2E] shadow-md">
                  <ShoppingCart size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-black tracking-tight">Create Purchase Order</h2>
                  <p className="text-xs text-emerald-300">
                    Draft order will not impact inventory until explicitly received
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPurchaseModal(false)}
                className="p-2 rounded-xl text-emerald-200 hover:bg-white/10 hover:text-white transition-all"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSavePurchase} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              {/* Header Fields */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Supplier */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Supplier *
                  </label>
                  <select
                    value={purchaseForm.supplier_id}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, supplier_id: e.target.value })}
                    required
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#063B2E]"
                  >
                    <option value="">Select Supplier</option>
                    {suppliersData
                      .filter((s) => s.is_active)
                      .map((sup) => (
                        <option key={sup.id} value={sup.id}>
                          {sup.name}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Purchase Date */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Purchase Date *
                  </label>
                  <input
                    type="date"
                    value={purchaseForm.purchase_date}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, purchase_date: e.target.value })}
                    required
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#063B2E]"
                  />
                </div>

                {/* Invoice Number */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Invoice # (Optional)
                  </label>
                  <input
                    type="text"
                    value={purchaseForm.invoice_number}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, invoice_number: e.target.value })}
                    placeholder="e.g. INV-98234"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#063B2E]"
                  />
                </div>
              </div>

              {/* Line Items Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-gray-900 tracking-tight flex items-center gap-2">
                    <Layers size={16} className="text-[#063B2E]" />
                    Purchase Line Items ({purchaseForm.items.length})
                  </h3>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-[#063B2E] bg-emerald-50 hover:bg-emerald-100 transition-all"
                  >
                    <Plus size={14} />
                    Add Row
                  </button>
                </div>

                <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3">Inventory Item *</th>
                        <th className="py-2.5 px-3 w-32">Quantity *</th>
                        <th className="py-2.5 px-3 w-36">Unit Cost (Rs.) *</th>
                        <th className="py-2.5 px-3 w-36">Total (Rs.)</th>
                        <th className="py-2.5 px-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm">
                      {purchaseForm.items.map((row, idx) => {
                        const rowQty = parseFloat(row.quantity) || 0;
                        const rowCost = parseFloat(row.unit_cost) || 0;
                        const rowTotal = rowQty * rowCost;
                        const currentItem = inventoryItemsData.find(
                          (it) => it.id === parseInt(row.inventory_item_id)
                        );

                        return (
                          <tr key={idx} className="hover:bg-gray-50/50">
                            <td className="p-2.5">
                              <select
                                value={row.inventory_item_id}
                                onChange={(e) => handleItemChange(idx, "inventory_item_id", e.target.value)}
                                required
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#063B2E]"
                              >
                                <option value="">Choose item...</option>
                                {inventoryItemsData.map((it) => (
                                  <option key={it.id} value={it.id}>
                                    {it.name} ({it.sku || "No SKU"}) — Stock: {it.current_stock}{" "}
                                    {it.unit_code}
                                  </option>
                                ))}
                              </select>
                              {currentItem && (
                                <p className="text-[10px] text-gray-400 mt-1 pl-1">
                                  Current Unit: <span className="font-bold">{currentItem.unit_code}</span> | Current Cost: Rs. {currentItem.cost_per_unit}
                                </p>
                              )}
                            </td>

                            <td className="p-2.5">
                              <input
                                type="number"
                                step="0.001"
                                min="0.001"
                                value={row.quantity}
                                onChange={(e) => handleItemChange(idx, "quantity", e.target.value)}
                                required
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 text-right focus:outline-none focus:ring-2 focus:ring-[#063B2E]"
                              />
                            </td>

                            <td className="p-2.5">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={row.unit_cost}
                                onChange={(e) => handleItemChange(idx, "unit_cost", e.target.value)}
                                required
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 text-right focus:outline-none focus:ring-2 focus:ring-[#063B2E]"
                              />
                            </td>

                            <td className="p-2.5 text-right font-bold text-gray-800 text-xs">
                              Rs. {rowTotal.toFixed(2)}
                            </td>

                            <td className="p-2.5 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveItemRow(idx)}
                                className="p-1 text-red-400 hover:text-red-600 rounded-lg transition-colors"
                                title="Remove row"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Financial Breakdown & Notes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Notes */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Order Notes
                  </label>
                  <textarea
                    rows={3}
                    value={purchaseForm.notes}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, notes: e.target.value })}
                    placeholder="Add delivery instructions, supplier terms, or batch details..."
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#063B2E]"
                  />
                </div>

                {/* Totals Summary Card */}
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 space-y-2.5">
                  <div className="flex justify-between text-xs font-semibold text-gray-600">
                    <span>Items Subtotal:</span>
                    <span>Rs. {calculatedSubtotal.toFixed(2)}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs font-semibold text-gray-600">
                    <span>Applicable Tax (Rs.):</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={purchaseForm.tax_amount}
                      onChange={(e) => setPurchaseForm({ ...purchaseForm, tax_amount: e.target.value })}
                      className="w-28 px-2 py-1 bg-white border border-gray-200 rounded-lg text-xs font-bold text-right focus:outline-none focus:ring-2 focus:ring-[#063B2E]"
                    />
                  </div>

                  <div className="border-t border-gray-200 pt-2 flex justify-between text-base font-black text-[#063B2E]">
                    <span>Grand Total:</span>
                    <span>Rs. {calculatedGrandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowPurchaseModal(false)}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingPurchase}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-black bg-yellow-400 hover:bg-yellow-500 shadow-md transition-all active:scale-95 disabled:opacity-50"
                >
                  {isCreatingPurchase ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      Saving Draft...
                    </>
                  ) : (
                    <>
                      <Check size={16} />
                      Save as Draft
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: PURCHASE DETAIL VIEW */}
      {/* ========================================================= */}
      {showDetailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-3xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
            {/* Detail Header */}
            <div className="bg-[#063B2E] text-white px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-yellow-400 flex items-center justify-center text-[#063B2E] shadow-md">
                  <FileText size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-black tracking-tight">
                    {selectedPurchaseDetail?.purchase_number || "Purchase Order"}
                  </h2>
                  <p className="text-xs text-emerald-300">
                    Vendor: {selectedPurchaseDetail?.supplier_name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-2 rounded-xl text-emerald-200 hover:bg-white/10 hover:text-white transition-all"
              >
                <X size={20} />
              </button>
            </div>

            {isDetailLoading ? (
              <div className="py-16 text-center text-gray-400">
                <RefreshCw size={28} className="animate-spin text-[#063B2E] mx-auto mb-2" />
                <span className="text-xs font-semibold">Loading purchase order details...</span>
              </div>
            ) : selectedPurchaseDetail ? (
              <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
                {/* Meta Overview Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50 p-4 rounded-2xl border border-gray-200/80">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                      Status
                    </span>
                    <div className="mt-1">{getStatusBadge(selectedPurchaseDetail.status)}</div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                      Purchase Date
                    </span>
                    <span className="text-xs font-bold text-gray-800">
                      {selectedPurchaseDetail.purchase_date}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                      Invoice #
                    </span>
                    <span className="text-xs font-mono font-bold text-gray-800">
                      {selectedPurchaseDetail.invoice_number || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                      Created By
                    </span>
                    <span className="text-xs font-semibold text-gray-800">
                      {selectedPurchaseDetail.created_by_name || "System"}
                    </span>
                  </div>
                </div>

                {/* Receiving Status Banner if Received */}
                {selectedPurchaseDetail.status === 2 && (
                  <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 font-bold text-emerald-900">
                      <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                      <span>Stock received and logged to inventory ledger</span>
                    </div>
                    <div className="text-emerald-700 text-right">
                      <span>Received by: <strong>{selectedPurchaseDetail.received_by_name || "Manager"}</strong></span>
                      <span className="block text-[10px] opacity-80">{selectedPurchaseDetail.received_at}</span>
                    </div>
                  </div>
                )}

                {/* Line Items Table */}
                <div className="space-y-2">
                  <h3 className="text-xs font-black text-gray-700 uppercase tracking-wider">
                    Purchased Items Breakdown
                  </h3>
                  <div className="border border-gray-200 rounded-2xl overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-gray-50 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                        <tr>
                          <th className="py-2.5 px-3">Item / SKU</th>
                          <th className="py-2.5 px-3 text-right">Quantity</th>
                          <th className="py-2.5 px-3 text-right">Unit Cost</th>
                          <th className="py-2.5 px-3 text-right">Line Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-xs">
                        {selectedPurchaseDetail.items?.map((itm) => (
                          <tr key={itm.id} className="hover:bg-gray-50/50">
                            <td className="py-2.5 px-3">
                              <span className="font-bold text-gray-800 block">{itm.item_name}</span>
                              <span className="text-[10px] text-gray-400 font-mono">{itm.item_sku}</span>
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-gray-700">
                              {parseFloat(itm.quantity).toFixed(2)} {itm.unit_code}
                            </td>
                            <td className="py-2.5 px-3 text-right font-medium text-gray-600">
                              Rs. {parseFloat(itm.unit_cost).toFixed(2)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-gray-900">
                              Rs. {parseFloat(itm.total_cost).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 space-y-2 text-xs">
                  <div className="flex justify-between font-medium text-gray-600">
                    <span>Subtotal:</span>
                    <span>Rs. {parseFloat(selectedPurchaseDetail.subtotal || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-medium text-gray-600">
                    <span>Tax:</span>
                    <span>Rs. {parseFloat(selectedPurchaseDetail.tax_amount || 0).toFixed(2)}</span>
                  </div>
                  <div className="border-t border-gray-200 pt-2 flex justify-between text-sm font-black text-[#063B2E]">
                    <span>Grand Total:</span>
                    <span>Rs. {parseFloat(selectedPurchaseDetail.total_amount || 0).toFixed(2)}</span>
                  </div>
                </div>

                {/* Modal Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <div className="text-xs text-gray-400">
                    Created at: {new Date(selectedPurchaseDetail.created_at).toLocaleString()}
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedPurchaseDetail.status === 1 && (
                      <button
                        onClick={() => {
                          setShowDetailModal(false);
                          setShowReceiveModal(true);
                        }}
                        className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 shadow-sm transition-all"
                      >
                        Receive Stock Now
                      </button>
                    )}
                    <button
                      onClick={() => setShowDetailModal(false)}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition-all"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: RECEIVE STOCK CONFIRMATION */}
      {/* ========================================================= */}
      {showReceiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200 p-6 space-y-5">
            <div className="flex items-center gap-3 text-emerald-800">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 size={26} />
              </div>
              <div>
                <h3 className="text-lg font-black text-gray-900 tracking-tight">
                  Confirm Stock Receiving
                </h3>
                <p className="text-xs text-emerald-700 font-medium">
                  Add purchased items directly into live inventory
                </p>
              </div>
            </div>

            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 space-y-2">
              <p className="font-bold flex items-center gap-1.5">
                <AlertTriangle size={15} className="text-amber-600 shrink-0" />
                Permanent Inventory Impact
              </p>
              <p className="leading-relaxed text-amber-800">
                This will immediately update stock levels for all line items, recalculate Weighted Average Cost per unit, and generate immutable <strong>PURCHASE_IN</strong> stock movement logs.
              </p>
              <p className="font-semibold text-amber-900">
                This action cannot be received again or reversed without manual audit reconciliation.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowReceiveModal(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReceive}
                disabled={isReceivingPurchase}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 shadow-md transition-all active:scale-95 disabled:opacity-50"
              >
                {isReceivingPurchase ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    Receiving Stock...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    Confirm & Receive Stock
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: CANCEL PURCHASE CONFIRMATION */}
      {/* ========================================================= */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 p-6 space-y-5">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center">
                <XCircle size={26} />
              </div>
              <div>
                <h3 className="text-lg font-black text-gray-900 tracking-tight">
                  Cancel Purchase Order?
                </h3>
                <p className="text-xs text-red-500 font-medium">
                  This will mark the order as Cancelled
                </p>
              </div>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              Are you sure you want to cancel this draft purchase order? It will remain visible for historical tracking but will be disabled from receiving.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition-all"
              >
                Keep Order
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={isCancellingPurchase}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 shadow-md transition-all active:scale-95 disabled:opacity-50"
              >
                {isCancellingPurchase ? "Cancelling..." : "Yes, Cancel Order"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: ADD / EDIT SUPPLIER */}
      {/* ========================================================= */}
      {showSupplierModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-[#063B2E] text-white px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-yellow-400 flex items-center justify-center text-[#063B2E] shadow-md">
                  <Building2 size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-black tracking-tight">
                    {editingSupplier ? "Edit Supplier" : "Add New Supplier"}
                  </h2>
                  <p className="text-xs text-emerald-300">
                    Vendor profile for purchase order replenishment
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSupplierModal(false)}
                className="p-2 rounded-xl text-emerald-200 hover:bg-white/10 hover:text-white transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveSupplier} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Supplier / Vendor Name *
                </label>
                <input
                  type="text"
                  value={supplierForm.name}
                  onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                  placeholder="e.g. Prime Poultry Farms, Metro Cash & Carry"
                  required
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#063B2E]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    value={supplierForm.contact_person}
                    onChange={(e) => setSupplierForm({ ...supplierForm, contact_person: e.target.value })}
                    placeholder="e.g. Ali Raza"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#063B2E]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={supplierForm.phone}
                    onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                    placeholder="e.g. +92 300 1234567"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#063B2E]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  value={supplierForm.email}
                  onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
                  placeholder="e.g. orders@supplier.com"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#063B2E]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Address
                </label>
                <input
                  type="text"
                  value={supplierForm.address}
                  onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })}
                  placeholder="e.g. Warehouse 14, Industrial Area"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#063B2E]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Notes / Payment Terms
                </label>
                <textarea
                  rows={2}
                  value={supplierForm.notes}
                  onChange={(e) => setSupplierForm({ ...supplierForm, notes: e.target.value })}
                  placeholder="e.g. Net 15 days, delivers Tuesdays & Fridays"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#063B2E]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowSupplierModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAddingSupplier || isUpdatingSupplier}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold text-black bg-yellow-400 hover:bg-yellow-500 shadow-md transition-all active:scale-95 disabled:opacity-50"
                >
                  {isAddingSupplier || isUpdatingSupplier ? "Saving..." : editingSupplier ? "Update Supplier" : "Save Supplier"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PurchasesPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-gray-400">
          <RefreshCw size={32} className="animate-spin text-[#063B2E] mx-auto mb-2" />
          <p className="text-sm font-bold text-gray-700">Loading Purchases module...</p>
        </div>
      }
    >
      <PurchasesContent />
    </Suspense>
  );
}
