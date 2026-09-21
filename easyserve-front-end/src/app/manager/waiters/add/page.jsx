"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { User, Mail, Lock, Phone, ArrowLeft, Loader2, UtensilsCrossed } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useCreateStaffMutation } from "@/services/private/users";

export default function AddWaiterPage() {
  const router = useRouter();
  const [createStaff, { isLoading: isSubmitting }] = useCreateStaffMutation();

  const [formData, setFormData] = useState({
    username: "",
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    phone: "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const username =
      formData.username.trim() ||
      `${formData.first_name}_${formData.last_name}`
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "_");

    if (!username) {
      toast.error("Please provide a username or full name.");
      return;
    }

    try {
      await createStaff({
        username,
        email: formData.email.trim(),
        password: formData.password,
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        phone: formData.phone.trim(),
        user_type: "waiter",
      }).unwrap();

      toast.success("Waiter added successfully and linked to your restaurant!");
      router.push("/manager/waiters");
    } catch (error) {
      toast.error(error?.data?.detail || "Failed to create waiter.");
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50/50 p-4 font-sans sm:p-8">
      <div className="mx-auto max-w-2xl">
        {/* Back Link */}
        <Link
          href="/manager/waiters"
          className="mb-6 inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-bold text-zinc-600 shadow-xs transition hover:bg-zinc-50 active:scale-95"
        >
          <ArrowLeft size={14} />
          Back to Waitstaff
        </Link>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-green-950 text-amber-400 shadow-sm">
              <UtensilsCrossed className="h-5 w-5" />
            </span>
            <h1 className="text-3xl font-black tracking-tight text-zinc-900">
              Add Waitstaff
            </h1>
          </div>
          <p className="mt-1 text-sm text-zinc-500">
            Add a new waiter to take orders, serve tables, and collect cash payments.
          </p>
        </div>

        {/* Form Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-sm sm:p-8"
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* First Name */}
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-zinc-500">
                  First Name
                </label>
                <div className="relative">
                  <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleChange}
                    placeholder="Muhammad"
                    required
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 py-3 pl-10 pr-4 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition focus:border-green-900 focus:bg-white focus:ring-2 focus:ring-green-950/10"
                  />
                </div>
              </div>

              {/* Last Name */}
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-zinc-500">
                  Last Name
                </label>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  placeholder="Ali"
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 py-3 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition focus:border-green-900 focus:bg-white focus:ring-2 focus:ring-green-950/10"
                />
              </div>
            </div>

            {/* Username */}
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-zinc-500">
                Staff Username
              </label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="m_ali_waiter"
                required
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 py-3 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition focus:border-green-900 focus:bg-white focus:ring-2 focus:ring-green-950/10"
              />
            </div>

            {/* Email */}
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-zinc-500">
                Email Address
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="ali@easyserve.pk"
                  required
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 py-3 pl-10 pr-4 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition focus:border-green-900 focus:bg-white focus:ring-2 focus:ring-green-950/10"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-zinc-500">
                Temporary Password
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 py-3 pl-10 pr-4 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition focus:border-green-900 focus:bg-white focus:ring-2 focus:ring-green-950/10"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-zinc-500">
                Contact Phone
              </label>
              <div className="relative">
                <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="0300 1234567"
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 py-3 pl-10 pr-4 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition focus:border-green-900 focus:bg-white focus:ring-2 focus:ring-green-950/10"
                />
              </div>
            </div>

            {/* Buttons */}
            <div className="flex flex-col gap-3 pt-4 sm:flex-row">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-green-950 py-3.5 text-sm font-bold text-white shadow-md shadow-green-950/20 transition hover:bg-green-900 active:scale-[0.98] disabled:opacity-50"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin text-amber-400" />}
                {isSubmitting ? "Creating Waiter Account..." : "Create Waiter Account"}
              </button>
              <Link
                href="/manager/waiters"
                className="flex flex-1 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 py-3.5 text-sm font-bold text-zinc-700 transition hover:bg-zinc-100 active:scale-[0.98]"
              >
                Cancel
              </Link>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
