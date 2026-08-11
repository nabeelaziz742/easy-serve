"use client";

export default function OrderSkeleton() {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 animate-pulse">
      {/* Title */}
      <div className="h-5 bg-gray-300 rounded w-1/3"></div>

      {/* Customer */}
      <div className="h-4 bg-gray-300 rounded w-1/2 mt-3"></div>

      {/* Items */}
      <div className="h-3 bg-gray-300 rounded w-2/3 mt-4"></div>
      <div className="h-3 bg-gray-300 rounded w-1/2 mt-2"></div>
      <div className="h-3 bg-gray-300 rounded w-3/4 mt-2"></div>

      {/* Bottom */}
      <div className="flex justify-between items-center mt-5">
        <div className="h-4 bg-gray-300 rounded w-20"></div>
        <div className="h-4 bg-gray-300 rounded w-16"></div>
      </div>
    </div>
  );
}
