"use client";

import { useEffect, useRef } from "react";
import confetti from "canvas-confetti";

export function Fireworks() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const myConfetti = confetti.create(canvasRef.current, {
      resize: true,
      useWorker: true,
    });

    let isUnmounted = false;

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const fire = () => {
      if (isUnmounted) return;

      myConfetti({
        particleCount: Math.floor(randomInRange(40, 80)),
        spread: randomInRange(80, 120),
        origin: { 
          y: randomInRange(0.3, 0.8), 
          x: randomInRange(0.2, 0.8) 
        },
        colors: ['#01A374', '#FFB300', '#F57C00', '#ffffff', '#6ee7b7'],
        startVelocity: randomInRange(25, 45),
        gravity: 0.8,
        scalar: randomInRange(0.7, 1.2),
        ticks: 200,
        shapes: ['circle', 'square'],
        disableForReducedMotion: true
      });

      // Schedule next burst
      setTimeout(fire, randomInRange(1000, 2500));
    };

    // Initial bursts
    fire();
    setTimeout(fire, 400);
    setTimeout(fire, 800);

    return () => {
      isUnmounted = true;
      myConfetti.reset();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-0"
    />
  );
}
