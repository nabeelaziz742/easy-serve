"use client";
import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useVerifyTokenMutation } from "@/services/public/auth";
import { useDispatch } from "react-redux";
import { onLoggedIn } from "@/store/slices/authSlice";


export default function AccountActivationPage({ params }) {
  const router = useRouter();

  const unwrapped = React.use(params)
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

      setTimeout(() => {
        router.push("/");
      }, 2000);
    }
  }, [isSuccess, data]);

  return (
    <div className="flex justify-center items-center min-h-[80vh] bg-gray-50">
      <div className="w-full max-w-md bg-white shadow-md rounded-2xl p-8 text-center border border-gray-200">

        {isLoading && (
          <>
            <h2 className="text-3xl font-bold text-green-900 mb-4">
              Activating Account...
            </h2>
            <Loader2 className="mx-auto animate-spin h-10 w-10 text-green-800 mb-3" />
            <p className="text-gray-600 text-sm">
              Please wait, verifying your activation link.
            </p>
          </>
        )}

        {isSuccess && (
          <>
            <h2 className="text-3xl font-bold text-green-900 mb-4">
              Account Activated!
            </h2>
            <p className="text-gray-600 text-sm mb-3">
              Redirecting you to the Home...
            </p>

            <Loader2 className="mx-auto animate-spin h-8 w-8 text-green-800" />
          </>
        )}

        {isError && (
          <>
            <h2 className="text-3xl font-bold text-red-700 mb-4">
              Activation Failed
            </h2>
            <p className="text-gray-600 text-sm mb-6">
              Your activation link may be expired or invalid.
            </p>

            <button
              onClick={() => router.push("/auth/login")}
              className="w-full bg-green-900 hover:bg-green-800 text-white py-3 rounded-xl transition"
            >
              Back to Login
            </button>
          </>
        )}
      </div>
    </div>
  );
}
