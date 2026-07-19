/**
 * @file AuthScreen.tsx
 * @description Full-page Google Sign-In screen for Habito.
 * Shown to unauthenticated users. Handles loading and error states.
 */

import { useAuth } from "@/hooks/use-auth";

const benefits = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="size-5">
        <path d="M12 2a10 10 0 1 0 10 10" />
        <path d="M12 6v6l4 2" />
        <path d="M20 2v4h-4" />
        <path d="M22 2 17 7" />
      </svg>
    ),
    title: "Sync across devices",
    desc: "Your habits follow you everywhere — phone, tablet, or desktop.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="size-5">
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
    title: "Secure cloud backup",
    desc: "All your data is safely stored and encrypted in the cloud.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="size-5">
        <path d="M3 3v18h18" />
        <path d="m7 16 4-4 4 4 4-6" />
      </svg>
    ),
    title: "Personalized insights",
    desc: "See trends, streaks, and statistics tailored to your habits.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="size-5">
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
    <svg className="size-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
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
    <svg
      className="size-5 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

export function AuthScreen() {
  const { loading, error, signInWithGoogle, clearError } = useAuth();

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#0a0a0f] px-4 py-16">
      {/* Ambient background glows */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-violet-600/10 blur-[120px]" />
        <div className="absolute bottom-0 left-1/4 h-[400px] w-[400px] rounded-full bg-emerald-500/8 blur-[100px]" />
        <div className="absolute right-1/4 top-1/3 h-[300px] w-[300px] rounded-full bg-indigo-500/8 blur-[100px]" />
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* App identity */}
        <div className="mb-10 text-center">
          <div className="mb-5 inline-flex items-center justify-center">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-500/25 ring-1 ring-white/10">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-8"
              >
                <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            </div>
          </div>

          <h1 className="font-['Instrument_Serif'] text-[2.75rem] leading-none tracking-tight text-white">
            Habito
          </h1>
          <p className="mt-1 text-sm font-medium tracking-widest text-violet-400/80 uppercase">
            Daily Habit Tracker
          </p>

          <div className="mt-8 space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight text-white">
              Build habits that last
            </h2>
            <p className="text-[15px] leading-relaxed text-white/50">
              Sign in to sync your progress, unlock insights,
              <br className="hidden sm:block" /> and stay consistent every single day.
            </p>
          </div>
        </div>

        {/* Sign-in card */}
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.04] p-8 shadow-xl backdrop-blur-sm">
          {/* Error banner */}
          {error && (
            <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mt-0.5 size-4 shrink-0 text-red-400"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <div className="flex-1">
                <p className="text-[13px] leading-relaxed text-red-300">{error}</p>
              </div>
              <button
                onClick={clearError}
                className="text-red-400/60 transition-colors hover:text-red-300"
                aria-label="Dismiss error"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-4">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* Google sign-in button */}
          <button
            onClick={signInWithGoogle}
            disabled={loading}
            className="group relative flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-white px-5 py-3.5 text-[15px] font-semibold text-gray-800 shadow-md transition-all duration-200 hover:bg-gray-50 hover:shadow-lg active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
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
          <div className="my-7 flex items-center gap-4">
            <div className="h-px flex-1 bg-white/[0.07]" />
            <span className="text-xs text-white/25">Why sign in?</span>
            <div className="h-px flex-1 bg-white/[0.07]" />
          </div>

          {/* Benefits list */}
          <ul className="space-y-4">
            {benefits.map((b) => (
              <li key={b.title} className="flex items-start gap-3.5">
                <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/15 text-violet-400">
                  {b.icon}
                </div>
                <div>
                  <p className="text-[13.5px] font-semibold text-white/90">{b.title}</p>
                  <p className="mt-0.5 text-[12.5px] leading-relaxed text-white/40">{b.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Privacy note */}
        <p className="mt-6 text-center text-[12px] leading-relaxed text-white/25">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mr-1 inline size-3.5 align-[-2px] text-white/30"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          Your Google account is used only for authentication and syncing your data.
          <br />
          We never access your contacts, emails, or other Google data.
        </p>
      </div>
    </div>
  );
}
