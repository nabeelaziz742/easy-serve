"use client";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { User, Mail, Phone, Shield, Camera } from "lucide-react";

export default function ManagerProfilePage() {
  const token = useSelector((state) => state.auth.token) || localStorage.getItem('token');
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
       const res = await fetch("http://127.0.0.1:8000/api/user/user/me/", {
         headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setProfile(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (token) fetchProfile();
    else setLoading(false); // ← yeh add karo
  }, [token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-green-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const fullName = `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim() || profile?.username;
  const initials = fullName?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const designationMap = {
    manager: "Restaurant Manager",
    restaurant_owner: "Restaurant Owner",
    waiter: "Waiter",
    chef: "Chef",
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 py-10 px-6">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Profile Card */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          
          {/* Banner */}
          <div className="h-28 bg-gradient-to-r from-green-900 via-green-800 to-green-900 relative">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:20px_20px]" />
          </div>

          {/* Avatar */}
          <div className="px-8 pb-8">
            <div className="relative -mt-14 mb-4 w-fit">
              {profile?.image ? (
                <img
                  src={profile.image}
                  alt="Profile"
                  className="w-24 h-24 rounded-2xl object-cover ring-4 ring-white dark:ring-zinc-900 shadow-lg"
                />
              ) : (
                <div className="w-24 h-24 rounded-2xl bg-yellow-400 flex items-center justify-center ring-4 ring-white dark:ring-zinc-900 shadow-lg">
                  <span className="text-2xl font-black text-green-950">{initials || "M"}</span>
                </div>
              )}
            </div>

            <h1 className="text-2xl font-black text-zinc-900 dark:text-white">{fullName}</h1>
            <span className="inline-block mt-1 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 text-xs font-bold rounded-full uppercase tracking-wider">
              {designationMap[profile?.user_type] || profile?.user_type}
            </span>
          </div>
        </div>

        {/* Info Cards */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-sm border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800">
          
          {[
            { icon: User,   label: "Full Name",    value: fullName || "—" },
            { icon: Mail,   label: "Email",        value: profile?.email || "—" },
            { icon: Phone,  label: "Phone",        value: profile?.phone || "—" },
            { icon: Shield, label: "Designation",  value: designationMap[profile?.user_type] || "—" },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-4 px-6 py-4">
              <div className="p-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-xl shrink-0">
                <Icon className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
              </div>
              <div>
                <p className="text-xs text-zinc-400 font-medium">{label}</p>
                <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">{value}</p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}