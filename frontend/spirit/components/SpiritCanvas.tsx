"use client";

import { useEffect, useRef } from "react";

interface SpiritAttributes {
  aggression: number;
  serenity: number;
  chaos: number;
  influence: number;
  connectivity: number;
}

export function SpiritCanvas({ attrs }: { attrs: SpiritAttributes }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Validate attributes - prevent NaN errors
    const safeAttrs = {
      aggression: Number(attrs.aggression) || 0,
      serenity: Number(attrs.serenity) || 0,
      chaos: Number(attrs.chaos) || 0,
      influence: Number(attrs.influence) || 0,
      connectivity: Number(attrs.connectivity) || 0,
    };

    const width = canvas.width;
    const height = canvas.height;
    let time = 0;

    const animate = () => {
      time += 0.01;

      // Clear with fade effect
      ctx.fillStyle = `rgba(0, 0, 0, ${0.05 + safeAttrs.serenity / 1000})`;
      ctx.fillRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;

      // Base spirit shape (blob-like creature)
      const numPoints = 8 + Math.floor(safeAttrs.connectivity / 10);
      const baseRadius = 80 + safeAttrs.influence * 0.8;

      // Main spirit body
      ctx.save();
      ctx.translate(centerX, centerY);

      // Outer glow (aura)
      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, baseRadius * 1.5);
      
      // Color based on attributes
      const hueAggression = (safeAttrs.aggression / 100) * 30; // 0-30 (red zone)
      const hueChaos = 240 + (safeAttrs.chaos / 100) * 60; // 240-300 (purple-pink)
      const hueSerenity = 180 + (safeAttrs.serenity / 100) * 60; // 180-240 (cyan-blue)
      
      const dominantHue = safeAttrs.aggression > 50 ? hueAggression : 
                         safeAttrs.chaos > 40 ? hueChaos : hueSerenity;

      gradient.addColorStop(0, `hsla(${dominantHue}, 80%, 60%, 0.4)`);
      gradient.addColorStop(0.5, `hsla(${dominantHue}, 70%, 50%, 0.2)`);
      gradient.addColorStop(1, "transparent");
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(0, 0, baseRadius * 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Main body (organic blob)
      ctx.beginPath();
      for (let i = 0; i <= numPoints; i++) {
        const angle = (i / numPoints) * Math.PI * 2;
        
        // Chaos creates irregular shape
        const chaosOffset = Math.sin(time * 2 + i) * (safeAttrs.chaos / 5);
        const aggressionSpike = safeAttrs.aggression > 50 ? 
          Math.abs(Math.sin(angle * 3 + time)) * 20 : 0;
        
        const radius = baseRadius + 
                      Math.sin(time + angle * 2) * 15 + 
                      chaosOffset + 
                      aggressionSpike;
        
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.closePath();

      // Fill with gradient
      const bodyGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, baseRadius);
      bodyGradient.addColorStop(0, `hsla(${dominantHue}, 90%, 70%, 0.9)`);
      bodyGradient.addColorStop(1, `hsla(${dominantHue}, 80%, 50%, 0.6)`);
      ctx.fillStyle = bodyGradient;
      ctx.fill();

      // Sharp edges for high aggression
      if (safeAttrs.aggression > 40) {
        ctx.strokeStyle = `hsla(${hueAggression}, 100%, 60%, 0.8)`;
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      // Connectivity - neural network lines
      if (safeAttrs.connectivity > 20) {
        ctx.strokeStyle = `hsla(${dominantHue}, 70%, 60%, ${safeAttrs.connectivity / 200})`;
        ctx.lineWidth = 1;
        
        const numConnections = Math.floor(safeAttrs.connectivity / 10);
        for (let i = 0; i < numConnections; i++) {
          const angle1 = (i / numConnections) * Math.PI * 2 + time;
          const angle2 = ((i + 1) / numConnections) * Math.PI * 2 + time;
          
          const r1 = baseRadius * 0.7;
          const r2 = baseRadius * 0.7;
          
          ctx.beginPath();
          ctx.moveTo(Math.cos(angle1) * r1, Math.sin(angle1) * r1);
          ctx.lineTo(Math.cos(angle2) * r2, Math.sin(angle2) * r2);
          ctx.stroke();
        }
      }

      // Particles for chaos
      if (safeAttrs.chaos > 30) {
        const numParticles = Math.floor(safeAttrs.chaos / 5);
        for (let i = 0; i < numParticles; i++) {
          const angle = (i / numParticles) * Math.PI * 2 + time * 3;
          const distance = baseRadius + Math.sin(time * 5 + i) * 40;
          const x = Math.cos(angle) * distance;
          const y = Math.sin(angle) * distance;
          
          ctx.fillStyle = `hsla(${hueChaos}, 90%, 70%, ${Math.sin(time * 2 + i) * 0.5 + 0.5})`;
          ctx.beginPath();
          ctx.arc(x, y, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Influence - pulsing rings
      if (safeAttrs.influence > 30) {
        const numRings = Math.floor(safeAttrs.influence / 20);
        for (let i = 1; i <= numRings; i++) {
          const ringRadius = baseRadius + (i * 30) + Math.sin(time * 2) * 10;
          ctx.strokeStyle = `hsla(${dominantHue}, 80%, 60%, ${0.3 / i})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // Eye/core
      ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
      ctx.beginPath();
      ctx.arc(0, -baseRadius * 0.3, 8, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = `hsla(${dominantHue}, 100%, 30%, 0.8)`;
      ctx.beginPath();
      ctx.arc(0, -baseRadius * 0.3, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      frameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [attrs]);

  return (
    <canvas
      ref={canvasRef}
      width={600}
      height={600}
      className="w-full h-full rounded-2xl"
      style={{ maxWidth: "600px", maxHeight: "600px" }}
    />
  );
}

