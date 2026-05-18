"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import type { LoadingScreenProps } from "@/components/loading/loading-screen-types";

export default function Loading9({ phase = "loading" }: LoadingScreenProps) {
  const isRevealing = phase === "revealing";
  const cards = [
    { src: "/kicklogo.png", rotate: -15, x: -140, y: -80, settleX: -18, settleY: -10 },
    { src: "/youtubelogo.png", rotate: 10, x: 140, y: -50, settleX: 18, settleY: -6 },
    { src: "/tvalogo.png", rotate: -5, x: -120, y: 110, settleX: -12, settleY: 12 },
    { src: "/kvalogo.png", rotate: 20, x: 120, y: 120, settleX: 12, settleY: 16 },
  ];

  return (
    <motion.div 
      className="w-full h-full absolute inset-0 bg-[#1a1a1a] flex items-center justify-center overflow-hidden perspective-[1000px]"
      animate={{
        opacity: isRevealing ? 0 : 1,
        backgroundColor: isRevealing ? "#080a0d" : "#1a1a1a",
      }}
      transition={{ duration: 0.98, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.div
        className="absolute h-[360px] w-[260px] rounded-2xl border border-[#53fc18]/15"
        initial={{ scale: 0.7, opacity: 0 }}
        animate={isRevealing ? { scale: 1.9, opacity: 0 } : { scale: [0.7, 1.08, 0.94], opacity: [0, 0.42, 0.16] }}
        transition={isRevealing ? { duration: 0.76, ease: [0.22, 1, 0.36, 1] } : { delay: 1.25, duration: 1.8, repeat: Infinity, ease: "easeOut" }}
      />
      
      {cards.map((card, idx) => (
        <motion.div
          key={idx}
          className="absolute w-32 h-48 sm:w-48 sm:h-64 bg-[#222] rounded-xl shadow-2xl border border-[#333] flex items-center justify-center p-4 sm:p-8 z-10"
          initial={{ x: card.x, y: card.y, rotateZ: card.rotate, opacity: 0 }}
          animate={
            isRevealing
              ? {
                  x: (idx % 2 === 0 ? -1 : 1) * (240 + idx * 34),
                  y: 300 + idx * 26,
                  rotateZ: card.rotate * 1.8,
                  opacity: 0,
                  scale: 0.9,
                }
              : {
                  x: [card.x, card.settleX, 0],
                  y: [card.y, card.settleY, 0],
                  rotateZ: [card.rotate, card.rotate * -0.35, 0],
                  opacity: 1,
                  scale: 1,
                }
          }
          transition={
            isRevealing
              ? { duration: 0.74, delay: idx * 0.05, ease: [0.76, 0, 0.24, 1] }
              : {
                  x: { duration: 1.35, delay: idx * 0.15, times: [0, 0.72, 1], ease: [0.22, 1, 0.36, 1] },
                  y: { duration: 1.35, delay: idx * 0.15, times: [0, 0.72, 1], ease: [0.22, 1, 0.36, 1] },
                  rotateZ: { duration: 1.35, delay: idx * 0.15, times: [0, 0.72, 1], ease: [0.22, 1, 0.36, 1] },
                  opacity: { duration: 0.45, delay: idx * 0.15 },
                }
          }
        >
          <div className="relative w-full h-full grayscale opacity-30">
            <Image src={card.src} alt="Logo" fill className="object-contain" />
          </div>
        </motion.div>
      ))}

      <motion.div
        className="absolute w-32 h-48 sm:w-48 sm:h-64 bg-[#0a0c10] rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-[#222] flex items-center justify-center p-4 sm:p-8 z-20 backface-hidden"
        initial={{ x: 0, y: -300, rotateX: 180, opacity: 0 }}
        animate={
          isRevealing
            ? {
                x: 0,
                y: -24,
                scale: 8,
                opacity: 0,
                rotateZ: 6,
                rotateX: -16,
                filter: "blur(8px)",
              }
            : {
                x: 0,
                y: [0, -15, 0],
                rotateZ: [0, -1.5, 1.2, 0],
                rotateX: 0,
                opacity: 1,
                scale: 1,
                filter: "blur(0px)",
              }
        }
        transition={
          isRevealing
            ? { duration: 0.94, ease: [0.76, 0, 0.24, 1] }
            : {
                x: { duration: 1.5, delay: 1.2, type: "spring", stiffness: 70, damping: 12 },
                rotateX: { duration: 1.5, delay: 1.2, type: "spring", stiffness: 70, damping: 12 },
                rotateZ: { duration: 5, delay: 2.7, repeat: Infinity, ease: "easeInOut" },
                opacity: { duration: 1.5, delay: 1.2 },
                y: {
                  duration: 4,
                  delay: 2.7,
                  repeat: Infinity,
                  ease: "easeInOut",
                },
              }
        }
        style={{ transformStyle: "preserve-3d" }}
      >
        <div className="relative w-full h-full">
          <Image src="/xlantislogo.png" alt="Xlantis" fill className="object-contain" priority />
        </div>
      </motion.div>

      <motion.div
        className="absolute inset-0 z-30 bg-[radial-gradient(circle_at_center,rgba(83,252,24,0.08)_0,transparent_38%,rgba(8,10,13,0.95)_80%)]"
        initial={{ opacity: 0 }}
        animate={isRevealing ? { opacity: [0, 0.28, 1] } : { opacity: 0 }}
        transition={{ duration: 0.94, ease: [0.22, 1, 0.36, 1] }}
      />
      
    </motion.div>
  );
}
