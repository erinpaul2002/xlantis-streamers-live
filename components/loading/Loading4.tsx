"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import Image from "next/image";
import { motion } from "framer-motion";
import type { LoadingScreenProps } from "@/components/loading/loading-screen-types";

export default function Loading4({ phase = "loading" }: LoadingScreenProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLHeadingElement>(null);
  const logo1Ref = useRef<HTMLDivElement>(null);
  const logo2Ref = useRef<HTMLDivElement>(null);
  const tetherRef = useRef<HTMLDivElement>(null);
  const impactRef = useRef<HTMLDivElement>(null);
  const loopTimelineRef = useRef<gsap.core.Timeline | null>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline();
      loopTimelineRef.current = tl;

      gsap.set([logo1Ref.current, logo2Ref.current], { y: -800, rotation: 0 });
      gsap.set(textRef.current, { scale: 1, opacity: 1 });
      gsap.set(tetherRef.current, { scaleX: 0, opacity: 0 });
      gsap.set(impactRef.current, { scaleX: 0, opacity: 0 });

      tl.to(logo1Ref.current, {
        y: 0,
        rotation: -15,
        duration: 1.2,
        ease: "bounce.out",
      }, 0.2);

      tl.to(logo2Ref.current, {
        y: 0,
        rotation: 20,
        duration: 1.5,
        ease: "bounce.out",
      }, 0.4);

      tl.to(textRef.current, {
        y: 20,
        scale: 0.95,
        duration: 0.1,
        yoyo: true,
        repeat: 3,
        ease: "power1.inOut"
      }, 1.2);

      tl.to(impactRef.current, {
        scaleX: 1,
        opacity: 1,
        duration: 0.16,
        ease: "power2.out",
      }, 1.22);

      tl.to(impactRef.current, {
        scaleX: 0.25,
        opacity: 0,
        duration: 0.45,
        ease: "power3.out",
      }, 1.38);

      tl.to(tetherRef.current, {
        scaleX: 1,
        opacity: 0.72,
        duration: 0.7,
        ease: "power3.out",
      }, 1.45);

      tl.to(logo1Ref.current, {
        y: -10,
        rotation: -12,
        x: -8,
        duration: 2,
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut"
      }, 2);

      tl.to(logo2Ref.current, {
        y: -15,
        rotation: 22,
        x: 10,
        duration: 2.5,
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut"
      }, 2);

      tl.to(tetherRef.current, {
        opacity: 0.38,
        scaleX: 0.92,
        duration: 1.7,
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut"
      }, 2);

      tl.to(textRef.current, {
        scale: 1.02,
        opacity: 0.8,
        duration: 3,
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut"
      }, 2);
    }, containerRef);

    return () => ctx.revert();
  }, []);

  useEffect(() => {
    if (phase !== "revealing") {
      return;
    }

    const ctx = gsap.context(() => {
      loopTimelineRef.current?.kill();

      const reveal = gsap.timeline();

      reveal.to(impactRef.current, {
        scaleX: 1.5,
        opacity: 1,
        duration: 0.12,
        ease: "power2.out",
      }, 0);

      reveal.to(tetherRef.current, {
        scaleX: 1.12,
        opacity: 1,
        duration: 0.16,
        ease: "power2.out",
      }, 0.03);

      reveal.to(logo1Ref.current, {
        x: -window.innerWidth * 0.42,
        y: -180,
        rotation: -42,
        duration: 0.75,
        ease: "power4.inOut",
      }, 0.08);

      reveal.to(logo2Ref.current, {
        x: window.innerWidth * 0.42,
        y: 220,
        rotation: 52,
        duration: 0.82,
        ease: "power4.inOut",
      }, 0.08);

      reveal.to(textRef.current, {
        scale: 0.92,
        duration: 0.16,
        ease: "power2.inOut",
      }, 0.1);

      reveal.to(textRef.current, {
        scale: 7.8,
        opacity: 0,
        duration: 0.84,
        ease: "power4.in",
      }, 0.24);

      reveal.to(tetherRef.current, {
        scaleX: 0,
        opacity: 0,
        duration: 0.34,
        ease: "power3.in",
      }, 0.3);

      reveal.to(impactRef.current, {
        scaleX: 3.8,
        opacity: 0,
        duration: 0.6,
        ease: "power4.out",
      }, 0.26);

      reveal.to(containerRef.current, {
        backgroundColor: "#050608",
        duration: 0.55,
        ease: "power2.out",
      }, 0.2);
    }, containerRef);

    return () => ctx.revert();
  }, [phase]);

  return (
    <motion.div
      ref={containerRef}
      className="w-full h-full absolute inset-0 bg-[#d6d4d0] flex items-center justify-center overflow-hidden"
      animate={{ opacity: phase === "revealing" ? 0 : 1 }}
      transition={{ duration: 1.05, ease: [0.76, 0, 0.24, 1] }}
    >
      <div ref={impactRef} className="absolute left-0 top-1/2 z-0 h-1 w-full origin-center bg-[#1a1a1a]" />
      <h1 
        ref={textRef} 
        className="text-[18vw] sm:text-[12vw] font-black text-[#1a1a1a] tracking-tighter leading-none mix-blend-difference z-10 select-none"
      >
        XLANTIS
      </h1>
      
      <div className="absolute w-full h-full inset-0 flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-32 z-20 pointer-events-none p-4">
        <div ref={tetherRef} className="absolute left-1/2 top-1/2 hidden h-px w-[42vw] max-w-[560px] origin-center -translate-x-1/2 -translate-y-1/2 bg-[#111]/60 sm:block" />
        <div ref={logo1Ref} className="relative w-24 h-24 sm:w-32 sm:h-32 bg-[#111] rounded-2xl shadow-2xl flex items-center justify-center p-4">
           <Image src="/kicklogo.png" alt="Kick" fill className="object-contain p-4" />
        </div>
        <div ref={logo2Ref} className="relative w-24 h-24 sm:w-32 sm:h-32 bg-[#111] rounded-2xl shadow-2xl flex items-center justify-center p-4 sm:mt-24">
           <Image src="/youtubelogo.png" alt="YouTube" fill className="object-contain p-4" />
        </div>
      </div>
    </motion.div>
  );
}
