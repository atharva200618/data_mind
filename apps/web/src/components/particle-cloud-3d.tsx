"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Sparkles, Html } from "@react-three/drei";
import React, { useRef, useMemo, useState } from "react";
import * as THREE from "three";

interface ParticleCloud3DProps {
  data: any[];
  xCol: string;
  yCol: string;
  colorCol: string;
}

function DataPoints({ data, xCol, yCol, colorCol }: ParticleCloud3DProps) {
  const pointsRef = useRef<THREE.Group>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Normalize data coordinates into fit range [-2.5, 2.5]
  const normalizedPoints = useMemo(() => {
    if (data.length === 0) return [];
    
    // Find min and max for X, Y, and Color columns
    const xVals = data.map((d) => Number(d[xCol]) || 0);
    const yVals = data.map((d) => Number(d[yCol]) || 0);
    const cVals = data.map((d) => Number(d[colorCol]) || 0);

    const xMin = Math.min(...xVals), xMax = Math.max(...xVals);
    const yMin = Math.min(...yVals), yMax = Math.max(...yVals);
    const cMin = Math.min(...cVals), cMax = Math.max(...cVals);

    const xRange = xMax - xMin || 1;
    const yRange = yMax - yMin || 1;
    const cRange = cMax - cMin || 1;

    return data.map((d, index) => {
      const xNorm = ((Number(d[xCol]) || 0) - xMin) / xRange * 5 - 2.5;
      const yNorm = ((Number(d[yCol]) || 0) - yMin) / yRange * 5 - 2.5;
      // Z will be noise to make it beautiful and 3D
      const zNorm = Math.sin(index * 0.1) * 1.5;
      
      // Calculate normalized color (0 to 1) for gradient interpolation
      const cNorm = ((Number(d[colorCol]) || 0) - cMin) / cRange;

      // Smoothly interpolate between Cyan (#22d3ee) and Violet (#8b5cf6)
      const color = new THREE.Color();
      color.lerpColors(new THREE.Color("#22d3ee"), new THREE.Color("#8b5cf6"), cNorm);

      return {
        position: new THREE.Vector3(xNorm, yNorm, zNorm),
        color: color,
        raw: d
      };
    });
  }, [data, xCol, yCol, colorCol]);

  useFrame((state) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = state.clock.getElapsedTime() * 0.04;
    }
  });

  return (
    <group ref={pointsRef}>
      {normalizedPoints.map((pt, i) => {
        const isHovered = hoveredIndex === i;
        const scale = isHovered ? 1.8 : 1;

        return (
          <mesh 
            key={i} 
            position={pt.position}
            scale={scale}
            onPointerOver={(e) => {
              e.stopPropagation();
              setHoveredIndex(i);
            }}
            onPointerOut={(e) => {
              e.stopPropagation();
              setHoveredIndex(null);
            }}
          >
            <sphereGeometry args={[0.07, 10, 10]} />
            <meshBasicMaterial color={isHovered ? "#ffffff" : pt.color} />

            {isHovered && (
              <Html distanceFactor={5.5} pointerEvents="none">
                <div className="glass p-4 rounded-2xl border border-cyan-400/30 text-[10px] font-space text-white min-w-[170px] shadow-[0_15px_30px_rgba(0,0,0,0.85)] bg-[#060814]/95 backdrop-blur-md relative z-30 select-none pointer-events-none">
                  <div className="flex items-center gap-1.5 border-b border-white/5 pb-1.5 mb-1.5 font-space uppercase tracking-wider text-cyan-400 font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                    Data Vector
                  </div>
                  <div className="space-y-1.5 font-mono text-gray-300">
                    {Object.entries(pt.raw).slice(0, 4).map(([key, val]) => (
                      <div key={key} className="flex justify-between gap-4">
                        <span className="text-gray-500 uppercase text-[8px] font-space">{key.substring(0, 8)}:</span>
                        <span className="text-white font-bold truncate max-w-[80px]">{String(val)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Html>
            )}
          </mesh>
        );
      })}
    </group>
  );
}

export function ParticleCloud3D({ data, xCol, yCol, colorCol }: ParticleCloud3DProps) {
  return (
    <div className="w-full h-full min-h-[450px] relative overflow-hidden bg-black/30 border border-white/5 rounded-[2rem]">
      <div className="absolute top-4 left-6 z-10 font-space pointer-events-none">
        <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400">Interactive Spatial Engine</span>
        <h4 className="text-sm font-bold text-white/90">3D Particle Mesh Representation</h4>
      </div>
      
      <Canvas camera={{ position: [0, 0, 6.5], fov: 50 }}>
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 5, 5]} intensity={1.5} color="#ffffff" />
        <pointLight position={[-5, -5, -5]} intensity={1.0} color="#8b5cf6" />
        
        <DataPoints data={data} xCol={xCol} yCol={yCol} colorCol={colorCol} />
        <OrbitControls enableZoom={true} enablePan={true} maxDistance={15} minDistance={3} />
        
        <Sparkles count={50} scale={6} size={1} opacity={0.2} color="#ffffff" />
      </Canvas>

      <div className="absolute bottom-4 right-6 z-10 pointer-events-none text-right font-mono text-[9px] text-gray-500">
        <span>[Hover Nodes / Drag to Orbit / Scroll to Zoom]</span>
      </div>
    </div>
  );
}
