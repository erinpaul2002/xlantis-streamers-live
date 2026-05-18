"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import type { LoadingScreenProps } from "@/components/loading/loading-screen-types";

export default function Loading7({ phase = "loading" }: LoadingScreenProps) {
  const isRevealing = phase === "revealing";
  const logos = [
    "/kicklogo.png",
    "/youtubelogo.png",
    "/tvalogo.png",
    "/kvalogo.png",
    "/kicklogo.png",
    "/youtubelogo.png",
    "/tvalogo.png",
    "/kvalogo.png",
  ];

  return (
    <motion.div 
      className="w-full h-full absolute inset-0 bg-[#e8e6e1] flex flex-col items-center justify-center overflow-hidden"
      animate={{
        opacity: isRevealing ? 0 : 1,
        backgroundColor: isRevealing ? "#111111" : "#e8e6e1",
      }}
      transition={{ duration: 0.92, ease: [0.76, 0, 0.24, 1] }}
    >
      <div className="w-[200%] h-32 absolute top-1/2 -translate-y-1/2 flex items-center overflow-hidden opacity-20 pointer-events-none">
        <motion.div
          className="flex gap-8 sm:gap-16 whitespace-nowrap"
          animate={isRevealing ? { x: "-68%", opacity: 0 } : { x: ["0%", "-50%"] }}
          transition={isRevealing ? { duration: 0.88, ease: [0.22, 1, 0.36, 1] } : { ease: "linear", duration: 15, repeat: Infinity }}
        >
          {logos.map((src, i) => (
            <div key={i} className="relative w-16 h-16 sm:w-24 sm:h-24 flex-shrink-0 grayscale">
              <Image src={src} alt="Logo" fill className="object-contain" />
            </div>
          ))}
           {logos.map((src, i) => (
            <div key={`dup-${i}`} className="relative w-16 h-16 sm:w-24 sm:h-24 flex-shrink-0 grayscale">
              <Image src={src} alt="Logo" fill className="object-contain" />
            </div>
          ))}
        </motion.div>
      </div>

      <motion.div
        className="absolute top-1/2 left-0 h-[2px] w-full -translate-y-1/2 bg-[#111]/20"
        initial={{ scaleX: 0, opacity: 0 }}
        animate={isRevealing ? { scaleX: 1.45, opacity: 0 } : { scaleX: [0, 1, 0.88, 1], opacity: [0, 0.55, 0.25, 0.42] }}
        transition={isRevealing ? { duration: 0.6, ease: [0.22, 1, 0.36, 1] } : { delay: 1.05, duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        initial={{ scale: 0, opacity: 0, y: 0 }}
        animate={
          isRevealing
            ? {
                scale: 1.85,
                opacity: 0,
                y: -12,
                width: "120vw",
                height: "18rem",
                borderRadius: "2rem",
                filter: "blur(6px)",
              }
            : {
                scale: 1,
                opacity: 1,
                y: [0, -10, 0],
                width: "12rem",
                height: "12rem",
                borderRadius: "1.5rem",
                filter: "blur(0px)",
              }
        }
        transition={
          isRevealing
            ? { duration: 0.95, ease: [0.22, 1, 0.36, 1] }
            : {
                scale: { delay: 1.5, duration: 1, type: "spring", bounce: 0.5 },
                opacity: { delay: 1.5, duration: 1 },
                y: { delay: 2.5, duration: 4, repeat: Infinity, ease: "easeInOut" },
              }
        }
        className="relative z-10 w-48 h-48 sm:w-64 sm:h-64 bg-[#111] rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] p-6 sm:p-8 flex items-center justify-center border border-[#333]"
      >
        <Image src="/xlantislogo.png" alt="Xlantis" fill className="object-contain p-4 sm:p-8" priority />
      </motion.div>

      <motion.div
        className="absolute inset-0 z-20 bg-[radial-gradient(circle_at_center,rgba(17,17,17,0)_0,rgba(17,17,17,0.08)_34%,rgba(17,17,17,0.92)_72%)]"
        initial={{ opacity: 0 }}
        animate={isRevealing ? { opacity: [0, 0.2, 1] } : { opacity: 0 }}
        transition={{ duration: 0.92, ease: [0.22, 1, 0.36, 1] }}
      />
      
    </motion.div>
  );
}
