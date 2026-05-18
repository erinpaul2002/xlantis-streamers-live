"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import type { LoadingScreenProps } from "@/components/loading/loading-screen-types";

export default function Loading1({ phase = "loading" }: LoadingScreenProps) {
  const isRevealing = phase === "revealing";
  const seams = [
    "left-1/2 top-0 h-full w-px -translate-x-1/2",
    "left-0 top-1/2 h-px w-full -translate-y-1/2",
  ];

  return (
    <motion.div
      className="w-full h-full absolute inset-0 bg-[#080a0d] flex items-center justify-center overflow-hidden"
      animate={{
        opacity: isRevealing ? 0 : 1,
        scale: isRevealing ? 1.02 : 1,
        filter: isRevealing ? "brightness(0.82)" : "brightness(1)",
      }}
      transition={{ duration: 0.88, ease: [0.22, 1, 0.36, 1] }}
    >
      {seams.map((className, index) => (
        <motion.div
          key={className}
          className={`absolute z-20 bg-[#53fc18]/35 shadow-[0_0_18px_rgba(83,252,24,0.28)] ${className}`}
          initial={{ scale: 0, opacity: 0 }}
          animate={
            isRevealing
              ? { scale: index === 0 ? 1.45 : 1.22, opacity: 0 }
              : { scale: [0, 1, 0.86, 1], opacity: [0, 0.9, 0.35, 0.7] }
          }
          transition={
            isRevealing
              ? { duration: 0.62, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }
              : {
                  delay: 1 + index * 0.12,
                  duration: 2.4,
                  repeat: Infinity,
                  repeatDelay: 0.35,
                  ease: "easeInOut",
                }
          }
        />
      ))}

      <motion.div
        className="absolute z-0 h-80 w-80 rounded-full border border-[#53fc18]/20"
        initial={{ scale: 0.55, opacity: 0 }}
        animate={isRevealing ? { scale: 2.6, opacity: 0 } : { scale: [0.55, 1.15, 0.95], opacity: [0, 0.35, 0.14] }}
        transition={
          isRevealing
            ? { duration: 0.84, ease: [0.22, 1, 0.36, 1] }
            : { delay: 1.35, duration: 1.8, repeat: Infinity, ease: "easeOut" }
        }
      />

      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={
          isRevealing
            ? { scale: 0.18, opacity: 0, filter: "blur(12px)" }
            : { scale: [0.8, 1.08, 0.98, 1.02], opacity: [0, 1, 0.85, 1] }
        }
        transition={
          isRevealing
            ? { duration: 0.72, ease: [0.22, 1, 0.36, 1] }
            : {
                duration: 2.8,
                times: [0, 0.28, 0.68, 1],
                repeat: Infinity,
                ease: "easeInOut",
              }
        }
        className="absolute z-0 w-48 h-48 sm:w-64 sm:h-64"
      >
        <Image src="/xlantislogo.png" alt="Xlantis" fill className="object-contain" priority />
      </motion.div>

      <motion.div
        initial={{ y: "0%" }}
        animate={isRevealing ? { y: "-136%", rotate: -8 } : { y: "-100%" }}
        transition={isRevealing ? { duration: 0.8, ease: [0.22, 1, 0.36, 1] } : { delay: 0.5, duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        className="absolute top-0 left-0 w-1/2 h-1/2 bg-[#1a1c20] z-10 border-r border-b border-[#2a2d32]"
      />
      <motion.div
        initial={{ x: "0%" }}
        animate={isRevealing ? { x: "136%", rotate: 8 } : { x: "100%" }}
        transition={isRevealing ? { duration: 0.8, delay: 0.04, ease: [0.22, 1, 0.36, 1] } : { delay: 0.6, duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        className="absolute top-0 right-0 w-1/2 h-1/2 bg-[#1a1c20] z-10 border-l border-b border-[#2a2d32]"
      />
      <motion.div
        initial={{ x: "0%" }}
        animate={isRevealing ? { x: "-136%", rotate: 8 } : { x: "-100%" }}
        transition={isRevealing ? { duration: 0.8, delay: 0.08, ease: [0.22, 1, 0.36, 1] } : { delay: 0.7, duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-[#1a1c20] z-10 border-r border-t border-[#2a2d32]"
      />
      <motion.div
        initial={{ y: "0%" }}
        animate={isRevealing ? { y: "136%", rotate: -8 } : { y: "100%" }}
        transition={isRevealing ? { duration: 0.8, delay: 0.12, ease: [0.22, 1, 0.36, 1] } : { delay: 0.8, duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-[#1a1c20] z-10 border-l border-t border-[#2a2d32]"
      />

      <motion.div
        className="absolute inset-0 z-30 bg-[radial-gradient(circle_at_center,rgba(83,252,24,0.32)_0,rgba(83,252,24,0.14)_18%,transparent_52%)]"
        initial={{ opacity: 0, scale: 0.7 }}
        animate={isRevealing ? { opacity: [0, 0.75, 0], scale: [0.7, 1.4, 2.1] } : { opacity: 0 }}
        transition={{ duration: 0.84, ease: [0.22, 1, 0.36, 1] }}
      />
    </motion.div>
  );
}
