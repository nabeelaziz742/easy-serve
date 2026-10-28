"use client";

import { useLoginMutation } from "@/services/public/auth";
import { onLoggedIn, onLoggedOut } from "@/store/slices/authSlice";
import { canRoleOpen, getRoleHome } from "@/utilities/roleRoutes";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { loginDefaultValues, loginSchema } from "../utilities/auth.schema";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Mail, Lock, ShieldAlert } from "lucide-react";
import { motion } from "framer-motion";

export default function LoginPage() {
  const router = useRouter();
  const [login, { isLoading }] = useLoginMutation();
  const dispatch = useDispatch();
  const [showPassword, setShowPassword] = useState(false);
  const [notice, setNotice] = useState(null);
  const { initialized, isAuthenticated } = useSelector((state) => state.auth);

  // The login page is always a signed-out screen. Arriving here with a live
  // session (the Back button, a typed URL, or RoleGuard sending a user away
  // from another role's page) used to leave that session running: the header
  // still showed "Account" and typing /waiter landed on the manager's
  // dashboard. Checked once on arrival, so this page's own login is kept.
  const arrivalChecked = useRef(false);
  useEffect(() => {
    if (!initialized || arrivalChecked.current) return;
    arrivalChecked.current = true;
    if (isAuthenticated) dispatch(onLoggedOut());
  }, [dispatch, initialized, isAuthenticated]);

  useEffect(() => {
    const reason = new URLSearchParams(window.location.search).get("reason");
    if (reason === "role") {
      setNotice("That page belongs to a different role. Sign in with an account that has access to it.");
    } else if (reason === "left") {
      setNotice("You left your staff panel, so you were signed out for security. Please sign in again.");
    } else if (reason === "expired") {
      setNotice("Your session has expired. Please sign in again.");
    }
  }, []);

  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: loginDefaultValues,
  });

  const onSubmit = async (values) => {
    try {
      const result = await login(values).unwrap();
      dispatch(onLoggedIn(result));

      // Return to the page that sent the user here (e.g. the dine-in menu
      // with a cart waiting), but only when this account's role may open it;
      // otherwise go to the role's own dashboard. Only same-site paths:
      // "//host" and "/\\host" would leave the site.
      const role = result.user_type;
      const next = new URLSearchParams(window.location.search).get("next");
      const safeNext =
        next && /^\/(?![\/\\])/.test(next) && canRoleOpen(role, next) ? next : null;
      // replace, not push: Back from the dashboard must not return to this
      // page, which would sign the user out again.
      router.replace(safeNext || getRoleHome(role));
    } catch (error) {
      // e.g. wrong password, or "This restaurant has been disabled..."
      toast.error(error?.data?.detail || "Login failed. Please try again.");
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-green-950 via-green-900 to-black px-5 py-16">
      {/* Glow Effects */}
      <div className="absolute left-0 top-0 h-72 w-72 rounded-full bg-yellow-400/10 blur-3xl" />
      <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-green-400/10 blur-3xl" />

      {/* Login Card */}
      <motion.div
        initial={{ opacity: 0, y: 35 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-md rounded-3xl border border-white/10 bg-white/10 p-8 shadow-2xl backdrop-blur-xl"
      >
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-yellow-400 text-3xl shadow-xl">
            🍴
          </div>
          <h2 className="text-4xl font-extrabold text-white">Welcome Back</h2>
          <p className="mt-2 text-gray-300">
            Login to continue your dining experience
          </p>
        </div>

        {notice && (
          <div
            role="alert"
            className="mb-6 flex items-start gap-3 rounded-2xl border border-yellow-400/30 bg-yellow-400/10 px-4 py-3 text-sm text-yellow-100"
          >
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-yellow-300" />
            <span>{notice}</span>
          </div>
        )}

        {/* Form */}
        <Form {...form}>
          <form
            id="login-form"
            action="javascript:void(0)"
            onSubmit={(e) => {
              e.preventDefault();
              form.handleSubmit(onSubmit)(e);
            }}
            className="space-y-6"
          >
            {/* Email */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-200">Email Address</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                      <Input
                        placeholder="Enter your email"
                        {...field}
                        className="h-12 rounded-2xl border-white/10 bg-white/10 pl-12 text-white placeholder:text-gray-400 focus:border-yellow-400 focus:ring-yellow-400/30"
                      />
                    </div>
                  </FormControl>
                  <FormMessage className="text-xs font-light text-red-300" />
                </FormItem>
              )}
            />

            {/* Password */}
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-200">Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        {...field}
                        className="h-12 rounded-2xl border-white/10 bg-white/10 pl-12 pr-12 text-white placeholder:text-gray-400 focus:border-yellow-400 focus:ring-yellow-400/30"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-1/2 -translate-y-1/2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5 text-gray-300" />
                        ) : (
                          <Eye className="h-5 w-5 text-gray-300" />
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage className="text-xs font-light text-red-300" />
                  <div className="text-right">
                    <a
                      href="/auth/forgot-password"
                      className="text-xs font-semibold text-yellow-400 transition hover:text-yellow-300"
                    >
                      Forgot password?
                    </a>
                  </div>
                </FormItem>
              )}
            />

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-2xl bg-yellow-400 py-3 text-lg font-bold text-black shadow-xl transition-all duration-300 hover:scale-[1.02] hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading ? "Signing In..." : "Sign In"}
            </button>
          </form>
        </Form>

        {/* Footer */}
        <p className="mt-8 text-center text-sm text-gray-300">
          Don’t have an account?{" "}
          <a
            href="/auth/register"
            className="font-semibold text-yellow-400 transition hover:text-yellow-300"
          >
            Register
          </a>
        </p>
      </motion.div>
    </div>
  );
}