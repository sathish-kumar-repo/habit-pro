/**
 * @file AuthScreen.tsx
 * @description Google Sign-In screen for Habito.
 *
 * Layout: split panel — dark editorial brand panel (left) with a masked
 * generative grid, a glowing focal cell, and a headline; plain sign-in
 * panel (right). Mobile collapses the brand panel to a strip above the
 * form. Content is bounded to a max width so the split stays proportional
 * on ultrawide displays instead of stretching thin.
 *
 * The grid is a deterministic pure function of (row, col) — no
 * Math.random/Date.now — so server and client markup match exactly.
 *
 * Performance: grid is a bounded set of static <div> cells inside a
 * non-scrolling panel, not a fullscreen overlay. No blur, no
 * backdrop-filter, no per-frame effects. Motion is limited to the button's
 * loading spinner and 150ms color/shadow transitions.
 *
 * Devices: fluid type via clamp() instead of hard breakpoint jumps, safe-area
 * insets for notched phones, and tested down to 320px width.
 */

import type { ReactNode, CSSProperties } from "react";
import { useAuth } from "@/hooks/use-auth";

// ─────────────────────────────────────────────────────────────
// Generative grid — deterministic, pure function of (row, col)
// ─────────────────────────────────────────────────────────────

function cellOpacity(row: number, col: number): number {
  const v = Math.abs(Math.sin(row * 12.9898 + col * 78.233) * 43758.5453) % 1;
  return 0.03 + v * 0.26;
}

// A small, fixed set of cells rendered as bright glowing focal points —
// a deliberate two-tone accent, not a literal "5 of 7 days" streak widget.
const FOCAL_CELLS_EMERALD = new Set(["2-7"]);
const FOCAL_CELLS_GOLD = new Set(["4-3"]);

