"use client";

export default function TableSkeleton() {
  return (
    <div className="rounded-2xl border p-5 animate-pulse bg-gray-100/60 flex flex-col gap-4">
      <div className="h-5 bg-gray-300 rounded w-1/2"></div>
      <div className="h-3 bg-gray-300 rounded w-1/3"></div>
      <div className="h-3 bg-gray-300 rounded w-2/3"></div>
      <div className="h-3 bg-gray-300 rounded w-full"></div>
      <div className="h-3 bg-gray-300 rounded w-3/4"></div>
      <div className="h-10 bg-gray-300 rounded mt-3"></div>
    </div>
  );
}
