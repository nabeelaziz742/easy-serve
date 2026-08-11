"use client";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import Link from "next/link";
import { UserPlus, Loader2 } from "lucide-react";

export default function ChefsPage() {
  const token = useSelector((state) => state.auth.token);
  const [chefs, setChefs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChefs = async () => {
      try {
        const res = await fetch("http://localhost:9000/api/user/staff/?type=chef", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await res.json();
        setChefs(Array.isArray(data) ? data : data.results || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (token) fetchChefs();
  }, [token]);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-zinc-900">Chefs</h1>
          <p className="text-zinc-500 mt-1">Manage your restaurant chefs</p>
        </div>
        <Link
          href="/manager/chefs/add"
          className="flex items-center gap-2 bg-green-950 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-green-900 transition"
        >
          <UserPlus size={18} />
          Add Chef
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-zinc-400" size={28} />
        </div>
      ) : chefs.length === 0 ? (
        <div className="bg-white rounded-3xl border border-zinc-200 p-8 text-center text-zinc-400">
          No chefs added yet.
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-zinc-200 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-zinc-50 border-b border-zinc-200">
              <tr>
                <th className="px-6 py-3 text-sm font-semibold text-zinc-600">Username</th>
                <th className="px-6 py-3 text-sm font-semibold text-zinc-600">Email</th>
                <th className="px-6 py-3 text-sm font-semibold text-zinc-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {chefs.map((c) => (
                <tr key={c.id} className="border-b border-zinc-100 last:border-0">
                  <td className="px-6 py-4 font-medium text-zinc-800">{c.username}</td>
                  <td className="px-6 py-4 text-zinc-500">{c.email}</td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                      c.is_active ? "bg-green-100 text-green-700" : "bg-zinc-100 text-zinc-500"
                    }`}>
                      {c.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}