"use client";

import { Bell, BellOff } from "lucide-react";

export default function SoundToggle({ on, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={on}
      title={on ? "New order sound is on" : "New order sound is off"}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition-colors ${
        on ? "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100" : "border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50"
      }`}
    >
      {on ? <Bell className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5" />}
      {on ? "Sound on" : "Sound off"}
    </button>
  );
}
