/**
 * @file AuthScreen.tsx
 * @description Full-page Google Sign-In screen for Habito.
 * Uses the project's exact design tokens — emerald primary, Instrument Serif
 * display font, and the real /logo.png app icon.
 */

import { useAuth } from "@/hooks/use-auth";

const benefits = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="size-[18px]">
        <path d="M12 2a10 10 0 1 0 10 10" />
        <path d="M22 2 17 7" />
        <path d="M17 2h5v5" />
      </svg>
    ),
    title: "Sync across devices",
    desc: "Your habits follow you everywhere — phone, tablet, or desktop.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="size-[18px]">
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
    title: "Secure cloud backup",
    desc: "All your data is safely stored and encrypted in the cloud.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="size-[18px]">
        <path d="M3 3v18h18" />
        <path d="m7 16 4-4 4 4 4-6" />
      </svg>
    ),
    title: "Personalized insights",
    desc: "See trends, streaks, and statistics tailored to your habits.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="size-[18px]">
        <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    ),
    title: "Never lose your progress",
    desc: "Switch devices or reinstall — your streak is always waiting.",
  },
];

function GoogleLogo() {
  return (
    <svg className="size-[18px] shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg className="size-[18px] animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

export function AuthScreen() {
  const { loading, error, signInWithGoogle, clearError } = useAuth();

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4 py-16">
      {/* Background — mirrors the global body gradient from styles.css */}
      {/* <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: [
            "radial-gradient(ellipse 70% 50% at 20% 0%, oklch(0.74 0.16 158 / 0.11), transparent 65%)",
            "radial-gradient(ellipse 55% 40% at 90% 100%, oklch(0.82 0.13 80 / 0.07), transparent 60%)",
            "radial-gradient(ellipse 40% 30% at 80% 10%, oklch(0.74 0.16 158 / 0.05), transparent 55%)",
          ].join(", "),
        }}
      /> */}

      {/* Subtle grid */}
      {/* <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(oklch(1 0 0) 1px, transparent 1px), linear-gradient(90deg, oklch(1 0 0) 1px, transparent 1px)",
          backgroundSize: "52px 52px",
        }}
      /> */}

      <div className="relative z-10 w-full max-w-[420px]">
        {/* ── App identity ── */}
        <div className="mb-9 text-center">
          {/* Logo */}
          <div className="mb-5 inline-flex">
            <div
              className="flex size-[72px] items-center justify-center overflow-hidden rounded-[20px]"
              style={{
                background: "oklch(0.19 0.008 240)",
                boxShadow: "0 0 0 1px oklch(1 0 0 / 0.08), 0 20px 48px -12px oklch(0.74 0.16 158 / 0.3)",
              }}
            >
              <img
                src="/logo.png"
                alt="Habito"
                className="size-full object-cover"
              />
            </div>
          </div>

          {/* Name + tagline */}
          <h1 className="font-display text-[2.6rem] leading-none tracking-tight text-foreground">
            Habito
          </h1>
          <p
            className="mt-1.5 font-mono text-[9.5px] uppercase tracking-[0.22em]"
            style={{ color: "oklch(0.74 0.16 158)" }}
          >
            Daily Habit Tracker
          </p>

          {/* Hero copy */}
          <div className="mt-8 space-y-2">
            <h2 className="font-display text-[1.55rem] leading-snug text-foreground">
              Build habits that last
            </h2>
            <p className="text-[14.5px] leading-relaxed text-muted-foreground">
              Sign in to sync your progress, unlock insights,
              <br className="hidden sm:block" /> and stay consistent every single day.
            </p>
          </div>
        </div>

        {/* ── Card ── */}
        <div
          className="rounded-2xl p-7"
          style={{
            background: "oklch(0.19 0.008 240)",
            border: "1px solid oklch(1 0 0 / 0.07)",
            boxShadow: "var(--shadow-elevated)",
          }}
        >
          {/* Error banner */}
          {error && (
            <div
              className="mb-5 flex items-start gap-3 rounded-xl px-4 py-3"
              style={{
                background: "oklch(0.65 0.21 28 / 0.1)",
                border: "1px solid oklch(0.65 0.21 28 / 0.2)",
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 size-4 shrink-0" style={{ color: "oklch(0.65 0.21 28)" }}>
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <p className="flex-1 text-[12.5px] leading-relaxed" style={{ color: "oklch(0.78 0.15 28)" }}>
                {error}
              </p>
              <button onClick={clearError} aria-label="Dismiss" className="transition-opacity hover:opacity-70" style={{ color: "oklch(0.65 0.21 28)" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-3.5"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            </div>
          )}

          {/* Google sign-in button */}
          <button
            onClick={signInWithGoogle}
            disabled={loading}
            className="group relative flex w-full items-center justify-center gap-2.5 rounded-xl bg-white px-5 py-3.5 text-[14.5px] font-semibold text-gray-800 transition-all duration-150 hover:bg-gray-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            style={{ boxShadow: "0 1px 3px oklch(0 0 0 / 0.18), 0 4px 12px oklch(0 0 0 / 0.08)" }}
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

          {/* Divider */}
          <div className="my-6 flex items-center gap-4">
            <div className="h-px flex-1" style={{ background: "oklch(1 0 0 / 0.07)" }} />
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Why sign in?
            </span>
            <div className="h-px flex-1" style={{ background: "oklch(1 0 0 / 0.07)" }} />
          </div>

          {/* Benefits */}
          <ul className="space-y-4">
            {benefits.map((b) => (
              <li key={b.title} className="flex items-start gap-3.5">
                <div
                  className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg"
                  style={{
                    background: "oklch(0.74 0.16 158 / 0.12)",
                    color: "oklch(0.74 0.16 158)",
                  }}
                >
                  {b.icon}
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-foreground">{b.title}</p>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">{b.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Privacy note */}
        <p className="mt-5 text-center text-[11.5px] leading-relaxed text-muted-foreground/60">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="mr-1 inline size-3 align-[-1.5px] opacity-60">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          Your Google account is only used for authentication and syncing your data.
          <br />
          We never access your contacts, emails, or other Google data.
        </p>
      </div>
    </div>
  );
}
