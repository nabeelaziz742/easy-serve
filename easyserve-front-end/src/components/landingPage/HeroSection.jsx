'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

import BannerImg from '@/assets/banner.jpg';

export default function HeroSection() {

  const router = useRouter();

  return (
    <section
      className="
        relative
        flex
        h-[92vh]
        w-full
        items-center
        justify-center
        overflow-hidden
      "
    >

      {/* Background */}
      <div className="absolute inset-0">

        <div className="relative h-full w-full overflow-hidden">

          <Image
            src={BannerImg}
            alt="Delicious food background"
            fill
            priority
            className="
              object-cover
              scale-110
              brightness-[0.55]
              transition-transform
              duration-[5000ms]
              hover:scale-125
            "
          />

          {/* Dark Overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80" />

          {/* Glow */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,215,0,0.12),transparent)] blur-3xl" />

        </div>
      </div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 35 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9 }}
        className="
          relative
          z-20
          mx-auto
          max-w-4xl
          px-5
          text-center
          text-white
        "
      >

        {/* Top Badge */}
        <div
          className="
            mb-7
            inline-flex
            items-center
            rounded-full
            border
            border-yellow-400/30
            bg-yellow-400/10
            px-4
            py-2
            text-xs
            text-yellow-300
            backdrop-blur-md
            sm:px-5
            sm:text-sm
          "
        >

          ✨ AI Powered Smart Dining Experience

        </div>

        {/* Heading */}
        <h1
          className="
            mb-6
            text-3xl
            font-extrabold
            leading-tight
            sm:text-5xl
            md:text-7xl
          "
        >

          Welcome to{' '}

          <span className="text-yellow-400 drop-shadow-lg">
            Easy Serve
          </span>

        </h1>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.8 }}
          className="
            mx-auto
            mb-10
            max-w-2xl
            text-base
            leading-relaxed
            text-gray-200
            sm:text-lg
            md:text-xl
          "
        >

          Experience culinary excellence,
          smart reservations,
          and seamless dining in a beautifully
          crafted modern environment.

        </motion.p>

        {/* Buttons */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="
            flex
            flex-col
            items-center
            justify-center
            gap-4
            sm:flex-row
          "
        >

          {/* Reservation Button */}
          <Button
            onClick={() =>
              router.push('/restaurant?mode=reservation')
            }
            className="
              w-full
              rounded-full
              bg-yellow-400
              px-6
              py-5
              text-base
              font-semibold
              text-black
              shadow-2xl
              shadow-yellow-500/30
              transition-all
              duration-300
              hover:scale-105
              hover:bg-yellow-300
              sm:w-auto
              sm:px-9
              sm:py-7
              sm:text-lg
            "
          >

            Make Reservation

          </Button>

          {/* QR Button */}
          <Button
            onClick={() => router.push('/scan')}
            className="
              w-full
              rounded-full
              border
              border-white/40
              bg-white/10
              px-6
              py-5
              text-base
              text-white
              backdrop-blur-md
              transition-all
              duration-300
              hover:scale-105
              hover:bg-white/20
              sm:w-auto
              sm:px-9
              sm:py-7
              sm:text-lg
            "
          >

            Scan QR Code (Dine-In)

          </Button>

        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="
            mt-12
            flex
            flex-wrap
            items-center
            justify-center
            gap-8
            text-white
            md:gap-10
          "
        >

          <div>

            <h2 className="text-2xl font-bold text-yellow-400 md:text-3xl">
              500+
            </h2>

            <p className="mt-1 text-sm text-gray-300">
              Restaurants
            </p>

          </div>

          <div>

            <h2 className="text-2xl font-bold text-yellow-400 md:text-3xl">
              10k+
            </h2>

            <p className="mt-1 text-sm text-gray-300">
              Happy Customers
            </p>

          </div>

          <div>

            <h2 className="text-2xl font-bold text-yellow-400 md:text-3xl">
              24/7
            </h2>

            <p className="mt-1 text-sm text-gray-300">
              Smart Support
            </p>

          </div>

        </motion.div>

      </motion.div>
    </section>
  );
}