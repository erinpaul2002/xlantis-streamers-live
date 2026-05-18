"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { MeshTransmissionMaterial, Environment, Center, useTexture } from "@react-three/drei";
import { useRef } from "react";
import * as THREE from "three";
import { motion } from "framer-motion";
import type { LoadingScreenProps } from "@/components/loading/loading-screen-types";

function GlassCard({
  angleOffset,
  radius,
  texturePath,
  verticalOffset = 0,
}: {
  angleOffset: number;
  radius: number;
  texturePath: string;
  verticalOffset?: number;
}) {
  const mesh = useRef<THREE.Mesh>(null);
  const texture = useTexture(texturePath);

  useFrame((state) => {
    if (mesh.current) {
      const orbitSpeed = 0.52;
      const currentAngle = state.clock.elapsedTime * orbitSpeed + angleOffset;
      const floatY = verticalOffset + Math.sin(state.clock.elapsedTime * 1.4 + angleOffset * 2) * 0.2;
      const pitch = Math.cos(state.clock.elapsedTime * 0.55 + angleOffset) * 0.06;
      const roll = Math.sin(state.clock.elapsedTime * 0.9 + angleOffset) * 0.08;

      mesh.current.position.x = Math.cos(currentAngle) * radius;
      mesh.current.position.z = Math.sin(currentAngle) * radius;
      mesh.current.position.y = floatY;
      mesh.current.rotation.x = pitch;
      mesh.current.rotation.y = Math.PI / 2 - currentAngle;
      mesh.current.rotation.z = roll;
    }
  });

  return (
    <mesh ref={mesh}>
      <boxGeometry args={[3, 4, 0.2]} />
      <MeshTransmissionMaterial 
        thickness={0.5} 
        roughness={0.2} 
        transmission={1} 
        ior={1.5} 
        chromaticAberration={0.04} 
        backside 
      />
      <mesh position={[0, 0, 0.11]}>
        <planeGeometry args={[2, 2]} />
        <meshBasicMaterial map={texture} transparent />
      </mesh>
      <mesh position={[0, 0, -0.11]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[2, 2]} />
        <meshBasicMaterial map={texture} transparent />
      </mesh>
    </mesh>
  );
}

function Scene() {
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
  const radius = isMobile ? 4.8 : 6.4;
  
  useFrame((state) => {
    state.camera.position.z = THREE.MathUtils.lerp(state.camera.position.z, isMobile ? 20 : 15, 0.05);
    state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, isMobile ? 1.2 : 0.4, 0.05);
    state.camera.lookAt(0, 0, 0);
  });

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 10]} intensity={1} />
      <Environment preset="city" />
      <Center>
        <GlassCard angleOffset={0} radius={radius} texturePath="/xlantislogo.png" verticalOffset={0.15} />
        <GlassCard angleOffset={(Math.PI * 2) / 3} radius={radius} texturePath="/kicklogo.png" verticalOffset={-0.1} />
        <GlassCard angleOffset={((Math.PI * 2) / 3) * 2} radius={radius} texturePath="/youtubelogo.png" verticalOffset={0.05} />
      </Center>
    </>
  );
}

export default function Loading3({ phase = "loading" }: LoadingScreenProps) {
  const isRevealing = phase === "revealing";

  return (
    <motion.div 
      className="w-full h-full absolute inset-0 bg-[#0a0a0c]"
      animate={{
        opacity: isRevealing ? 0 : 1,
        scale: isRevealing ? 1.08 : 1,
        filter: isRevealing ? "blur(10px)" : "blur(0px)",
      }}
      transition={{ duration: 0.96, ease: [0.22, 1, 0.36, 1] }}
    >
      <Canvas camera={{ position: [0, 0, 30], fov: 40 }}>
        <Scene />
      </Canvas>

      <motion.div
        className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.05)_0,rgba(255,255,255,0.12)_24%,transparent_52%)]"
        initial={{ opacity: 0, scale: 0.85 }}
        animate={isRevealing ? { opacity: [0, 0.9, 0], scale: [0.85, 1.35, 1.9] } : { opacity: 0 }}
        transition={{ duration: 0.96, ease: [0.22, 1, 0.36, 1] }}
      />
    </motion.div>
  );
}
