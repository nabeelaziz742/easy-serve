"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CalendarClock, Clock, Loader2, Percent, Receipt, Save, Settings, Store } from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/layout/PageHeader";
import ErrorState from "@/components/feedback/ErrorState";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { fadeUp } from "@/lib/motion";
import {
  useGetRestaurantSettingsQuery,
  useUpdateRestaurantSettingsMutation,
} from "@/services/private/settings";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const PROFILE_FIELDS = ["name", "cuisine", "description", "phone_number", "email", "address", "city", "country"];
const BILLING_FIELDS = ["tax_label", "tax_percent", "service_charge_percent", "tax_number", "receipt_footer"];
const SAMPLE_SUBTOTAL = 1000;
const SLOT_OPTIONS = [15, 30, 45, 60, 90, 120];

const hhmm = (t) => (t ? String(t).slice(0, 5) : "");

function toForm(data) {
  const form = {};
  [...PROFILE_FIELDS, ...BILLING_FIELDS].forEach((key) => {
    form[key] = data?.[key] ?? "";
  });
  form.reservation_slot_minutes = data?.reservation_slot_minutes ?? 30;
  form.reservation_max_guests = data?.reservation_max_guests ?? 10;
  form.reservation_auto_confirm = Boolean(data?.reservation_auto_confirm);
  const byDay = Object.fromEntries((data?.hours || []).map((h) => [h.day_of_week, h]));
  // A restaurant that never set hours starts with every day open.
  const noHoursYet = !data?.hours?.length;
  form.hours = DAYS.map((_, day) => ({
    open: noHoursYet || Boolean(byDay[day]),
    open_time: hhmm(byDay[day]?.open_time) || "12:00",
    close_time: hhmm(byDay[day]?.close_time) || "23:00",
  }));
  return form;
}

function toPayload(form) {
  const payload = {};
  [...PROFILE_FIELDS, ...BILLING_FIELDS].forEach((key) => {
    payload[key] = form[key];
  });
  payload.tax_percent = form.tax_percent === "" ? "0" : String(form.tax_percent);
  payload.service_charge_percent = form.service_charge_percent === "" ? "0" : String(form.service_charge_percent);
  payload.reservation_slot_minutes = Number(form.reservation_slot_minutes);
  payload.reservation_max_guests = Number(form.reservation_max_guests) || 1;
  payload.reservation_auto_confirm = form.reservation_auto_confirm;
  payload.hours = form.hours
    .map((h, day) => ({ ...h, day_of_week: day }))
    .filter((h) => h.open)
    .map(({ day_of_week, open_time, close_time }) => ({ day_of_week, open_time, close_time }));
  return payload;
}

function firstError(error) {
  const data = error?.data;
  if (!data) return "Could not save settings. Please try again.";
  if (typeof data.detail === "string") return data.detail;
  const [field, messages] = Object.entries(data)[0] || [];
  const message = Array.isArray(messages) ? messages[0] : messages;
  return field ? `${field.replace(/_/g, " ")}: ${typeof message === "string" ? message : "invalid value"}` : "Could not save settings.";
}

function Section({ icon: Icon, title, description, children }) {
  return (
    <motion.section {...fadeUp} className="saas-card p-4 sm:p-5">
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-green-50 text-green-800">
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-sm font-bold text-zinc-900">{title}</h2>
          <p className="text-xs text-zinc-500">{description}</p>
        </div>
      </div>
      {children}
    </motion.section>
  );
}

function Field({ label, children, className = "" }) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <Label className="text-xs font-semibold text-zinc-600">{label}</Label>
      {children}
    </div>
  );
}

