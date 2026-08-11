import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import StateProvider from "@/providers/StateProvider";
import LayoutClient from "./layoutClient";
import AIChatbot from "@/components/Aichatbot";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <StateProvider>
          <LayoutClient>{children}</LayoutClient>

          <AIChatbot />
        </StateProvider>
      </body>
    </html>
  );
}