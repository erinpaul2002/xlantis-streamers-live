"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import Image from "next/image";
import { motion } from "framer-motion";
import type { LoadingScreenProps } from "@/components/loading/loading-screen-types";

export default function Loading8({ phase = "loading" }: LoadingScreenProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const blockRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const railsRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const loopTweenRef = useRef<gsap.core.Tween | null>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline();

      gsap.set(blockRef.current, { height: 0, top: 0 });
      gsap.set(contentRef.current, { scale: 0.8, opacity: 0 });
      gsap.set(railsRef.current?.children ?? [], { scaleX: 0, opacity: 0 });

      // Heavy drop
      tl.to(blockRef.current, {
        height: "100%",
        duration: 0.8,
        ease: "power4.in",
      });

      // Impact screen shake
      tl.to(containerRef.current, {
        y: 10,
        duration: 0.05,
        yoyo: true,
        repeat: 5,
        ease: "none"
      });

      tl.to(railsRef.current?.children ?? [], {
        scaleX: 1,
        opacity: 0.7,
        duration: 0.35,
        stagger: 0.08,
        ease: "power3.out",
      }, "-=0.1");

      tl.to(railsRef.current?.children ?? [], {
        scaleX: 0.18,
        opacity: 0.12,
        duration: 0.6,
        stagger: 0.05,
        ease: "power3.out",
      }, "+=0.05");

      // Reveal content inside block (acts as background)
      tl.to(contentRef.current, {
        scale: 1,
        opacity: 1,
        duration: 1,
        ease: "power2.out",
        onComplete: () => {
          loopTweenRef.current = gsap.to(contentRef.current, {
            scale: 1.05,
            opacity: 0.8,
            y: -8,
            duration: 2,
            yoyo: true,
            repeat: -1,
            ease: "sine.inOut"
          });
        }
      }, "-=0.2");

    }, containerRef);

    return () => ctx.revert();
  }, []);

  useEffect(() => {
    if (phase !== "revealing") {
      return;
    }

    const ctx = gsap.context(() => {
      loopTweenRef.current?.kill();

      const reveal = gsap.timeline();

      reveal.to(railsRef.current?.children ?? [], {
        scaleX: 1.35,
        opacity: 1,
        duration: 0.2,
        stagger: 0.04,
        ease: "power2.out",
      }, 0);

      reveal.to(contentRef.current, {
        scale: 1.22,
        y: -24,
        opacity: 1,
        duration: 0.24,
        ease: "power2.out",
      }, 0.06);

      reveal.to(progressRef.current, {
        height: "100%",
        duration: 0.62,
        ease: "power4.inOut",
      }, 0.14);

      reveal.to(contentRef.current, {
        scale: 0.72,
        opacity: 0,
        y: -42,
        duration: 0.48,
        ease: "power3.in",
      }, 0.34);

      reveal.to(blockRef.current, {
        yPercent: -104,
        duration: 0.82,
        ease: "power4.inOut",
      }, 0.42);

      reveal.to(containerRef.current, {
        opacity: 0,
        duration: 0.92,
        ease: "power2.out",
      }, 0.38);
    }, containerRef);

    return () => ctx.revert();
  }, [phase]);

  return (
    <motion.div
      ref={containerRef}
      className="w-full h-full absolute inset-0 bg-[#e3e1db] flex items-center justify-center overflow-hidden"
    >
      
      <div 
        ref={blockRef} 
        className="absolute w-full bg-[#111111] z-10 flex items-center justify-center overflow-hidden"
      >
        <div ref={railsRef} className="absolute inset-0 z-0 flex flex-col justify-center gap-10 px-6 opacity-70">
          {[0, 1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-px origin-left bg-[#53fc18]/45 shadow-[0_0_18px_rgba(83,252,24,0.18)]"
            />
          ))}
        </div>
        <div ref={contentRef} className="relative w-48 h-48 sm:w-64 sm:h-64">
           <Image src="/xlantislogo.png" alt="Xlantis" fill className="object-contain drop-shadow-[0_0_30px_rgba(255,255,255,0.1)] p-4 sm:p-0" priority />
        </div>
      </div>
      
      <motion.div
        ref={progressRef}
        className="absolute bottom-0 left-0 z-20 h-1 bg-[#53fc18]"
        initial={{ width: "0%" }}
        animate={{ width: ["0%", "62%", "78%", "100%"] }}
        transition={{ duration: 3.25, times: [0, 0.45, 0.7, 1], ease: "easeInOut" }}
      />
    </motion.div>
  );
}
