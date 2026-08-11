"use client";

import { useSignUpMutation } from "@/services/public/auth";

import { useRouter } from "next/navigation";

import { useState } from "react";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import {
  registerDefaultValues,
  registerSchema,
} from "../utilities/auth.schema";

import { useForm } from "react-hook-form";

import { zodResolver } from "@hookform/resolvers/zod";

import { Input } from "@/components/ui/input";

import { Button } from "@/components/ui/button";

import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
} from "lucide-react";

import { motion } from "framer-motion";


export default function RegisterPage() {

  const router = useRouter();

  const [showPassword, setShowPassword] =
    useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);

  const [signUp, { isLoading }] =
    useSignUpMutation();

  const form = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: registerDefaultValues,
  });

  const onSubmit = async (value) => {
  console.log("SUBMIT BUTTON CLICKED");
  console.log(value);

  try {
    await signUp(value).unwrap();
    router.push("/auth/verify");
  } catch (error) {
    console.log("FULL ERROR =>", error);
  }
};

  return (
    <div
      className="
        relative
        flex
        min-h-screen
        items-center
        justify-center
        overflow-hidden
        bg-gradient-to-br
        from-green-950
        via-green-900
        to-black
        px-5
        py-16
      "
    >

      {/* Glow Effects */}
      <div className="absolute left-0 top-0 h-72 w-72 rounded-full bg-yellow-400/10 blur-3xl" />

      <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-green-400/10 blur-3xl" />

      {/* Register Card */}
      <motion.div
        initial={{ opacity: 0, y: 35 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="
          relative
          z-10
          w-full
          max-w-xl
          rounded-3xl
          border
          border-white/10
          bg-white/10
          p-8
          shadow-2xl
          backdrop-blur-xl
        "
      >

        {/* Header */}
        <div className="mb-8 text-center">

          <div
            className="
              mx-auto
              mb-5
              flex
              h-20
              w-20
              items-center
              justify-center
              rounded-full
              bg-yellow-400
              text-3xl
              shadow-xl
            "
          >
            🍴
          </div>

          <h2 className="text-4xl font-extrabold text-white">
            Create Account
          </h2>

          <p className="mt-2 text-gray-300">
            Join Easy Serve and enjoy smart dining
          </p>

        </div>

        {/* Form */}
        <Form {...form}>

          <form
            id="register-form"
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-6"
          >

            {/* Name Fields */}
            <div className="grid gap-5 md:grid-cols-2">

              {/* First Name */}
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (

                  <FormItem>

                    <FormLabel className="text-gray-200">
                      First Name
                    </FormLabel>

                    <FormControl>

                      <div className="relative">

                        <User className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />

                        <Input
                          placeholder="First Name"
                          {...field}
                          className="
                            h-12
                            rounded-2xl
                            border-white/10
                            bg-white/10
                            pl-12
                            text-white
                            placeholder:text-gray-400
                            focus:border-yellow-400
                            focus:ring-yellow-400/30
                          "
                        />

                      </div>

                    </FormControl>

                    <FormMessage className="text-xs text-red-300" />

                  </FormItem>
                )}
              />

              {/* Last Name */}
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (

                  <FormItem>

                    <FormLabel className="text-gray-200">
                      Last Name
                    </FormLabel>

                    <FormControl>

                      <div className="relative">

                        <User className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />

                        <Input
                          placeholder="Last Name"
                          {...field}
                          className="
                            h-12
                            rounded-2xl
                            border-white/10
                            bg-white/10
                            pl-12
                            text-white
                            placeholder:text-gray-400
                            focus:border-yellow-400
                            focus:ring-yellow-400/30
                          "
                        />

                      </div>

                    </FormControl>

                    <FormMessage className="text-xs text-red-300" />

                  </FormItem>
                )}
              />

            </div>

            {/* Username */}
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (

                <FormItem>

                  <FormLabel className="text-gray-200">
                    Username
                  </FormLabel>

                  <FormControl>

                    <div className="relative">

                      <User className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />

                      <Input
                        placeholder="Choose a username"
                        {...field}
                        className="
                          h-12
                          rounded-2xl
                          border-white/10
                          bg-white/10
                          pl-12
                          text-white
                          placeholder:text-gray-400
                          focus:border-yellow-400
                          focus:ring-yellow-400/30
                        "
                      />

                    </div>

                  </FormControl>

                  <FormMessage className="text-xs text-red-300" />

                </FormItem>
              )}
            />

            {/* Email */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (

                <FormItem>

                  <FormLabel className="text-gray-200">
                    Email Address
                  </FormLabel>

                  <FormControl>

                    <div className="relative">

                      <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />

                      <Input
                        placeholder="Enter your email"
                        {...field}
                        className="
                          h-12
                          rounded-2xl
                          border-white/10
                          bg-white/10
                          pl-12
                          text-white
                          placeholder:text-gray-400
                          focus:border-yellow-400
                          focus:ring-yellow-400/30
                        "
                      />

                    </div>

                  </FormControl>

                  <FormMessage className="text-xs text-red-300" />

                </FormItem>
              )}
            />

            {/* Password */}
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (

                <FormItem>

                  <FormLabel className="text-gray-200">
                    Password
                  </FormLabel>

                  <FormControl>

                    <div className="relative">

                      <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />

                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Create password"
                        {...field}
                        className="
                          h-12
                          rounded-2xl
                          border-white/10
                          bg-white/10
                          pl-12
                          pr-12
                          text-white
                          placeholder:text-gray-400
                          focus:border-yellow-400
                          focus:ring-yellow-400/30
                        "
                      />

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="
                          absolute
                          right-2
                          top-1/2
                          -translate-y-1/2
                          hover:bg-transparent
                        "
                        onClick={() =>
                          setShowPassword(!showPassword)
                        }
                      >

                        {showPassword ? (

                          <EyeOff className="h-5 w-5 text-gray-300" />

                        ) : (

                          <Eye className="h-5 w-5 text-gray-300" />

                        )}

                      </Button>

                    </div>

                  </FormControl>

                  <FormMessage className="text-xs text-red-300" />

                </FormItem>
              )}
            />

            {/* Confirm Password */}
            <FormField
              control={form.control}
              name="confirm_password"
              render={({ field }) => (

                <FormItem>

                  <FormLabel className="text-gray-200">
                    Confirm Password
                  </FormLabel>

                  <FormControl>

                    <div className="relative">

                      <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />

                      <Input
                        type={
                          showConfirmPassword
                            ? "text"
                            : "password"
                        }
                        placeholder="Confirm password"
                        {...field}
                        className="
                          h-12
                          rounded-2xl
                          border-white/10
                          bg-white/10
                          pl-12
                          pr-12
                          text-white
                          placeholder:text-gray-400
                          focus:border-yellow-400
                          focus:ring-yellow-400/30
                        "
                      />

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="
                          absolute
                          right-2
                          top-1/2
                          -translate-y-1/2
                          hover:bg-transparent
                        "
                        onClick={() =>
                          setShowConfirmPassword(
                            !showConfirmPassword
                          )
                        }
                      >

                        {showConfirmPassword ? (

                          <EyeOff className="h-5 w-5 text-gray-300" />

                        ) : (

                          <Eye className="h-5 w-5 text-gray-300" />

                        )}

                      </Button>

                    </div>

                  </FormControl>

                  <FormMessage className="text-xs text-red-300" />

                </FormItem>
              )}
            />

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="
                w-full
                rounded-2xl
                bg-yellow-400
                py-3
                text-lg
                font-bold
                text-black
                shadow-xl
                transition-all
                duration-300
                hover:scale-[1.02]
                hover:bg-yellow-300
                disabled:cursor-not-allowed
                disabled:opacity-70
              "
            >

              {isLoading
                ? "Creating Account..."
                : "Create Account"}

            </button>

          </form>

        </Form>

        {/* Footer */}
        <p className="mt-8 text-center text-sm text-gray-300">

          Already have an account?{" "}

          <a
            href="/auth/login"
            className="
              font-semibold
              text-yellow-400
              transition
              hover:text-yellow-300
            "
          >
            Login
          </a>

        </p>

      </motion.div>
    </div>
  );
}