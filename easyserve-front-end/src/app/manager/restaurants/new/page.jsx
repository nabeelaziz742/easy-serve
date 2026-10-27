"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { CheckCircle2, Loader2, Store, Table2, UserCog } from "lucide-react";
import RoleGuard from "@/components/auth/RoleGuard";
import PageHeader from "@/components/layout/PageHeader";
import { useOnboardRestaurantMutation } from "@/services/private/superAdmin";

// "manager.username" style names map straight onto the API's nested payload.
const SECTIONS = [
  {
    title: "Restaurant",
    icon: Store,
    fields: [
      { name: "name", label: "Restaurant name", required: true, placeholder: "Karachi Grill" },
      { name: "city", label: "City", placeholder: "Karachi", maxLength: 20 },
      { name: "address", label: "Address", placeholder: "Clifton Block 5" },
      { name: "phone_number", label: "Phone", type: "tel", placeholder: "0300 1234567" },
      { name: "cuisine", label: "Cuisine", placeholder: "BBQ", maxLength: 20 },
      { name: "email", label: "Email", type: "email", placeholder: "info@karachigrill.pk" },
    ],
  },
  {
    title: "Manager login",
    icon: UserCog,
    fields: [
      { name: "manager.first_name", label: "First name", required: true, placeholder: "Ali" },
      { name: "manager.last_name", label: "Last name", placeholder: "Raza" },
      { name: "manager.username", label: "Username", required: true, placeholder: "ali.manager" },
      { name: "manager.email", label: "Email", type: "email", required: true, placeholder: "ali@karachigrill.pk" },
      { name: "manager.password", label: "Temporary password", type: "password", required: true, minLength: 8 },
      { name: "manager.phone", label: "Phone", type: "tel", placeholder: "0300 1234567" },
    ],
  },
  {
    title: "Tables",
    icon: Table2,
    fields: [
      { name: "table_count", label: "Number of tables", type: "number", required: true, min: 1, max: 100, defaultValue: 10 },
      { name: "table_capacity", label: "Seats per table", type: "number", min: 1, max: 20, defaultValue: 4 },
    ],
  },
];

// Blank optional fields are left out so the API applies its defaults.
const toPayload = (form) => {
  const payload = { manager: {} };
  for (const [key, raw] of new FormData(form)) {
    const value = raw.trim();
    if (!value) continue;
    const [group, field] = key.split(".");
    if (field) payload[group][field] = value;
    else payload[group] = value;
  }
  return payload;
};

// {manager: {username: ["taken"]}} -> {"manager.username": "taken"}
const flattenErrors = (errors, prefix = "") =>
  Object.entries(errors || {}).reduce((all, [key, value]) => {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return { ...all, ...flattenErrors(value, `${prefix}${key}.`) };
    }
    return { ...all, [prefix + key]: [].concat(value).join(" ") };
  }, {});

const inputClass =
  "w-full rounded-lg border border-zinc-200 bg-zinc-50/50 px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-green-900 focus:bg-white focus:ring-2 focus:ring-green-950/10";

function Field({ label, error, ...input }) {
  return (
    <label className="block">
      <span className="saas-label mb-1 block">
        {label} {input.required && <span className="text-red-500">*</span>}
      </span>
      <input id={input.name} className={inputClass} aria-invalid={!!error} {...input} />
      {error && <span className="mt-1 block text-xs font-medium text-red-600">{error}</span>}
    </label>
  );
}

function Created({ restaurant, onReset }) {
  return (
    <div className="saas-card space-y-4 p-6 text-sm">
      <p className="flex items-center gap-2 text-base font-black text-zinc-900">
        <CheckCircle2 className="h-5 w-5 text-emerald-600" /> {restaurant.name} is ready
      </p>
      <p className="text-zinc-600">
        The manager can log in now as <b>{restaurant.manager?.username}</b> ({restaurant.manager?.email}) with the
        temporary password. {restaurant.table_count} tables were created, each with its own QR code.
      </p>
      <div className="flex flex-wrap gap-2">
        <Link href="/admin/tables" className="rounded-lg bg-green-950 px-3 py-2 text-xs font-bold text-amber-400">
          Print table QR codes
        </Link>
        <button type="button" onClick={onReset} className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-bold text-zinc-700">
          Add another restaurant
        </button>
      </div>
    </div>
  );
}

export default function AddRestaurantPage() {
  return (
    <RoleGuard allowedRoles={["super_admin"]}>
      <AddRestaurant />
    </RoleGuard>
  );
}

function AddRestaurant() {
  const [onboard, { isLoading }] = useOnboardRestaurantMutation();
  const [errors, setErrors] = useState({});
  const [created, setCreated] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrors({});
    try {
      setCreated(await onboard(toPayload(event.currentTarget)).unwrap());
    } catch (error) {
      const fieldErrors = flattenErrors(error?.data);
      setErrors(fieldErrors);
      toast.error(fieldErrors.detail || "Please fix the highlighted fields.");
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6">
      <PageHeader
        icon={Store}
        title="Add Restaurant"
        description="Creates the restaurant, its manager login and its tables with QR codes in one step."
      />

      {created ? (
        <Created restaurant={created} onReset={() => setCreated(null)} />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {SECTIONS.map(({ title, icon: Icon, fields }) => (
            <fieldset key={title} className="saas-card space-y-4 p-5">
              <legend className="flex items-center gap-2 text-sm font-bold text-zinc-900">
                <Icon className="h-4 w-4 text-amber-500" /> {title}
              </legend>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {fields.map((field) => (
                  <Field key={field.name} error={errors[field.name]} {...field} />
                ))}
              </div>
            </fieldset>
          ))}
          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-green-950 py-3 text-sm font-bold text-amber-400 transition hover:bg-green-900 disabled:opacity-60"
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            Create restaurant
          </button>
        </form>
      )}
    </div>
  );
}
