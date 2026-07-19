/**
 * @file AuthLoadingScreen.tsx
 * @description Shown while Firebase resolves the initial auth state.
 * Matches the app's dark theme to prevent a flash of unstyled content.
 */

export function AuthLoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f]">
      <div className="flex flex-col items-center gap-5">
        {/* App icon */}
        <div className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-500/25 ring-1 ring-white/10">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-7"
          >
            <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
        </div>

        {/* Spinner */}
        <div className="flex items-center gap-2">
          <svg
            className="size-4 animate-spin text-violet-400"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm text-white/30">Loading…</span>
        </div>
      </div>
    </div>
  );
}
