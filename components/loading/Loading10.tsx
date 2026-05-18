"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import type { LoadingScreenProps } from "@/components/loading/loading-screen-types";

export default function Loading10({ phase = "loading" }: LoadingScreenProps) {
  const isRevealing = phase === "revealing";
  const nodes = [
    { src: "/kicklogo.png", top: "25%", left: "25%", delay: 1.2, exitY: -100 },
    { src: "/youtubelogo.png", top: "75%", left: "75%", delay: 1.4, exitY: 100 },
    { src: "/tvalogo.png", top: "25%", left: "75%", delay: 1.55, exitY: -100 },
    { src: "/kvalogo.png", top: "75%", left: "25%", delay: 1.7, exitY: 100 },
  ];

  return (
    <motion.div 
      className="w-full h-full absolute inset-0 bg-[#eaeaec] flex items-center justify-center overflow-hidden"
      animate={{
        opacity: isRevealing ? 0 : 1,
        backgroundColor: isRevealing ? "#0a0a0c" : "#eaeaec",
      }}
      transition={{ duration: 0.94, ease: [0.76, 0, 0.24, 1] }}
    >
      <motion.div 
        className="absolute top-1/2 left-0 w-full h-[1px] bg-[#d0d0d5]"
        initial={{ scaleX: 0 }}
        animate={isRevealing ? { scaleX: 0, opacity: 0 } : { scaleX: 1, opacity: 1 }}
        transition={isRevealing ? { duration: 0.6, ease: [0.22, 1, 0.36, 1] } : { duration: 1.5, ease: "easeInOut" }}
      />
      <motion.div 
        className="absolute left-1/2 top-0 w-[1px] h-full bg-[#d0d0d5]"
        initial={{ scaleY: 0 }}
        animate={isRevealing ? { scaleY: 0, opacity: 0 } : { scaleY: 1, opacity: 1 }}
        transition={isRevealing ? { duration: 0.6, delay: 0.05, ease: [0.22, 1, 0.36, 1] } : { duration: 1.5, ease: "easeInOut", delay: 0.2 }}
      />
      
      <motion.div 
        className="absolute top-1/4 left-0 w-full h-[1px] bg-[#d0d0d5] opacity-50"
        initial={{ scaleX: 0 }}
        animate={isRevealing ? { scaleX: 0, opacity: 0 } : { scaleX: 1, opacity: 0.5 }}
        transition={isRevealing ? { duration: 0.55, ease: [0.22, 1, 0.36, 1] } : { duration: 1.5, ease: "easeInOut", delay: 0.1 }}
      />
      <motion.div 
        className="absolute left-1/4 top-0 w-[1px] h-full bg-[#d0d0d5] opacity-50"
        initial={{ scaleY: 0 }}
        animate={isRevealing ? { scaleY: 0, opacity: 0 } : { scaleY: 1, opacity: 0.5 }}
        transition={isRevealing ? { duration: 0.55, delay: 0.08, ease: [0.22, 1, 0.36, 1] } : { duration: 1.5, ease: "easeInOut", delay: 0.3 }}
      />
       <motion.div 
        className="absolute top-3/4 left-0 w-full h-[1px] bg-[#d0d0d5] opacity-50"
        initial={{ scaleX: 0 }}
        animate={isRevealing ? { scaleX: 0, opacity: 0 } : { scaleX: 1, opacity: 0.5 }}
        transition={isRevealing ? { duration: 0.55, delay: 0.12, ease: [0.22, 1, 0.36, 1] } : { duration: 1.5, ease: "easeInOut", delay: 0.2 }}
      />
      <motion.div 
        className="absolute left-3/4 top-0 w-[1px] h-full bg-[#d0d0d5] opacity-50"
        initial={{ scaleY: 0 }}
        animate={isRevealing ? { scaleY: 0, opacity: 0 } : { scaleY: 1, opacity: 0.5 }}
        transition={isRevealing ? { duration: 0.55, delay: 0.16, ease: [0.22, 1, 0.36, 1] } : { duration: 1.5, ease: "easeInOut", delay: 0.4 }}
      />

      {nodes.map((node, index) => (
        <motion.div
          key={node.src}
          className="absolute w-10 h-10 sm:w-16 sm:h-16 bg-[#1a1a1a] p-1 sm:p-2 border border-[#333] shadow-sm"
          style={{ top: node.top, left: node.left }}
          initial={{ x: "-50%", y: -100, opacity: 0, rotate: index % 2 ? 8 : -8 }}
          animate={
            isRevealing
              ? { x: "-50%", y: "-50%", opacity: 0, rotate: 0, scale: 0.34, top: "50%", left: "50%" }
              : { x: "-50%", y: "-50%", opacity: 1, rotate: 0, scale: 1, top: node.top, left: node.left }
          }
          transition={
            isRevealing
              ? { duration: 0.68, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }
              : { delay: node.delay, type: "spring", stiffness: 100, damping: 13 }
          }
        >
          <Image src={node.src} alt="" fill className="object-contain p-2" />
        </motion.div>
      ))}

      {nodes.map((node, index) => (
        <motion.div
          key={`${node.src}-trace`}
          className="absolute left-1/2 top-1/2 z-0 h-px origin-left bg-[#1a1a1a]/25"
          initial={{ width: 0, opacity: 0, rotate: index * 90 + 45 }}
          animate={isRevealing ? { width: 0, opacity: 0 } : { width: "36vw", opacity: [0, 0.55, 0.18, 0.42] }}
          transition={isRevealing ? { duration: 0.44, ease: [0.22, 1, 0.36, 1] } : { delay: 1.85 + index * 0.08, duration: 1.4, repeat: Infinity, repeatDelay: 0.4 }}
        />
      ))}

      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 sm:w-48 sm:h-48 bg-[#0a0a0c] p-4 sm:p-6 border border-[#222] shadow-xl z-10"
        initial={{ scale: 0, opacity: 0, y: "-50%" }}
        animate={
          isRevealing
            ? {
                scale: 5.8,
                opacity: 0,
                y: "-50%",
                rotate: 45,
                boxShadow: "0 0 0 rgba(0,0,0,0)",
              }
            : {
                scale: 1,
                opacity: 1,
                y: ["-50%", "-55%", "-50%"],
                rotate: 0,
                boxShadow: [
                  "0 18px 34px rgba(0,0,0,0.2)",
                  "0 22px 46px rgba(0,0,0,0.32)",
                  "0 18px 34px rgba(0,0,0,0.2)",
                ],
              }
        }
        transition={
          isRevealing
            ? { duration: 0.9, ease: [0.76, 0, 0.24, 1] }
            : {
                scale: { delay: 1.8, type: "spring", stiffness: 80, damping: 15 },
                opacity: { delay: 1.8 },
                y: { delay: 2.5, duration: 4, repeat: Infinity, ease: "easeInOut" },
                boxShadow: { delay: 2.5, duration: 4, repeat: Infinity, ease: "easeInOut" },
              }
        }
      >
        <Image src="/xlantislogo.png" alt="Xlantis" fill className="object-contain p-4" priority />
      </motion.div>

      <motion.div
        className="absolute inset-0 z-20 bg-[radial-gradient(circle_at_center,rgba(10,10,12,0)_0,rgba(10,10,12,0.08)_24%,rgba(10,10,12,0.95)_76%)]"
        initial={{ opacity: 0 }}
        animate={isRevealing ? { opacity: [0, 0.28, 1] } : { opacity: 0 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      />

    </motion.div>
  );
}
