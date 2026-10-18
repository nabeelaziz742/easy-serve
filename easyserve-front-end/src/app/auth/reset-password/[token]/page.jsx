"use client";

import Link from "next/link";
import { use, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CircleCheck, Eye, EyeOff, Lock, LockKeyhole } from "lucide-react";
import { useResetPasswordMutation } from "@/services/public/auth";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import AuthCard, { authButtonClass, authInputClass } from "@/components/auth/AuthCard";
import { resetPasswordSchema } from "../../utilities/auth.schema";

function PasswordField({ form, name, label, placeholder, show, onToggle }) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-gray-200">{label}</FormLabel>
          <FormControl>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <Input
                type={show ? "text" : "password"}
                autoComplete="new-password"
                placeholder={placeholder}
                {...field}
                className={`${authInputClass} pr-12`}
              />
              <button
                type="button"
                onClick={onToggle}
                aria-label={show ? "Hide password" : "Show password"}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300"
              >
                {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </FormControl>
          <FormMessage className="text-xs font-light text-red-300" />
        </FormItem>
      )}
    />
  );
}

export default function ResetPasswordPage({ params }) {
  const { token } = use(params);
  const [resetPassword, { isLoading }] = useResetPasswordMutation();
  const [show, setShow] = useState(false);
  const [done, setDone] = useState(false);
  const [linkError, setLinkError] = useState(null);

  const form = useForm({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { new_password: "", confirm_password: "" },
  });

  const onSubmit = async ({ new_password }) => {
    setLinkError(null);
    try {
      await resetPassword({ token, new_password }).unwrap();
      setDone(true);
    } catch (error) {
      const expired = /expired/i.test(error?.data?.message || "");
      setLinkError(
        expired
          ? "This link has expired. Please ask for a new one."
          : "This link is not valid any more. Please ask for a new one."
      );
    }
  };

  if (done) {
    return (
      <AuthCard
        icon={<CircleCheck className="h-8 w-8" />}
        title="Password changed"
        subtitle="You can now sign in with your new password."
      >
        <Link href="/auth/login" className={`${authButtonClass} block text-center`}>
          Sign in
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      icon={<LockKeyhole className="h-8 w-8" />}
      title="Choose a new password"
      subtitle="Use at least 8 characters with an uppercase letter, a number and a symbol."
      footer={
        <Link href="/auth/login" className="font-semibold text-yellow-400 transition hover:text-yellow-300">
          Back to sign in
        </Link>
      }
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <PasswordField
            form={form}
            name="new_password"
            label="New password"
            placeholder="Enter a new password"
            show={show}
            onToggle={() => setShow((s) => !s)}
          />
          <PasswordField
            form={form}
            name="confirm_password"
            label="Confirm password"
            placeholder="Type it again"
            show={show}
            onToggle={() => setShow((s) => !s)}
          />

          {linkError && (
            <div className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {linkError}{" "}
              <Link href="/auth/forgot-password" className="font-semibold text-yellow-400 underline">
                Send a new link
              </Link>
            </div>
          )}

          <button type="submit" disabled={isLoading} className={authButtonClass}>
            {isLoading ? "Saving..." : "Save new password"}
          </button>
        </form>
      </Form>
    </AuthCard>
  );
}
