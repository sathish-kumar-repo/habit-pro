import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  LayoutGrid,
  Flame,
  TrendingUp,
  Calendar,
  Plus,
  CheckCircle2,
  Circle,
  BarChart3,
  RefreshCw,
} from "lucide-react";
import {
  Habit,
  classify,
  subscribeHabits,
  deleteHabit as deleteHabitFs,
  toggleHabitDay,
  today,
  progress,
  streak,
  fmtDate,
} from "@/lib/habits";
import { HabitCard } from "@/components/habits/HabitCard";
import { AddHabitDialog } from "@/components/habits/AddHabitDialog";
import { HabitDetailDialog } from "@/components/habits/HabitDetailDialog";
import { EditHabitDialog } from "@/components/habits/EditHabitDialog";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Habito — Daily Habit Tracker" },
      {
        name: "description",
        content: "A focused workspace for building, tracking, and analyzing daily habits.",
      },
    ],
  }),
  component: Index,
});

const FILTERS = [
  { id: "ongoing", label: "In motion" },
  { id: "upcoming", label: "Upcoming" },
  { id: "pending", label: "Lapsed" },
  { id: "finished", label: "Completed" },
] as const;
type FilterId = (typeof FILTERS)[number]["id"];

type MobileTab = "today" | "habits" | "progress";

