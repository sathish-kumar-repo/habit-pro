import { createContext, useContext, useRef, useCallback, ReactNode } from "react";

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

const COUNT = 36;
const DURATION_MS = 1000;

type ConfettiCtx = {
  trigger: (color: string, originEl?: HTMLElement | null) => void;
};

const Ctx = createContext<ConfettiCtx>({ trigger: () => {} });

export function GlobalConfettiProvider({ children }: { children: ReactNode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  const trigger = useCallback((color: string, originEl?: HTMLElement | null) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const c = canvas.getContext("2d");
    if (!c) return;

    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const dpr = Math.min(window.devicePixelRatio ?? 1, 2);
    const cw = window.innerWidth;
    const ch = window.innerHeight;
    canvas.width = cw * dpr;
    canvas.height = ch * dpr;
    c.scale(dpr, dpr);

    // Origin: centre of the triggering element, or mid-screen
    let ox = cw * 0.5;
    let oy = ch * 0.55;
    if (originEl) {
      const r = originEl.getBoundingClientRect();
      ox = r.left + r.width / 2;
      oy = r.top + r.height / 2;
    }

    const palette = [color, "#ffffff", color + "bb", "#ffffffcc"];
    const particles: Particle[] = [];
    for (let i = 0; i < COUNT; i++) {
      const ang = -Math.PI * 0.5 + (Math.random() - 0.5) * Math.PI * 1.3;
      const speed = 2.5 + Math.random() * 6.5;
      particles.push({
        x: ox + (Math.random() - 0.5) * 24,
        y: oy + (Math.random() - 0.5) * 12,
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed - 0.5,
        size: 2.5 + Math.random() * 5,
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

  return (
    <Ctx.Provider value={{ trigger }}>
      {children}
      <canvas
        ref={canvasRef}
        className="pointer-events-none fixed inset-0 z-[9999]"
        style={{ width: "100vw", height: "100vh" }}
      />
    </Ctx.Provider>
  );
}

export function useGlobalConfetti() {
  return useContext(Ctx);
}