export default function RestaurantSettingsPage() {
  const { data, isLoading, isError, refetch } = useGetRestaurantSettingsQuery();
  const [updateSettings, { isLoading: saving }] = useUpdateRestaurantSettingsMutation();
  const [form, setForm] = useState(null);

  useEffect(() => {
    if (data) setForm(toForm(data));
  }, [data]);

  const dirty = useMemo(
    () => Boolean(form && data && JSON.stringify(toPayload(form)) !== JSON.stringify(toPayload(toForm(data)))),
    [form, data]
  );

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const setHour = (day, patch) =>
    setForm((f) => ({ ...f, hours: f.hours.map((h, i) => (i === day ? { ...h, ...patch } : h)) }));

  const preview = useMemo(() => {
    const tax = Number(form?.tax_percent) || 0;
    const service = Number(form?.service_charge_percent) || 0;
    const serviceAmount = (SAMPLE_SUBTOTAL * service) / 100;
    const taxAmount = (SAMPLE_SUBTOTAL * tax) / 100;
    return { serviceAmount, taxAmount, total: SAMPLE_SUBTOTAL + serviceAmount + taxAmount, tax, service };
  }, [form?.tax_percent, form?.service_charge_percent]);

  const save = async () => {
    try {
      await updateSettings(toPayload(form)).unwrap();
      toast.success("Settings saved");
    } catch (err) {
      toast.error(firstError(err));
    }
  };

  const header = (
    <PageHeader
      icon={Settings}
      title="Settings"
      description="Restaurant details, opening hours, table bookings and how bills are calculated."
      actions={
        form && (
          <button
            onClick={save}
            disabled={!dirty || saving}
            className="inline-flex items-center gap-2 rounded-xl bg-green-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "Saving" : "Save changes"}
          </button>
        )
      }
    />
  );

  if (isError) {
    return (
      <div className="mx-auto max-w-5xl space-y-5 px-4 py-6 sm:px-6">
        {header}
        <ErrorState compact homeHref="/manager" reset={refetch} />
      </div>
    );
  }

  if (isLoading || !form) {
    return (
      <div className="mx-auto max-w-5xl space-y-5 px-4 py-6 sm:px-6">
        {header}
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-48 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-4 py-6 sm:px-6">
      {header}

      <Section icon={Store} title="Restaurant profile" description="Shown to customers on the menu and printed on bills.">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Restaurant name">
            <Input value={form.name} onChange={set("name")} />
          </Field>
          <Field label="Cuisine">
            <Input value={form.cuisine} onChange={set("cuisine")} maxLength={20} placeholder="e.g. Desi, BBQ" />
          </Field>
          <Field label="About" className="sm:col-span-2">
            <Textarea value={form.description} onChange={set("description")} rows={2} />
          </Field>
          <Field label="Phone">
            <Input value={form.phone_number} onChange={set("phone_number")} maxLength={20} />
          </Field>
          <Field label="Email">
            <Input type="email" value={form.email} onChange={set("email")} />
          </Field>
          <Field label="Address" className="sm:col-span-2">
            <Input value={form.address} onChange={set("address")} />
          </Field>
          <Field label="City">
            <Input value={form.city} onChange={set("city")} maxLength={20} />
          </Field>
          <Field label="Country">
            <Input value={form.country} onChange={set("country")} maxLength={20} />
          </Field>
        </div>
      </Section>

      <Section icon={Clock} title="Opening hours" description="Days you are closed are left unticked.">
        <div className="divide-y divide-zinc-100">
          {DAYS.map((day, i) => {
            const h = form.hours[i];
            return (
              <div key={day} className="flex flex-wrap items-center gap-3 py-2">
                <label className="flex w-36 cursor-pointer items-center gap-2 text-sm font-medium text-zinc-800">
                  <input
                    type="checkbox"
                    checked={h.open}
                    onChange={(e) => setHour(i, { open: e.target.checked })}
                    className="h-4 w-4 accent-green-800"
                  />
                  {day}
                </label>
                {h.open ? (
                  <div className="flex items-center gap-2 text-sm">
                    <Input type="time" value={h.open_time} onChange={(e) => setHour(i, { open_time: e.target.value })} className="h-8 w-32" />
                    <span className="text-zinc-400">to</span>
                    <Input type="time" value={h.close_time} onChange={(e) => setHour(i, { close_time: e.target.value })} className="h-8 w-32" />
                  </div>
                ) : (
                  <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Closed</span>
                )}
              </div>
            );
          })}
        </div>
      </Section>

      <Section icon={CalendarClock} title="Table bookings" description="Guests can book times inside your opening hours, up to an hour before closing.">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Time slot every">
            <select
              value={form.reservation_slot_minutes}
              onChange={set("reservation_slot_minutes")}
              className="h-9 w-full rounded-md border border-zinc-200 bg-white px-2 text-sm"
            >
              {SLOT_OPTIONS.map((m) => (
                <option key={m} value={m}>{m} minutes</option>
              ))}
            </select>
          </Field>
          <Field label="Most guests in one online booking">
            <Input type="number" min="1" max="50" value={form.reservation_max_guests} onChange={set("reservation_max_guests")} />
          </Field>
          <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-zinc-200 p-3 text-sm sm:mt-5">
            <input
              type="checkbox"
              checked={form.reservation_auto_confirm}
              onChange={(e) => setForm((f) => ({ ...f, reservation_auto_confirm: e.target.checked }))}
              className="mt-0.5 h-4 w-4 accent-green-800"
            />
            <span>
              <span className="block font-semibold text-zinc-800">Confirm bookings automatically</span>
              <span className="text-xs text-zinc-500">Off: you confirm each request on the Reservations page.</span>
            </span>
          </label>
        </div>
      </Section>

      <Section icon={Percent} title="Tax and service charge" description="Added to every new order's total. Orders already placed keep their bill.">
        <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Tax name">
              <Input value={form.tax_label} onChange={set("tax_label")} maxLength={30} placeholder="GST" />
            </Field>
            <Field label="Tax rate (%)">
              <Input type="number" min="0" max="100" step="0.01" value={form.tax_percent} onChange={set("tax_percent")} />
            </Field>
            <Field label="Service charge (%), dine-in only">
              <Input type="number" min="0" max="100" step="0.01" value={form.service_charge_percent} onChange={set("service_charge_percent")} />
            </Field>
            <Field label="Tax registration no. (NTN / STRN)">
              <Input value={form.tax_number} onChange={set("tax_number")} maxLength={50} />
            </Field>
            <Field label="Message at the bottom of the bill" className="sm:col-span-2">
              <Input value={form.receipt_footer} onChange={set("receipt_footer")} maxLength={255} placeholder="Thank you for dining with us!" />
            </Field>
          </div>

          <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 p-3 text-sm">
            <p className="saas-label mb-2 flex items-center gap-1.5">
              <Receipt className="h-3.5 w-3.5" /> Example bill
            </p>
            <div className="tabular space-y-1 text-zinc-600">
              <div className="flex justify-between"><span>Items</span><span>Rs. {SAMPLE_SUBTOTAL.toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Service charge {preview.service}%</span><span>Rs. {preview.serviceAmount.toFixed(2)}</span></div>
              <div className="flex justify-between"><span>{form.tax_label || "Tax"} {preview.tax}%</span><span>Rs. {preview.taxAmount.toFixed(2)}</span></div>
              <div className="mt-2 flex justify-between border-t border-zinc-200 pt-2 font-bold text-zinc-900">
                <span>Total</span><span>Rs. {preview.total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}
