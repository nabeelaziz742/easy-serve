import Link from "next/link";
import { Compass, Home, QrCode } from "lucide-react";

export const metadata = {
  title: "Page not found",
};

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-16">
      <div className="saas-card w-full max-w-md p-6 text-center shadow-md">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-50 text-yellow-600 ring-1 ring-yellow-200">
          <Compass className="h-6 w-6" />
        </div>
        <p className="font-mono text-xs font-bold text-yellow-700">404</p>
        <h1 className="mt-1 text-lg font-black tracking-tight text-green-950">This page does not exist</h1>
        <p className="mt-1 text-sm text-zinc-500">The link may be old or mistyped. Head back home or scan your table QR to order.</p>
        <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-green-950 px-4 py-2 text-sm font-bold text-yellow-400 transition-colors hover:bg-green-900"
          >
            <Home className="h-4 w-4" /> Go to home
          </Link>
          <Link
            href="/scan"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-bold text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            <QrCode className="h-4 w-4" /> Scan table QR
          </Link>
        </div>
      </div>
    </div>
  );
}
