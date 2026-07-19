/**
 * @file DesktopTodaySkeleton.tsx
 * @description Shimmer loading placeholder matching the DesktopToday two-column layout.
 * Rendered while the habits Firestore subscription is in flight.
 * @author Sathish Kumar
 */

import { Sk } from "@/components/ui/skeleton";

/**
 * Full-height skeleton for the Desktop Today view.
 * Mirrors the two-column grid: date strip + habit list on the left,
 * progress ring + weekly chart on the right.
 */
export function DesktopTodaySkeleton() {
  return (
    <div className="grid h-full gap-5 xl:grid-cols-[1fr_340px]">
      {/* Left */}
      <div className="flex flex-col gap-5">
        <div
          className="rounded-2xl border border-border bg-card p-5"
          style={{ boxShadow: "var(--shadow-soft)" }}
        >
          <div className="flex items-center justify-between mb-4">
            <Sk className="h-3 w-24" />
            <div className="flex gap-2">
              <Sk className="h-7 w-7 rounded-lg" />
              <Sk className="h-7 w-7 rounded-lg" />
            </div>
          </div>
          <div className="flex gap-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <Sk key={i} className="h-16 flex-1 rounded-2xl" />
            ))}
          </div>
          <div className="mt-4 border-t border-[oklch(1_0_0_/_0.06)] pt-4 space-y-2">
            <Sk className="h-3 w-16" />
            <Sk className="h-7 w-40" />
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-3">
          <div className="flex items-center justify-between">
            <Sk className="h-6 w-36" />
            <Sk className="h-3 w-16" />
          </div>
          <div className="grid gap-2.5 xl:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl border border-border bg-card p-4 flex items-center gap-4"
                style={{ boxShadow: "var(--shadow-soft)" }}
              >
                <Sk className="size-10 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Sk className="h-4 w-32" />
                  <Sk className="h-3 w-24" />
                </div>
                <Sk className="h-3 w-10" />
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Right */}
      <div className="flex flex-col gap-5">
        <div
          className="rounded-2xl border border-border bg-card p-6"
          style={{ boxShadow: "var(--shadow-soft)" }}
        >
          <Sk className="h-3 w-32 mb-5" />
          <div className="flex justify-center my-5">
            <Sk className="size-[140px] rounded-full" />
          </div>
          <div className="grid grid-cols-3 gap-2 border-t border-border pt-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <Sk className="h-6 w-10" />
                <Sk className="h-2 w-8" />
              </div>
            ))}
          </div>
        </div>
        <div
          className="flex-1 rounded-2xl border border-border bg-card p-5"
          style={{ boxShadow: "var(--shadow-soft)" }}
        >
          <div className="flex items-center justify-between mb-4">
            <Sk className="h-5 w-24" />
            <Sk className="h-3 w-12" />
          </div>
          <div className="flex items-end gap-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-2">
                <Sk
                  className="w-full rounded-sm"
                  style={{ height: `${30 + Math.sin(i) * 20 + 20}px` }}
                />
                <Sk className="h-2 w-4" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
