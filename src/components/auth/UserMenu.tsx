/**
 * @file UserMenu.tsx
 * @description A compact user avatar button that opens a popover with the
 * user's profile (photo, name, email) and a Sign Out action.
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

  // Close on outside click
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
        className="group flex size-9 items-center justify-center overflow-hidden rounded-full ring-2 ring-transparent transition-all hover:ring-violet-500/50 focus-visible:outline-none focus-visible:ring-violet-500"
      >
        {user.photoURL ? (
          <img
            src={user.photoURL}
            alt={user.displayName ?? "User avatar"}
            className="size-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-gradient-to-br from-violet-500 to-indigo-600 text-[13px] font-semibold text-white">
            {initials}
          </div>
        )}
      </button>

      {/* Popover */}
      {open && (
        <div
          className="absolute right-0 top-11 z-50 w-72 overflow-hidden rounded-2xl border border-white/[0.08] bg-[oklch(0.18_0.01_240)] shadow-2xl ring-1 ring-black/20"
          role="menu"
        >
          {/* Profile section */}
          <div className="flex items-center gap-3.5 px-4 py-4">
            <div className="size-12 shrink-0 overflow-hidden rounded-full ring-2 ring-violet-500/30">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName ?? "Avatar"}
                  className="size-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="flex size-full items-center justify-center bg-gradient-to-br from-violet-500 to-indigo-600 text-lg font-semibold text-white">
                  {initials}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-semibold text-white">
                {user.displayName ?? "Habito User"}
              </p>
              <p className="mt-0.5 truncate text-[12px] text-white/40">
                {user.email}
              </p>
              <div className="mt-1.5 flex items-center gap-1">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                  <span className="size-1.5 rounded-full bg-emerald-400" />
                  Synced
                </span>
              </div>
            </div>
          </div>

          <div className="mx-4 h-px bg-white/[0.07]" />

          {/* Actions */}
          <div className="p-2">
            <button
              onClick={() => { setOpen(false); onSignOut(); }}
              role="menuitem"
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium text-white/60 transition-colors hover:bg-white/[0.05] hover:text-red-400"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-4"
              >
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
