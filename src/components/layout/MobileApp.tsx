/**
 * @file MobileApp.tsx
 * @description Root mobile/tablet layout (< lg breakpoint). Renders a sticky
 * top header, pull-to-refresh affordance, scrollable tab content, bottom nav
 * bar, and a floating action button on the Today tab.
 * @author Sathish Kumar
 */

import { BarChart3, CheckCircle2, ClipboardList, LayoutGrid, Plus } from "lucide-react";
import { fmtDate } from "@/lib/habits";
import type { AppProps } from "@/hooks/use-app-data";
import type { AppTab } from "@/types/app";
import type { User } from "firebase/auth";
import { UserMenu } from "@/components/auth/UserMenu";
import { MiniStat } from "@/components/ui/MiniStat";
import { DateStrip } from "@/components/today/DateStrip";
import { TodayHabitList } from "@/components/today/TodayHabitList";
import { MobileTodaySkeleton } from "@/components/today/MobileTodaySkeleton";
import { MobileHabits } from "@/components/habits/MobileHabits";
import { MobileProgress } from "@/components/progress/MobileProgress";
import { TodoList } from "@/components/todos/TodoList";

const BOTTOM_NAV: { id: AppTab; icon: React.ReactNode; label: string }[] = [
  { id: "today", icon: <CheckCircle2 className="size-5" />, label: "Today" },
  { id: "habits", icon: <LayoutGrid className="size-5" />, label: "Habits" },
  { id: "progress", icon: <BarChart3 className="size-5" />, label: "Progress" },
  { id: "todos", icon: <ClipboardList className="size-5" />, label: "To-Do" },
];

type MobileAppProps = AppProps & { user: User; onSignOut: () => void };

/**
 * Full mobile application shell (< lg breakpoint).
 * Hidden on desktop — DesktopApp handles those viewports.
 */