function Index() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [filter, setFilter] = useState<FilterId>("ongoing");
  const [openId, setOpenId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<MobileTab>("today");

  // Pull-to-refresh state
  const [pullY, setPullY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const pullStartY = useRef(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const PULL_THRESHOLD = 72;

  useEffect(() => {
    const unsub = subscribeHabits(setHabits);
    return () => unsub();
  }, []);

  const counts = useMemo(() => {
    const c: Record<FilterId, number> = { ongoing: 0, upcoming: 0, finished: 0, pending: 0 };
    habits.forEach((h) => {
      c[classify(h)]++;
    });
    return c;
  }, [habits]);

  const filtered = useMemo(() => {
    const t = today();
    const list = habits.filter((h) => classify(h) === filter);
    return list.sort((a, b) => {
      const ad = a.track[t]?.done ? 1 : 0;
      const bd = b.track[t]?.done ? 1 : 0;
      if (ad !== bd) return ad - bd;
      return b.createdAt - a.createdAt;
    });
  }, [habits, filter]);

  const stats = useMemo(() => {
    const t = today();
    const active = habits.filter((h) => classify(h) === "ongoing");
    const doneToday = active.filter((h) => h.track[t]?.done).length;
    const avg =
      habits.length === 0
        ? 0
        : Math.round((habits.reduce((acc, h) => acc + progress(h).pct, 0) / habits.length) * 100);
    const bestStreak = habits.reduce((m, h) => Math.max(m, streak(h)), 0);
    return { total: habits.length, active: active.length, doneToday, avg, bestStreak };
  }, [habits]);

  const rollup = useMemo(() => {
    const out: { key: string; label: string; done: number; total: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
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
      out.push({ key, label: d.toLocaleDateString("en", { weekday: "short" })[0], done, total });
    }
    return out;
  }, [habits]);

  const handleDelete = (id: string) => void deleteHabitFs(id);
  const toggleToday = (id: string) => {
    const habit = habits.find((h) => h.id === id);
    if (habit) void toggleHabitDay(habit, today());
  };
  const toggleDay = (id: string, day: string) => {
    const habit = habits.find((h) => h.id === id);
    if (habit) void toggleHabitDay(habit, day);
  };
  const openHabit = habits.find((h) => h.id === openId) ?? null;
  const editHabit = habits.find((h) => h.id === editId) ?? null;

  // Pull to refresh handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    const el = contentRef.current;
    if (!el || el.scrollTop > 0) return;
    pullStartY.current = e.touches[0].clientY;
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (refreshing) return;
    const el = contentRef.current;
    if (!el || el.scrollTop > 0) return;
    const dy = e.touches[0].clientY - pullStartY.current;
    if (dy > 0) setPullY(Math.min(dy * 0.5, PULL_THRESHOLD + 20));
  };
  const handleTouchEnd = () => {
    if (pullY >= PULL_THRESHOLD) {
      setRefreshing(true);
      setTimeout(() => {
        setRefreshing(false);
        setPullY(0);
      }, 1200);
    } else {
      setPullY(0);
    }
  };

  const todayHabits = useMemo(() => {
    const t = today();
    return habits
      .filter((h) => classify(h) === "ongoing")
      .sort((a, b) => {
        const ad = a.track[t]?.done ? 1 : 0;
        const bd = b.track[t]?.done ? 1 : 0;
        if (ad !== bd) return ad - bd;
        return b.createdAt - a.createdAt;
      });
  }, [habits]);

  const todayPct = stats.active ? stats.doneToday / stats.active : 0;
  const r = 38;
  const circ = 2 * Math.PI * r;
  const dashOffset = circ * (1 - todayPct);

  return (
    <div className="flex min-h-screen bg-background">
      {/* ──────────── DESKTOP SIDEBAR ──────────── */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-[oklch(0.165_0.008_240)] px-5 py-7 lg:flex">
        <div className="flex items-center gap-2.5">
          <div className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <span className="font-display text-lg">H</span>
          </div>
          <div>
            <div className="font-display text-lg leading-none">Habito</div>
            <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
              daily · tracker
            </div>
          </div>
        </div>
        <nav className="mt-10 space-y-1">
          <div className="flex items-center gap-3 rounded-md bg-[oklch(1_0_0_/_0.05)] px-3 py-2 text-sm">
            <LayoutGrid className="size-4" />
            Overview
          </div>
        </nav>
        <div className="mt-8">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Filter
          </div>
          <div className="mt-2 space-y-0.5">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className="group flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors"
                style={
                  filter === f.id
                    ? { background: "oklch(1 0 0 / 0.05)", color: "var(--color-foreground)" }
                    : { color: "var(--color-muted-foreground)" }
                }
              >
                <span className="flex items-center gap-2">
                  <span
                    className="size-1 rounded-full"
                    style={{ background: filter === f.id ? "var(--color-primary)" : "transparent" }}
                  />
                  {f.label}
                </span>
                <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                  {counts[f.id]}
                </span>
              </button>
            ))}
          </div>
        </div>
        <div className="mt-auto">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Today
            </div>
            <div className="mt-1 font-display text-3xl text-foreground">
              {stats.doneToday}
              <span className="text-muted-foreground">/{stats.active}</span>
            </div>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${stats.active ? (stats.doneToday / stats.active) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>
      </aside>

      {/* ──────────── DESKTOP MAIN ──────────── */}
      <main className="hidden flex-1 px-6 py-8 sm:px-10 sm:py-12 lg:block">
        <header className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              {new Date().toLocaleDateString("en", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </div>
            <h1 className="mt-2 max-w-2xl font-display text-5xl leading-[0.95] text-foreground sm:text-6xl">
              The discipline of <em className="text-primary">small, daily</em> commitments.
            </h1>
          </div>
          <AddHabitDialog open={addOpen} onOpenChange={setAddOpen} />
        </header>
        <section className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border md:grid-cols-4">
          <Kpi label="Habits tracked" value={stats.total.toString()} hint="active workspace" />
          <Kpi label="In motion" value={stats.active.toString()} hint="currently running" accent />
          <Kpi
            label="Avg progress"
            value={`${stats.avg}%`}
            hint="across all habits"
            icon={<TrendingUp className="size-3.5" />}
          />
          <Kpi
            label="Best streak"
            value={`${stats.bestStreak}d`}
            hint="longest active"
            icon={<Flame className="size-3.5" />}
          />
        </section>
        <section className="mt-6 rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Last 7 days
              </div>
              <h2 className="mt-1 font-display text-2xl">Weekly rhythm</h2>
            </div>
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              <Calendar className="size-3.5" />
              {rollup.reduce((a, x) => a + x.done, 0)} / {rollup.reduce((a, x) => a + x.total, 0)}{" "}
              completions
            </div>
          </div>
          <div className="mt-6 flex items-end gap-2 sm:gap-4">
            {rollup.map((d, i) => {
              const ratio = d.total ? d.done / d.total : 0;
              const h = Math.max(8, ratio * 120);
              const isToday = i === rollup.length - 1;
              return (
                <div key={d.key} className="flex flex-1 flex-col items-center gap-2">
                  <div className="relative w-full" style={{ height: 120 }}>
                    <div
                      className="absolute inset-x-2 bottom-0 rounded-md bg-[oklch(1_0_0_/_0.04)]"
                      style={{ height: "100%" }}
                    />
                    <div
                      className="absolute inset-x-2 bottom-0 rounded-md transition-all"
                      style={{
                        height: h,
                        background: isToday
                          ? "linear-gradient(180deg, var(--color-primary), oklch(0.62 0.16 158))"
                          : "linear-gradient(180deg, oklch(1 0 0 / 0.18), oklch(1 0 0 / 0.06))",
                      }}
                    />
                  </div>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    {d.label}
                  </div>
                  <div className="font-mono text-[10px] tabular-nums text-foreground">
                    {d.done}/{d.total}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
        <nav className="mt-8 flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className="rounded-full border px-4 py-1.5 text-xs font-medium transition-all"
              style={
                filter === f.id
                  ? {
                      background: "var(--color-primary)",
                      color: "var(--color-primary-foreground)",
                      borderColor: "var(--color-primary)",
                    }
                  : { borderColor: "oklch(1 0 0 / 0.08)", color: "var(--color-muted-foreground)" }
              }
            >
              {f.label} <span className="opacity-60">{counts[f.id]}</span>
            </button>
          ))}
        </nav>
        <div className="mt-10 flex items-baseline justify-between">
          <div>
            <h2 className="font-display text-3xl text-foreground">
              {FILTERS.find((f) => f.id === filter)?.label}
            </h2>
            <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              {filtered.length} {filtered.length === 1 ? "habit" : "habits"}
            </div>
          </div>
        </div>
        <section className="mt-5">
          {filtered.length === 0 ? (
            <EmptyState filter={filter} />
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {filtered.map((h) => (
                <HabitCard
                  key={h.id}
                  habit={h}
                  onToggleToday={toggleToday}
                  onOpen={setOpenId}
                  onEdit={setEditId}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </section>
        <footer className="mt-16 border-t border-border pt-6 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Habito · daily habit tracker · {new Date().getFullYear()}
        </footer>
      </main>

      {/* ──────────── MOBILE FULL APP ──────────── */}
      <div className="flex w-full flex-col lg:hidden">
        {/* Mobile sticky header */}
        <header
          className="mobile-header sticky top-0 z-30 flex items-center justify-between px-5 py-4"
          style={{
            paddingTop: "max(1rem, env(safe-area-inset-top))",
            background: "oklch(0.155 0.008 240 / 0.85)",
            backdropFilter: "blur(20px) saturate(180%)",
            WebkitBackdropFilter: "blur(20px) saturate(180%)",
            borderBottom: "1px solid oklch(1 0 0 / 0.06)",
          }}
        >
          <div className="flex items-center gap-2.5">
            <div className="grid size-8 place-items-center rounded-[10px] bg-primary text-primary-foreground">
              <span className="font-display text-base leading-none">H</span>
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
            {mobileTab !== "today" && (
              <button
                onClick={() => setAddOpen(true)}
                className="flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-xs font-medium text-primary-foreground transition-all active:scale-95"
              >
                <Plus className="size-3.5" />
                New
              </button>
            )}
          </div>
        </header>

        {/* Pull to refresh indicator */}
        <div
          className="flex items-center justify-center overflow-hidden transition-all duration-200"
          style={{ height: pullY > 0 ? `${pullY}px` : refreshing ? "48px" : "0px" }}
        >
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <RefreshCw
              className={`size-3.5 ${refreshing ? "animate-spin" : ""}`}
              style={{ color: "var(--color-primary)" }}
            />
            {refreshing
              ? "Syncing..."
              : pullY >= PULL_THRESHOLD
                ? "Release to refresh"
                : "Pull to refresh"}
          </div>
        </div>

        {/* Scrollable content */}
        <div
          ref={contentRef}
          className="flex-1 overflow-y-auto"
          style={{ paddingBottom: "calc(5rem + env(safe-area-inset-bottom))" }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* ── TODAY TAB ── */}
          {mobileTab === "today" && (
            <div className="px-4 pt-2 pb-4">
              {/* Hero greeting */}
              <div className="mb-5 mt-2">
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  {new Date().toLocaleDateString("en", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                </div>
                <h1 className="mt-1 font-display text-3xl leading-tight text-foreground">
                  {stats.doneToday === stats.active && stats.active > 0
                    ? "All done today! 🎉"
                    : `${stats.active - stats.doneToday} habit${stats.active - stats.doneToday !== 1 ? "s" : ""} left today`}
                </h1>
              </div>

              {/* Today progress ring + stats */}
              <div
                className="mb-4 flex items-center gap-4 rounded-2xl border border-border bg-card p-4"
                style={{ boxShadow: "var(--shadow-soft)" }}
              >
                <div className="relative shrink-0">
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
                      strokeDashoffset={dashOffset}
                      strokeLinecap="round"
                      transform="rotate(-90 48 48)"
                      style={{ transition: "stroke-dashoffset 0.6s cubic-bezier(0.4,0,0.2,1)" }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="font-display text-2xl leading-none text-foreground">
                      {stats.doneToday}
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      /{stats.active}
                    </span>
                  </div>
                </div>
                <div className="flex flex-1 flex-col gap-3">
                  <MiniStat label="Total habits" value={stats.total.toString()} />
                  <MiniStat label="Avg progress" value={`${stats.avg}%`} />
                  <MiniStat label="Best streak" value={`${stats.bestStreak}d`} highlight />
                </div>
              </div>

              {/* Today's quick check-off list */}
              <div className="mb-4">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-display text-xl text-foreground">Today's habits</h2>
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    {todayHabits.length} active
                  </span>
                </div>
                {todayHabits.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border bg-card/40 px-6 py-10 text-center">
                    <p className="font-display text-lg text-foreground">No active habits yet.</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Start one to begin tracking.
                    </p>
                    <button
                      onClick={() => setAddOpen(true)}
                      className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-all active:scale-95"
                    >
                      <Plus className="size-4" /> New habit
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {todayHabits.map((h) => {
                      const t = today();
                      const done = h.track[t]?.done ?? false;
                      const inRange = h.track[t] !== undefined;
                      const { pct } = progress(h);
                      return (
                        <button
                          key={h.id}
                          onClick={() => inRange && toggleToday(h.id)}
                          disabled={!inRange}
                          className="flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition-all active:scale-[0.98] disabled:opacity-50"
                          style={{
                            borderColor: done ? `${h.color}40` : "oklch(1 0 0 / 0.07)",
                            background: done ? `${h.color}12` : "var(--color-card)",
                            boxShadow: "var(--shadow-soft)",
                          }}
                        >
                          <div
                            className="shrink-0"
                            style={{ color: done ? h.color : "var(--color-muted-foreground)" }}
                          >
                            {done ? (
                              <CheckCircle2 className="size-6" style={{ color: h.color }} />
                            ) : (
                              <Circle className="size-6" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div
                              className="truncate font-medium text-foreground"
                              style={{
                                textDecoration: done ? "line-through" : "none",
                                opacity: done ? 0.6 : 1,
                              }}
                            >
                              {h.name}
                            </div>
                            {h.description && (
                              <div className="mt-0.5 truncate text-xs text-muted-foreground">
                                {h.description}
                              </div>
                            )}
                          </div>
                          <div className="shrink-0 text-right">
                            <div
                              className="font-mono text-xs tabular-nums"
                              style={{ color: h.color }}
                            >
                              {Math.round(pct * 100)}%
                            </div>
                            <div className="mt-0.5 h-1 w-12 overflow-hidden rounded-full bg-[oklch(1_0_0_/_0.08)]">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{ width: `${pct * 100}%`, background: h.color }}
                              />
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Weekly rhythm mini chart */}
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
                    const h = Math.max(6, ratio * 64);
                    const isToday = i === rollup.length - 1;
                    return (
                      <div key={d.key} className="flex flex-1 flex-col items-center gap-1.5">
                        <div className="relative w-full" style={{ height: 64 }}>
                          <div
                            className="absolute inset-x-1 bottom-0 rounded-sm bg-[oklch(1_0_0_/_0.04)]"
                            style={{ height: "100%" }}
                          />
                          <div
                            className="absolute inset-x-1 bottom-0 rounded-sm transition-all"
                            style={{
                              height: h,
                              background: isToday
                                ? "linear-gradient(180deg, var(--color-primary), oklch(0.62 0.16 158))"
                                : "linear-gradient(180deg, oklch(1 0 0 / 0.2), oklch(1 0 0 / 0.07))",
                            }}
                          />
                        </div>
                        <div className="font-mono text-[9px] uppercase text-muted-foreground">
                          {d.label}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── HABITS TAB ── */}
          {mobileTab === "habits" && (
            <div className="px-4 pt-3 pb-4">
              {/* Filter pills */}
              <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto pb-1">
                {FILTERS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFilter(f.id)}
                    className="shrink-0 rounded-full border px-4 py-2 text-xs font-medium transition-all active:scale-95"
                    style={
                      filter === f.id
                        ? {
                            background: "var(--color-primary)",
                            color: "var(--color-primary-foreground)",
                            borderColor: "var(--color-primary)",
                          }
                        : {
                            borderColor: "oklch(1 0 0 / 0.08)",
                            color: "var(--color-muted-foreground)",
                            background: "var(--color-card)",
                          }
                    }
                  >
                    {f.label} <span className="ml-1 opacity-60">{counts[f.id]}</span>
                  </button>
                ))}
              </div>

              <div className="mb-3">
                <h2 className="font-display text-2xl text-foreground">
                  {FILTERS.find((f) => f.id === filter)?.label}
                </h2>
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  {filtered.length} {filtered.length === 1 ? "habit" : "habits"}
                </div>
              </div>

              {filtered.length === 0 ? (
                <EmptyState filter={filter} />
              ) : (
                <div className="space-y-3">
                  {filtered.map((h) => (
                    <HabitCard
                      key={h.id}
                      habit={h}
                      onToggleToday={toggleToday}
                      onOpen={setOpenId}
                      onEdit={setEditId}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── PROGRESS TAB ── */}
          {mobileTab === "progress" && (
            <div className="px-4 pt-3 pb-4">
              <h2 className="mb-4 font-display text-2xl text-foreground">Progress</h2>

              {/* KPI grid */}
              <div className="mb-4 grid grid-cols-2 gap-3">
                {[
                  {
                    label: "Habits tracked",
                    value: stats.total.toString(),
                    hint: "all time",
                    icon: <LayoutGrid className="size-4" />,
                  },
                  {
                    label: "In motion",
                    value: stats.active.toString(),
                    hint: "right now",
                    icon: <Flame className="size-4" />,
                    accent: true,
                  },
                  {
                    label: "Avg progress",
                    value: `${stats.avg}%`,
                    hint: "across all",
                    icon: <TrendingUp className="size-4" />,
                  },
                  {
                    label: "Best streak",
                    value: `${stats.bestStreak}d`,
                    hint: "longest run",
                    icon: <Flame className="size-4" />,
                    accent: true,
                  },
                ].map((kpi) => (
                  <div
                    key={kpi.label}
                    className="rounded-2xl border border-border bg-card p-4"
                    style={{ boxShadow: "var(--shadow-soft)" }}
                  >
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      {kpi.icon}
                    </div>
                    <div
                      className="mt-2 font-display text-3xl leading-none"
                      style={kpi.accent ? { color: "var(--color-primary)" } : undefined}
                    >
                      {kpi.value}
                    </div>
                    <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                      {kpi.label}
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{kpi.hint}</div>
                  </div>
                ))}
              </div>

              {/* Weekly rhythm */}
              <div
                className="mb-4 rounded-2xl border border-border bg-card p-4"
                style={{ boxShadow: "var(--shadow-soft)" }}
              >
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                      Last 7 days
                    </div>
                    <h3 className="mt-0.5 font-display text-xl text-foreground">Weekly rhythm</h3>
                  </div>
                  <div className="text-right font-mono text-xs text-muted-foreground">
                    <div style={{ color: "var(--color-primary)" }}>
                      {rollup.reduce((a, x) => a + x.done, 0)}
                    </div>
                    <div className="text-[10px]">
                      / {rollup.reduce((a, x) => a + x.total, 0)} done
                    </div>
                  </div>
                </div>
                <div className="flex items-end gap-2">
                  {rollup.map((d, i) => {
                    const ratio = d.total ? d.done / d.total : 0;
                    const h = Math.max(8, ratio * 100);
                    const isToday = i === rollup.length - 1;
                    return (
                      <div key={d.key} className="flex flex-1 flex-col items-center gap-2">
                        <div className="w-full text-center font-mono text-[9px] tabular-nums text-muted-foreground">
                          {d.done}
                        </div>
                        <div className="relative w-full" style={{ height: 100 }}>
                          <div
                            className="absolute inset-x-1 bottom-0 rounded-sm bg-[oklch(1_0_0_/_0.04)]"
                            style={{ height: "100%" }}
                          />
                          <div
                            className="absolute inset-x-1 bottom-0 rounded-sm transition-all"
                            style={{
                              height: h,
                              background: isToday
                                ? "linear-gradient(180deg, var(--color-primary), oklch(0.62 0.16 158))"
                                : "linear-gradient(180deg, oklch(1 0 0 / 0.2), oklch(1 0 0 / 0.07))",
                            }}
                          />
                        </div>
                        <div className="font-mono text-[10px] uppercase text-muted-foreground">
                          {d.label}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Per-habit progress */}
              {habits.length > 0 && (
                <div
                  className="rounded-2xl border border-border bg-card p-4"
                  style={{ boxShadow: "var(--shadow-soft)" }}
                >
                  <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    All habits
                  </div>
                  <div className="space-y-4">
                    {habits.map((h) => {
                      const { done, total, pct } = progress(h);
                      const s = streak(h);
                      return (
                        <div key={h.id}>
                          <div className="mb-1.5 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className="size-2 shrink-0 rounded-full"
                                style={{ background: h.color }}
                              />
                              <span className="truncate text-sm font-medium text-foreground">
                                {h.name}
                              </span>
                            </div>
                            <div className="shrink-0 flex items-center gap-3 font-mono text-[10px] text-muted-foreground">
                              <span>
                                {done}/{total}
                              </span>
                              {s > 0 && <span style={{ color: h.color }}>{s}d 🔥</span>}
                              <span className="font-medium" style={{ color: h.color }}>
                                {Math.round(pct * 100)}%
                              </span>
                            </div>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-[oklch(1_0_0_/_0.06)]">
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{ width: `${pct * 100}%`, background: h.color }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── MOBILE BOTTOM NAV ── */}
        <nav
          className="fixed bottom-0 inset-x-0 z-40"
          style={{
            paddingBottom: "env(safe-area-inset-bottom)",
            background: "oklch(0.165 0.008 240 / 0.92)",
            backdropFilter: "blur(20px) saturate(180%)",
            WebkitBackdropFilter: "blur(20px) saturate(180%)",
            borderTop: "1px solid oklch(1 0 0 / 0.08)",
          }}
        >
          <div className="flex items-stretch">
            {[
              {
                id: "today" as MobileTab,
                icon: <CheckCircle2 className="size-5" />,
                label: "Today",
              },
              {
                id: "habits" as MobileTab,
                icon: <LayoutGrid className="size-5" />,
                label: "Habits",
              },
              {
                id: "progress" as MobileTab,
                icon: <BarChart3 className="size-5" />,
                label: "Progress",
              },
            ].map((tab) => {
              const active = mobileTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setMobileTab(tab.id)}
                  className="flex flex-1 flex-col items-center justify-center gap-1 py-3 transition-all active:scale-95"
                  style={{
                    color: active ? "var(--color-primary)" : "var(--color-muted-foreground)",
                  }}
                >
                  <div className="relative">
                    {tab.icon}
                    {tab.id === "today" && stats.active > stats.doneToday && stats.active > 0 && (
                      <span
                        className="absolute -right-1 -top-1 flex size-3.5 items-center justify-center rounded-full text-[8px] font-bold text-white"
                        style={{ background: "var(--color-primary)" }}
                      >
                        {stats.active - stats.doneToday}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-medium tracking-wide">{tab.label}</span>
                  {active && (
                    <span
                      className="absolute bottom-0 h-0.5 w-8 rounded-full"
                      style={{ background: "var(--color-primary)" }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* ── MOBILE FAB ── */}
        {mobileTab === "today" && (
          <button
            onClick={() => setAddOpen(true)}
            className="fixed z-50 flex items-center justify-center rounded-full shadow-2xl transition-all active:scale-90"
            style={{
              right: "1.25rem",
              bottom: `calc(5.5rem + env(safe-area-inset-bottom))`,
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

      {/* ──────────── SHARED DIALOGS ──────────── */}
      <AddHabitDialog open={addOpen} onOpenChange={setAddOpen} />
      <HabitDetailDialog
        habit={openHabit}
        onClose={() => setOpenId(null)}
        onToggleDay={toggleDay}
      />
      <EditHabitDialog habit={editHabit} onClose={() => setEditId(null)} />
    </div>
  );
}

function MiniStat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </div>
      <div
        className="mt-0.5 font-display text-lg leading-none"
        style={highlight ? { color: "var(--color-primary)" } : undefined}
      >
        {value}
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  hint,
  accent,
  icon,
}: {
  label: string;
  value: string;
  hint: string;
  accent?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className="bg-card p-6">
      <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        {icon}
        {label}
      </div>
      <div
        className="mt-2 font-display text-4xl leading-none"
        style={accent ? { color: "var(--color-primary)" } : undefined}
      >
        {value}
      </div>
      <div className="mt-1.5 text-xs text-muted-foreground">{hint}</div>
    </div>
  );
}

function EmptyState({ filter }: { filter: FilterId }) {
  const copy: Record<FilterId, string> = {
    ongoing: "No habits in motion. Start one and let momentum take care of the rest.",
    upcoming: "Nothing scheduled ahead. Plan your next commitment.",
    finished: "No completed habits yet. Stay consistent — they're coming.",
    pending: "Nothing lapsed. You're caught up.",
  };
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/40 px-8 py-16 text-center">
      <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
        Empty
      </div>
      <p className="mt-3 max-w-xs font-display text-xl leading-tight text-foreground">
        {copy[filter]}
      </p>
    </div>
  );
}
