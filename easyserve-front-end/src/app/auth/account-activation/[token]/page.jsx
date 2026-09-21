"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2, XCircle, ArrowRight } from "lucide-react";
import { useVerifyTokenMutation } from "@/services/public/auth";
import { useDispatch } from "react-redux";
import { onLoggedIn } from "@/store/slices/authSlice";
import { motion } from "framer-motion";

export default function AccountActivationPage({ params }) {
  const router = useRouter();

  const unwrapped = React.use(params);
  const token = unwrapped?.token;

  const [verifyToken, { isLoading, isSuccess, isError, data }] =
    useVerifyTokenMutation();

  useEffect(() => {
    if (!token) return;
    verifyToken(token);
  }, [token]);

  const dispatch = useDispatch();

  useEffect(() => {
    if (isSuccess && data?.access && data?.refresh) {
      dispatch(onLoggedIn(data));

      const timer = setTimeout(() => {
        router.push("/");
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [isSuccess, data, dispatch, router]);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-green-950 via-green-900 to-black px-5 py-16">
      {/* Glow Effects */}
      <div className="absolute left-0 top-0 h-72 w-72 rounded-full bg-yellow-400/10 blur-3xl" />
      <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-green-400/10 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 35 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-md rounded-3xl border border-white/10 bg-white/10 p-8 text-center shadow-2xl backdrop-blur-xl"
      >
        {isLoading && (
          <div className="space-y-4">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-yellow-400/20 text-yellow-400">
              <Loader2 className="h-10 w-10 animate-spin" />
            </div>
            <h1 className="text-3xl font-extrabold text-white">
              Activating Account...
            </h1>
            <p className="text-sm text-gray-300">
              Please hold on while we verify your activation link.
            </p>
          </div>
        )}

        {isSuccess && (
          <div className="space-y-4">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <h1 className="text-3xl font-extrabold text-white">
              Account Activated! 🎉
            </h1>
            <p className="text-sm text-gray-300">
              Your account has been successfully verified. Redirecting you to your dining dashboard...
            </p>
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-yellow-400" />
          </div>
        )}

        {isError && (
          <div className="space-y-4">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-500/20 text-red-400">
              <XCircle className="h-10 w-10" />
            </div>
            <h1 className="text-3xl font-extrabold text-white">
              Activation Failed
            </h1>
            <p className="text-sm text-gray-300">
              Your activation link may be expired or already used.
            </p>

            <button
              onClick={() => router.push("/auth/login")}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-yellow-400 py-3.5 text-base font-bold text-black shadow-xl transition-all hover:bg-yellow-300 active:scale-[0.98]"
            >
              Back to Login <ArrowRight size={16} />
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
