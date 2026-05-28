import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Flame,
  TrendingUp,
  Calendar,
  Plus,
  CheckCircle2,
  Circle,
  BarChart3,
  LayoutGrid,
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
type AppTab = "today" | "habits" | "progress";

function Index() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [filter, setFilter] = useState<FilterId>("ongoing");
  const [openId, setOpenId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [tab, setTab] = useState<AppTab>("today");

  // Pull-to-refresh
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
    return habits
      .filter((h) => classify(h) === filter)
      .sort((a, b) => {
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

  const handleDelete = (id: string) => void deleteHabitFs(id);
  const toggleToday = (id: string) => {
    const h = habits.find((h) => h.id === id);
    if (h) void toggleHabitDay(h, today());
  };
  const toggleDay = (id: string, day: string) => {
    const h = habits.find((h) => h.id === id);
    if (h) void toggleHabitDay(h, day);
  };

  const openHabit = habits.find((h) => h.id === openId) ?? null;
  const editHabit = habits.find((h) => h.id === editId) ?? null;

  // Progress ring
  const r = 44;
  const circ = 2 * Math.PI * r;
  const todayPct = stats.active ? stats.doneToday / stats.active : 0;
  const dashOff = circ * (1 - todayPct);

  // Pull-to-refresh handlers (touch only)
  const onTouchStart = (e: React.TouchEvent) => {
    if (!contentRef.current || contentRef.current.scrollTop > 0) return;
    pullStartY.current = e.touches[0].clientY;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (refreshing || !contentRef.current || contentRef.current.scrollTop > 0) return;
    const dy = e.touches[0].clientY - pullStartY.current;
    if (dy > 0) setPullY(Math.min(dy * 0.5, PULL_THRESHOLD + 20));
  };
  const onTouchEnd = () => {
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

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {/* ── STICKY HEADER ── */}
      <header
        className="z-30 flex shrink-0 items-center justify-between px-5 py-3"
        style={{
          paddingTop: "max(0.75rem, env(safe-area-inset-top))",
          background: "oklch(0.155 0.008 240 / 0.88)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          borderBottom: "1px solid oklch(1 0 0 / 0.07)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground"
            style={{ boxShadow: "var(--shadow-glow)" }}
          >
            <span className="font-display text-lg leading-none">H</span>
          </div>
          <div>
            <div className="font-display text-[18px] leading-none tracking-tight">Habito</div>
            <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
              {new Date().toLocaleDateString("en", {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
            </div>
          </div>
        </div>

        {/* Header action button when not on Today tab */}
        {tab !== "today" && (
          <button
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-all hover:brightness-110 active:scale-95"
            style={{ boxShadow: "var(--shadow-glow)" }}
          >
            <Plus className="size-4" />
            New habit
          </button>
        )}
      </header>

      {/* ── PULL-TO-REFRESH STRIP ── */}
      <div
        className="flex shrink-0 items-center justify-center overflow-hidden transition-all duration-200"
        style={{ height: pullY > 0 ? `${pullY}px` : refreshing ? "44px" : "0px" }}
      >
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <RefreshCw
            className="size-3.5"
            style={{
              color: "var(--color-primary)",
              animation: refreshing ? "spin 1s linear infinite" : "none",
            }}
          />
          {refreshing
            ? "Syncing…"
            : pullY >= PULL_THRESHOLD
              ? "Release to refresh"
              : "Pull to refresh"}
        </div>
      </div>

      {/* ── SCROLLABLE CONTENT ── */}
      <div
        ref={contentRef}
        className="flex-1 overflow-y-auto"
        style={{ paddingBottom: "calc(4.5rem + env(safe-area-inset-bottom))" }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="mx-auto w-full max-w-4xl px-4 sm:px-6">
          {/* ════ TODAY TAB ════ */}
          {tab === "today" && (
            <div className="pt-5 pb-6 space-y-4">
              {/* Date + greeting */}
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  {new Date().toLocaleDateString("en", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                </div>
                <h1 className="mt-1 font-display text-3xl leading-tight text-foreground sm:text-4xl">
                  {stats.doneToday === stats.active && stats.active > 0
                    ? "All done today! 🎉"
                    : stats.active === 0
                      ? "Start your first habit"
                      : `${stats.active - stats.doneToday} habit${stats.active - stats.doneToday !== 1 ? "s" : ""} left today`}
                </h1>
              </div>

              {/* Progress ring + stats — wider on desktop */}
              <div
                className="flex items-center gap-5 rounded-2xl border border-border bg-card p-5 sm:gap-8 sm:p-6"
                style={{ boxShadow: "var(--shadow-soft)" }}
              >
                {/* Ring */}
                <div className="relative shrink-0">
                  <svg width="108" height="108" viewBox="0 0 108 108">
                    <circle
                      cx="54"
                      cy="54"
                      r={r}
                      fill="none"
                      strokeWidth="7"
                      stroke="oklch(1 0 0 / 0.06)"
                    />
                    <circle
                      cx="54"
                      cy="54"
                      r={r}
                      fill="none"
                      strokeWidth="7"
                      stroke="var(--color-primary)"
                      strokeDasharray={circ}
                      strokeDashoffset={dashOff}
                      strokeLinecap="round"
                      transform="rotate(-90 54 54)"
                      style={{ transition: "stroke-dashoffset 0.7s cubic-bezier(0.4,0,0.2,1)" }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="font-display text-3xl leading-none text-foreground">
                      {stats.doneToday}
                    </span>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      /{stats.active}
                    </span>
                  </div>
                </div>

                {/* Mini stats */}
                <div className="grid flex-1 grid-cols-2 gap-4 sm:grid-cols-3">
                  <MiniStat label="Total habits" value={stats.total.toString()} />
                  <MiniStat label="Avg progress" value={`${stats.avg}%`} />
                  <MiniStat label="Best streak" value={`${stats.bestStreak}d`} highlight />
                </div>
              </div>

              {/* Today's check-off list */}
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-display text-xl text-foreground sm:text-2xl">
                    Today's habits
                  </h2>
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    {todayHabits.length} active
                  </span>
                </div>

                {todayHabits.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border bg-card/40 px-6 py-12 text-center">
                    <p className="font-display text-xl text-foreground">No active habits yet.</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Create one to start tracking.
                    </p>
                    <button
                      onClick={() => setAddOpen(true)}
                      className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:brightness-110 active:scale-95"
                    >
                      <Plus className="size-4" /> New habit
                    </button>
                  </div>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
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
                          className="flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition-all hover:brightness-105 active:scale-[0.98] disabled:opacity-50"
                          style={{
                            borderColor: done ? `${h.color}40` : "oklch(1 0 0 / 0.07)",
                            background: done ? `${h.color}12` : "var(--color-card)",
                            boxShadow: "var(--shadow-soft)",
                          }}
                        >
                          <div className="shrink-0">
                            {done ? (
                              <CheckCircle2 className="size-6" style={{ color: h.color }} />
                            ) : (
                              <Circle className="size-6 text-muted-foreground" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div
                              className="truncate font-medium text-foreground"
                              style={{
                                textDecoration: done ? "line-through" : "none",
                                opacity: done ? 0.55 : 1,
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

              {/* Weekly mini chart */}
              <div
                className="rounded-2xl border border-border bg-card p-5"
                style={{ boxShadow: "var(--shadow-soft)" }}
              >
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-display text-lg text-foreground sm:text-xl">This week</h3>
                  <div className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
                    <Calendar className="size-3.5" />
                    {rollup.reduce((a, x) => a + x.done, 0)}&nbsp;/&nbsp;
                    {rollup.reduce((a, x) => a + x.total, 0)}
                  </div>
                </div>
                <div className="flex items-end gap-2">
                  {rollup.map((d, i) => {
                    const ratio = d.total ? d.done / d.total : 0;
                    const h = Math.max(6, ratio * 72);
                    const isToday = i === rollup.length - 1;
                    return (
                      <div key={d.key} className="flex flex-1 flex-col items-center gap-1.5">
                        <div className="relative w-full" style={{ height: 72 }}>
                          <div
                            className="absolute inset-x-1 bottom-0 rounded-sm bg-[oklch(1_0_0_/_0.04)]"
                            style={{ height: "100%" }}
                          />
                          <div
                            className="absolute inset-x-1 bottom-0 rounded-sm transition-all"
                            style={{
                              height: h,
                              background: isToday
                                ? "linear-gradient(180deg,var(--color-primary),oklch(0.62 0.16 158))"
                                : "linear-gradient(180deg,oklch(1 0 0/.2),oklch(1 0 0/.07))",
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
            </div>
          )}

          {/* ════ HABITS TAB ════ */}
          {tab === "habits" && (
            <div className="pt-5 pb-6 space-y-4">
              {/* Filter pills */}
              <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
                {FILTERS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFilter(f.id)}
                    className="shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-all hover:brightness-110 active:scale-95"
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
                    {f.label}&nbsp;<span className="opacity-60">{counts[f.id]}</span>
                  </button>
                ))}
              </div>

              <div>
                <h2 className="font-display text-2xl text-foreground sm:text-3xl">
                  {FILTERS.find((f) => f.id === filter)?.label}
                </h2>
                <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  {filtered.length} {filtered.length === 1 ? "habit" : "habits"}
                </div>
              </div>

              {filtered.length === 0 ? (
                <EmptyState filter={filter} />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
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

          {/* ════ PROGRESS TAB ════ */}
          {tab === "progress" && (
            <div className="pt-5 pb-6 space-y-4">
              <h2 className="font-display text-2xl text-foreground sm:text-3xl">Progress</h2>

              {/* KPI grid */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  {
                    label: "Tracked",
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
                    hint: "all habits",
                    icon: <TrendingUp className="size-4" />,
                  },
                  {
                    label: "Best streak",
                    value: `${stats.bestStreak}d`,
                    hint: "longest run",
                    icon: <Flame className="size-4" />,
                    accent: true,
                  },
                ].map((k) => (
                  <div
                    key={k.label}
                    className="rounded-2xl border border-border bg-card p-4 sm:p-5"
                    style={{ boxShadow: "var(--shadow-soft)" }}
                  >
                    <div className="text-muted-foreground">{k.icon}</div>
                    <div
                      className="mt-2 font-display text-3xl leading-none sm:text-4xl"
                      style={k.accent ? { color: "var(--color-primary)" } : undefined}
                    >
                      {k.value}
                    </div>
                    <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                      {k.label}
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{k.hint}</div>
                  </div>
                ))}
              </div>

              {/* Weekly bar chart */}
              <div
                className="rounded-2xl border border-border bg-card p-5 sm:p-6"
                style={{ boxShadow: "var(--shadow-soft)" }}
              >
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                      Last 7 days
                    </div>
                    <h3 className="mt-0.5 font-display text-xl text-foreground sm:text-2xl">
                      Weekly rhythm
                    </h3>
                  </div>
                  <div className="text-right">
                    <div
                      className="font-display text-2xl"
                      style={{ color: "var(--color-primary)" }}
                    >
                      {rollup.reduce((a, x) => a + x.done, 0)}
                    </div>
                    <div className="font-mono text-[10px] text-muted-foreground">
                      / {rollup.reduce((a, x) => a + x.total, 0)} done
                    </div>
                  </div>
                </div>
                <div className="flex items-end gap-2 sm:gap-3">
                  {rollup.map((d, i) => {
                    const ratio = d.total ? d.done / d.total : 0;
                    const h = Math.max(8, ratio * 120);
                    const isToday = i === rollup.length - 1;
                    return (
                      <div key={d.key} className="flex flex-1 flex-col items-center gap-2">
                        <div className="font-mono text-[9px] tabular-nums text-muted-foreground">
                          {d.done}
                        </div>
                        <div className="relative w-full" style={{ height: 120 }}>
                          <div
                            className="absolute inset-x-1 bottom-0 rounded-md bg-[oklch(1_0_0_/_0.04)]"
                            style={{ height: "100%" }}
                          />
                          <div
                            className="absolute inset-x-1 bottom-0 rounded-md transition-all"
                            style={{
                              height: h,
                              background: isToday
                                ? "linear-gradient(180deg,var(--color-primary),oklch(0.62 0.16 158))"
                                : "linear-gradient(180deg,oklch(1 0 0/.2),oklch(1 0 0/.07))",
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

              {/* Per-habit progress bars */}
              {habits.length > 0 && (
                <div
                  className="rounded-2xl border border-border bg-card p-5 sm:p-6"
                  style={{ boxShadow: "var(--shadow-soft)" }}
                >
                  <div className="mb-4 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    All habits
                  </div>
                  <div className="space-y-4">
                    {habits.map((h) => {
                      const { done, total, pct } = progress(h);
                      const s = streak(h);
                      return (
                        <div key={h.id}>
                          <div className="mb-1.5 flex items-center justify-between gap-2">
                            <div className="flex min-w-0 items-center gap-2">
                              <span
                                className="size-2 shrink-0 rounded-full"
                                style={{ background: h.color }}
                              />
                              <span className="truncate text-sm font-medium text-foreground">
                                {h.name}
                              </span>
                            </div>
                            <div className="flex shrink-0 items-center gap-3 font-mono text-[10px] text-muted-foreground">
                              <span>
                                {done}/{total}
                              </span>
                              {s > 0 && <span style={{ color: h.color }}>{s}d 🔥</span>}
                              <span className="font-semibold" style={{ color: h.color }}>
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
      </div>

      {/* ── BOTTOM NAV ── */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40"
        style={{
          paddingBottom: "env(safe-area-inset-bottom)",
          background: "oklch(0.165 0.008 240 / 0.92)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          borderTop: "1px solid oklch(1 0 0 / 0.08)",
        }}
      >
        <div className="mx-auto flex max-w-4xl items-stretch">
          {(
            [
              { id: "today" as AppTab, icon: <CheckCircle2 className="size-5" />, label: "Today" },
              { id: "habits" as AppTab, icon: <LayoutGrid className="size-5" />, label: "Habits" },
              {
                id: "progress" as AppTab,
                icon: <BarChart3 className="size-5" />,
                label: "Progress",
              },
            ] as const
          ).map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="relative flex flex-1 flex-col items-center justify-center gap-1 py-3 transition-all active:scale-95"
                style={{ color: active ? "var(--color-primary)" : "var(--color-muted-foreground)" }}
              >
                {/* Badge on Today */}
                <div className="relative">
                  {t.icon}
                  {t.id === "today" && stats.active > stats.doneToday && stats.active > 0 && (
                    <span
                      className="absolute -right-1.5 -top-1.5 flex size-4 items-center justify-center rounded-full text-[9px] font-bold text-white"
                      style={{ background: "var(--color-primary)" }}
                    >
                      {stats.active - stats.doneToday}
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-medium tracking-wide">{t.label}</span>
                {/* Active indicator */}
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

      {/* ── FAB ── */}
      {tab === "today" && (
        <button
          onClick={() => setAddOpen(true)}
          className="fixed z-50 flex items-center justify-center rounded-full transition-all hover:scale-105 hover:brightness-110 active:scale-90"
          style={{
            right: "max(1.25rem, env(safe-area-inset-right))",
            bottom: "calc(4.75rem + env(safe-area-inset-bottom))",
            width: 60,
            height: 60,
            background: "var(--color-primary)",
            color: "var(--color-primary-foreground)",
            boxShadow: "var(--shadow-glow)",
          }}
        >
          <Plus className="size-6" />
        </button>
      )}

      {/* ── SHARED DIALOGS ── */}
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

/* ── helpers ── */

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
        className="mt-0.5 font-display text-xl leading-none sm:text-2xl"
        style={highlight ? { color: "var(--color-primary)" } : undefined}
      >
        {value}
      </div>
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
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/40 px-8 py-20 text-center">
      <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
        Empty
      </div>
      <p className="mt-3 max-w-sm font-display text-xl leading-tight text-foreground sm:text-2xl">
        {copy[filter]}
      </p>
    </div>
  );
}
