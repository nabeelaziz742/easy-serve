"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ImagePlus, Loader2, Store, Table2, UserCog, Utensils } from "lucide-react";

// "manager.username" style names map straight onto the API's nested payload.
// createOnly fields are set once when the restaurant is added.
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
      { name: "manager.username", label: "Username", required: true, placeholder: "ali.manager", createOnly: true },
      { name: "manager.email", label: "Email", type: "email", required: true, placeholder: "ali@karachigrill.pk" },
      { name: "manager.password", label: "Temporary password", type: "password", required: true, minLength: 8 },
      { name: "manager.phone", label: "Phone", type: "tel", placeholder: "0300 1234567" },
    ],
  },
  {
    title: "Tables",
    icon: Table2,
    createOnly: true,
    fields: [
      { name: "table_count", label: "Number of tables", type: "number", required: true, min: 1, max: 100, defaultValue: 10 },
      { name: "table_capacity", label: "Seats per table", type: "number", min: 1, max: 20, defaultValue: 4 },
    ],
  },
];

// On edit, example placeholders would look like saved values, and the
// password is optional: it only changes when filled in.
const EDIT_OVERRIDES = { "manager.password": { label: "New password", required: false, placeholder: "Leave blank to keep" } };

const sectionsFor = (initial) => {
  const isEdit = !!initial;
  return SECTIONS.filter((s) => !(isEdit && s.createOnly) && !(isEdit && s.title === "Manager login" && !initial.manager)).map((s) => ({
    ...s,
    fields: s.fields
      .filter((f) => !(isEdit && f.createOnly))
      .map((f) => (isEdit ? { ...f, placeholder: undefined, ...EDIT_OVERRIDES[f.name] } : f)),
  }));
};

// Blank fields are left out so the API keeps its defaults (or the current value).
// The logo file is sent separately (see onSubmit), so files are skipped here.
const toPayload = (form) => {
  const payload = { manager: {} };
  for (const [key, raw] of new FormData(form)) {
    if (typeof raw !== "string") continue;
    const value = raw.trim();
    if (!value) continue;
    const [group, field] = key.split(".");
    if (field) payload[group][field] = value;
    else payload[group] = value;
  }
  if (!Object.keys(payload.manager).length) delete payload.manager;
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

const valueAt = (data, name) => name.split(".").reduce((obj, key) => obj?.[key], data) ?? undefined;

const inputClass =
  "w-full rounded-lg border border-zinc-200 bg-zinc-50/50 px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-green-900 focus:bg-white focus:ring-2 focus:ring-green-950/10";

function Field({ label, error, createOnly, ...input }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold text-zinc-600">
        {label}
        {input.required && <span className="ml-0.5 text-red-500">*</span>}
      </span>
      <input id={input.name} className={inputClass} aria-invalid={!!error} {...input} />
      {error && <span className="text-xs font-medium text-red-600">{error}</span>}
    </label>
  );
}

function LogoField({ current, error }) {
  const [preview, setPreview] = useState(current);

  return (
    <div className="flex items-center gap-4 border-b border-zinc-100 px-5 py-4">
      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-green-100 to-yellow-100 ring-1 ring-zinc-200">
        {preview ? (
          <img src={preview} alt="Restaurant logo" className="h-full w-full object-cover" />
        ) : (
          <Utensils className="h-7 w-7 text-green-900" />
        )}
      </div>
      <div className="flex flex-col gap-1">
        <label className="inline-flex w-fit cursor-pointer items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-bold text-zinc-700 transition hover:bg-zinc-50">
          <ImagePlus className="h-3.5 w-3.5" /> {preview ? "Change logo" : "Upload logo"}
          <input
            type="file"
            name="logo"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) setPreview(URL.createObjectURL(file));
            }}
          />
        </label>
        <span className="text-xs text-zinc-500">PNG, JPG or WebP, up to 2 MB. Shown on the guest restaurant list.</span>
        {error && <span className="text-xs font-medium text-red-600">{error}</span>}
      </div>
    </div>
  );
}

/** Add and Edit restaurant form. `initial` (an API restaurant) switches it to edit mode. */
export default function RestaurantForm({ initial, onSubmit, isLoading, submitLabel }) {
  // onSubmit(payload, logoFile): logoFile is null when no new logo was picked.
  const [errors, setErrors] = useState({});

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrors({});
    try {
      const logo = event.currentTarget.elements.logo.files[0] ?? null;
      await onSubmit(toPayload(event.currentTarget), logo);
    } catch (error) {
      const fieldErrors = flattenErrors(error?.data);
      setErrors(fieldErrors);
      toast.error(fieldErrors.detail || "Please fix the highlighted fields.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {sectionsFor(initial).map(({ title, icon: Icon, fields }) => (
        <section key={title} className="saas-card overflow-hidden">
          <h2 className="flex items-center gap-2 border-b border-zinc-100 px-5 py-3 text-sm font-bold text-zinc-900">
            <Icon className="h-4 w-4 text-amber-500" /> {title}
          </h2>
          {title === "Restaurant" && <LogoField current={initial?.logo} error={errors.logo} />}
          <div className="grid grid-cols-1 gap-x-4 gap-y-4 p-5 sm:grid-cols-2">
            {fields.map((field) => (
              <Field
                key={field.name}
                error={errors[field.name]}
                {...field}
                defaultValue={initial ? valueAt(initial, field.name) : field.defaultValue}
              />
            ))}
          </div>
        </section>
      ))}
      <button
        type="submit"
        disabled={isLoading}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-green-950 py-3 text-sm font-bold text-amber-400 transition hover:bg-green-900 disabled:opacity-60"
      >
        {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
        {submitLabel}
      </button>
    </form>
  );
}
