/**
 * @file MobileTodaySkeleton.tsx
 * @description Shimmer loading placeholder for the Mobile Today view.
 * Rendered while the habits Firestore subscription is in flight.
 * @author Sathish Kumar
 */

import { Sk } from "@/components/ui/skeleton";

/**
 * Single-column skeleton for the Mobile Today view.
 * Mirrors: date strip card → ring stats → habit cards.
 */
export function MobileTodaySkeleton() {
  return (
    <div className="space-y-4 pb-6 pt-4">
      <div
        className="rounded-2xl border border-border bg-card p-4"
        style={{ boxShadow: "var(--shadow-soft)" }}
      >
        <div className="flex items-center justify-between mb-3">
          <Sk className="h-3 w-20" />
          <div className="flex gap-2">
            <Sk className="h-6 w-6 rounded-lg" />
            <Sk className="h-6 w-6 rounded-lg" />
          </div>
        </div>
        <div className="flex gap-1.5">
          {Array.from({ length: 7 }).map((_, i) => (
            <Sk key={i} className="h-14 flex-1 rounded-xl" />
          ))}
        </div>
        <div className="mt-3 border-t border-[oklch(1_0_0_/_0.06)] pt-3 space-y-2">
          <Sk className="h-6 w-36" />
        </div>
      </div>
      <div
        className="flex items-center gap-5 rounded-2xl border border-border bg-card p-4"
        style={{ boxShadow: "var(--shadow-soft)" }}
      >
        <Sk className="size-24 rounded-full shrink-0" />
        <div className="flex-1 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex justify-between">
              <Sk className="h-3 w-20" />
              <Sk className="h-4 w-10" />
            </div>
          ))}
        </div>
      </div>
      <div>
        <div className="mb-3 flex items-center justify-between">
          <Sk className="h-6 w-36" />
          <Sk className="h-3 w-16" />
        </div>
        <div className="grid gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-border bg-card p-4 flex items-center gap-3"
              style={{ boxShadow: "var(--shadow-soft)" }}
            >
              <Sk className="size-9 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Sk className="h-4 w-28" />
                <Sk className="h-3 w-20" />
              </div>
              <Sk className="h-3 w-8" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
