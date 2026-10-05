"use client";

import React, { useState, useMemo, Suspense } from "react";
import {
  ScrollText,
  Plus,
  Search,
  RefreshCw,
  Eye,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Layers,
  DollarSign,
  Percent,
  UtensilsCrossed,
  X,
  Check,
  TrendingDown,
  Info,
} from "lucide-react";
import {
  useGetRecipeSummaryQuery,
  useGetRecipesQuery,
  useGetRecipeDetailQuery,
  useGetAvailableMenuItemsQuery,
  useCreateRecipeMutation,
  useUpdateRecipeMutation,
  useDeleteRecipeMutation,
} from "@/services/private/recipes";
import {
  useGetInventoryItemsQuery,
  useGetInventoryUnitsQuery,
} from "@/services/private/inventory";
import { toast } from "sonner";

function RecipesContent() {
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [costHealthFilter, setCostHealthFilter] = useState("all"); // 'all' | 'ideal' | 'high'

  // Modal States
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState(null);
  const [selectedRecipeId, setSelectedRecipeId] = useState(null);

  // Queries
  const {
    data: summaryData,
    isLoading: isSummaryLoading,
    refetch: refetchSummary,
  } = useGetRecipeSummaryQuery();

  const queryParams = useMemo(() => {
    const params = {};
    if (searchQuery.trim()) params.search = searchQuery.trim();
    if (statusFilter === "active") params.is_active = true;
    if (statusFilter === "inactive") params.is_active = false;
    return params;
  }, [searchQuery, statusFilter]);

  const {
    data: recipesData = [],
    isLoading: isRecipesLoading,
    isFetching: isRecipesFetching,
    refetch: refetchRecipes,
  } = useGetRecipesQuery(queryParams);

  const { data: availableMenuItems = [], refetch: refetchAvailableItems } =
    useGetAvailableMenuItemsQuery({});

  const { data: inventoryItems = [] } = useGetInventoryItemsQuery({});
  const { data: inventoryUnits = [] } = useGetInventoryUnitsQuery({});

  const {
    data: selectedRecipeDetail,
    isLoading: isDetailLoading,
    refetch: refetchDetail,
  } = useGetRecipeDetailQuery(
    { id: selectedRecipeId },
    { skip: !selectedRecipeId }
  );

  // Mutations
  const [createRecipe, { isLoading: isCreatingRecipe }] = useCreateRecipeMutation();
  const [updateRecipe, { isLoading: isUpdatingRecipe }] = useUpdateRecipeMutation();
  const [deleteRecipe, { isLoading: isDeletingRecipe }] = useDeleteRecipeMutation();

  // Recipe Form State
  const [recipeForm, setRecipeForm] = useState({
    menu_item_id: "",
    yield_servings: "1.00",
    instructions: "",
    is_active: true,
    items: [
      {
        inventory_item_id: "",
        quantity_required: "1.0000",
        uom_id: "",
      },
    ],
  });

  // Filtered recipes by Food Cost Health
  const displayedRecipes = useMemo(() => {
    if (costHealthFilter === "all") return recipesData;
    return recipesData.filter((r) => {
      const fc = parseFloat(r.food_cost_percentage);
      if (isNaN(fc)) return false;
      if (costHealthFilter === "ideal") return fc <= 35;
      if (costHealthFilter === "high") return fc > 35;
      return true;
    });
  }, [recipesData, costHealthFilter]);

  // Calculations for Recipe Modal Form
  const selectedMenuItemObj = useMemo(() => {
    if (editingRecipe) {
      return editingRecipe.menu_item_name
        ? {
            name: editingRecipe.menu_item_name,
            price: editingRecipe.menu_item_price,
            category_name: editingRecipe.category_name,
          }
        : null;
    }
    return availableMenuItems.find((m) => m.id === parseInt(recipeForm.menu_item_id));
  }, [recipeForm.menu_item_id, editingRecipe, availableMenuItems]);

  const calculatedTotalCost = useMemo(() => {
    return recipeForm.items.reduce((acc, row) => {
      const q = parseFloat(row.quantity_required) || 0;
      const itm = inventoryItems.find((it) => it.id === parseInt(row.inventory_item_id));
      const costPerUnit = parseFloat(itm?.cost_per_unit || 0);
      return acc + q * costPerUnit;
    }, 0);
  }, [recipeForm.items, inventoryItems]);

  const calculatedCostPerServing = useMemo(() => {
    const y = parseFloat(recipeForm.yield_servings) || 1;
    return y > 0 ? calculatedTotalCost / y : calculatedTotalCost;
  }, [calculatedTotalCost, recipeForm.yield_servings]);

  const calculatedFoodCostPct = useMemo(() => {
    const price = parseFloat(selectedMenuItemObj?.price || 0);
    if (price <= 0) return null;
    return (calculatedCostPerServing / price) * 100;
  }, [calculatedCostPerServing, selectedMenuItemObj]);

  // Handlers
  const handleOpenNewRecipe = () => {
    setEditingRecipe(null);
    const defaultMenu = availableMenuItems.length > 0 ? availableMenuItems[0].id : "";
    const defaultInv = inventoryItems.length > 0 ? inventoryItems[0].id : "";
    const defaultUom = inventoryItems.length > 0 ? inventoryItems[0].uom_id || "" : "";

    setRecipeForm({
      menu_item_id: defaultMenu,
      yield_servings: "1.00",
      instructions: "",
      is_active: true,
      items: [
        {
          inventory_item_id: defaultInv,
          quantity_required: "1.0000",
          uom_id: defaultUom,
        },
      ],
    });
    setShowRecipeModal(true);
  };

  const handleOpenEditRecipe = (recipe) => {
    setEditingRecipe(recipe);
    setRecipeForm({
      menu_item_id: recipe.menu_item,
      yield_servings: recipe.yield_servings || "1.00",
      instructions: recipe.instructions || "",
      is_active: recipe.is_active,
      items: recipe.items?.length
        ? recipe.items.map((it) => ({
            inventory_item_id: it.inventory_item,
            quantity_required: it.quantity_required,
            uom_id: it.uom || "",
          }))
        : [
            {
              inventory_item_id: inventoryItems[0]?.id || "",
              quantity_required: "1.0000",
              uom_id: inventoryItems[0]?.uom_id || "",
            },
          ],
    });
    setShowRecipeModal(true);
  };

  const handleAddIngredientRow = () => {
    const defaultInv = inventoryItems.length > 0 ? inventoryItems[0].id : "";
    const defaultUom = inventoryItems.length > 0 ? inventoryItems[0].uom_id || "" : "";
    setRecipeForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          inventory_item_id: defaultInv,
          quantity_required: "1.0000",
          uom_id: defaultUom,
        },
      ],
    }));
  };

  const handleRemoveIngredientRow = (idx) => {
    if (recipeForm.items.length <= 1) {
      toast.error("At least one ingredient is required in the recipe.");
      return;
    }
    setRecipeForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx),
    }));
  };

  const handleIngredientChange = (idx, field, value) => {
    setRecipeForm((prev) => {
      const newItems = [...prev.items];
      newItems[idx] = { ...newItems[idx], [field]: value };

      if (field === "inventory_item_id") {
        const found = inventoryItems.find((it) => it.id === parseInt(value));
        if (found) {
          newItems[idx].uom_id = found.uom_id || "";
        }
      }

      return { ...prev, items: newItems };
    });
  };

  const handleSaveRecipe = async (e) => {
    e.preventDefault();
    if (!editingRecipe && !recipeForm.menu_item_id) {
      toast.error("Please select a menu item.");
      return;
    }

    if (!recipeForm.items.length) {
      toast.error("Please add at least one ingredient.");
      return;
    }

    for (let i = 0; i < recipeForm.items.length; i++) {
      const row = recipeForm.items[i];
      if (!row.inventory_item_id) {
        toast.error(`Please select an inventory item for line #${i + 1}`);
        return;
      }
      if (parseFloat(row.quantity_required) <= 0 || isNaN(parseFloat(row.quantity_required))) {
        toast.error(`Quantity for line #${i + 1} must be greater than 0`);
        return;
      }
    }

    try {
      const payload = {
        yield_servings: parseFloat(recipeForm.yield_servings || 1).toFixed(2),
        instructions: recipeForm.instructions.trim(),
        is_active: recipeForm.is_active,
        items: recipeForm.items.map((it) => ({
          inventory_item_id: parseInt(it.inventory_item_id),
          quantity_required: parseFloat(it.quantity_required).toFixed(4),
          uom_id: it.uom_id ? parseInt(it.uom_id) : null,
        })),
      };

      if (!editingRecipe) {
        payload.menu_item_id = parseInt(recipeForm.menu_item_id);
        await createRecipe(payload).unwrap();
        toast.success("Recipe / BOM created successfully!");
      } else {
        await updateRecipe({ id: editingRecipe.id, ...payload }).unwrap();
        toast.success("Recipe updated successfully!");
      }

      setShowRecipeModal(false);
      refetchRecipes();
      refetchSummary();
      refetchAvailableItems();
    } catch (err) {
      console.error(err);
      const errMsg =
        err?.data?.non_field_errors?.[0] ||
        err?.data?.error ||
        err?.data?.detail ||
        (typeof err?.data === "object"
          ? Object.entries(err.data)
              .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(" ") : v}`)
              .join(" | ")
          : null) ||
        "Failed to save recipe.";
      toast.error(errMsg);
    }
  };

  const handleToggleRecipeActive = async (recipe) => {
    try {
      await updateRecipe({
        id: recipe.id,
        is_active: !recipe.is_active,
      }).unwrap();
      toast.success(recipe.is_active ? "Recipe deactivated." : "Recipe activated.");
      refetchRecipes();
      refetchSummary();
    } catch (err) {
      toast.error("Failed to update recipe status.");
    }
  };

  const getFoodCostBadge = (pctStr) => {
    if (!pctStr || pctStr === "None") {
      return <span className="text-gray-400 text-xs italic">N/A</span>;
    }
    const val = parseFloat(pctStr);
    if (isNaN(val)) return <span className="text-gray-400 text-xs italic">N/A</span>;

    if (val <= 30) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
          {val.toFixed(1)}% <span className="text-[10px] font-normal">Ideal</span>
        </span>
      );
    } else if (val <= 40) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-50 text-amber-700 border border-amber-200">
          {val.toFixed(1)}% <span className="text-[10px] font-normal">Normal</span>
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-red-50 text-red-700 border border-red-200">
          {val.toFixed(1)}% <span className="text-[10px] font-normal">High</span>
        </span>
      );
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 font-sans">
      {/* Top Header Card */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#063B2E] text-yellow-400 flex items-center justify-center shadow-md">
              <ScrollText size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">
                Recipes & Bill of Materials
              </h1>
              <p className="text-sm text-gray-500 font-medium">
                Connect menu items with raw ingredients for precise costing & automatic kitchen stock consumption
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => {
              refetchSummary();
              refetchRecipes();
              refetchAvailableItems();
              toast.success("Recipe data refreshed");
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-all"
            title="Refresh"
          >
            <RefreshCw size={14} className={isRecipesFetching ? "animate-spin" : ""} />
            Refresh
          </button>

          <button
            onClick={handleOpenNewRecipe}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-black bg-yellow-400 hover:bg-yellow-500 shadow-md transition-all active:scale-95"
          >
            <Plus size={15} />
            + Create Recipe (BOM)
          </button>
        </div>
      </div>

      {/* Live SaaS KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Recipes */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Recipes</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-800">
              <ScrollText size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-gray-900 tracking-tight">
            {isSummaryLoading ? "..." : summaryData?.total_recipes || 0}
          </p>
          <span className="text-[11px] font-semibold text-emerald-700">
            {summaryData?.active_recipes || 0} active in kitchen
          </span>
        </div>

        {/* Menu Items Covered */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Menu Coverage</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-700">
              <UtensilsCrossed size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-blue-900 tracking-tight">
            {isSummaryLoading ? "..." : summaryData?.menu_items_with_recipes_count || 0}
          </p>
          <span className="text-[11px] font-semibold text-blue-600">
            {summaryData?.menu_items_without_recipes_count || 0} items pending BOM
          </span>
        </div>

        {/* Average Food Cost % */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Avg Food Cost</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-700">
              <Percent size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-800 tracking-tight">
            {isSummaryLoading ? "..." : summaryData?.avg_food_cost_percentage || "0.0"}%
          </p>
          <span className="text-[11px] font-semibold text-amber-600">Target: 28% – 35%</span>
        </div>

        {/* Low Stock Ingredient Alert */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Stock Risk</span>
            <div className="p-2 rounded-xl bg-red-50 text-red-600">
              <AlertTriangle size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-red-700 tracking-tight">
            {isSummaryLoading ? "..." : summaryData?.low_stock_recipes_count || 0}
          </p>
          <span className="text-[11px] font-semibold text-red-600">Recipes with low items</span>
        </div>

        {/* Automated Consumption Badge */}
        <div className="bg-[#063B2E] p-5 rounded-2xl text-white shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between opacity-80 text-xs font-bold uppercase">
            <span>Auto-Consumption</span>
            <CheckCircle2 size={16} className="text-yellow-400" />
          </div>
          <div>
            <p className="text-lg font-black text-yellow-400 tracking-tight leading-tight">
              Active on PREPARED
            </p>
            <p className="text-[11px] text-emerald-200 mt-0.5">
              Stock deducts automatically on kitchen prep
            </p>
          </div>
        </div>
      </div>

      {/* Filter & Action Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row items-center gap-3 justify-between">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search recipe by menu item, category..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#063B2E] focus:bg-white transition-all"
          />
        </div>

        {/* Status Pills */}
        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {[
            { label: "All Recipes", val: "all" },
            { label: "Active", val: "active" },
            { label: "Inactive", val: "inactive" },
          ].map((st) => (
            <button
              key={st.val}
              onClick={() => setStatusFilter(st.val)}
              className={`
                px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all
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

        {/* Food Cost Filter */}
        <div className="flex items-center gap-1.5 w-full md:w-auto">
          {[
            { label: "All Margins", val: "all" },
            { label: "Ideal (≤35%)", val: "ideal" },
            { label: "High Cost (>35%)", val: "high" },
          ].map((ch) => (
            <button
              key={ch.val}
              onClick={() => setCostHealthFilter(ch.val)}
              className={`
                px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all
                ${
                  costHealthFilter === ch.val
                    ? "bg-amber-100 text-amber-900 border border-amber-300 shadow-sm"
                    : "bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100"
                }
              `}
            >
              {ch.label}
            </button>
          ))}
        </div>
      </div>

      {/* Recipes Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Menu Item</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4 text-right">Selling Price</th>
                <th className="py-3.5 px-4 text-right">Recipe Cost (BOM)</th>
                <th className="py-3.5 px-4 text-right">Gross Margin</th>
                <th className="py-3.5 px-4 text-center">Food Cost %</th>
                <th className="py-3.5 px-4 text-center">Ingredients</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-sm">
              {isRecipesLoading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gray-400">
                    <RefreshCw size={24} className="animate-spin text-[#063B2E] mx-auto mb-2" />
                    <span className="text-xs font-semibold">Loading recipes...</span>
                  </td>
                </tr>
              ) : displayedRecipes.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gray-400">
                    <ScrollText size={32} className="text-gray-300 mx-auto mb-2" />
                    <p className="font-bold text-gray-700">No recipes configured</p>
                    <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
                      Configure your first Bill of Materials (BOM) to link menu items with raw inventory.
                    </p>
                    <button
                      onClick={handleOpenNewRecipe}
                      className="mt-3 px-4 py-2 rounded-xl text-xs font-bold text-black bg-yellow-400 hover:bg-yellow-500 shadow-md"
                    >
                      + Create First Recipe
                    </button>
                  </td>
                </tr>
              ) : (
                displayedRecipes.map((r) => {
                  const sellingPrice = parseFloat(r.menu_item_price || 0);
                  const recipeCost = parseFloat(r.cost_per_serving || 0);
                  const margin = sellingPrice - recipeCost;

                  return (
                    <tr key={r.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-gray-900">{r.menu_item_name}</div>
                        <div className="text-[11px] text-gray-400">
                          Yield: {parseFloat(r.yield_servings || 1)} serving(s)
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-xs font-medium text-gray-600">
                        {r.category_name ? (
                          <span className="px-2 py-0.5 rounded-lg bg-gray-100 text-gray-700 text-[11px]">
                            {r.category_name}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right text-xs font-bold text-gray-900">
                        Rs. {sellingPrice.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-right text-xs font-bold text-[#063B2E]">
                        Rs. {recipeCost.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-right text-xs font-semibold text-emerald-700">
                        Rs. {margin.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {getFoodCostBadge(r.food_cost_percentage)}
                      </td>
                      <td className="py-3.5 px-4 text-center text-xs font-bold text-gray-700">
                        {r.items_count} items
                      </td>
                      <td className="py-3.5 px-4">
                        {r.is_active ? (
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-600 border border-gray-200">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedRecipeId(r.id);
                              setShowDetailModal(true);
                            }}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                            title="View Recipe Breakdown"
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            onClick={() => handleOpenEditRecipe(r)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                            title="Edit Recipe"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            onClick={() => handleToggleRecipeActive(r)}
                            className={`
                              px-2 py-1 rounded-lg text-xs font-bold transition-colors
                              ${
                                r.is_active
                                  ? "text-amber-700 hover:bg-amber-50"
                                  : "text-emerald-700 hover:bg-emerald-50"
                              }
                            `}
                          >
                            {r.is_active ? "Deactivate" : "Activate"}
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

      {/* ========================================================= */}
      {/* MODAL: CREATE / EDIT RECIPE */}
      {/* ========================================================= */}
      {showRecipeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-4xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-[#063B2E] text-white px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-yellow-400 flex items-center justify-center text-[#063B2E] shadow-md">
                  <ScrollText size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-black tracking-tight">
                    {editingRecipe ? `Edit Recipe: ${editingRecipe.menu_item_name}` : "Create Recipe / BOM"}
                  </h2>
                  <p className="text-xs text-emerald-300">
                    Define raw inventory consumption rules and portion yields
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowRecipeModal(false)}
                className="p-2 rounded-xl text-emerald-200 hover:bg-white/10 hover:text-white transition-all"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveRecipe} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              {/* Menu Item & Yield */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Menu Item Selection */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Menu Item *
                  </label>
                  {editingRecipe ? (
                    <div className="px-3.5 py-2.5 bg-gray-100 border border-gray-200 rounded-xl text-sm font-bold text-gray-800">
                      {editingRecipe.menu_item_name} — Rs. {parseFloat(editingRecipe.menu_item_price || 0).toLocaleString()}
                    </div>
                  ) : (
                    <select
                      value={recipeForm.menu_item_id}
                      onChange={(e) => setRecipeForm({ ...recipeForm, menu_item_id: e.target.value })}
                      required
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#063B2E]"
                    >
                      <option value="">Select menu item...</option>
                      {availableMenuItems.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} ({item.category_name}) — Selling Price: Rs. {parseFloat(item.price).toLocaleString()}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Yield Servings */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Yield Servings *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={recipeForm.yield_servings}
                    onChange={(e) => setRecipeForm({ ...recipeForm, yield_servings: e.target.value })}
                    required
                    placeholder="1.00"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#063B2E]"
                  />
                </div>
              </div>

              {/* Dynamic Ingredients Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-gray-900 tracking-tight flex items-center gap-2">
                    <Layers size={16} className="text-[#063B2E]" />
                    Raw Inventory Ingredients ({recipeForm.items.length})
                  </h3>
                  <button
                    type="button"
                    onClick={handleAddIngredientRow}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-[#063B2E] bg-emerald-50 hover:bg-emerald-100 transition-all"
                  >
                    <Plus size={14} />
                    Add Ingredient
                  </button>
                </div>

                <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3">Inventory Item *</th>
                        <th className="py-2.5 px-3 w-32">Qty Required *</th>
                        <th className="py-2.5 px-3 w-32">Unit</th>
                        <th className="py-2.5 px-3 w-36 text-right">Cost (Rs.)</th>
                        <th className="py-2.5 px-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm">
                      {recipeForm.items.map((row, idx) => {
                        const itm = inventoryItems.find((it) => it.id === parseInt(row.inventory_item_id));
                        const lineQty = parseFloat(row.quantity_required) || 0;
                        const unitCost = parseFloat(itm?.cost_per_unit || 0);
                        const estimatedCost = lineQty * unitCost;

                        return (
                          <tr key={idx} className="hover:bg-gray-50/50">
                            <td className="p-2.5">
                              <select
                                value={row.inventory_item_id}
                                onChange={(e) => handleIngredientChange(idx, "inventory_item_id", e.target.value)}
                                required
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#063B2E]"
                              >
                                <option value="">Select ingredient...</option>
                                {inventoryItems.map((inv) => (
                                  <option key={inv.id} value={inv.id}>
                                    {inv.name} ({inv.sku || "No SKU"}) — Stock: {inv.current_stock} {inv.unit_code}
                                  </option>
                                ))}
                              </select>
                              {itm && (
                                <p className="text-[10px] text-gray-400 mt-1 pl-1">
                                  Current Stock: <span className="font-bold">{itm.current_stock} {itm.unit_code}</span> | WAC: Rs. {itm.cost_per_unit} / {itm.unit_code}
                                </p>
                              )}
                            </td>

                            <td className="p-2.5">
                              <input
                                type="number"
                                step="0.0001"
                                min="0.0001"
                                value={row.quantity_required}
                                onChange={(e) => handleIngredientChange(idx, "quantity_required", e.target.value)}
                                required
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 text-right focus:outline-none focus:ring-2 focus:ring-[#063B2E]"
                              />
                            </td>

                            <td className="p-2.5">
                              <select
                                value={row.uom_id}
                                onChange={(e) => handleIngredientChange(idx, "uom_id", e.target.value)}
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#063B2E]"
                              >
                                <option value="">Default ({itm?.unit_code || "Unit"})</option>
                                {inventoryUnits.map((u) => (
                                  <option key={u.id} value={u.id}>
                                    {u.name} ({u.short_code})
                                  </option>
                                ))}
                              </select>
                            </td>

                            <td className="p-2.5 text-right font-bold text-gray-800 text-xs">
                              Rs. {estimatedCost.toFixed(2)}
                            </td>

                            <td className="p-2.5 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveIngredientRow(idx)}
                                className="p-1 text-red-400 hover:text-red-600 rounded-lg transition-colors"
                                title="Remove ingredient"
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

              {/* Instructions & Financial Analytics Card */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Kitchen Preparation Instructions
                  </label>
                  <textarea
                    rows={4}
                    value={recipeForm.instructions}
                    onChange={(e) => setRecipeForm({ ...recipeForm, instructions: e.target.value })}
                    placeholder="Step-by-step culinary preparation instructions for kitchen / KDS..."
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#063B2E]"
                  />
                </div>

                {/* Live Food Cost Analysis */}
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 space-y-2 text-xs">
                  <span className="font-bold text-gray-700 uppercase tracking-wider block">
                    Live Profit & Cost Analysis
                  </span>
                  <div className="flex justify-between text-gray-600 font-medium">
                    <span>Batch Total Cost:</span>
                    <span className="font-bold">Rs. {calculatedTotalCost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600 font-medium">
                    <span>Cost Per Serving:</span>
                    <span className="font-bold text-[#063B2E]">Rs. {calculatedCostPerServing.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600 font-medium">
                    <span>Selling Price:</span>
                    <span className="font-bold">Rs. {parseFloat(selectedMenuItemObj?.price || 0).toFixed(2)}</span>
                  </div>
                  <div className="border-t border-gray-200 pt-2 flex items-center justify-between text-sm">
                    <span className="font-bold text-gray-800">Estimated Food Cost:</span>
                    <div>{getFoodCostBadge(calculatedFoodCostPct ? calculatedFoodCostPct.toFixed(1) : null)}</div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowRecipeModal(false)}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingRecipe || isUpdatingRecipe}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-black bg-yellow-400 hover:bg-yellow-500 shadow-md transition-all active:scale-95 disabled:opacity-50"
                >
                  {isCreatingRecipe || isUpdatingRecipe ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      Saving Recipe...
                    </>
                  ) : (
                    <>
                      <Check size={16} />
                      {editingRecipe ? "Update Recipe" : "Save Recipe"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: RECIPE DETAIL VIEW */}
      {/* ========================================================= */}
      {showDetailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-3xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-[#063B2E] text-white px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-yellow-400 flex items-center justify-center text-[#063B2E] shadow-md">
                  <ScrollText size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-black tracking-tight">
                    {selectedRecipeDetail?.menu_item_name || "Recipe Breakdown"}
                  </h2>
                  <p className="text-xs text-emerald-300">
                    Category: {selectedRecipeDetail?.category_name || "General"}
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
                <span className="text-xs font-semibold">Loading recipe details...</span>
              </div>
            ) : selectedRecipeDetail ? (
              <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
                {/* Financial Overview Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50 p-4 rounded-2xl border border-gray-200/80">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                      Selling Price
                    </span>
                    <span className="text-sm font-bold text-gray-900">
                      Rs. {parseFloat(selectedRecipeDetail.menu_item_price || 0).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                      Recipe Cost / Serving
                    </span>
                    <span className="text-sm font-bold text-[#063B2E]">
                      Rs. {parseFloat(selectedRecipeDetail.cost_per_serving || 0).toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                      Food Cost %
                    </span>
                    <div className="mt-0.5">{getFoodCostBadge(selectedRecipeDetail.food_cost_percentage)}</div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                      Yield
                    </span>
                    <span className="text-sm font-bold text-gray-800">
                      {parseFloat(selectedRecipeDetail.yield_servings || 1)} Serving(s)
                    </span>
                  </div>
                </div>

                {/* Ingredients List */}
                <div className="space-y-2">
                  <h3 className="text-xs font-black text-gray-700 uppercase tracking-wider">
                    Raw Materials / Bill of Materials (BOM)
                  </h3>
                  <div className="border border-gray-200 rounded-2xl overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-gray-50 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                        <tr>
                          <th className="py-2.5 px-3">Ingredient</th>
                          <th className="py-2.5 px-3 text-right">Required Qty</th>
                          <th className="py-2.5 px-3 text-right">Current Stock</th>
                          <th className="py-2.5 px-3 text-right">Unit Cost</th>
                          <th className="py-2.5 px-3 text-right">Total Cost</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-xs">
                        {selectedRecipeDetail.items?.map((itm) => (
                          <tr key={itm.id} className="hover:bg-gray-50/50">
                            <td className="py-2.5 px-3">
                              <span className="font-bold text-gray-800 block">{itm.item_name}</span>
                              <span className="text-[10px] text-gray-400 font-mono">{itm.item_sku}</span>
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-gray-700">
                              {parseFloat(itm.quantity_required).toFixed(3)} {itm.uom_code || itm.inventory_uom_code}
                            </td>
                            <td className="py-2.5 px-3 text-right font-medium text-gray-600">
                              {parseFloat(itm.current_stock || 0).toFixed(2)} {itm.inventory_uom_code}
                            </td>
                            <td className="py-2.5 px-3 text-right font-medium text-gray-600">
                              Rs. {parseFloat(itm.cost_per_unit || 0).toFixed(2)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-gray-900">
                              Rs. {parseFloat(itm.ingredient_cost || 0).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Preparation Instructions */}
                {selectedRecipeDetail.instructions && (
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-1.5">
                    <span className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
                      Preparation Instructions
                    </span>
                    <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-line">
                      {selectedRecipeDetail.instructions}
                    </p>
                  </div>
                )}

                {/* Modal Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <div className="text-xs text-gray-400">
                    Last updated: {new Date(selectedRecipeDetail.updated_at).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setShowDetailModal(false);
                        handleOpenEditRecipe(selectedRecipeDetail);
                      }}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-black bg-yellow-400 hover:bg-yellow-500 shadow-md"
                    >
                      Edit Recipe
                    </button>
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
    </div>
  );
}

export default function RecipesPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-gray-400">
          <RefreshCw size={32} className="animate-spin text-[#063B2E] mx-auto mb-2" />
          <p className="text-sm font-bold text-gray-700">Loading Recipes module...</p>
        </div>
      }
    >
      <RecipesContent />
    </Suspense>
  );
}
