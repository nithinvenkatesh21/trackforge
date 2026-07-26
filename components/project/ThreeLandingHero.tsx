"use client";

import { useEffect, useRef } from "react";

export function ThreeLandingHero() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || 800);
    let height = (canvas.height = 300);

    const handleResize = () => {
      if (canvas.parentElement) {
        width = canvas.width = canvas.parentElement.clientWidth;
        height = canvas.height = 300;
      }
    };

    window.addEventListener("resize", handleResize);

    let step = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw dynamic audio waveform spectrum lines (Emerald, Cyan, Violet)
      const lines = [
        { color: "rgba(16, 185, 129, 0.4)", freq: 0.015, speed: 0.03, amp: 40 },
        { color: "rgba(6, 182, 212, 0.4)", freq: 0.02, speed: 0.04, amp: 30 },
        { color: "rgba(139, 92, 246, 0.3)", freq: 0.01, speed: 0.02, amp: 50 },
      ];

      lines.forEach((line) => {
        ctx.beginPath();
        ctx.lineWidth = 2;
        ctx.strokeStyle = line.color;

        for (let x = 0; x < width; x += 4) {
          const y =
            height / 2 +
            Math.sin(x * line.freq + step * line.speed) * line.amp * Math.sin(x / width * Math.PI);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }

        ctx.stroke();
      });

      step += 1;
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="w-full relative overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-4">
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
}
