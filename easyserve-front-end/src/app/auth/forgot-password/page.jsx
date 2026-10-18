"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound, Mail, MailCheck } from "lucide-react";
import { useForgotPasswordMutation } from "@/services/public/auth";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import AuthCard, { authButtonClass, authInputClass } from "@/components/auth/AuthCard";
import { forgotPasswordSchema } from "../utilities/auth.schema";

export default function ForgotPasswordPage() {
  const [forgotPassword, { isLoading }] = useForgotPasswordMutation();
  const [sentTo, setSentTo] = useState(null);

  const form = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async ({ email }) => {
    // The same message is shown whether or not the email has an account,
    // so this page cannot be used to find out who is registered.
    await forgotPassword({ email }).unwrap().catch(() => {});
    setSentTo(email);
  };

  const backToLogin = (
    <Link href="/auth/login" className="font-semibold text-yellow-400 transition hover:text-yellow-300">
      Back to sign in
    </Link>
  );

  if (sentTo) {
    return (
      <AuthCard
        icon={<MailCheck className="h-8 w-8" />}
        title="Check your email"
        subtitle={`If an account exists for ${sentTo}, we have sent a link to reset the password. The link works for 30 minutes.`}
        footer={backToLogin}
      >
        <button type="button" onClick={() => setSentTo(null)} className={authButtonClass}>
          Use a different email
        </button>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      icon={<KeyRound className="h-8 w-8" />}
      title="Forgot password?"
      subtitle="Enter your email and we will send you a link to choose a new password."
      footer={backToLogin}
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-200">Email Address</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                    <Input type="email" autoComplete="email" placeholder="Enter your email" {...field} className={authInputClass} />
                  </div>
                </FormControl>
                <FormMessage className="text-xs font-light text-red-300" />
              </FormItem>
            )}
          />
          <button type="submit" disabled={isLoading} className={authButtonClass}>
            {isLoading ? "Sending link..." : "Send reset link"}
          </button>
        </form>
      </Form>
    </AuthCard>
  );
}
