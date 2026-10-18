"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "easyserve_order_sound";

const readEnabled = () => {
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== "off";
  } catch {
    return true;
  }
};

// Two short rising tones. Generated with Web Audio so no sound file ships.
const playChime = (ctx) => {
  const now = ctx.currentTime;
  [880, 1320].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    const start = now + i * 0.16;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.25, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.22);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.24);
  });
};

// Plays a chime (and vibrates on phones) when an order id appears that was
// not in the previous poll. The first load never alerts.
export default function useNewOrderAlert(orders) {
  const [enabled, setEnabled] = useState(true);
  const seen = useRef(null);
  const audioCtx = useRef(null);

  useEffect(() => setEnabled(readEnabled()), []);

  // Browsers only allow audio after a user gesture, so unlock on first tap.
  useEffect(() => {
    const unlock = () => {
      if (!audioCtx.current) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (Ctx) audioCtx.current = new Ctx();
      }
      audioCtx.current?.resume?.();
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => window.removeEventListener("pointerdown", unlock);
  }, []);

  const ids = (orders || []).map((order) => order.id).join(",");

  useEffect(() => {
    const current = new Set(ids ? ids.split(",") : []);
    if (seen.current === null) {
      seen.current = current;
      return;
    }
    const hasNew = [...current].some((id) => !seen.current.has(id));
    seen.current = current;
    if (!hasNew || !enabled) return;
    if (audioCtx.current && audioCtx.current.state === "running") playChime(audioCtx.current);
    navigator.vibrate?.([120, 60, 120]);
  }, [ids, enabled]);

  const toggle = useCallback(() => {
    setEnabled((value) => {
      const next = !value;
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? "on" : "off");
      } catch {}
      return next;
    });
  }, []);

  return { soundOn: enabled, toggleSound: toggle };
}
