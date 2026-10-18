"use client";

import ErrorState from "@/components/feedback/ErrorState";

export default function Error({ error, reset }) {
  return <ErrorState error={error} reset={reset} homeHref="/waiter" compact />;
}
