import { useRef, useCallback } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  rot: number;
  rotV: number;
  shape: 0 | 1 | 2;
}

const COOLDOWN_MS = 2200;
const COUNT = 28;
const DURATION_MS = 960;

export function useConfetti() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const rafRef = useRef<number>(0);
  const lastRef = useRef<number>(0);

  const trigger = useCallback((color: string) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const now = Date.now();
    if (now - lastRef.current < COOLDOWN_MS) return;
    lastRef.current = now;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const c = canvas.getContext("2d");
    if (!c) return;

    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const dpr = Math.min(window.devicePixelRatio ?? 1, 2);
    const cw = canvas.offsetWidth;
    const ch = canvas.offsetHeight;
    canvas.width = cw * dpr;
    canvas.height = ch * dpr;
    c.scale(dpr, dpr);

    // Confetti origin: center of the toggle button
    let ox = cw * 0.82;
    let oy = ch * 0.88;
    const btn = buttonRef.current;
    const canRect = canvas.getBoundingClientRect();
    if (btn && canRect) {
      const br = btn.getBoundingClientRect();
      ox = br.left + br.width / 2 - canRect.left;
      oy = br.top + br.height / 2 - canRect.top;
    }

    const palette = [color, "#ffffff", color + "bb", "#ffffffcc"];
    const particles: Particle[] = [];
    for (let i = 0; i < COUNT; i++) {
      const ang = -Math.PI * 0.5 + (Math.random() - 0.5) * Math.PI * 1.3;
      const speed = 2.2 + Math.random() * 5.8;
      particles.push({
        x: ox + (Math.random() - 0.5) * 22,
        y: oy + (Math.random() - 0.5) * 10,
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed - 0.4,
        size: 2.5 + Math.random() * 4.8,
        color: palette[Math.floor(Math.random() * palette.length)],
        alpha: 1,
        rot: Math.random() * Math.PI * 2,
        rotV: (Math.random() - 0.5) * 0.34,
        shape: Math.floor(Math.random() * 3) as 0 | 1 | 2,
      });
    }

    let t0: number | null = null;

    const animate = (ts: number) => {
      if (!t0) t0 = ts;
      const progress = Math.min((ts - t0) / DURATION_MS, 1);

      c.clearRect(0, 0, cw, ch);

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.22;
        p.vx *= 0.975;
        p.rot += p.rotV;
        p.alpha = Math.max(0, 1 - progress * 1.55);
        if (p.alpha <= 0.01) continue;

        c.save();
        c.globalAlpha = p.alpha;
        c.fillStyle = p.color;
        c.strokeStyle = p.color;
        c.translate(p.x, p.y);
        c.rotate(p.rot);

        if (p.shape === 0) {
          c.fillRect(-p.size * 0.5, -p.size * 0.35, p.size, p.size * 0.7);
        } else if (p.shape === 1) {
          c.beginPath();
          c.arc(0, 0, p.size * 0.42, 0, Math.PI * 2);
          c.fill();
        } else {
          c.lineWidth = 1.5;
          c.lineCap = "round";
          c.beginPath();
          c.moveTo(-p.size, 0);
          c.lineTo(p.size, 0);
          c.stroke();
        }
        c.restore();
      }

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        c.clearRect(0, 0, cw, ch);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
  }, []);

  return { canvasRef, buttonRef, trigger };
}
