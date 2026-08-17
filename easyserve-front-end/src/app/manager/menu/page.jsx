"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Edit2, Trash2 } from "lucide-react";
import {
  useGetMenuItemsQuery,
  useAddMenuItemMutation,
  useUpdateMenuItemMutation,
  useDeleteMenuItemMutation,
} from "@/services/private/menuitems";

export default function ManagerMenuPage() {
  // Keep the current demo menu contract, but isolate it in one place so it can
  // be replaced by the authenticated restaurant's default menu without
  // changing the form/list logic.
  const menuId = 1;
  const { data: items, isLoading, error } = useGetMenuItemsQuery(menuId);
  const menuItems = Array.isArray(items) ? items : items?.results || [];

  const [addMenuItem, { isLoading: isAdding }] = useAddMenuItemMutation();
  const [updateMenuItem, { isLoading: isUpdating }] = useUpdateMenuItemMutation();
  const [deleteMenuItem, { isLoading: isDeleting }] = useDeleteMenuItemMutation();

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [image, setImage] = useState(null);
  const [fileName, setFileName] = useState("Choose an image...");
  const [editingId, setEditingId] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  const resetForm = () => {
    setName("");
    setPrice("");
    setImage(null);
    setFileName("Choose an image...");
    setEditingId(null);
  };

  const handleSubmit = async () => {
    setErrorMessage("");

    const normalizedName = name.trim();
    const numericPrice = Number(price);

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
        // Keep PATCH JSON-compatible. Image upload is intentionally handled
        // only on creation until the backend exposes multipart PATCH support.
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
    setFileName("Choose an image...");
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

  return (
    <div className="min-h-screen bg-slate-50 p-4 font-sans md:p-8 lg:p-10">
      <div className="mx-auto max-w-5xl">
        <motion.h1
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-2 text-3xl font-black tracking-tight text-slate-900 md:text-4xl"
        >
          Menu Management
        </motion.h1>
        <p className="mb-8 text-sm text-slate-500">
          Add, update and remove menu items for your restaurant.
        </p>

        <motion.div className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-800">
              {editingId ? "Edit Item" : "Add New Menu Item"}
            </h2>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-100"
              >
                Cancel edit
              </button>
            )}
          </div>

          {errorMessage && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {errorMessage}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <input
              className="rounded-xl border border-slate-200 p-3 outline-none transition focus:border-green-500 focus:ring-1 focus:ring-green-500"
              placeholder="Item Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              className="rounded-xl border border-slate-200 p-3 outline-none transition focus:border-green-500 focus:ring-1 focus:ring-green-500"
              placeholder="Price (Rs)"
              type="number"
              min="0.01"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />

            {!editingId && (
              <div className="md:col-span-2">
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3 transition-colors hover:border-green-500">
                  <Upload className="h-5 w-5 text-slate-400" />
                  <span className="truncate text-sm text-slate-500">{fileName}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const selected = e.target.files?.[0] || null;
                      setImage(selected);
                      setFileName(selected?.name || "Choose an image...");
                    }}
                  />
                </label>
              </div>
            )}

            <button
              type="button"
              disabled={busy}
              onClick={handleSubmit}
              className="rounded-xl bg-green-600 py-3 font-bold text-white shadow-lg shadow-green-200 transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50 md:col-span-2"
            >
              {isAdding
                ? "Adding..."
                : isUpdating
                  ? "Updating..."
                  : isDeleting
                    ? "Deleting..."
                    : editingId
                      ? "Update Item"
                      : "Add to Menu"}
            </button>
          </div>
        </motion.div>

        {isLoading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            Loading menu items...
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
            Unable to load menu items. Please try again.
          </div>
        ) : menuItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
            No menu items yet. Add your first item above.
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {menuItems.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="flex flex-col gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition-all hover:border-green-200 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="h-16 w-16 shrink-0 rounded-xl border border-slate-100 object-cover"
                      />
                    ) : (
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xs text-slate-400">
                        No image
                      </div>
                    )}
                    <div className="min-w-0">
                      <h3 className="truncate font-bold text-slate-900">{item.name}</h3>
                      <p className="text-sm font-bold text-green-600">Rs {item.price}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleEdit(item)}
                      className="rounded-lg p-2 text-slate-400 transition-all hover:bg-blue-50 hover:text-blue-600 disabled:opacity-50"
                      aria-label={`Edit ${item.name}`}
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleDelete(item.id)}
                      className="rounded-lg p-2 text-slate-400 transition-all hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                      aria-label={`Delete ${item.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
