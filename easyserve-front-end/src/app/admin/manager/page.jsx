"use client";

import { motion } from "framer-motion";
import {
  Users,
  ClipboardList,
  MessageCircle,
  CheckCircle,
  ShoppingBag,
  BarChart3,
  AlertCircle,
  CalendarClock,
} from "lucide-react";

export default function ManagerDashboardPage() {
  // Manager Info
  const manager = {
    name: "Sarah Khan",
    id: "MGR-202",
    role: "Restaurant Manager",
    profile: "https://randomuser.me/api/portraits/women/45.jpg",
  };

  // Dashboard Stats
  const stats = [
    {
      title: "Today's Customers",
      value: 128,
      icon: Users,
      color: "bg-blue-50 text-blue-700 border-blue-100",
    },
    {
      title: "Complaints Received",
      value: 3,
      icon: MessageCircle,
      color: "bg-red-50 text-red-700 border-red-100",
    },
    {
      title: "Orders Prepared",
      value: 74,
      icon: CheckCircle,
      color: "bg-green-50 text-green-700 border-green-100",
    },
    {
      title: "Pending Orders",
      value: 9,
      icon: ClipboardList,
      color: "bg-yellow-50 text-yellow-700 border-yellow-100",
    },
  ];

  // Sample Orders Data
  const orders = [
    {
      id: 401,
      customer: "Ali Hassan",
      items: 3,
      total: "$35.50",
      status: "Completed",
      time: "12:40 PM",
    },
    {
      id: 402,
      customer: "Maryam Riaz",
      items: 2,
      total: "$22.10",
      status: "Pending",
      time: "1:15 PM",
    },
    {
      id: 403,
      customer: "John Doe",
      items: 4,
      total: "$49.20",
      status: "Preparing",
      time: "1:30 PM",
    },
    {
      id: 404,
      customer: "Ayesha Noor",
      items: 1,
      total: "$9.99",
      status: "Completed",
      time: "11:55 AM",
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
      {/* 👩‍💼 Manager Info */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 flex items-center justify-between flex-wrap gap-6">
        <div className="flex items-center gap-5">
          <img
            src={manager.profile}
            alt={manager.name}
            className="w-16 h-16 rounded-full border-2 border-blue-400 object-cover shadow-sm"
          />
          <div>
            <h2 className="text-xl font-semibold text-gray-800">{manager.name}</h2>
            <p className="text-sm text-gray-500 mt-1">ID: {manager.id}</p>
            <p className="text-sm font-medium text-blue-700 mt-2 bg-blue-50 px-3 py-1 rounded-full w-fit">
              {manager.role}
            </p>
          </div>
        </div>

        <div className="text-right text-gray-600">
          <p className="text-sm">Shift: 10 AM – 10 PM</p>
          <p className="text-sm mt-1">Date: {new Date().toDateString()}</p>
        </div>
      </div>

      {/* 📊 Stats Section */}
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

      {/* 🧾 Order List */}
      <div>
        <h3 className="text-2xl font-semibold mb-6 text-blue-800 border-l-4 border-blue-400 pl-3 flex items-center gap-2">
          🧾 Today’s Orders
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
                  #{order.id} — {order.customer}
                </h4>
                <span
                  className={`text-xs px-2 py-1 rounded-md border ${getStatusStyle(
                    order.status
                  )}`}
                >
                  {order.status}
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-1">{order.items} items</p>
              <p className="text-sm text-gray-600 mt-1">Total: {order.total}</p>
              <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                <CalendarClock className="w-4 h-4" />
                {order.time}
              </p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* 📈 Manager Overview */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-600" /> Performance Overview
        </h3>

        <div className="grid md:grid-cols-3 gap-6 text-center">
          <div className="p-4 bg-green-50 rounded-xl">
            <h4 className="text-2xl font-semibold text-green-700">95%</h4>
            <p className="text-sm text-gray-600">Customer Satisfaction</p>
          </div>
          <div className="p-4 bg-blue-50 rounded-xl">
            <h4 className="text-2xl font-semibold text-blue-700">82%</h4>
            <p className="text-sm text-gray-600">Orders On-Time</p>
          </div>
          <div className="p-4 bg-red-50 rounded-xl">
            <h4 className="text-2xl font-semibold text-red-700">3 Issues</h4>
            <p className="text-sm text-gray-600">Today’s Complaints</p>
          </div>
        </div>
      </div>
    </div>
  );
}
