/**
 * @file DateStrip.tsx
 * @description Horizontally scrollable weekly date selector with per-day completion
 * indicators. Supports week-by-week navigation and jumps back to today.
 * @author Sathish Kumar
 */

import { useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Habit } from "@/lib/habits";
import { fmtDate } from "@/lib/habits";

const DAY_NAMES = ["S", "M", "T", "W", "T", "F", "S"] as const;

interface DateStripProps {
  habits: Habit[];
  selectedDate: Date;
  setSelectedDate: (d: Date) => void;
}

/**
 * A week-by-week date picker strip. Each day pill shows a mini completion bar
 * derived from the habits tracked on that date.
 */
export function DateStrip({ habits, selectedDate, setSelectedDate }: DateStripProps) {
  const [weekOffset, setWeekOffset] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const todayDate = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const days = useMemo(() => {
    const weekStart = new Date(todayDate);
    weekStart.setDate(todayDate.getDate() - todayDate.getDay() + weekOffset * 7);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      const key = fmtDate(d);
      let done = 0,
        total = 0;
      habits.forEach((h) => {
        const e = h.track[key];
        if (e) {
          total++;
          if (e.done) done++;
        }
      });
      return {
        date: d,
        key,
        done,
        total,
        isToday: d.getTime() === todayDate.getTime(),
        isFuture: d > todayDate,
        isSelected: fmtDate(d) === fmtDate(selectedDate),
      };
    });
  }, [habits, todayDate, weekOffset, selectedDate]);

  const weekLabel = useMemo(() => {
    const first = days[0].date;
    const last = days[6].date;
    if (first.getMonth() === last.getMonth()) {
      return first.toLocaleDateString("en", { month: "long", year: "numeric" });
    }
    return `${first.toLocaleDateString("en", { month: "short" })} – ${last.toLocaleDateString("en", { month: "short", year: "numeric" })}`;
  }, [days]);

  return (
    <div className="select-none">
      {/* Month label + nav */}
      <div className="mb-3 flex items-center justify-between">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          {weekLabel}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setWeekOffset((w) => w - 1)}
            className="flex size-6 items-center justify-center rounded-lg transition-all hover:bg-[oklch(1_0_0_/_0.07)] active:scale-90"
            style={{ color: "var(--color-muted-foreground)" }}
            aria-label="Previous week"
          >
            <ChevronLeft className="size-3.5" />
          </button>
          {weekOffset !== 0 && (
            <button
              onClick={() => {
                setWeekOffset(0);
                const d = new Date();
                d.setHours(0, 0, 0, 0);
                setSelectedDate(d);
              }}
              className="rounded-md px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.15em] transition-all hover:bg-[oklch(1_0_0_/_0.07)]"
              style={{ color: "var(--color-primary)" }}
            >
              Today
            </button>
          )}
          <button
            onClick={() => setWeekOffset((w) => w + 1)}
            className="flex size-6 items-center justify-center rounded-lg transition-all hover:bg-[oklch(1_0_0_/_0.07)] active:scale-90"
            style={{ color: "var(--color-muted-foreground)" }}
            aria-label="Next week"
          >
            <ChevronRight className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Date pills */}
      <div ref={scrollRef} className="no-scrollbar flex gap-1.5 overflow-x-auto pb-1">
        {days.map((d, idx) => {
          const completionPct = d.total > 0 ? d.done / d.total : 0;
          const allDone = d.total > 0 && d.done === d.total;
          return (
            <button
              key={d.key}
              disabled={d.isFuture}
              onClick={() => setSelectedDate(d.date)}
              aria-label={d.date.toLocaleDateString("en", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
              aria-pressed={d.isSelected}
              className="flex flex-1 min-w-[40px] flex-col items-center gap-1 rounded-2xl py-2.5 px-1 transition-all active:scale-95"
              style={{
                background: d.isSelected
                  ? "var(--color-primary)"
                  : d.isToday
                    ? "oklch(1 0 0 / 0.06)"
                    : "oklch(1 0 0 / 0.03)",
                opacity: d.isFuture && !d.isSelected ? 0.55 : 1,
                boxShadow: d.isSelected ? "0 4px 16px oklch(0.62 0.2 158 / 0.35)" : undefined,
              }}
            >
              <span
                className="font-mono text-[9px] uppercase tracking-[0.1em]"
                style={{
                  color: d.isSelected ? "oklch(1 0 0 / 0.75)" : "var(--color-muted-foreground)",
                }}
              >
                {DAY_NAMES[idx]}
              </span>
              <span
                className="font-display text-lg leading-none"
                style={{
                  color: d.isSelected
                    ? "white"
                    : d.isToday
                      ? "var(--color-primary)"
                      : "var(--color-foreground)",
                  fontWeight: d.isToday || d.isSelected ? 700 : 500,
                }}
              >
                {d.date.getDate()}
              </span>
              {d.total > 0 ? (
                <div
                  className="relative h-1 w-5 overflow-hidden rounded-full"
                  style={{
                    background: d.isSelected ? "oklch(1 0 0 / 0.25)" : "oklch(1 0 0 / 0.08)",
                  }}
                >
                  <div
                    className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                    style={{
                      width: `${completionPct * 100}%`,
                      background: d.isSelected
                        ? "white"
                        : allDone
                          ? "var(--color-primary)"
                          : "oklch(0.75 0.15 158 / 0.8)",
                    }}
                  />
                </div>
              ) : (
                <div
                  className="h-1 w-1.5 rounded-full"
                  style={{
                    background:
                      d.isToday && !d.isSelected ? "var(--color-primary)" : "oklch(1 0 0 / 0.12)",
                  }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
