"use client";

import { motion } from "framer-motion";
import {
  Clock,
  Flame,
  CheckCircle,
  UtensilsCrossed,
  Timer,
  BarChart3,
  ClipboardList,
  AlertCircle,
} from "lucide-react";

export default function ChefDashboardPage() {
  // Chef Info
  const chef = {
    name: "Ahmed Raza",
    id: "CHF-112",
    role: "Head Chef",
    profile: "https://randomuser.me/api/portraits/men/32.jpg",
  };

  // Performance Stats
  const stats = [
    {
      title: "Orders in Queue",
      value: 12,
      icon: ClipboardList,
      color: "bg-yellow-50 text-yellow-700 border-yellow-100",
    },
    {
      title: "Preparing Now",
      value: 5,
      icon: Flame,
      color: "bg-orange-50 text-orange-700 border-orange-100",
    },
    {
      title: "Completed Today",
      value: 25,
      icon: CheckCircle,
      color: "bg-green-50 text-green-700 border-green-100",
    },
    {
      title: "Avg Prep Time",
      value: "18 min",
      icon: Timer,
      color: "bg-blue-50 text-blue-700 border-blue-100",
    },
  ];

  // Sample Orders Data
  const orders = [
    {
      id: 101,
      dish: "Chicken Alfredo Pasta",
      table: 3,
      status: "Preparing",
      timeElapsed: "12 min",
      priority: "High",
    },
    {
      id: 102,
      dish: "Beef Burger",
      table: 6,
      status: "Pending",
      timeElapsed: "—",
      priority: "Medium",
    },
    {
      id: 103,
      dish: "Grilled Fish Platter",
      table: 2,
      status: "Completed",
      timeElapsed: "16 min",
      priority: "Low",
    },
    {
      id: 104,
      dish: "Mushroom Soup",
      table: 4,
      status: "Preparing",
      timeElapsed: "8 min",
      priority: "High",
    },
  ];

  // Helper for status styling
  const getStatusStyle = (status) => {
    switch (status) {
      case "Preparing":
        return "bg-orange-50 text-orange-700 border-orange-100";
      case "Completed":
        return "bg-green-50 text-green-700 border-green-100";
      case "Pending":
        return "bg-yellow-50 text-yellow-700 border-yellow-100";
      default:
        return "bg-gray-50 text-gray-600 border-gray-100";
    }
  };

  return (
    <div className="space-y-10">
      {/* 👨‍🍳 Chef Info Card */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 flex items-center justify-between flex-wrap gap-6">
        <div className="flex items-center gap-5">
          <img
            src={chef.profile}
            alt={chef.name}
            className="w-16 h-16 rounded-full border-2 border-orange-400 object-cover shadow-sm"
          />
          <div>
            <h2 className="text-xl font-semibold text-gray-800">{chef.name}</h2>
            <p className="text-sm text-gray-500 mt-1">ID: {chef.id}</p>
            <p className="text-sm font-medium text-orange-700 mt-2 bg-orange-50 px-3 py-1 rounded-full w-fit">
              {chef.role}
            </p>
          </div>
        </div>

        <div className="text-right text-gray-600">
          <p className="text-sm">Shift: 11 AM – 9 PM</p>
          <p className="text-sm mt-1">Date: {new Date().toDateString()}</p>
        </div>
      </div>

      {/* 📊 Stats Cards */}
      <motion.div
        className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {stats.map((s, i) => (
          <motion.div
            key={i}
            whileHover={{ scale: 1.04 }}
            className={`rounded-2xl p-5 flex items-center gap-4 border shadow-sm transition-all duration-200 ${s.color}`}
          >
            <s.icon className="w-8 h-8 opacity-80" />
            <div>
              <p className="text-sm font-medium">{s.title}</p>
              <h3 className="text-xl font-semibold">{s.value}</h3>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* 🔥 Active Orders Section */}
      <div>
        <h3 className="text-2xl font-semibold mb-6 text-orange-800 border-l-4 border-orange-400 pl-3 flex items-center gap-2">
          🔥 Active & Pending Orders
        </h3>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {orders.map((order) => (
            <motion.div
              key={order.id}
              whileHover={{ scale: 1.02 }}
              className={`rounded-2xl border p-5 shadow-sm transition ${getStatusStyle(
                order.status
              )}`}
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-gray-800">
                  #{order.id} — {order.dish}
                </h4>
                <span
                  className={`text-xs px-2 py-1 rounded-md border ${getStatusStyle(
                    order.status
                  )}`}
                >
                  {order.status}
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-1">Table #{order.table}</p>
              <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {order.timeElapsed}
              </p>
              <p
                className={`text-xs mt-3 px-2 py-1 rounded-full w-fit font-medium ${
                  order.priority === "High"
                    ? "bg-red-100 text-red-700"
                    : order.priority === "Medium"
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-green-100 text-green-700"
                }`}
              >
                {order.priority} Priority
              </p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* 📈 Performance Overview */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-orange-600" /> Performance Overview
        </h3>

        <div className="grid md:grid-cols-3 gap-6 text-center">
          <div className="p-4 bg-orange-50 rounded-xl">
            <h4 className="text-2xl font-semibold text-orange-700">92%</h4>
            <p className="text-sm text-gray-600">Orders On-Time</p>
          </div>
          <div className="p-4 bg-green-50 rounded-xl">
            <h4 className="text-2xl font-semibold text-green-700">4.7 ★</h4>
            <p className="text-sm text-gray-600">Average Rating</p>
          </div>
          <div className="p-4 bg-yellow-50 rounded-xl">
            <h4 className="text-2xl font-semibold text-yellow-700">3 Delays</h4>
            <p className="text-sm text-gray-600">Today’s Issues</p>
          </div>
        </div>
      </div>
    </div>
  );
}
