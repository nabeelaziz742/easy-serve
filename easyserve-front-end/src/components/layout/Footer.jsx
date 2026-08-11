"use client";

import Link from "next/link";

import {
  Facebook,
  Instagram,
  Twitter,
  MapPin,
  Phone,
  Mail,
} from "lucide-react";

export function Footer() {

  return (
    <footer className="relative mt-24 overflow-hidden bg-green-950 text-gray-200">

      {/* Top Gradient Line */}
      <div className="absolute left-0 right-0 top-0 h-1 bg-gradient-to-r from-yellow-400 via-green-400 to-yellow-400" />

      {/* Glow Effects */}
      <div className="absolute left-0 top-0 h-72 w-72 rounded-full bg-yellow-400/10 blur-3xl" />

      <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-green-400/10 blur-3xl" />

      {/* Main Footer */}
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-14 px-6 py-20 md:grid-cols-2 lg:grid-cols-4">

        {/* Brand */}
        <div>

          <div className="mb-5 flex items-center gap-3">

            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-400 text-xl text-black shadow-lg">
              🍴
            </div>

            <div>
              <h3 className="text-2xl font-extrabold text-yellow-400">
                Easy Serve
              </h3>

              <p className="text-sm text-green-200">
                Smart Dining Experience
              </p>
            </div>

          </div>

          <p className="leading-relaxed text-gray-300">
            Discover premium dining experiences with
            seamless reservations, AI powered suggestions,
            and exceptional hospitality.
          </p>

          {/* Social Icons */}
          <div className="mt-7 flex gap-4">

            <Link
              href="#"
              className="
                rounded-full
                bg-white/10
                p-3
                transition-all
                duration-300
                hover:scale-110
                hover:bg-yellow-400
                hover:text-black
              "
            >
              <Facebook className="h-5 w-5" />
            </Link>

            <Link
              href="#"
              className="
                rounded-full
                bg-white/10
                p-3
                transition-all
                duration-300
                hover:scale-110
                hover:bg-yellow-400
                hover:text-black
              "
            >
              <Instagram className="h-5 w-5" />
            </Link>

            <Link
              href="#"
              className="
                rounded-full
                bg-white/10
                p-3
                transition-all
                duration-300
                hover:scale-110
                hover:bg-yellow-400
                hover:text-black
              "
            >
              <Twitter className="h-5 w-5" />
            </Link>

          </div>
        </div>

        {/* Quick Links */}
        <div>

          <h3 className="mb-6 text-lg font-bold text-yellow-400">
            Quick Links
          </h3>

          <ul className="space-y-4 text-sm">

            <li>
              <Link
                href="/"
                className="transition hover:text-yellow-300"
              >
                Home
              </Link>
            </li>

            <li>
              <Link
                href="/orders"
                className="transition hover:text-yellow-300"
              >
                Orders
              </Link>
            </li>

            <li>
              <Link
                href="/restaurant"
                className="transition hover:text-yellow-300"
              >
                Restaurants
              </Link>
            </li>

            <li>
              <Link
                href="/scan"
                className="transition hover:text-yellow-300"
              >
                Scan QR
              </Link>
            </li>

          </ul>
        </div>

        {/* Information */}
        <div>

          <h3 className="mb-6 text-lg font-bold text-yellow-400">
            Information
          </h3>

          <ul className="space-y-4 text-sm">

            <li>
              <Link
                href="/about"
                className="transition hover:text-yellow-300"
              >
                About Us
              </Link>
            </li>

            <li>
              <Link
                href="/privacy"
                className="transition hover:text-yellow-300"
              >
                Privacy Policy
              </Link>
            </li>

            <li>
              <Link
                href="/terms"
                className="transition hover:text-yellow-300"
              >
                Terms & Conditions
              </Link>
            </li>

          </ul>

          {/* Contact */}
          <div className="mt-8 space-y-4 text-sm text-gray-300">

            <div className="flex items-start gap-3">

              <MapPin className="mt-1 h-4 w-4 text-yellow-400" />

              <span>Lahore, Pakistan</span>

            </div>

            <div className="flex items-center gap-3">

              <Phone className="h-4 w-4 text-yellow-400" />

              <span>+92 300 1234567</span>

            </div>

            <div className="flex items-center gap-3">

              <Mail className="h-4 w-4 text-yellow-400" />

              <span>support@easyserve.com</span>

            </div>

          </div>
        </div>

        {/* Newsletter */}
        <div>

          <h3 className="mb-6 text-lg font-bold text-yellow-400">
            Newsletter
          </h3>

          <p className="mb-5 text-sm leading-relaxed text-gray-300">
            Stay updated with exclusive promotions,
            trending restaurants, and special dishes.
          </p>

          <form className="space-y-4">

            <input
              type="email"
              placeholder="Enter your email"
              className="
                w-full
                rounded-2xl
                border
                border-white/10
                bg-white/10
                px-4
                py-3
                text-white
                placeholder:text-gray-400
                outline-none
                transition-all
                focus:border-yellow-400
                focus:ring-2
                focus:ring-yellow-400/30
              "
              required
            />

            <button
              className="
                w-full
                rounded-2xl
                bg-yellow-400
                py-3
                font-semibold
                text-black
                shadow-lg
                transition-all
                duration-300
                hover:scale-[1.02]
                hover:bg-yellow-300
              "
            >
              Subscribe
            </button>

          </form>
        </div>

      </div>

      {/* Bottom */}
      <div className="border-t border-white/10">

        <div
          className="
            mx-auto
            flex
            max-w-7xl
            flex-col
            items-center
            justify-between
            gap-4
            px-6
            py-6
            text-sm
            text-gray-400
            md:flex-row
          "
        >

          <p>
            © {new Date().getFullYear()} Easy Serve. All rights reserved.
          </p>

          <div className="flex gap-6">

            <button className="transition hover:text-yellow-300">
              Privacy Policy
            </button>

            <button className="transition hover:text-yellow-300">
              Terms & Conditions
            </button>

          </div>

        </div>
      </div>
    </footer>
  );
}