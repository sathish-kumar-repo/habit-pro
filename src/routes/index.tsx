import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { LayoutGrid, Flame, TrendingUp, Calendar } from "lucide-react";
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
      { property: "og:title", content: "Habito — Daily Habit Tracker" },
      {
        property: "og:description",
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

function Index() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [filter, setFilter] = useState<FilterId>("ongoing");
  const [openId, setOpenId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);

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
    // Unmarked-today first, marked sink to bottom. Stable secondary by createdAt desc.
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

  // 7-day rollup
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

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
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
          <SideItem icon={<LayoutGrid className="size-4" />} label="Overview" active />
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

      {/* Main */}
      <main className="flex-1 px-6 py-8 sm:px-10 sm:py-12">
        {/* Header */}
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
          <AddHabitDialog />
        </header>

        {/* KPI strip */}
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

        {/* Week rollup */}
        <section
          className="mt-6 rounded-2xl border border-border bg-card p-6"
          style={{ boxShadow: "var(--shadow-soft)" }}
        >
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

        {/* Mobile filters */}
        <nav className="mt-8 flex flex-wrap gap-2 lg:hidden">
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

        {/* Section heading */}
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

        {/* Grid */}
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

      <HabitDetailDialog
        habit={openHabit}
        onClose={() => setOpenId(null)}
        onToggleDay={toggleDay}
      />

      <EditHabitDialog habit={editHabit} onClose={() => setEditId(null)} />
    </div>
  );
}

function SideItem({
  icon,
  label,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <div
      className="flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors"
      style={
        active
          ? { background: "oklch(1 0 0 / 0.05)", color: "var(--color-foreground)" }
          : { color: "var(--color-muted-foreground)" }
      }
    >
      {icon}
      {label}
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
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/40 px-8 py-24 text-center">
      <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
        Empty state
      </div>
      <p className="mt-4 max-w-sm font-display text-2xl leading-tight text-foreground">
        {copy[filter]}
      </p>
    </div>
  );
}
