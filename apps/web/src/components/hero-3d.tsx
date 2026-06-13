"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Sparkles, MeshTransmissionMaterial } from "@react-three/drei";
import React, { useRef, useMemo } from "react";
import * as THREE from "three";

// Cache/shared geometry objects to prevent duplicate instantiations and GPU uploads
const sphereGeometry = new THREE.IcosahedronGeometry(1, 1);

const ringGeometries: { [key: number]: THREE.TorusGeometry } = {
  2.8: new THREE.TorusGeometry(2.8, 0.008, 16, 100),
  3.2: new THREE.TorusGeometry(3.2, 0.008, 16, 100),
};

function OrbitalSphere({ position, scale, speed, color }: { position: [number, number, number]; scale: number; speed: number; color: string }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      const time = state.clock.getElapsedTime();
      meshRef.current.rotation.x = time * speed * 0.3;
      meshRef.current.rotation.y = time * speed * 0.5;
      meshRef.current.position.y = position[1] + Math.sin(time * speed) * 0.15;
    }
  });

  return (
    <Float speed={1.5} rotationIntensity={0.5} floatIntensity={0.8}>
      <mesh ref={meshRef} position={position} scale={scale} castShadow receiveShadow geometry={sphereGeometry}>
        <MeshTransmissionMaterial
          backside
          backsideThickness={0.4}
          thickness={0.15}
          roughness={0.05}
          transmission={1}
          ior={1.5}
          chromaticAberration={0.6}
          anisotropy={0.1}
          color={color}
        />
      </mesh>
    </Float>
  );
}

function OrbitalRing({ radius, speed, color }: { radius: number; speed: number; color: string }) {
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (ringRef.current) {
      const time = state.clock.getElapsedTime();
      ringRef.current.rotation.x = Math.PI * 0.35 + Math.sin(time * 0.3) * 0.1;
      ringRef.current.rotation.z = time * speed;
    }
  });

  // Share or generate geometry lazily and cache it
  const geometry = useMemo(() => {
    if (!ringGeometries[radius]) {
      ringGeometries[radius] = new THREE.TorusGeometry(radius, 0.008, 16, 100);
    }
    return ringGeometries[radius];
  }, [radius]);

  return (
    <mesh ref={ringRef} geometry={geometry}>
      <meshStandardMaterial color={color} transparent opacity={0.35} emissive={color} emissiveIntensity={0.5} />
    </mesh>
  );
}

function HeroScene() {
  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[10, 10, 5]} intensity={1.8} color="#22d3ee" />
      <directionalLight position={[-10, -10, -5]} intensity={1.5} color="#8b5cf6" />
      <pointLight position={[0, 5, 0]} intensity={0.8} color="#10b981" />

      {/* Main large sphere */}
      <OrbitalSphere position={[0, 0, 0]} scale={1.6} speed={0.4} color="#ffffff" />

      {/* Smaller orbiting spheres */}
      <OrbitalSphere position={[2.5, 0.5, -1]} scale={0.35} speed={0.8} color="#22d3ee" />
      <OrbitalSphere position={[-2.2, -0.3, 0.5]} scale={0.25} speed={1.0} color="#8b5cf6" />
      <OrbitalSphere position={[1.2, -1.5, 1]} scale={0.2} speed={1.2} color="#10b981" />

      {/* Orbital rings */}
      <OrbitalRing radius={2.8} speed={0.15} color="#22d3ee" />
      <OrbitalRing radius={3.2} speed={-0.1} color="#8b5cf6" />

      {/* Particle field */}
      <Sparkles
        count={80}
        scale={8}
        size={2}
        speed={0.3}
        color="#22d3ee"
        opacity={0.4}
      />
      <Sparkles
        count={40}
        scale={6}
        size={1.5}
        speed={0.2}
        color="#8b5cf6"
        opacity={0.3}
      />
    </>
  );
}

export const Hero3D = React.memo(function Hero3D() {
  return (
    <div className="absolute inset-0 z-0 pointer-events-none">
      <Canvas
        camera={{ position: [0, 0, 7], fov: 42 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 1.5]}
      >
        <HeroScene />
      </Canvas>
    </div>
  );
});
