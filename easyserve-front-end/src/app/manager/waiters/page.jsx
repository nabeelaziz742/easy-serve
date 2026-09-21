"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { UserPlus, Loader2, Pencil, Trash2, X, UtensilsCrossed, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  useGetStaffQuery,
  useUpdateStaffMutation,
  useDeleteStaffMutation,
} from "@/services/private/users";

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.2 } }
};

export default function WaitersPage() {
  const { data: staffData, isLoading, isFetching, refetch } = useGetStaffQuery(
    { type: "waiter" },
    { refetchOnMountOrArgChange: true, refetchOnFocus: true }
  );
  const [updateStaff, { isLoading: saving }] = useUpdateStaffMutation();
  const [deleteStaff, { isLoading: deleting }] = useDeleteStaffMutation();

  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({ first_name: "", last_name: "", phone: "", is_active: true });

  const waiters = Array.isArray(staffData) ? staffData : staffData?.results || [];

  const openEdit = (waiter) => {
    setEditingUser(waiter);
    setEditForm({
      first_name: waiter.first_name || "",
      last_name: waiter.last_name || "",
      phone: waiter.phone || "",
      is_active: waiter.is_active,
    });
  };

  const handleEditChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditForm({ ...editForm, [name]: type === "checkbox" ? checked : value });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await updateStaff({
        id: editingUser.id,
        ...editForm,
      }).unwrap();
      toast.success("Waiter profile updated successfully!");
      setEditingUser(null);
    } catch (err) {
      toast.error(err?.data?.detail || "Failed to update waiter.");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to remove this waiter?")) return;
    try {
      await deleteStaff(id).unwrap();
      toast.success("Waiter removed successfully.");
    } catch (err) {
      toast.error(err?.data?.detail || "Failed to remove waiter.");
    }
  };

  return (
    <div className="p-4 sm:p-8">
      {/* Header */}
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-green-950 text-amber-400 shadow-sm">
              <UtensilsCrossed className="h-5 w-5" />
            </span>
            <h1 className="text-3xl font-black tracking-tight text-zinc-900">
              Waitstaff
            </h1>
          </div>
          <p className="mt-1 text-sm text-zinc-500">
            Manage your service waitstaff, assigned shifts and cash collection rights.
          </p>
        </div>
        <Link
          href="/manager/waiters/add"
          className="inline-flex items-center gap-2 rounded-xl bg-green-950 px-5 py-3 text-xs font-bold text-white shadow-sm shadow-green-950/20 transition hover:bg-green-900 active:scale-[0.98]"
        >
          <UserPlus size={16} className="text-amber-400" />
          Add New Waiter
        </Link>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
        </div>
      ) : waiters.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-200 bg-white p-12 text-center shadow-xs">
          <UtensilsCrossed className="mx-auto h-10 w-10 text-zinc-300" />
          <h3 className="mt-3 text-base font-bold text-zinc-800">No waitstaff registered yet</h3>
          <p className="mt-1 text-sm text-zinc-500">Add waiters to handle dine-in table orders and cash payments.</p>
          <Link
            href="/manager/waiters/add"
            className="mt-4 rounded-xl bg-zinc-100 px-4 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-200"
          >
            Add First Waiter
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-zinc-200/80 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="border-b border-zinc-100 bg-zinc-50/70">
                <tr>
                  <th className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-zinc-500">Name</th>
                  <th className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-zinc-500">Username</th>
                  <th className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-zinc-500">Email</th>
                  <th className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-zinc-500">Phone</th>
                  <th className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-zinc-500">Status</th>
                  <th className="px-6 py-3.5 text-right text-xs font-bold uppercase tracking-wider text-zinc-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {waiters.map((w) => (
                  <tr key={w.id} className="transition-colors hover:bg-zinc-50/50">
                    <td className="px-6 py-4">
                      <p className="font-bold text-zinc-900">
                        {w.first_name || w.last_name ? `${w.first_name} ${w.last_name}`.trim() : "Waiter"}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-zinc-600">@{w.username}</td>
                    <td className="px-6 py-4 text-xs text-zinc-500">{w.email || "—"}</td>
                    <td className="px-6 py-4 text-xs text-zinc-500">{w.phone || "—"}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                        w.is_active ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200" : "bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200"
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${w.is_active ? "bg-emerald-500" : "bg-zinc-400"}`} />
                        {w.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEdit(w)}
                          className="rounded-xl border border-zinc-100 bg-zinc-50 p-2 text-zinc-600 transition hover:bg-zinc-100 hover:text-green-950 active:scale-95"
                          title="Edit"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          disabled={deleting}
                          onClick={() => handleDelete(w.id)}
                          className="rounded-xl border border-zinc-100 bg-zinc-50 p-2 text-zinc-600 transition hover:bg-red-50 hover:text-red-600 active:scale-95 disabled:opacity-50"
                          title="Delete"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      <AnimatePresence>
        {editingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl"
            >
              <button
                onClick={() => setEditingUser(null)}
                className="absolute right-5 top-5 rounded-full p-1 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
              >
                <X size={18} />
              </button>
              <h2 className="text-xl font-black text-zinc-900">Edit Waiter</h2>
              <p className="mt-0.5 text-xs text-zinc-500">Update contact and shift activation status.</p>

              <form onSubmit={handleUpdate} className="mt-5 space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-zinc-500">First Name</label>
                  <input
                    type="text"
                    name="first_name"
                    value={editForm.first_name}
                    onChange={handleEditChange}
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3.5 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-green-900 focus:bg-white focus:ring-2 focus:ring-green-950/10"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-zinc-500">Last Name</label>
                  <input
                    type="text"
                    name="last_name"
                    value={editForm.last_name}
                    onChange={handleEditChange}
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3.5 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-green-900 focus:bg-white focus:ring-2 focus:ring-green-950/10"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-zinc-500">Phone</label>
                  <input
                    type="text"
                    name="phone"
                    value={editForm.phone}
                    onChange={handleEditChange}
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3.5 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-green-900 focus:bg-white focus:ring-2 focus:ring-green-950/10"
                  />
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="is_active"
                    name="is_active"
                    checked={editForm.is_active}
                    onChange={handleEditChange}
                    className="h-4 w-4 rounded-sm border-zinc-300 text-green-950 focus:ring-green-950"
                  />
                  <label htmlFor="is_active" className="text-xs font-bold text-zinc-700">Active Staff Member</label>
                </div>
                <div className="flex gap-3 pt-3">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 rounded-xl bg-green-950 py-3 text-xs font-bold text-white shadow-sm transition hover:bg-green-900 active:scale-[0.98] disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="flex-1 rounded-xl border border-zinc-200 bg-zinc-50 py-3 text-xs font-bold text-zinc-700 transition hover:bg-zinc-100 active:scale-[0.98]"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
