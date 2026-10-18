"use client";

export default function TableSkeleton() {
  return (
    <div className="rounded-xl border p-3.5 animate-pulse bg-gray-100/60 flex flex-col gap-2.5">
      <div className="h-4 bg-gray-300 rounded w-1/2"></div>
      <div className="h-3 bg-gray-300 rounded w-1/3"></div>
      <div className="h-3 bg-gray-300 rounded w-2/3"></div>
      <div className="h-3 bg-gray-300 rounded w-full"></div>
      <div className="h-3 bg-gray-300 rounded w-3/4"></div>
      <div className="h-8 bg-gray-300 rounded-lg mt-1"></div>
    </div>
  );
}
