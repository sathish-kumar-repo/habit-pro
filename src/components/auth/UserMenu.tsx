/**
 * @file UserMenu.tsx
 * @description Avatar trigger that opens a profile popover with sign-out.
 * Uses the project's emerald primary theme.
 */

import { useState, useRef, useEffect } from "react";
import type { User } from "firebase/auth";

type Props = {
  user: User;
  onSignOut: () => void;
};

export function UserMenu({ user, onSignOut }: Props) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const initials = user.displayName
    ? user.displayName.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : user.email?.[0]?.toUpperCase() ?? "?";

  return (
    <div ref={menuRef} className="relative">
      {/* Avatar trigger */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Open user menu"
        aria-expanded={open}
        className="flex size-9 items-center justify-center overflow-hidden rounded-full transition-all focus-visible:outline-none"
        style={{
          boxShadow: open
            ? `0 0 0 2px oklch(0.74 0.16 158 / 0.6)`
            : `0 0 0 2px oklch(1 0 0 / 0.08)`,
        }}
      >
        {user.photoURL ? (
          <img
            src={user.photoURL}
            alt={user.displayName ?? "User avatar"}
            className="size-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div
            className="flex size-full items-center justify-center text-[13px] font-semibold"
            style={{
              background: "linear-gradient(135deg, oklch(0.74 0.16 158), oklch(0.62 0.16 158))",
              color: "oklch(0.15 0.01 240)",
            }}
          >
            {initials}
          </div>
        )}
      </button>

      {/* Popover */}
      {open && (
        <div
          className="absolute right-0 top-11 z-50 w-72 overflow-hidden rounded-2xl"
          role="menu"
          style={{
            background: "oklch(0.215 0.01 240)",
            border: "1px solid oklch(1 0 0 / 0.08)",
            boxShadow: "var(--shadow-elevated)",
          }}
        >
          {/* Profile section */}
          <div className="flex items-center gap-3.5 px-4 py-4">
            <div
              className="size-12 shrink-0 overflow-hidden rounded-full"
              style={{ boxShadow: "0 0 0 2px oklch(0.74 0.16 158 / 0.35)" }}
            >
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName ?? "Avatar"}
                  className="size-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div
                  className="flex size-full items-center justify-center text-lg font-semibold"
                  style={{
                    background: "linear-gradient(135deg, oklch(0.74 0.16 158), oklch(0.62 0.16 158))",
                    color: "oklch(0.15 0.01 240)",
                  }}
                >
                  {initials}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13.5px] font-semibold text-foreground">
                {user.displayName ?? "Habito User"}
              </p>
              <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
                {user.email}
              </p>
              <div className="mt-1.5">
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-wide"
                  style={{
                    background: "oklch(0.74 0.16 158 / 0.12)",
                    color: "oklch(0.74 0.16 158)",
                  }}
                >
                  <span
                    className="size-1.5 rounded-full"
                    style={{ background: "oklch(0.74 0.16 158)" }}
                  />
                  Synced
                </span>
              </div>
            </div>
          </div>

          <div style={{ height: 1, margin: "0 16px", background: "oklch(1 0 0 / 0.07)" }} />

          {/* Sign out */}
          <div className="p-2">
            <button
              onClick={() => { setOpen(false); onSignOut(); }}
              role="menuitem"
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[12.5px] font-medium transition-colors"
              style={{ color: "oklch(0.62 0.012 240)" }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.background = "oklch(0.65 0.21 28 / 0.08)";
                (e.currentTarget as HTMLButtonElement).style.color = "oklch(0.65 0.21 28)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                (e.currentTarget as HTMLButtonElement).style.color = "oklch(0.62 0.012 240)";
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-4">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
