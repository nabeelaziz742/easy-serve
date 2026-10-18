import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import StateProvider from "@/providers/StateProvider";
import LayoutClient from "./layoutClient";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: {
    default: "Easy Serve | Smart Restaurant Management",
    template: "%s | Easy Serve",
  },
  description:
    "QR table ordering, kitchen display, waiter app, cash settlement, inventory and reports for restaurants, in one system.",
  applicationName: "Easy Serve",
  openGraph: {
    title: "Easy Serve | Smart Restaurant Management",
    description:
      "QR table ordering, kitchen display, waiter app, cash settlement, inventory and reports for restaurants.",
    type: "website",
  },
};

export const viewport = {
  themeColor: "#063B2E",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <StateProvider>
          <LayoutClient>{children}</LayoutClient>
          <Toaster richColors position="top-right" />
        </StateProvider>
      </body>
    </html>
  );
}