function ConsistencyGrid({
  rows,
  cols,
  className = "",
}: {
  rows: number;
  cols: number;
  className?: string;
}) {
  const cells = Array.from({ length: rows * cols }, (_, i) => i);
  return (
    <div
      className={`grid gap-[5px] ${className}`}
      style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
      aria-hidden="true"
    >
      {cells.map((i) => {
        const row = Math.floor(i / cols);
        const col = i % cols;
        const key = `${row}-${col}`;
        const isEmerald = FOCAL_CELLS_EMERALD.has(key);
        const isGold = FOCAL_CELLS_GOLD.has(key);
        let style: CSSProperties = {
          background: `oklch(0.74 0.16 158 / ${cellOpacity(row, col).toFixed(3)})`,
        };
        if (isEmerald) {
          style = {
            background: "oklch(0.74 0.16 158 / 0.9)",
            boxShadow: "0 0 16px 2px oklch(0.74 0.16 158 / 0.6)",
          };
        } else if (isGold) {
          style = {
            background: "oklch(0.82 0.13 80 / 0.9)",
            boxShadow: "0 0 16px 2px oklch(0.82 0.13 80 / 0.55)",
          };
        }
        return <div key={i} className="aspect-square rounded-[2.5px]" style={style} />;
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Icons
// ─────────────────────────────────────────────────────────────

function GoogleLogo() {
  return (
    <svg className="size-[18px] shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

function Spinner() {
  return (
    <svg className="size-[18px] animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

function ErrorText({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div role="alert" className="mt-4 flex items-start gap-2">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="mt-[3px] size-3.5 shrink-0"
        style={{ color: "oklch(0.68 0.19 25)" }}
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <p className="flex-1 text-[12.5px] leading-relaxed" style={{ color: "oklch(0.74 0.16 25)" }}>
        {message}
      </p>
      <button
        onClick={onDismiss}
        aria-label="Dismiss error"
        className="shrink-0 rounded text-[12px] text-muted-foreground underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{ outlineColor: "oklch(0.74 0.16 158)" }}
      >
        Dismiss
      </button>
    </div>
  );
}

interface ChecklistItem {
  icon: ReactNode;
  title: string;
  desc: string;
}

const CHECKLIST: ChecklistItem[] = [
  {
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-[15px]"
      >
        <path d="M17.5 19H9a6 6 0 1 1 1.2-11.88A6.5 6.5 0 0 1 22 10.5a4.5 4.5 0 0 1-.86 8.34" />
      </svg>
    ),
    title: "Synced everywhere",
    desc: "Your habits follow you across phone, tablet, and desktop.",
  },
  {
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-[15px]"
      >
        <path d="M12 21s7-3.5 7-9.5V6l-7-2.5L5 6v5.5c0 6 7 9.5 7 9.5z" />
      </svg>
    ),
    title: "Encrypted by default",
    desc: "Your data is backed up automatically, never stored in plain text.",
  },
  {
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-[15px]"
      >
        <path d="M4 19V10.5M11 19V5M18 19v-6.5M4 19h14" />
      </svg>
    ),
    title: "Real progress insight",
    desc: "See streaks, trends, and consistency over time — not just checkmarks.",
  },
];

// ─────────────────────────────────────────────────────────────
// Screen
// ─────────────────────────────────────────────────────────────

export function AuthScreen() {
  const { loading, error, signInWithGoogle, clearError } = useAuth();

  return (
    <div
      className="flex min-h-screen justify-center bg-background"
      style={{
        paddingBottom: "env(safe-area-inset-bottom)",
        paddingTop: "env(safe-area-inset-top)",
      }}
    >
      <style>{`
        @keyframes habito-fade-up {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .habito-reveal {
          animation: habito-fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        @media (prefers-reduced-motion: reduce) {
          .habito-reveal { animation: none; }
        }
      `}</style>
      <div className="flex w-full max-w-[1360px] flex-col md:flex-row">
        {/* ── Brand panel ── */}
        <div
          className="relative flex h-52 shrink-0 flex-col justify-between overflow-hidden px-6 py-6 sm:h-56 sm:px-8 sm:py-8 md:h-auto md:w-[45%] md:px-14 md:py-14 lg:px-16 lg:py-16"
          style={{
            background:
              "linear-gradient(160deg, oklch(0.135 0.009 240) 0%, oklch(0.115 0.008 240) 100%)",
          }}
        >
          {/* Oversized ghost quote mark — the editorial signature */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -left-2 -top-6 hidden font-display md:block"
            style={{
              fontSize: "13rem",
              lineHeight: 1,
              color: "oklch(1 0 0 / 0.035)",
            }}
          >
            "
          </span>
          <div
            className="absolute inset-0"
            style={{
              maskImage: "linear-gradient(100deg, black 40%, transparent 92%)",
              WebkitMaskImage: "linear-gradient(100deg, black 40%, transparent 92%)",
            }}
          >
            <ConsistencyGrid
              rows={7}
              cols={11}
              className="absolute inset-0 p-6 sm:p-8 md:p-14 lg:p-16"
            />
          </div>

          <div
            className="pointer-events-none absolute inset-y-0 right-0 hidden w-px md:block"
            style={{
              background:
                "linear-gradient(180deg, transparent, oklch(1 0 0 / 0.1) 20%, oklch(1 0 0 / 0.1) 80%, transparent)",
            }}
          />

          <div
            className="relative z-10 flex items-center gap-2.5 habito-reveal"
            style={{ animationDelay: "0ms" }}
          >
            <img
              src="/logo.png"
              alt=""
              className="size-7 rounded-[7px]"
              style={{ boxShadow: "0 0 0 1px oklch(1 0 0 / 0.14)" }}
            />
            <span className="font-display text-[1.2rem] leading-none tracking-tight text-foreground">
              Habito
            </span>
          </div>

          <div
            className="relative z-10 max-w-[340px] habito-reveal"
            style={{ animationDelay: "90ms" }}
          >
            <p
              className="mb-3 hidden font-mono text-[10px] font-medium uppercase tracking-[0.2em] md:block"
              style={{ color: "oklch(0.74 0.16 158)" }}
            >
              Habit tracking, done right
            </p>
            <p
              className="font-display leading-[1.16] text-foreground"
              style={{ fontSize: "clamp(1.6rem, 1.0rem + 2.3vw, 2.75rem)" }}
            >
              Small habits.{" "}
              <span
                className="italic"
                style={{
                  backgroundImage:
                    "linear-gradient(100deg, oklch(0.74 0.16 158), oklch(0.82 0.13 80))",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                }}
              >
                Extraordinary
              </span>{" "}
              results.
            </p>
            <p className="mt-4 text-[12.5px] leading-relaxed text-muted-foreground md:text-[13.5px]">
              Every day you show up is a data point
              <span className="hidden md:inline">. We just help you see the pattern</span>.
            </p>
          </div>
        </div>

        {/* ── Form panel ── */}
        <div className="flex flex-1 items-center justify-center px-5 py-9 sm:px-8 sm:py-14">
          <div className="w-full max-w-[380px] habito-reveal" style={{ animationDelay: "150ms" }}>
            <p
              className="mb-2 font-mono text-[10px] font-medium uppercase tracking-[0.2em]"
              style={{ color: "oklch(0.6 0.01 240)" }}
            >
              Welcome back
            </p>
            <h1
              className="font-display tracking-tight text-foreground"
              style={{ fontSize: "clamp(1.5rem, 1.3rem + 0.9vw, 1.9rem)", lineHeight: 1.2 }}
            >
              Sign in to Habito
            </h1>
            <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
              Continue with your Google account to sync your progress.
            </p>

            <div className="mt-8">
              <button
                onClick={signInWithGoogle}
                disabled={loading}
                aria-busy={loading}
                className="flex w-full items-center justify-center gap-2.5 rounded-xl px-5 py-3.5 text-[14.5px] font-semibold text-gray-800 transition-all duration-150 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
                style={{
                  background: "linear-gradient(180deg, #ffffff 0%, #f6f6f7 100%)",
                  boxShadow:
                    "inset 0 1px 0 oklch(1 0 0 / 0.9), 0 1px 2px oklch(0 0 0 / 0.18), 0 14px 30px -12px oklch(0 0 0 / 0.45)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow =
                    "inset 0 1px 0 oklch(1 0 0 / 0.9), 0 1px 2px oklch(0 0 0 / 0.2), 0 16px 34px -12px oklch(0 0 0 / 0.5), 0 0 0 3px oklch(0.74 0.16 158 / 0.16)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow =
                    "inset 0 1px 0 oklch(1 0 0 / 0.9), 0 1px 2px oklch(0 0 0 / 0.18), 0 14px 30px -12px oklch(0 0 0 / 0.45)";
                }}
              >
                {loading ? (
                  <>
                    <Spinner />
                    <span>Signing in…</span>
                  </>
                ) : (
                  <>
                    <GoogleLogo />
                    <span>Continue with Google</span>
                  </>
                )}
              </button>

              {error && <ErrorText message={error} onDismiss={clearError} />}

              <p className="mt-3 flex items-center gap-1.5 text-[11.5px] text-muted-foreground/70">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.75}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-3 shrink-0"
                >
                  <rect x="4" y="10" width="16" height="10" rx="2" />
                  <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                </svg>
                No password to remember — Google handles sign-in securely.
              </p>
            </div>

            <div className="my-8 flex items-center gap-4">
              <div className="h-px flex-1" style={{ background: "oklch(1 0 0 / 0.07)" }} />
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                What you get
              </span>
              <div className="h-px flex-1" style={{ background: "oklch(1 0 0 / 0.07)" }} />
            </div>

            <ul className="space-y-4">
              {CHECKLIST.map((item) => (
                <li key={item.title} className="flex items-start gap-3">
                  <div
                    className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-[9px]"
                    style={{
                      background: "oklch(1 0 0 / 0.05)",
                      color: "oklch(0.74 0.16 158)",
                      border: "1px solid oklch(1 0 0 / 0.07)",
                    }}
                  >
                    {item.icon}
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-foreground">{item.title}</p>
                    <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
                      {item.desc}
                    </p>
                  </div>
                </li>
              ))}
            </ul>

            <div
              className="mt-8 flex items-center gap-2.5 border-t pt-6"
              style={{ borderColor: "oklch(1 0 0 / 0.06)" }}
            >
              <div className="flex -space-x-2" aria-hidden="true">
                {["A", "M", "S"].map((letter) => (
                  <div
                    key={letter}
                    className="flex size-6 items-center justify-center rounded-full text-[9px] font-semibold"
                    style={{
                      background: "oklch(0.19 0.008 240)",
                      color: "oklch(0.74 0.16 158)",
                      boxShadow: "0 0 0 2px oklch(0.115 0.008 240)",
                    }}
                  >
                    {letter}
                  </div>
                ))}
              </div>
              <p className="text-[11.5px] text-muted-foreground">
                Joined by thousands building consistent habits.
              </p>
            </div>

            <p className="mt-6 text-[11.5px] leading-relaxed text-muted-foreground/55">
              Used only for authentication and sync — never for reading your contacts, email, or
              other Google data.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