export function MobileApp(p: MobileAppProps) {
  const {
    tab,
    setTab,
    setAddOpen,
    stats,
    filter,
    setFilter,
    counts,
    filtered,
    todayHabits,
    rollup,
    toggleToday,
    saveNote,
    setOpenId,
    setEditId,
    handleDelete,
  } = p;

  const r = 38,
    circ = 2 * Math.PI * r;
  const todayPct = stats.active ? stats.doneToday / stats.active : 0;

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-background lg:hidden">
      {/* Header */}
      <header
        className="sticky top-0 z-30 flex shrink-0 items-center justify-between px-5 py-3"
        style={{
          paddingTop: "max(0.75rem, env(safe-area-inset-top))",
          background: "oklch(0.155 0.008 240 / 0.88)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          borderBottom: "1px solid oklch(1 0 0 / 0.07)",
        }}
      >
        <div className="flex items-center gap-2.5">
          <div className="grid size-9 place-items-center rounded-xl">
            <img src="/logo.png" alt="Habito" className="size-full object-cover" />
          </div>
          <div>
            <div className="font-display text-[17px] leading-none tracking-tight">Habito</div>
            <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
              {new Date().toLocaleDateString("en", {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {tab !== "today" && tab !== "todos" && (
            <button
              onClick={() => setAddOpen(true)}
              className="flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-xs font-medium text-primary-foreground transition-all active:scale-95"
            >
              <Plus className="size-3.5" /> New
            </button>
          )}
          <UserMenu user={p.user} onSignOut={p.onSignOut} />
        </div>
      </header>

      {/* Scrollable content */}
      <div
        className="flex-1 overflow-y-auto"
        style={{ paddingBottom: "calc(4.5rem + env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto w-full max-w-2xl px-4 sm:px-6">
          {/* TODAY */}
          {tab === "today" &&
            (p.habitsLoading ? (
              <MobileTodaySkeleton />
            ) : (
              <div className="space-y-4 pb-6 pt-4">
                {/* Date strip */}
                <div
                  className="rounded-2xl border border-border bg-card p-4"
                  style={{ boxShadow: "var(--shadow-soft)" }}
                >
                  <DateStrip
                    habits={p.habits}
                    selectedDate={p.selectedDate}
                    setSelectedDate={p.setSelectedDate}
                  />
                  <div className="mt-3 border-t border-[oklch(1_0_0_/_0.06)] pt-3">
                    <h1 className="font-display text-2xl leading-tight text-foreground">
                      {p.selectedDate >
                      (() => {
                        const d = new Date();
                        d.setHours(0, 0, 0, 0);
                        return d;
                      })()
                        ? p.statsForSelectedDate.active > 0
                          ? `${p.statsForSelectedDate.active} habit${p.statsForSelectedDate.active !== 1 ? "s" : ""} planned`
                          : "Nothing planned"
                        : p.statsForSelectedDate.done === p.statsForSelectedDate.active &&
                            p.statsForSelectedDate.active > 0
                          ? "All done! 🎉"
                          : p.statsForSelectedDate.active === 0
                            ? "No habits this day"
                            : `${p.statsForSelectedDate.active - p.statsForSelectedDate.done} left`}
                    </h1>
                    {p.statsForSelectedDate.active > 0 && (
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {p.statsForSelectedDate.done} of {p.statsForSelectedDate.active} completed
                      </p>
                    )}
                  </div>
                </div>

                {/* Ring */}
                <div
                  className="flex items-center gap-5 rounded-2xl border border-border bg-card p-4"
                  style={{ boxShadow: "var(--shadow-soft)" }}
                >
                  <div className="relative shrink-0" aria-hidden>
                    <svg width="96" height="96" viewBox="0 0 96 96">
                      <circle
                        cx="48"
                        cy="48"
                        r={r}
                        fill="none"
                        strokeWidth="6"
                        stroke="oklch(1 0 0 / 0.06)"
                      />
                      <circle
                        cx="48"
                        cy="48"
                        r={r}
                        fill="none"
                        strokeWidth="6"
                        stroke="var(--color-primary)"
                        strokeDasharray={circ}
                        strokeDashoffset={
                          circ *
                          (1 -
                            (p.statsForSelectedDate.active
                              ? p.statsForSelectedDate.done / p.statsForSelectedDate.active
                              : 0))
                        }
                        strokeLinecap="round"
                        transform="rotate(-90 48 48)"
                        style={{ transition: "stroke-dashoffset 0.7s cubic-bezier(0.4,0,0.2,1)" }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="font-display text-2xl leading-none text-foreground">
                        {p.statsForSelectedDate.done}
                      </span>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        /{p.statsForSelectedDate.active}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col gap-3">
                    <MiniStat label="Total habits" value={stats.total.toString()} />
                    <MiniStat label="Avg progress" value={`${stats.avg}%`} />
                    <MiniStat label="Best streak" value={`${stats.bestStreak}d`} highlight />
                  </div>
                </div>

                {/* Check-off */}
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="font-display text-xl text-foreground">
                      {p.selectedDateKey === fmtDate(new Date())
                        ? "Today's habits"
                        : `${p.selectedDate.toLocaleDateString("en", { weekday: "long" })}'s habits`}
                    </h2>
                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                      {todayHabits.length} {todayHabits.length === 1 ? "habit" : "habits"}
                    </span>
                  </div>
                  <TodayHabitList
                    habits={todayHabits}
                    dateKey={p.selectedDateKey}
                    onToggle={toggleToday}
                    onSaveNote={saveNote}
                    gridClass="grid gap-2"
                    emptySlot={
                      <div className="rounded-2xl border border-dashed border-border bg-card/40 px-6 py-10 text-center">
                        <p className="font-display text-lg text-foreground">No habits this day.</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Select today or a date with active habits.
                        </p>
                        {p.selectedDateKey === fmtDate(new Date()) && (
                          <button
                            onClick={() => setAddOpen(true)}
                            className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-all active:scale-95"
                          >
                            <Plus className="size-4" /> New habit
                          </button>
                        )}
                      </div>
                    }
                  />
                </div>

                {/* Weekly mini chart */}
                <div
                  className="rounded-2xl border border-border bg-card p-4"
                  style={{ boxShadow: "var(--shadow-soft)" }}
                >
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-display text-lg text-foreground">This week</h3>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {rollup.reduce((a, x) => a + x.done, 0)}/
                      {rollup.reduce((a, x) => a + x.total, 0)}
                    </span>
                  </div>
                  <div className="flex items-end gap-1.5">
                    {rollup.map((d, i) => {
                      const ratio = d.total ? d.done / d.total : 0;
                      const hh = Math.max(6, ratio * 64);
                      const isToday = i === rollup.length - 1;
                      const isSelDay = d.key === p.selectedDateKey;
                      return (
                        <div key={d.key} className="flex flex-1 flex-col items-center gap-1.5">
                          <div className="relative w-full" style={{ height: 64 }}>
                            <div
                              className="absolute inset-x-1 bottom-0 rounded-sm"
                              style={{
                                height: "100%",
                                background: isSelDay
                                  ? "oklch(1 0 0 / 0.07)"
                                  : "oklch(1 0 0 / 0.04)",
                              }}
                            />
                            <div
                              className="absolute inset-x-1 bottom-0 rounded-sm transition-all"
                              style={{
                                height: hh,
                                background:
                                  isSelDay || isToday
                                    ? "linear-gradient(180deg,var(--color-primary),oklch(0.62 0.16 158))"
                                    : "linear-gradient(180deg,oklch(1 0 0/.2),oklch(1 0 0/.07))",
                                opacity: isSelDay ? 1 : isToday ? 0.7 : 1,
                              }}
                            />
                          </div>
                          <div
                            className="font-mono text-[10px] uppercase"
                            style={{
                              color: isSelDay
                                ? "var(--color-primary)"
                                : "var(--color-muted-foreground)",
                              fontWeight: isSelDay ? 700 : 400,
                            }}
                          >
                            {d.label}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}

          {/* HABITS */}
          {tab === "habits" && (
            <MobileHabits
              filter={filter}
              setFilter={setFilter}
              counts={counts}
              filtered={filtered}
              toggleToday={toggleToday}
              setOpenId={setOpenId}
              setEditId={setEditId}
              handleDelete={handleDelete}
              habitSearch={p.habitSearch}
              setHabitSearch={p.setHabitSearch}
            />
          )}

          {/* PROGRESS */}
          {tab === "progress" && (
            <MobileProgress
              stats={p.stats}
              rollup={p.rollup}
              rollup30={p.rollup30}
              rollupMonthly={p.rollupMonthly}
              habits={p.habits}
              counts={p.counts}
              progressRange={p.progressRange}
              setProgressRange={p.setProgressRange}
              progressSort={p.progressSort}
              setProgressSort={p.setProgressSort}
              setOpenId={p.setOpenId}
              weekdayStats={p.weekdayStats}
              periodComparison={p.periodComparison}
              consistencyScore={p.consistencyScore}
              perHabitExtended={p.perHabitExtended}
              personalRecords={p.personalRecords}
            />
          )}

          {/* TO-DO */}
          {tab === "todos" && (
            <div className="space-y-2 pb-6 pt-4">
              <TodoList todos={p.todos} />
            </div>
          )}
        </div>
      </div>

      {/* Bottom nav */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 lg:hidden"
        aria-label="Bottom navigation"
        style={{
          paddingBottom: "env(safe-area-inset-bottom)",
          background: "oklch(0.165 0.008 240 / 0.92)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          borderTop: "1px solid oklch(1 0 0 / 0.08)",
        }}
      >
        <div className="mx-auto flex max-w-2xl items-stretch">
          {BOTTOM_NAV.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                aria-current={active ? "page" : undefined}
                className="relative flex flex-1 flex-col items-center justify-center gap-1 py-3 transition-all active:scale-95"
                style={{ color: active ? "var(--color-primary)" : "var(--color-muted-foreground)" }}
              >
                <div className="relative">
                  {t.icon}
                  {t.id === "today" && stats.active > stats.doneToday && stats.active > 0 && (
                    <span
                      className="absolute -right-1.5 -top-1.5 flex size-4 items-center justify-center rounded-full text-[9px] font-bold text-white"
                      style={{ background: "var(--color-primary)" }}
                      aria-label={`${stats.active - stats.doneToday} remaining`}
                    >
                      {stats.active - stats.doneToday}
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-medium tracking-wide">{t.label}</span>
                {active && (
                  <span
                    className="absolute bottom-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full"
                    style={{ background: "var(--color-primary)" }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* FAB */}
      {tab === "today" && (
        <button
          onClick={() => setAddOpen(true)}
          aria-label="Add new habit"
          className="fixed z-50 flex items-center justify-center rounded-full transition-all active:scale-90 lg:hidden"
          style={{
            right: "max(1.25rem, env(safe-area-inset-right))",
            bottom: "calc(4.75rem + env(safe-area-inset-bottom))",
            width: 56,
            height: 56,
            background: "var(--color-primary)",
            color: "var(--color-primary-foreground)",
            boxShadow: "var(--shadow-glow)",
          }}
        >
          <Plus className="size-6" />
        </button>
      )}
    </div>
  );
}
