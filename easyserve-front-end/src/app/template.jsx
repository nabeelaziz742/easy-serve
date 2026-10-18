"use client";

import { motion } from "framer-motion";
import { easeOut } from "@/lib/motion";

// Re-mounts on every navigation, giving each page a soft fade-in. Opacity
// only: a transform here would break position:fixed modals and drawers.
export default function Template({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25, ease: easeOut }}
    >
      {children}
    </motion.div>
  );
}
