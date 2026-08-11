/**
 * @file DesktopApp.tsx
 * @description Root desktop layout. Renders a fixed left nav rail with brand
 * mark, navigation items, a today-progress ring, and a "New habit" CTA. The
 * right side is a scrollable content area that hosts Today, Habits, Progress,
 * and To-Do panels behind tab switching.
 * @author Sathish Kumar
 */

import { ChartBar as BarChart3, CircleCheck as CheckCircle2, ClipboardList, Flame, LayoutGrid, Plus, TrendingUp } from "lucide-react";
import { fmtDate } from "@/lib/habits";
import type { AppProps } from "@/hooks/use-app-data";
import type { AppTab } from "@/types/app";
import type { User } from "firebase/auth";
import { UserMenu } from "@/components/auth/UserMenu";
import { QuickStat } from "@/components/ui/QuickStat";
import { DesktopToday } from "@/components/today/DesktopToday";
import { DesktopHabits } from "@/components/habits/DesktopHabits";
import { DesktopProgress } from "@/components/progress/DesktopProgress";
import { TodoList } from "@/components/todos/TodoList";

const NAV: { id: AppTab; icon: React.ReactNode; label: string }[] = [
  { id: "today", icon: <CheckCircle2 className="size-5" />, label: "Today" },
  { id: "habits", icon: <LayoutGrid className="size-5" />, label: "Habits" },
  { id: "progress", icon: <BarChart3 className="size-5" />, label: "Progress" },
  { id: "todos", icon: <ClipboardList className="size-5" />, label: "To-Do" },
];

type DesktopAppProps = AppProps & { user: User; onSignOut: () => void };

/**
 * Full desktop application shell (≥ lg breakpoint).
 * Hidden on smaller viewports — MobileApp handles those.
 */
export function DesktopApp(p: DesktopAppProps) {
  const { stats, tab, setTab, setAddOpen } = p;
  const todayPct = stats.active ? stats.doneToday / stats.active : 0;
  const r = 32,
    circ = 2 * Math.PI * r,
    dashOff = circ * (1 - todayPct);

  return (
    <div className="hidden h-screen overflow-hidden bg-background lg:flex">
      {/* ── Left nav rail ── */}
      <aside
        className="flex h-full w-60 shrink-0 flex-col border-r border-border xl:w-64"
        style={{ background: "oklch(0.158 0.008 240)" }}
      >
        {/* Brand */}
        <div className="flex items-center gap-3 px-5 pt-6 pb-5">
          <div className="grid size-9 shrink-0 place-items-center rounded-xl">
            <img src="/logo.png" alt="Habito" className="size-full object-cover" />
          </div>
          <div>
            <div className="font-display text-[17px] leading-none tracking-tight">Habito</div>
            <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
              daily · tracker
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 px-3 pt-1" aria-label="Main navigation">
          {NAV.map((n) => {
            const active = tab === n.id;
            return (
              <button
                key={n.id}
                onClick={() => setTab(n.id)}
                aria-current={active ? "page" : undefined}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all hover:bg-[oklch(1_0_0_/_0.04)]"
                style={{
                  background: active ? "oklch(1 0 0 / 0.06)" : undefined,
                  color: active ? "var(--color-foreground)" : "var(--color-muted-foreground)",
                }}
              >
                <span style={{ color: active ? "var(--color-primary)" : undefined }}>{n.icon}</span>
                {n.label}
                {n.id === "today" && stats.active > stats.doneToday && stats.active > 0 && (
                  <span
                    className="ml-auto flex size-5 items-center justify-center rounded-full text-[10px] font-bold text-white"
                    style={{ background: "var(--color-primary)" }}
                    aria-label={`${stats.active - stats.doneToday} habits remaining`}
                  >
                    {stats.active - stats.doneToday}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Progress ring + CTA */}
        <div className="px-4 pb-6 pt-4 space-y-3">
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
              Today
            </div>
            <div className="mt-3 flex items-center gap-3">
              <svg width="72" height="72" viewBox="0 0 72 72" className="shrink-0" aria-hidden>
                <circle
                  cx="36"
                  cy="36"
                  r={r}
                  fill="none"
                  strokeWidth="5"
                  stroke="oklch(1 0 0 / 0.06)"
                />
                <circle
                  cx="36"
                  cy="36"
                  r={r}
                  fill="none"
                  strokeWidth="5"
                  stroke="var(--color-primary)"
                  strokeDasharray={circ}
                  strokeDashoffset={dashOff}
                  strokeLinecap="round"
                  transform="rotate(-90 36 36)"
                  style={{ transition: "stroke-dashoffset 0.7s cubic-bezier(0.4,0,0.2,1)" }}
                />
              </svg>
              <div>
                <div className="font-display text-3xl leading-none text-foreground">
                  {stats.doneToday}
                  <span className="text-base text-muted-foreground">/{stats.active}</span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {stats.active === 0
                    ? "No active habits"
                    : stats.doneToday === stats.active
                      ? "All done! 🎉"
                      : `${stats.active - stats.doneToday} remaining`}
                </div>
              </div>
            </div>
          </div>
          <button
            onClick={() => setAddOpen(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-medium text-primary-foreground transition-all hover:brightness-110 active:scale-[0.98]"
            style={{ boxShadow: "var(--shadow-glow)" }}
          >
            <Plus className="size-4" /> New habit
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header
          className="flex shrink-0 items-center justify-between px-8 py-4 xl:px-10"
          style={{
            background: "oklch(0.155 0.008 240 / 0.8)",
            backdropFilter: "blur(12px)",
            borderBottom: "1px solid oklch(1 0 0 / 0.07)",
          }}
        >
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              {tab === "today"
                ? p.selectedDateKey === fmtDate(new Date())
                  ? new Date().toLocaleDateString("en", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    })
                  : p.selectedDate.toLocaleDateString("en", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    })
                : new Date().toLocaleDateString("en", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
            </div>
            <h1 className="mt-0.5 font-display text-2xl leading-none text-foreground xl:text-3xl">
              {
                {
                  today: "Today's Focus",
                  habits: "My Habits",
                  progress: "My Progress",
                  todos: "To-Do",
                }[tab]
              }
            </h1>
          </div>
          <div className="flex items-center gap-5">
            <div className="hidden items-center gap-6 xl:flex" aria-label="Summary stats">
              <QuickStat
                icon={<LayoutGrid className="size-3.5" />}
                label="Total"
                value={stats.total.toString()}
              />
              <QuickStat
                icon={<Flame className="size-3.5" />}
                label="Streak"
                value={`${stats.bestStreak}d`}
                accent
              />
              <QuickStat
                icon={<TrendingUp className="size-3.5" />}
                label="Avg"
                value={`${stats.avg}%`}
              />
            </div>
            <UserMenu user={p.user} onSignOut={p.onSignOut} />
          </div>
        </header>

        {/* Scrollable body */}
        <main className="flex-1 overflow-y-auto px-8 py-6 xl:px-10 xl:py-8">
          {tab === "today" && <DesktopToday {...p} />}
          {tab === "habits" && <DesktopHabits {...p} />}
          {tab === "progress" && <DesktopProgress {...p} />}
          {tab === "todos" && (
            <div className="mx-auto max-w-2xl space-y-5">
              <div>
                <h2 className="font-display text-2xl font-light tracking-tight text-foreground">
                  To-Do List
                </h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Organize tasks, track progress, and stay on top of your day.
                </p>
              </div>
              <TodoList todos={p.todos} categories={p.categories} />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
