"use client";
import { useRouter } from "next/navigation";

export default function VerifyEmailPage() {
  const router = useRouter();

  return (
    <div className="flex justify-center items-center min-h-[80vh]">
      <div className="w-full max-w-md bg-white shadow-lg rounded-xl p-6 text-center">
        <h2 className="text-2xl font-bold text-blue-700 mb-4">Confirm Your Email</h2>

        <p className="text-sm text-gray-600 mb-6">
          We've sent a confirmation link to your email.
          <br />
          Please check your inbox and verify your account to continue.
        </p>

        <button
          type="button"
          onClick={() => router.push('/auth/login')}
          className="w-full bg-green-900 text-white py-2 rounded hover:bg-green-800"
        >
          Back to Login
        </button>
      </div>
    </div>
  );
}
