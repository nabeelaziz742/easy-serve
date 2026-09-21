"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { MailCheck, ArrowRight } from "lucide-react";

export default function VerifyEmailPage() {
  const router = useRouter();

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
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-yellow-400 text-black shadow-xl">
          <MailCheck className="h-10 w-10 text-black" />
        </div>

        <h1 className="text-3xl font-extrabold text-white">
          Verify Your Email
        </h1>

        <p className="mt-3 text-sm leading-relaxed text-gray-300">
          We have sent a confirmation link to your email address.
          Please check your inbox and click the activation link to start your dining experience.
        </p>

        <div className="mt-8">
          <button
            type="button"
            onClick={() => router.push("/auth/login")}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-yellow-400 py-3.5 text-base font-bold text-black shadow-xl transition-all duration-300 hover:scale-[1.02] hover:bg-yellow-300 active:scale-[0.98]"
          >
            Back to Login <ArrowRight size={16} />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
