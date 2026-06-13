"use client";

import React from "react";

export const AmbientMesh = React.memo(function AmbientMesh() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      {/* Primary Cyan Orb */}
      <div
        className="absolute w-[700px] h-[700px] rounded-full animate-orb-drift"
        style={{
          background: "radial-gradient(circle, rgba(34,211,238,0.1) 0%, transparent 70%)",
          top: "-10%",
          left: "-5%",
          filter: "blur(80px)",
          transform: "translate3d(0, 0, 0)",
          willChange: "transform",
        }}
      />
      {/* Violet Orb */}
      <div
        className="absolute w-[600px] h-[600px] rounded-full animate-float-delayed"
        style={{
          background: "radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)",
          bottom: "5%",
          right: "-8%",
          filter: "blur(90px)",
          transform: "translate3d(0, 0, 0)",
          willChange: "transform",
        }}
      />
      {/* Green Orb */}
      <div
        className="absolute w-[500px] h-[500px] rounded-full animate-float-slow"
        style={{
          background: "radial-gradient(circle, rgba(16,185,129,0.06) 0%, transparent 70%)",
          top: "50%",
          left: "40%",
          filter: "blur(100px)",
          transform: "translate3d(0, 0, 0)",
          willChange: "transform",
        }}
      />
      {/* Amber accent */}
      <div
        className="absolute w-[300px] h-[300px] rounded-full animate-breathe"
        style={{
          background: "radial-gradient(circle, rgba(245,158,11,0.06) 0%, transparent 70%)",
          top: "20%",
          right: "20%",
          filter: "blur(70px)",
          transform: "translate3d(0, 0, 0)",
          willChange: "transform",
        }}
      />
      {/* Subtle grain overlay */}
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
});
