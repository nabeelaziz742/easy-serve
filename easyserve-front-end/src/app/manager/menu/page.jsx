"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Edit2, Trash2, UtensilsCrossed, Plus, Sparkles, AlertCircle, Image as ImageIcon } from "lucide-react";
import { useGetMeQuery } from "@/services/private/me";
import {
  useGetMenusQuery,
  useGetMenuItemsQuery,
  useAddMenuItemMutation,
  useUpdateMenuItemMutation,
  useDeleteMenuItemMutation,
} from "@/services/private/menuitems";

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.2 } },
};

export default function ManagerMenuPage() {
  const { data: me, isLoading: isLoadingMe } = useGetMeQuery();

  const profile = me?.profile;
  const restaurantId =
    profile?.restaurant?.id ||
    profile?.selected_restaurant ||
    profile?.owned_restaurants?.[0]?.id ||
    null;

  const { data: menus, isLoading: isLoadingMenus, error: menusError } = useGetMenusQuery(
    restaurantId,
    { skip: !restaurantId }
  );
  const menuList = Array.isArray(menus) ? menus : menus?.results || [];
  const menuId = menuList[0]?.id || null;

  const { data: items, isLoading: isLoadingItems, error: itemsError } = useGetMenuItemsQuery(
    menuId,
    { skip: !menuId }
  );
  const menuItems = Array.isArray(items) ? items : items?.results || [];

  const [addMenuItem, { isLoading: isAdding }] = useAddMenuItemMutation();
  const [updateMenuItem, { isLoading: isUpdating }] = useUpdateMenuItemMutation();
  const [deleteMenuItem, { isLoading: isDeleting }] = useDeleteMenuItemMutation();

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [image, setImage] = useState(null);
  const [fileName, setFileName] = useState("Choose an item image...");
  const [editingId, setEditingId] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  const resetForm = () => {
    setName("");
    setPrice("");
    setImage(null);
    setFileName("Choose an item image...");
    setEditingId(null);
    setErrorMessage("");
  };

  const handleSubmit = async () => {
    setErrorMessage("");

    const normalizedName = name.trim();
    const numericPrice = Number(price);

    if (!menuId) {
      setErrorMessage("No menu is configured for this restaurant yet.");
      return;
    }
    if (!normalizedName) {
      setErrorMessage("Item name is required.");
      return;
    }
    if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
      setErrorMessage("Enter a valid price greater than zero.");
      return;
    }

    try {
      if (editingId) {
        await updateMenuItem({
          id: editingId,
          name: normalizedName,
          price: price,
        }).unwrap();
      } else {
        const formData = new FormData();
        formData.append("name", normalizedName);
        formData.append("price", price);
        if (image) formData.append("image", image);
        await addMenuItem({ menuId, formData }).unwrap();
      }
      resetForm();
    } catch (err) {
      setErrorMessage(
        err?.data?.detail ||
          err?.data?.message ||
          "Unable to save this menu item. Please try again."
      );
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setName(item.name || "");
    setPrice(item.price ?? "");
    setImage(null);
    setFileName("Choose an item image...");
    setErrorMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (itemId) => {
    setErrorMessage("");
    try {
      await deleteMenuItem(itemId).unwrap();
      if (editingId === itemId) resetForm();
    } catch (err) {
      setErrorMessage(
        err?.data?.detail ||
          err?.data?.message ||
          "Unable to delete this menu item. Please try again."
      );
    }
  };

  const busy = isAdding || isUpdating || isDeleting;
  const loading = isLoadingMe || isLoadingMenus || (!!menuId && isLoadingItems);
  const loadError = menusError || itemsError;

  return (
    <div className="min-h-screen bg-zinc-50/50 p-4 font-sans md:p-8 lg:p-10">
      <div className="mx-auto max-w-5xl space-y-8">
        {/* Page Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-green-950 text-amber-400 shadow-sm">
                <UtensilsCrossed className="h-5 w-5" />
              </span>
              <h1 className="text-3xl font-black tracking-tight text-zinc-900 md:text-4xl">
                Menu Management
              </h1>
            </div>
            <p className="mt-1 text-sm text-zinc-500">
              Add, update prices, and organize dishes served at your restaurant.
            </p>
          </div>
          {menuId && (
            <div className="w-fit rounded-full border border-amber-200 bg-amber-50 px-3.5 py-1 text-xs font-bold text-amber-800">
              Menu #{menuId} • {menuItems.length} items
            </div>
          )}
        </div>

        {/* Form Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-sm md:p-8"
        >
          <div className="mb-6 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black text-zinc-900">
                {editingId ? "Edit Menu Item" : "Add New Dish"}
              </h2>
              <p className="text-xs text-zinc-500">
                {editingId ? "Update details for the selected dish" : "Enter item details and upload a photo to display to customers"}
              </p>
            </div>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-1.5 text-xs font-bold text-zinc-600 transition hover:bg-zinc-100 active:scale-95"
              >
                Cancel edit
              </button>
            )}
          </div>

          {errorMessage && (
            <div className="mb-5 flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {!loading && !menuId ? (
            <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-8 text-center text-sm text-zinc-500">
              No menu is configured for this restaurant. Create the restaurant menu first, then dishes can be added here.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-zinc-500">
                  Item Name
                </label>
                <input
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-green-900 focus:bg-white focus:ring-2 focus:ring-green-950/10"
                  placeholder="e.g. Special Chicken Karahi"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-zinc-500">
                  Price (Rs)
                </label>
                <input
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-green-900 focus:bg-white focus:ring-2 focus:ring-green-950/10"
                  placeholder="e.g. 1450"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </div>

              {!editingId && (
                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-zinc-500">
                    Item Photo
                  </label>
                  <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-zinc-300 bg-zinc-50/50 px-4 py-3.5 transition-colors hover:border-green-900 hover:bg-white">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-50 text-green-900">
                      <Upload className="h-4 w-4" />
                    </div>
                    <span className="truncate text-sm font-medium text-zinc-600">{fileName}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const selected = e.target.files?.[0] || null;
                        setImage(selected);
                        setFileName(selected?.name || "Choose an item image...");
                      }}
                    />
                  </label>
                </div>
              )}

              <button
                type="button"
                disabled={busy || !menuId}
                onClick={handleSubmit}
                className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-green-950 py-3.5 text-sm font-bold text-white shadow-md shadow-green-950/20 transition-all hover:bg-green-900 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 md:col-span-2"
              >
                {editingId ? <Edit2 className="h-4 w-4 text-amber-400" /> : <Plus className="h-4 w-4 text-amber-400" />}
                {isAdding ? "Adding..." : isUpdating ? "Updating..." : isDeleting ? "Deleting..." : editingId ? "Update Menu Item" : "Add to Menu"}
              </button>
            </div>
          )}
        </motion.div>

        {/* Menu Items List */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-black text-zinc-900">Current Menu Items</h2>
            <span className="text-xs font-medium text-zinc-500">{menuItems.length} items listed</span>
          </div>

          {loading ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-20 animate-pulse rounded-2xl bg-zinc-100" />
              ))}
            </div>
          ) : loadError ? (
            <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm font-medium text-red-700">
              Unable to load the restaurant menu. Please try again.
            </div>
          ) : !menuId ? null : menuItems.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-zinc-200 bg-white p-12 text-center shadow-xs">
              <UtensilsCrossed className="mx-auto h-8 w-8 text-zinc-300" />
              <p className="mt-2 text-sm font-medium text-zinc-500">No dishes on the menu yet. Add your first item above.</p>
            </div>
          ) : (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="grid gap-3 sm:grid-cols-2"
            >
              <AnimatePresence>
                {menuItems.map((item) => (
                  <motion.div
                    key={item.id}
                    variants={itemVariants}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex flex-col justify-between gap-3 rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-xs transition-all duration-200 hover:border-amber-200 hover:shadow-md sm:flex-row sm:items-center"
                  >
                    <div className="flex min-w-0 items-center gap-3.5">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="h-14 w-14 shrink-0 rounded-xl border border-zinc-100 object-cover shadow-xs"
                        />
                      ) : (
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-400">
                          <ImageIcon className="h-6 w-6" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-black text-zinc-900">{item.name}</h3>
                        <p className="mt-0.5 text-xs font-bold text-green-900">Rs {item.price}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5 self-end sm:self-center">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleEdit(item)}
                        className="rounded-xl border border-zinc-100 bg-zinc-50 p-2 text-zinc-600 transition-all hover:bg-zinc-100 hover:text-green-900 active:scale-95 disabled:opacity-50"
                        aria-label={`Edit ${item.name}`}
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleDelete(item.id)}
                        className="rounded-xl border border-zinc-100 bg-zinc-50 p-2 text-zinc-600 transition-all hover:bg-red-50 hover:text-red-600 active:scale-95 disabled:opacity-50"
                        aria-label={`Delete ${item.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

