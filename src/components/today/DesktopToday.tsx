/**
 * @file DesktopToday.tsx
 * @description Desktop "Today's Focus" panel. Two-column layout: date strip +
 * habit check-off list on the left, progress ring + weekly bar chart on the right.
 * @author Sathish Kumar
 */

import { Calendar, Plus } from "lucide-react";
import { fmtDate } from "@/lib/habits";
import type { AppProps } from "@/hooks/use-app-data";
import { DateStrip } from "./DateStrip";
import { TodayHabitList } from "./TodayHabitList";
import { DesktopTodaySkeleton } from "./DesktopTodaySkeleton";

/**
 * Renders the full Desktop Today view including:
 * - Weekly DateStrip with per-day completion indicators
 * - Contextual heading (habits left / all done / nothing planned)
 * - TodayHabitList sorted incomplete-first
 * - SVG progress ring for the selected date
 * - Clickable weekly bar chart that drives date selection
 */
export function DesktopToday({
  stats,
  habits,
  todayHabits,
  rollup,
  toggleToday,
  saveNote,
  setAddOpen,
  selectedDate,
  setSelectedDate,
  selectedDateKey,
  statsForSelectedDate,
  habitsLoading,
}: AppProps) {
  if (habitsLoading) return <DesktopTodaySkeleton />;

  const selPct = statsForSelectedDate.active
    ? statsForSelectedDate.done / statsForSelectedDate.active
    : 0;
  const r = 52, circ = 2 * Math.PI * r, dashOff = circ * (1 - selPct);

  const isSelectedToday = selectedDateKey === fmtDate(new Date());
  const isFuture = selectedDate > (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; })();

  const dateLabel = isSelectedToday
    ? "Today"
    : selectedDate.toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric" });

  const headingText = isFuture
    ? statsForSelectedDate.active > 0
      ? `${statsForSelectedDate.active} habit${statsForSelectedDate.active !== 1 ? "s" : ""} planned`
      : "Nothing planned yet"
    : statsForSelectedDate.done === statsForSelectedDate.active && statsForSelectedDate.active > 0
      ? "All done! 🎉"
      : statsForSelectedDate.active === 0
        ? "No habits this day"
        : `${statsForSelectedDate.active - statsForSelectedDate.done} left`;

  return (
    <div className="grid h-full gap-5 xl:grid-cols-[1fr_340px]">
      {/* Left — date strip + check-off list */}
      <div className="flex flex-col gap-5">
        <div className="rounded-2xl border border-border bg-card p-5" style={{ boxShadow: "var(--shadow-soft)" }}>
          <DateStrip habits={habits} selectedDate={selectedDate} setSelectedDate={setSelectedDate} />
          <div className="mt-4 border-t border-[oklch(1_0_0_/_0.06)] pt-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{dateLabel}</div>
            <h2 className="mt-1 font-display text-2xl text-foreground xl:text-3xl">{headingText}</h2>
            {statsForSelectedDate.active > 0 && (
              <p className="mt-1 text-sm text-muted-foreground">
                {statsForSelectedDate.done} of {statsForSelectedDate.active} completed
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-xl text-foreground">
              {isSelectedToday ? "Today's habits" : `${selectedDate.toLocaleDateString("en", { weekday: "long" })}'s habits`}
            </h3>
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              {todayHabits.length} {todayHabits.length === 1 ? "habit" : "habits"}
            </span>
          </div>
          <TodayHabitList
            habits={todayHabits}
            dateKey={selectedDateKey}
            onToggle={toggleToday}
            onSaveNote={saveNote}
            gridClass="grid gap-2.5 xl:grid-cols-2"
            emptySlot={
              <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/40 py-16 text-center">
                <p className="font-display text-xl text-foreground">
                  {isFuture ? "No habits planned for this day." : "No habits tracked this day."}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {isFuture ? "Create a habit that includes this date." : "Habits are tracked from their start date."}
                </p>
                {isSelectedToday && (
                  <button
                    onClick={() => setAddOpen(true)}
                    className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:brightness-110 active:scale-95"
                  >
                    <Plus className="size-4" /> New habit
                  </button>
                )}
              </div>
            }
          />
        </div>
      </div>

      {/* Right — ring + weekly chart */}
      <div className="flex flex-col gap-5">
        {/* Progress ring */}
        <div className="rounded-2xl border border-border bg-card p-6" style={{ boxShadow: "var(--shadow-soft)" }}>
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            {isSelectedToday ? "Today's progress" : "Day's progress"}
          </div>
          <div className="my-5 flex justify-center">
            <div className="relative">
              <svg width="140" height="140" viewBox="0 0 140 140">
                <circle cx="70" cy="70" r={r} fill="none" strokeWidth="8" stroke="oklch(1 0 0 / 0.06)" />
                <circle
                  cx="70" cy="70" r={r} fill="none" strokeWidth="8"
                  stroke="var(--color-primary)"
                  strokeDasharray={circ} strokeDashoffset={dashOff}
                  strokeLinecap="round" transform="rotate(-90 70 70)"
                  style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-display text-4xl leading-none text-foreground">{statsForSelectedDate.done}</span>
                <span className="font-mono text-sm text-muted-foreground">/{statsForSelectedDate.active}</span>
                <span className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">done</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 border-t border-border pt-4">
            {[
              { label: "Total", value: stats.total.toString() },
              { label: "Avg", value: `${stats.avg}%` },
              { label: "Streak", value: `${stats.bestStreak}d`, accent: true },
            ].map((k) => (
              <div key={k.label} className="text-center">
                <div className="font-display text-xl leading-none" style={k.accent ? { color: "var(--color-primary)" } : undefined}>{k.value}</div>
                <div className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">{k.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Weekly chart */}
        <div className="flex-1 rounded-2xl border border-border bg-card p-5" style={{ boxShadow: "var(--shadow-soft)" }}>
          <div className="mb-4 flex items-center justify-between">
            <div className="font-display text-lg text-foreground">This week</div>
            <div className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
              <Calendar className="size-3.5" />
              {rollup.reduce((a, x) => a + x.done, 0)}/{rollup.reduce((a, x) => a + x.total, 0)}
            </div>
          </div>
          <div className="flex items-end gap-2">
            {rollup.map((d, i) => {
              const ratio = d.total ? d.done / d.total : 0;
              const h = Math.max(6, ratio * 100);
              const isToday = i === rollup.length - 1;
              const isSelDay = d.key === selectedDateKey;
              return (
                <button
                  key={d.key}
                  onClick={() => {
                    const dt = new Date(d.key.split("-").map(Number).reduce((acc: Date, n: number, i: number) => {
                      if (i === 0) return new Date(n, 0, 1);
                      if (i === 1) { acc.setMonth(n - 1); return acc; }
                      acc.setDate(n); return acc;
                    }, new Date()));
                    setSelectedDate(dt);
                  }}
                  aria-label={`Select ${d.key}`}
                  className="flex flex-1 flex-col items-center gap-1.5 transition-all active:scale-95"
                >
                  <div className="font-mono text-[9px] tabular-nums text-muted-foreground">{d.done}</div>
                  <div className="relative w-full" style={{ height: 100 }}>
                    <div className="absolute inset-x-1 bottom-0 rounded-md" style={{ height: "100%", background: isSelDay ? "oklch(1 0 0 / 0.07)" : "oklch(1 0 0 / 0.04)" }} />
                    <div
                      className="absolute inset-x-1 bottom-0 rounded-md transition-all duration-500"
                      style={{
                        height: h,
                        background: isSelDay || isToday
                          ? "linear-gradient(180deg,var(--color-primary),oklch(0.62 0.16 158))"
                          : "linear-gradient(180deg,oklch(1 0 0/.2),oklch(1 0 0/.07))",
                        opacity: isSelDay ? 1 : isToday ? 0.7 : 1,
                      }}
                    />
                    {isSelDay && (
                      <div className="absolute inset-x-0 bottom-0 -mb-1 flex justify-center">
                        <div className="h-0.5 w-3 rounded-full" style={{ background: "var(--color-primary)" }} />
                      </div>
                    )}
                  </div>
                  <div
                    className="font-mono text-[10px] uppercase"
                    style={{ color: isSelDay ? "var(--color-primary)" : "var(--color-muted-foreground)", fontWeight: isSelDay ? 700 : 400 }}
                  >
                    {d.label}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
