"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { User, Mail, Lock, Phone, Calendar, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useSelector } from "react-redux";

export default function AddWaiterPage() {
  const router = useRouter();
  const token = useSelector((state) => state.auth.token);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    password: "",
    phone: "",
    joining_date: "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
  e.preventDefault();
  
  try {
    const response = await fetch("http://127.0.0.1:8000/api/user/register/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        username: formData.full_name.replace(" ", "_").toLowerCase(),
        email: formData.email,
        password: formData.password,
        user_type: "waiter",
      }),
    });

    // ✅ Fix: pehle text lo, phir parse karo
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
    
    if (response.ok) {
      alert("Waiter added! Verification email sent.");
      router.push("/manager/waiters");
    } else {
      alert(JSON.stringify(data));
    }
  } catch (error) {
    console.error(error);
  }
};

  return (
    <div className="min-h-screen bg-zinc-50 p-8">
      
      {/* Back Button */}
      <Link
        href="/manager/waiters"
        className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-800 transition mb-6"
      >
        <ArrowLeft size={16} />
        Back to Waiters
      </Link>

      <div className="max-w-2xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-zinc-900">Add Waiter</h1>
          <p className="text-zinc-500 mt-1">Fill in the details to add a new waiter</p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-3xl shadow-sm border border-zinc-200 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Full Name */}
            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-2">
                Full Name
              </label>
              <div className="relative">
                <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  placeholder="Muhammad Ali"
                  required
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="ali@example.com"
                  required
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-2">
                Phone Number
              </label>
              <div className="relative">
                <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="03001234567"
                  required
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                />
              </div>
            </div>

            {/* Joining Date */}
            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-2">
                Joining Date
              </label>
              <div className="relative">
                <Calendar size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="date"
                  name="joining_date"
                  value={formData.joining_date}
                  onChange={handleChange}
                  required
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                />
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-4 pt-2">
              <button
                type="submit"
                className="flex-1 bg-green-950 text-white py-3 rounded-xl font-semibold hover:bg-green-900 transition-all duration-200 shadow-sm"
              >
                Add Waiter
              </button>
              <Link
                href="/manager/waiters"
                className="flex-1 text-center bg-zinc-100 text-zinc-700 py-3 rounded-xl font-semibold hover:bg-zinc-200 transition-all duration-200"
              >
                Cancel
              </Link>
            </div>

          </form>
        </div>

      </div>
    </div>
  );
}