/**
 * @file AuthLoadingScreen.tsx
 * @description Shown while Firebase resolves the initial auth state.
 * Uses the project's bg-background and emerald primary to avoid any flash.
 */

export function AuthLoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        {/* Real app logo */}
        <div
          className="flex size-14 items-center justify-center overflow-hidden rounded-[16px]"
          style={{
            background: "oklch(0.19 0.008 240)",
            boxShadow:
              "0 0 0 1px oklch(1 0 0 / 0.07), 0 12px 32px -8px oklch(0.74 0.16 158 / 0.25)",
          }}
        >
          <img src="/logo.png" alt="Habito" className="size-full object-cover" />
        </div>

        {/* Spinner in emerald */}
        <div className="flex items-center gap-2">
          <svg
            className="size-3.5 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
            style={{ color: "oklch(0.74 0.16 158)" }}
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Loading
          </span>
        </div>
      </div>
    </div>
  );
}
