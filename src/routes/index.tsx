import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Flame,
  TrendingUp,
  TrendingDown,
  Calendar,
  Plus,
  CheckCircle2,
  Circle,
  BarChart3,
  LayoutGrid,
  RefreshCw,
  StickyNote,
  Trophy,
  ArrowUpDown,
  Zap,
  ChevronRight,
  ChevronLeft,
  Activity,
  CalendarCheck,
  Award,
  Search,
  X,
  ClipboardList,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import {
  Habit,
  classify,
  subscribeHabits,
  deleteHabit as deleteHabitFs,
  toggleHabitDay,
  setHabitNote,
  today,
  progress,
  streak,
  fmtDate,
} from "@/lib/habits";
import { HabitCard } from "@/components/habits/HabitCard";
import { AddHabitDialog } from "@/components/habits/AddHabitDialog";
import { HabitDetailDialog } from "@/components/habits/HabitDetailDialog";
import { EditHabitDialog } from "@/components/habits/EditHabitDialog";
import { useGlobalConfetti } from "@/hooks/use-global-confetti";
import { playCompletionSound, triggerHaptic } from "@/lib/completion-fx";
import { HabitIcon } from "@/components/habits/HabitIcon";
import { Todo, subscribeTodos } from "@/lib/todos";
import { TodoList } from "@/components/todos/TodoList";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Habito — Daily Habit Tracker" },
      { name: "description", content: "Track your daily habits." },
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
type AppTab = "today" | "habits" | "progress" | "todos";

type ProgressRange = "7d" | "30d" | "all";
type ProgressSort = "pct" | "streak" | "name";
/* ─── shared data hook ───────────────────────── */
function useAppData() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [filter, setFilter] = useState<FilterId>("ongoing");
  const [openId, setOpenId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [tab, setTab] = useState<AppTab>("today");
  const [progressRange, setProgressRange] = useState<ProgressRange>("7d");
  const [progressSort, setProgressSort] = useState<ProgressSort>("pct");
  const [habitSearch, setHabitSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const [habitsLoading, setHabitsLoading] = useState(true);
  const [todos, setTodos] = useState<Todo[]>([]);

  useEffect(() => {
    const u = subscribeHabits((data) => {
      setHabits(data);
      setHabitsLoading(false);
    });
    return u;
  }, []);

  useEffect(() => {
    const u = subscribeTodos(setTodos);
    return u;
  }, []);

  const selectedDateKey = useMemo(() => fmtDate(selectedDate), [selectedDate]);

  const counts = useMemo(() => {
    const c: Record<FilterId, number> = { ongoing: 0, upcoming: 0, finished: 0, pending: 0 };
    habits.forEach((h) => {
      c[classify(h)]++;
    });
    return c;
  }, [habits]);

  const filtered = useMemo(() => {
    const t = today();
    const q = habitSearch.trim().toLowerCase();
    return habits
      .filter((h) => classify(h) === filter)
      .filter((h) => (q ? h.name.toLowerCase().includes(q) : true));
  }, [habits, filter, habitSearch]);

  const stats = useMemo(() => {
    const t = today();
    const active = habits.filter((h) => classify(h) === "ongoing");
    const done = active.filter((h) => h.track[t]?.done).length;
    const avg =
      habits.length === 0
        ? 0
        : Math.round((habits.reduce((a, h) => a + progress(h).pct, 0) / habits.length) * 100);
    const best = habits.reduce((m, h) => Math.max(m, streak(h)), 0);
    return { total: habits.length, active: active.length, doneToday: done, avg, bestStreak: best };
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

  const rollup30 = useMemo(() => {
    const out: { key: string; label: string; done: number; total: number }[] = [];
    for (let i = 29; i >= 0; i--) {
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
      const isWeekStart = d.getDay() === 0;
      out.push({
        key,
        label: isWeekStart ? d.toLocaleDateString("en", { month: "short", day: "numeric" }) : "",
        done,
        total,
      });
    }
    return out;
  }, [habits]);

  const rollupMonthly = useMemo(() => {
    const monthMap: Record<
      string,
      { done: number; total: number; label: string; sortKey: string }
    > = {};
    habits.forEach((h) => {
      Object.entries(h.track).forEach(([, e]) => {
        const d = e.date;
        const sortKey = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
        if (!monthMap[sortKey]) {
          monthMap[sortKey] = {
            done: 0,
            total: 0,
            sortKey,
            label: d.toLocaleString("en", { month: "short", year: "2-digit" }),
          };
        }
        monthMap[sortKey].total++;
        if (e.done) monthMap[sortKey].done++;
      });
    });
    return Object.values(monthMap).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  }, [habits]);

  const weekdayStats = useMemo(() => {
    const days = [
      { day: 0, label: "Sun", done: 0, total: 0 },
      { day: 1, label: "Mon", done: 0, total: 0 },
      { day: 2, label: "Tue", done: 0, total: 0 },
      { day: 3, label: "Wed", done: 0, total: 0 },
      { day: 4, label: "Thu", done: 0, total: 0 },
      { day: 5, label: "Fri", done: 0, total: 0 },
      { day: 6, label: "Sat", done: 0, total: 0 },
    ];
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    habits.forEach((h) => {
      Object.values(h.track).forEach((e) => {
        const d = new Date(e.date);
        d.setHours(0, 0, 0, 0);
        if (d > now) return;
        const wd = d.getDay();
        days[wd].total++;
        if (e.done) days[wd].done++;
      });
    });
    return days.map((d) => ({ ...d, pct: d.total ? Math.round((d.done / d.total) * 100) : 0 }));
  }, [habits]);

  const periodComparison = useMemo(() => {
    const compute = (offset: number, window: number) => {
      let done = 0,
        total = 0;
      for (let i = offset; i < offset + window; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        d.setHours(0, 0, 0, 0);
        const key = fmtDate(d);
        habits.forEach((h) => {
          const e = h.track[key];
          if (e) {
            total++;
            if (e.done) done++;
          }
        });
      }
      return total ? Math.round((done / total) * 100) : 0;
    };
    const this7 = compute(0, 7),
      last7 = compute(7, 7);
    const this30 = compute(0, 30),
      last30 = compute(30, 30);
    return { this7, last7, delta7: this7 - last7, this30, last30, delta30: this30 - last30 };
  }, [habits]);

  const personalRecords = useMemo(() => {
    const dayMap: Record<string, { done: number; total: number }> = {};
    habits.forEach((h) => {
      Object.entries(h.track).forEach(([key, e]) => {
        if (!dayMap[key]) dayMap[key] = { done: 0, total: 0 };
        dayMap[key].total++;
        if (e.done) dayMap[key].done++;
      });
    });
    let bestDayCount = 0;
    Object.values(dayMap).forEach(({ done }) => {
      if (done > bestDayCount) bestDayCount = done;
    });
    const allKeys = Object.keys(dayMap).sort();
    let bestWeekPct = 0;
    for (let i = 0; i <= allKeys.length - 7; i++) {
      let done = 0,
        total = 0;
      for (let j = i; j < Math.min(i + 7, allKeys.length); j++) {
        done += dayMap[allKeys[j]].done;
        total += dayMap[allKeys[j]].total;
      }
      if (total > 0) bestWeekPct = Math.max(bestWeekPct, Math.round((done / total) * 100));
    }
    const longestEver = habits.reduce((max, h) => {
      const keys = Object.keys(h.track).sort(
        (a, b) => h.track[a].date.getTime() - h.track[b].date.getTime(),
      );
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      let m = 0,
        cur = 0;
      for (const key of keys) {
        const e = h.track[key];
        const d = new Date(e.date);
        d.setHours(0, 0, 0, 0);
        if (d > now) break;
        if (e.done) {
          cur++;
          m = Math.max(m, cur);
        } else cur = 0;
      }
      return Math.max(max, m);
    }, 0);
    return { bestDayCount, bestWeekPct, longestEver };
  }, [habits]);

  const consistencyScore = useMemo(() => {
    if (habits.length === 0) return 0;
    const compScore = Math.round((stats.avg / 100) * 50);
    const streakScore = Math.min(30, stats.bestStreak * 2);
    const todayKey = today();
    const yDate = new Date();
    yDate.setDate(yDate.getDate() - 1);
    yDate.setHours(0, 0, 0, 0);
    const yKey = fmtDate(yDate);
    const anyToday = habits.some((h) => h.track[todayKey]?.done);
    const anyYest = habits.some((h) => h.track[yKey]?.done);
    const recencyScore = anyToday ? 20 : anyYest ? 10 : 0;
    return Math.min(100, compScore + streakScore + recencyScore);
  }, [habits, stats]);

  const perHabitExtended = useMemo(() => {
    return habits.map((h) => {
      const keys = Object.keys(h.track).sort(
        (a, b) => h.track[a].date.getTime() - h.track[b].date.getTime(),
      );
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      let maxStreak = 0,
        curSt = 0;
      for (const key of keys) {
        const e = h.track[key];
        const d = new Date(e.date);
        d.setHours(0, 0, 0, 0);
        if (d > now) break;
        if (e.done) {
          curSt++;
          maxStreak = Math.max(maxStreak, curSt);
        } else curSt = 0;
      }
      const lastKey = keys[keys.length - 1];
      const end = lastKey ? new Date(h.track[lastKey].date) : now;
      end.setHours(0, 0, 0, 0);
      const daysRemaining = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 86400000));
      const { done, total, pct } = progress(h);
      return {
        habit: h,
        longestStreak: maxStreak,
        daysRemaining,
        done,
        total,
        pct,
        currentStreak: streak(h),
      };
    });
  }, [habits]);

  const todayHabits = useMemo(() => {
    return habits.filter((h) => h.track[selectedDateKey] !== undefined);
  }, [habits, selectedDateKey]);

  const statsForSelectedDate = useMemo(() => {
    const active = todayHabits.length;
    const done = todayHabits.filter((h) => h.track[selectedDateKey]?.done).length;
    return { active, done };
  }, [todayHabits, selectedDateKey]);

  const handleDelete = (id: string) => void deleteHabitFs(id);
  const toggleToday = (id: string) => {
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);

    if (selectedDate > todayDate) return;

    const h = habits.find((h) => h.id === id);
    if (h) void toggleHabitDay(h, selectedDateKey);
  };
  const toggleDay = (id: string, day: string) => {
    const targetDate = new Date(day);
    targetDate.setHours(0, 0, 0, 0);

    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);

    if (targetDate > todayDate) return;

    const h = habits.find((h) => h.id === id);
    if (h) void toggleHabitDay(h, day);
  };
  const saveNote = (id: string, note: string) => {
    const h = habits.find((h) => h.id === id);
    if (h) void setHabitNote(h, selectedDateKey, note);
  };
  const openHabit = habits.find((h) => h.id === openId) ?? null;
  const editHabit = habits.find((h) => h.id === editId) ?? null;

  return {
    habits,
    filter,
    setFilter,
    openId,
    setOpenId,
    editId,
    setEditId,
    addOpen,
    setAddOpen,
    tab,
    setTab,
    counts,
    filtered,
    stats,
    rollup,
    rollup30,
    rollupMonthly,
    todayHabits,
    handleDelete,
    toggleToday,
    toggleDay,
    saveNote,
    openHabit,
    editHabit,
    progressRange,
    setProgressRange,
    progressSort,
    setProgressSort,
    habitSearch,
    setHabitSearch,
    weekdayStats,
    periodComparison,
    personalRecords,
    consistencyScore,
    perHabitExtended,
    selectedDate,
    setSelectedDate,
    selectedDateKey,
    statsForSelectedDate,
    todos,
    habitsLoading,
  };
}

/* ─── DateStrip — horizontally scrollable date selector ─── */
function DateStrip({
  habits,
  selectedDate,
  setSelectedDate,
}: {
  habits: Habit[];
  selectedDate: Date;
  setSelectedDate: (d: Date) => void;
}) {
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
      const isToday = d.getTime() === todayDate.getTime();
      const isFuture = d > todayDate;
      const isSelected = fmtDate(d) === fmtDate(selectedDate);
      return { date: d, key, done, total, isToday, isFuture, isSelected };
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

  const DAY_NAMES = ["S", "M", "T", "W", "T", "F", "S"];

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
              {/* Day initial */}
              <span
                className="font-mono text-[9px] uppercase tracking-[0.1em]"
                style={{
                  color: d.isSelected ? "oklch(1 0 0 / 0.75)" : "var(--color-muted-foreground)",
                }}
              >
                {DAY_NAMES[idx]}
              </span>

              {/* Date number */}
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

              {/* Completion indicator */}
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

/* ─── root ───────────────────────────────────── */
function Index() {
  const data = useAppData();
  return (
    <>
      {/* Desktop ≥ lg */}
      <DesktopApp {...data} />
      {/* Mobile / tablet < lg */}
      <MobileApp {...data} />

      {/* Shared drawers */}
      <AddHabitDialog open={data.addOpen} onOpenChange={data.setAddOpen} />
      <HabitDetailDialog
        habit={data.openHabit}
        onClose={() => data.setOpenId(null)}
        onToggleDay={data.toggleDay}
      />
      <EditHabitDialog habit={data.editHabit} onClose={() => data.setEditId(null)} />
    </>
  );
}

/* ══════════════════════════════════════════════════════
   DESKTOP APP  — full sidebar nav + rich content panels
══════════════════════════════════════════════════════ */
type AppProps = ReturnType<typeof useAppData>;

function DesktopApp(p: AppProps) {
  const { stats, tab, setTab, addOpen, setAddOpen } = p;
  const todayPct = stats.active ? stats.doneToday / stats.active : 0;
  const r = 32,
    circ = 2 * Math.PI * r,
    dashOff = circ * (1 - todayPct);

  const NAV: { id: AppTab; icon: React.ReactNode; label: string }[] = [
    { id: "today", icon: <CheckCircle2 className="size-5" />, label: "Today" },
    { id: "habits", icon: <LayoutGrid className="size-5" />, label: "Habits" },
    { id: "progress", icon: <BarChart3 className="size-5" />, label: "Progress" },
    { id: "todos", icon: <ClipboardList className="size-5" />, label: "To-Do" },
  ];

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

        {/* Nav items */}
        <nav className="flex-1 space-y-0.5 px-3 pt-1">
          {NAV.map((n) => {
            const active = tab === n.id;
            return (
              <button
                key={n.id}
                onClick={() => setTab(n.id)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all hover:bg-[oklch(1_0_0_/_0.04)]"
                style={{
                  background: active ? "oklch(1 0 0 / 0.06)" : undefined,
                  color: active ? "var(--color-foreground)" : "var(--color-muted-foreground)",
                }}
              >
                <span style={{ color: active ? "var(--color-primary)" : undefined }}>{n.icon}</span>
                {n.label}
                {/* badge on Today */}
                {n.id === "today" && stats.active > stats.doneToday && stats.active > 0 && (
                  <span
                    className="ml-auto flex size-5 items-center justify-center rounded-full text-[10px] font-bold text-white"
                    style={{ background: "var(--color-primary)" }}
                  >
                    {stats.active - stats.doneToday}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Today mini ring + CTA */}
        <div className="px-4 pb-6 pt-4 space-y-3">
          {/* Progress ring card */}
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
              Today
            </div>
            <div className="mt-3 flex items-center gap-3">
              <svg width="72" height="72" viewBox="0 0 72 72" className="shrink-0">
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

          {/* Add button */}
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
              {{ today: "Today's Focus", habits: "My Habits", progress: "My Progress" }[tab]}
            </h1>
          </div>
          {/* Quick stats row */}
          <div className="hidden items-center gap-6 xl:flex">
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
        </header>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-8 py-6 xl:px-10 xl:py-8">
          {/* ─ TODAY ─ */}
          {tab === "today" && <DesktopToday {...p} />}

          {/* ─ HABITS ─ */}
          {tab === "habits" && <DesktopHabits {...p} />}

          {/* ─ PROGRESS ─ */}
          {tab === "progress" && <DesktopProgress {...p} />}

          {/* ─ TO-DO ─ */}
          {tab === "todos" && (
            <div className="mx-auto max-w-2xl space-y-2">
              <h2 className="text-lg font-semibold tracking-tight">To-Do List</h2>
              <TodoList todos={p.todos} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Desktop Today ── */
function DesktopToday({
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
  const r = 52,
    circ = 2 * Math.PI * r,
    dashOff = circ * (1 - selPct);

  const isSelectedToday = selectedDateKey === fmtDate(new Date());
  const isFuture =
    selectedDate >
    (() => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      return d;
    })();

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
        {/* Date strip card */}
        <div
          className="rounded-2xl border border-border bg-card p-5"
          style={{ boxShadow: "var(--shadow-soft)" }}
        >
          <DateStrip
            habits={habits}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
          />
          {/* Dynamic heading below strip */}
          <div className="mt-4 border-t border-[oklch(1_0_0_/_0.06)] pt-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              {dateLabel}
            </div>
            <h2 className="mt-1 font-display text-2xl text-foreground xl:text-3xl">
              {headingText}
            </h2>
            {statsForSelectedDate.active > 0 && (
              <p className="mt-1 text-sm text-muted-foreground">
                {statsForSelectedDate.done} of {statsForSelectedDate.active} completed
              </p>
            )}
          </div>
        </div>

        {/* Habit checklist */}
        <div className="flex flex-1 flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-xl text-foreground">
              {isSelectedToday
                ? "Today's habits"
                : `${selectedDate.toLocaleDateString("en", { weekday: "long" })}'s habits`}
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
                  {isFuture
                    ? "Create a habit that includes this date."
                    : "Habits are tracked from their start date."}
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
        {/* Ring card */}
        <div
          className="rounded-2xl border border-border bg-card p-6"
          style={{ boxShadow: "var(--shadow-soft)" }}
        >
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            {isSelectedToday ? "Today's progress" : "Day's progress"}
          </div>
          <div className="my-5 flex justify-center">
            <div className="relative">
              <svg width="140" height="140" viewBox="0 0 140 140">
                <circle
                  cx="70"
                  cy="70"
                  r={r}
                  fill="none"
                  strokeWidth="8"
                  stroke="oklch(1 0 0 / 0.06)"
                />
                <circle
                  cx="70"
                  cy="70"
                  r={r}
                  fill="none"
                  strokeWidth="8"
                  stroke="var(--color-primary)"
                  strokeDasharray={circ}
                  strokeDashoffset={dashOff}
                  strokeLinecap="round"
                  transform="rotate(-90 70 70)"
                  style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-display text-4xl leading-none text-foreground">
                  {statsForSelectedDate.done}
                </span>
                <span className="font-mono text-sm text-muted-foreground">
                  /{statsForSelectedDate.active}
                </span>
                <span className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                  done
                </span>
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
                <div
                  className="font-display text-xl leading-none"
                  style={k.accent ? { color: "var(--color-primary)" } : undefined}
                >
                  {k.value}
                </div>
                <div className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
                  {k.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Weekly chart */}
        <div
          className="flex-1 rounded-2xl border border-border bg-card p-5"
          style={{ boxShadow: "var(--shadow-soft)" }}
        >
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
                    const dt = new Date(
                      d.key
                        .split("-")
                        .map(Number)
                        .reduce((acc, n, i) => {
                          if (i === 0) return new Date(n, 0, 1);
                          if (i === 1) {
                            acc.setMonth(n - 1);
                            return acc;
                          }
                          acc.setDate(n);
                          return acc;
                        }, new Date()),
                    );
                    setSelectedDate(dt);
                  }}
                  className="flex flex-1 flex-col items-center gap-1.5 transition-all active:scale-95"
                >
                  <div className="font-mono text-[9px] tabular-nums text-muted-foreground">
                    {d.done}
                  </div>
                  <div className="relative w-full" style={{ height: 100 }}>
                    <div
                      className="absolute inset-x-1 bottom-0 rounded-md"
                      style={{
                        height: "100%",
                        background: isSelDay ? "oklch(1 0 0 / 0.07)" : "oklch(1 0 0 / 0.04)",
                      }}
                    />
                    <div
                      className="absolute inset-x-1 bottom-0 rounded-md transition-all duration-500"
                      style={{
                        height: h,
                        background: isSelDay
                          ? "linear-gradient(180deg,var(--color-primary),oklch(0.62 0.16 158))"
                          : isToday
                            ? "linear-gradient(180deg,var(--color-primary),oklch(0.62 0.16 158))"
                            : "linear-gradient(180deg,oklch(1 0 0/.2),oklch(1 0 0/.07))",
                        opacity: isSelDay ? 1 : isToday ? 0.7 : 1,
                      }}
                    />
                    {isSelDay && (
                      <div className="absolute inset-x-0 bottom-0 -mb-1 flex justify-center">
                        <div
                          className="h-0.5 w-3 rounded-full"
                          style={{ background: "var(--color-primary)" }}
                        />
                      </div>
                    )}
                  </div>
                  <div
                    className="font-mono text-[10px] uppercase"
                    style={{
                      color: isSelDay ? "var(--color-primary)" : "var(--color-muted-foreground)",
                      fontWeight: isSelDay ? 700 : 400,
                    }}
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

/* ── Skeleton shimmer primitive ── */
function Sk({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-xl ${className ?? ""}`}
      style={{ background: "oklch(1 0 0 / 0.06)" }}
    />
  );
}

/* ── Desktop Today skeleton ── */
function DesktopTodaySkeleton() {
  return (
    <div className="grid h-full gap-5 xl:grid-cols-[1fr_340px]">
      {/* Left */}
      <div className="flex flex-col gap-5">
        {/* Date strip card */}
        <div className="rounded-2xl border border-border bg-card p-5" style={{ boxShadow: "var(--shadow-soft)" }}>
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

        {/* Habit list */}
        <div className="flex flex-1 flex-col gap-3">
          <div className="flex items-center justify-between">
            <Sk className="h-6 w-36" />
            <Sk className="h-3 w-16" />
          </div>
          <div className="grid gap-2.5 xl:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-border bg-card p-4 flex items-center gap-4" style={{ boxShadow: "var(--shadow-soft)" }}>
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
        {/* Ring card */}
        <div className="rounded-2xl border border-border bg-card p-6" style={{ boxShadow: "var(--shadow-soft)" }}>
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

        {/* Weekly chart */}
        <div className="flex-1 rounded-2xl border border-border bg-card p-5" style={{ boxShadow: "var(--shadow-soft)" }}>
          <div className="flex items-center justify-between mb-4">
            <Sk className="h-5 w-24" />
            <Sk className="h-3 w-12" />
          </div>
          <div className="flex items-end gap-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-2">
                <Sk className="w-full rounded-sm" style={{ height: `${30 + Math.sin(i) * 20 + 20}px` }} />
                <Sk className="h-2 w-4" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Mobile Today skeleton ── */
function MobileTodaySkeleton() {
  return (
    <div className="space-y-4 pb-6 pt-4">
      {/* Date strip card */}
      <div className="rounded-2xl border border-border bg-card p-4" style={{ boxShadow: "var(--shadow-soft)" }}>
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

      {/* Ring stats card */}
      <div className="flex items-center gap-5 rounded-2xl border border-border bg-card p-4" style={{ boxShadow: "var(--shadow-soft)" }}>
        <Sk className="size-24 rounded-full shrink-0" />
        <div className="flex-1 space-y-3">
          <div className="flex justify-between">
            <Sk className="h-3 w-20" />
            <Sk className="h-4 w-8" />
          </div>
          <div className="flex justify-between">
            <Sk className="h-3 w-20" />
            <Sk className="h-4 w-10" />
          </div>
          <div className="flex justify-between">
            <Sk className="h-3 w-20" />
            <Sk className="h-4 w-8" />
          </div>
        </div>
      </div>

      {/* Habit cards */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <Sk className="h-6 w-36" />
          <Sk className="h-3 w-16" />
        </div>
        <div className="grid gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-border bg-card p-4 flex items-center gap-3" style={{ boxShadow: "var(--shadow-soft)" }}>
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

/* ── Desktop Habits ── */
function DesktopHabits({
  filter,
  setFilter,
  counts,
  filtered,
  toggleToday,
  setOpenId,
  setEditId,
  handleDelete,
  setAddOpen,
  habitSearch,
  setHabitSearch,
}: AppProps) {

  return (
    <div className="space-y-5">
      {/* Filter pills */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className="rounded-full border px-4 py-2 text-sm font-medium transition-all hover:brightness-110 active:scale-95"
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
            {f.label} <span className="opacity-60">{counts[f.id]}</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={habitSearch}
          onChange={(e) => setHabitSearch(e.target.value)}
          placeholder="Search habits…"
          className="w-full rounded-xl border py-2 pl-9 pr-9 text-sm outline-none transition-all focus:ring-1"
          style={
            {
              background: "var(--color-card)",
              borderColor: "oklch(1 0 0 / 0.08)",
              color: "var(--color-foreground)",
              "--tw-ring-color": "var(--color-primary)",
            } as React.CSSProperties
          }
        />
        {habitSearch && (
          <button
            onClick={() => setHabitSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {/* Section heading */}
      <div className="flex items-baseline gap-3">
        <h2 className="font-display text-2xl text-foreground">
          {FILTERS.find((f) => f.id === filter)?.label}
        </h2>
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          {filtered.length} {filtered.length === 1 ? "habit" : "habits"}
        </span>
        {habitSearch && (
          <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
            · matching "{habitSearch}"
          </span>
        )}
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        habitSearch ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/40 py-16 text-center">
            <Search className="mx-auto mb-3 size-8 text-muted-foreground opacity-40" />
            <p className="font-display text-xl text-foreground">No results for "{habitSearch}"</p>
            <p className="mt-1 text-sm text-muted-foreground">Try a different search term.</p>
          </div>
        ) : (
          <EmptyState filter={filter} />
        )
      ) : (
        <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
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
  );
}

/* ── Desktop Progress ── */
function DesktopProgress({
  stats,
  rollup,
  rollup30,
  rollupMonthly,
  habits,
  counts,
  progressRange,
  setProgressRange,
  progressSort,
  setProgressSort,
  setOpenId,
  weekdayStats,
  periodComparison,
  consistencyScore,
  perHabitExtended,
  personalRecords,
}: AppProps) {
  const chartData = useMemo(() => {
    const raw =
      progressRange === "7d" ? rollup : progressRange === "30d" ? rollup30 : rollupMonthly;
    return raw.map((d) => ({ ...d, ratio: d.total ? Math.round((d.done / d.total) * 100) : 0 }));
  }, [progressRange, rollup, rollup30, rollupMonthly]);

  const sortedExtended = useMemo(() => {
    const h = [...perHabitExtended];
    if (progressSort === "pct") return h.sort((a, b) => b.pct - a.pct);
    if (progressSort === "streak") return h.sort((a, b) => b.currentStreak - a.currentStreak);
    return h.sort((a, b) => a.habit.name.localeCompare(b.habit.name));
  }, [perHabitExtended, progressSort]);

  const totalDone = chartData.reduce((a, x) => a + x.done, 0);
  const totalPossible = chartData.reduce((a, x) => a + x.total, 0);
  const overallPct = totalPossible ? Math.round((totalDone / totalPossible) * 100) : 0;
  const delta =
    progressRange === "7d"
      ? periodComparison.delta7
      : progressRange === "30d"
        ? periodComparison.delta30
        : 0;
  const showDelta = progressRange !== "all";
  const bestDay = weekdayStats.reduce((b, d) => (d.total > 0 && d.pct > b.pct ? d : b), {
    ...weekdayStats[0],
  });

  const scoreR = 36,
    scoreCirc = 2 * Math.PI * scoreR;
  const scoreDash = scoreCirc * (1 - consistencyScore / 100);
  const scoreColor =
    consistencyScore >= 80
      ? "var(--color-primary)"
      : consistencyScore >= 55
        ? "#E4A12B"
        : "#E48068";
  const scoreTier =
    consistencyScore >= 85
      ? "Elite"
      : consistencyScore >= 65
        ? "Strong"
        : consistencyScore >= 40
          ? "Building"
          : habits.length > 0
            ? "Starting"
            : "—";

  const rangeLabels: Record<string, string> = {
    "7d": "Last 7 days",
    "30d": "Last 30 days",
    all: "All time",
  };
  const sortLabels: Record<string, string> = {
    pct: "By progress",
    streak: "By streak",
    name: "By name",
  };
  const sortOptions: ProgressSort[] = ["pct", "streak", "name"];
  const [sortOpen, setSortOpen] = useState(false);

  const statusColors = {
    ongoing: "#20A973",
    upcoming: "#5DA9E9",
    finished: "#7F52E0",
    pending: "#E48068",
  };
  const statusLabels = {
    ongoing: "In motion",
    upcoming: "Upcoming",
    finished: "Completed",
    pending: "Lapsed",
  };
  const statusTotal = Object.values(counts).reduce((a, v) => a + v, 0);

  return (
    <div className="space-y-5">
      {/* ── Filter bar ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 rounded-xl border border-border bg-card p-1">
          {(["7d", "30d", "all"] as ProgressRange[]).map((r) => (
            <button
              key={r}
              onClick={() => setProgressRange(r)}
              className="rounded-lg px-4 py-1.5 text-xs font-medium transition-all active:scale-95"
              style={
                progressRange === r
                  ? { background: "var(--color-primary)", color: "var(--color-primary-foreground)" }
                  : { color: "var(--color-muted-foreground)" }
              }
            >
              {r === "7d" ? "7 Days" : r === "30d" ? "30 Days" : "All Time"}
            </button>
          ))}
        </div>
        <div className="relative">
          <button
            onClick={() => setSortOpen((v) => !v)}
            className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-xs font-medium text-muted-foreground transition-all hover:text-foreground active:scale-95"
          >
            <ArrowUpDown className="size-3.5" />
            {sortLabels[progressSort]}
          </button>
          {sortOpen && (
            <div
              className="absolute right-0 top-full z-50 mt-1.5 min-w-[140px] overflow-hidden rounded-xl border border-border bg-card shadow-lg"
              onMouseLeave={() => setSortOpen(false)}
            >
              {sortOptions.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setProgressSort(s);
                    setSortOpen(false);
                  }}
                  className="flex w-full items-center justify-between px-4 py-2.5 text-xs transition-colors hover:bg-[oklch(1_0_0_/_0.04)]"
                  style={{
                    color: progressSort === s ? "var(--color-primary)" : "var(--color-foreground)",
                  }}
                >
                  {sortLabels[s]}
                  {progressSort === s && (
                    <span
                      className="size-1.5 rounded-full"
                      style={{ background: "var(--color-primary)" }}
                    />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── KPI row — 5 cards ── */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-5">
        {/* 1. Total */}
        <div
          className="rounded-2xl border border-border bg-card p-5"
          style={{ boxShadow: "var(--shadow-soft)" }}
        >
          <LayoutGrid className="size-4 text-muted-foreground" />
          <div className="mt-3 font-display text-4xl leading-none xl:text-5xl">{stats.total}</div>
          <div className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
            Habits tracked
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">all time</div>
        </div>
        {/* 2. Active */}
        <div
          className="relative overflow-hidden rounded-2xl border border-border bg-card p-5"
          style={{ boxShadow: "var(--shadow-soft)" }}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.06]"
            style={{
              background:
                "radial-gradient(circle at top right, var(--color-primary) 0%, transparent 70%)",
            }}
          />
          <Zap className="size-4" style={{ color: "var(--color-primary)" }} />
          <div
            className="mt-3 font-display text-4xl leading-none xl:text-5xl"
            style={{ color: "var(--color-primary)" }}
          >
            {stats.active}
          </div>
          <div className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
            In motion
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">active now</div>
        </div>
        {/* 3. Period completion + trend delta */}
        <div
          className="rounded-2xl border border-border bg-card p-5"
          style={{ boxShadow: "var(--shadow-soft)" }}
        >
          <div className="flex items-center justify-between">
            <Activity className="size-4 text-muted-foreground" />
            {showDelta && delta !== 0 && (
              <span
                className="flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-mono text-[9px] font-medium"
                style={{
                  background:
                    delta > 0 ? "oklch(0.62 0.16 158 / 0.15)" : "oklch(0.55 0.2 25 / 0.15)",
                  color: delta > 0 ? "#20A973" : "#E48068",
                }}
              >
                {delta > 0 ? (
                  <TrendingUp className="size-2.5" />
                ) : (
                  <TrendingDown className="size-2.5" />
                )}
                {delta > 0 ? "+" : ""}
                {delta}%
              </span>
            )}
          </div>
          <div className="mt-3 font-display text-4xl leading-none xl:text-5xl">{overallPct}%</div>
          <div className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
            Completion rate
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {showDelta ? "vs prev period" : "all time avg"}
          </div>
        </div>
        {/* 4. Personal best streak */}
        <div
          className="relative overflow-hidden rounded-2xl border border-border bg-card p-5"
          style={{ boxShadow: "var(--shadow-soft)" }}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.06]"
            style={{
              background:
                "radial-gradient(circle at top right, var(--color-primary) 0%, transparent 70%)",
            }}
          />
          <Trophy className="size-4" style={{ color: "var(--color-primary)" }} />
          <div
            className="mt-3 font-display text-4xl leading-none xl:text-5xl"
            style={{ color: "var(--color-primary)" }}
          >
            {personalRecords.longestEver}d
          </div>
          <div className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
            Longest streak
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">personal record</div>
        </div>
        {/* 5. Consistency Score ring */}
        <div
          className="rounded-2xl border border-border bg-card p-5 flex flex-col"
          style={{ boxShadow: "var(--shadow-soft)" }}
        >
          <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
            Consistency
          </div>
          <div className="flex flex-1 items-center gap-3 mt-3">
            <svg width={80} height={80} viewBox="0 0 88 88" className="shrink-0">
              <circle
                cx="44"
                cy="44"
                r={scoreR}
                fill="none"
                stroke="oklch(1 0 0 / 0.06)"
                strokeWidth={7}
              />
              <circle
                cx="44"
                cy="44"
                r={scoreR}
                fill="none"
                stroke={scoreColor}
                strokeWidth={7}
                strokeLinecap="round"
                strokeDasharray={scoreCirc}
                strokeDashoffset={scoreDash}
                transform="rotate(-90 44 44)"
                style={{ transition: "stroke-dashoffset 0.8s ease" }}
              />
              <text
                x="44"
                y="50"
                textAnchor="middle"
                fill="white"
                fontSize="17"
                fontFamily="var(--font-display)"
                fontWeight="700"
              >
                {consistencyScore}
              </text>
            </svg>
            <div>
              <div className="font-display text-xl leading-none" style={{ color: scoreColor }}>
                {scoreTier}
              </div>
              <div className="mt-1 font-mono text-[8px] uppercase tracking-[0.12em] text-muted-foreground">
                / 100 pts
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Chart + Day-of-week analysis ── */}
      <div className="grid gap-5 xl:grid-cols-[1fr_280px]">
        {/* Completion rhythm */}
        <div
          className="rounded-2xl border border-border bg-card p-6"
          style={{ boxShadow: "var(--shadow-soft)" }}
        >
          <div className="mb-5 flex items-end justify-between">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                {rangeLabels[progressRange]}
              </div>
              <h3 className="mt-0.5 font-display text-2xl text-foreground">Completion rhythm</h3>
            </div>
            <div className="text-right">
              <div
                className="font-display text-3xl leading-none"
                style={{ color: "var(--color-primary)" }}
              >
                {overallPct}%
              </div>
              <div className="font-mono text-[10px] text-muted-foreground">
                {totalDone}/{totalPossible} done
              </div>
            </div>
          </div>
          {chartData.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
              No data for this range
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart
                data={chartData}
                barCategoryGap={chartData.length > 20 ? "15%" : "28%"}
                margin={{ top: 4, right: 0, left: 0, bottom: 0 }}
              >
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "oklch(0.55 0.01 240)", fontSize: 9, fontFamily: "monospace" }}
                  interval={chartData.length > 15 ? "preserveStartEnd" : 0}
                />
                <YAxis hide domain={[0, 100]} />
                <Tooltip
                  cursor={{ fill: "oklch(1 0 0 / 0.03)" }}
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload as { done: number; total: number; ratio: number };
                    return (
                      <div className="rounded-xl border border-border bg-card px-3 py-2 text-xs shadow-lg">
                        <div className="font-medium text-foreground">
                          {label || `${d.done}/${d.total}`}
                        </div>
                        <div className="mt-0.5 font-mono text-muted-foreground">
                          {d.done}/{d.total} · {d.ratio}%
                        </div>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="ratio" radius={[4, 4, 0, 0]} maxBarSize={40}>
                  {chartData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={
                        i === chartData.length - 1
                          ? "var(--color-primary)"
                          : entry.ratio >= 80
                            ? "oklch(0.62 0.16 158 / 0.65)"
                            : entry.ratio >= 50
                              ? "oklch(1 0 0 / 0.18)"
                              : "oklch(1 0 0 / 0.07)"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
          <div className="mt-3 flex items-center gap-4 flex-wrap">
            {[
              { color: "var(--color-primary)", label: "Today / latest" },
              { color: "oklch(0.62 0.16 158 / 0.65)", label: "≥ 80%" },
              { color: "oklch(1 0 0 / 0.18)", label: "≥ 50%" },
              { color: "oklch(1 0 0 / 0.07)", label: "< 50%" },
            ].map((l) => (
              <div key={l.label} className="flex items-center gap-1.5">
                <span className="size-2 rounded-sm" style={{ background: l.color }} />
                <span className="font-mono text-[8px] text-muted-foreground">{l.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Day-of-week analysis */}
        <div
          className="rounded-2xl border border-border bg-card p-5"
          style={{ boxShadow: "var(--shadow-soft)" }}
        >
          <div className="mb-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Patterns
            </div>
            <h3 className="mt-0.5 font-display text-xl text-foreground">Best days</h3>
            {bestDay.total > 0 && (
              <div className="mt-1 flex items-center gap-1.5">
                <span className="font-mono text-[9px] text-muted-foreground">Peak day:</span>
                <span
                  className="font-mono text-[9px] font-semibold"
                  style={{ color: "var(--color-primary)" }}
                >
                  {bestDay.label} · {bestDay.pct}%
                </span>
              </div>
            )}
          </div>
          <div className="space-y-3">
            {weekdayStats.map((d) => {
              const isBest = d.total > 0 && d.pct === bestDay.pct && bestDay.total > 0;
              return (
                <div key={d.day} className="flex items-center gap-3">
                  <div className="w-8 shrink-0 font-mono text-[10px] text-muted-foreground">
                    {d.label}
                  </div>
                  <div className="flex-1 h-2 overflow-hidden rounded-full bg-[oklch(1_0_0_/_0.06)]">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: d.total === 0 ? "0%" : `${d.pct}%`,
                        background: isBest ? "var(--color-primary)" : "oklch(1 0 0 / 0.22)",
                      }}
                    />
                  </div>
                  <div
                    className="w-9 shrink-0 text-right font-mono text-[10px]"
                    style={{
                      color: isBest ? "var(--color-primary)" : "var(--color-muted-foreground)",
                    }}
                  >
                    {d.total === 0 ? "—" : `${d.pct}%`}
                  </div>
                </div>
              );
            })}
          </div>
          {weekdayStats.every((d) => d.total === 0) && (
            <div className="mt-3 text-center text-xs text-muted-foreground">
              Track habits to see patterns
            </div>
          )}
        </div>
      </div>

      {/* ── Enhanced habit table + [Records + Status] ── */}
      <div className="grid gap-5 xl:grid-cols-[1fr_268px]">
        {/* Enhanced habit breakdown table */}
        <div
          className="flex flex-col rounded-2xl border border-border bg-card"
          style={{ boxShadow: "var(--shadow-soft)" }}
        >
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Habit breakdown
            </div>
            <span className="font-mono text-[10px] text-muted-foreground">
              {habits.length} total
            </span>
          </div>
          {habits.length === 0 ? (
            <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">
              No habits yet
            </div>
          ) : (
            <>
              <div className="grid grid-cols-[1fr_60px_60px_52px_48px] items-center border-b border-border px-5 py-2">
                {[
                  ["Habit", "left"],
                  ["Streak", "right"],
                  ["Best", "right"],
                  ["Rate", "right"],
                  ["Left", "right"],
                ].map(([h, align]) => (
                  <div
                    key={h}
                    className={`font-mono text-[8px] uppercase tracking-[0.15em] text-muted-foreground text-${align}`}
                  >
                    {h}
                  </div>
                ))}
              </div>
              <div className="flex-1 overflow-y-auto divide-y divide-[oklch(1_0_0_/_0.04)]">
                {sortedExtended.map((item, i) => {
                  const {
                    habit: h,
                    longestStreak,
                    daysRemaining,
                    done,
                    total,
                    pct,
                    currentStreak,
                  } = item;
                  return (
                    <button
                      key={h.id}
                      onClick={() => setOpenId(h.id)}
                      className="group w-full grid grid-cols-[1fr_60px_60px_52px_48px] items-center px-4 py-3 text-left transition-all hover:bg-[oklch(1_0_0_/_0.03)]"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="flex size-7 shrink-0 items-center justify-center rounded-lg font-mono text-[9px] text-white"
                          style={{ background: h.color }}
                        >
                          {i + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <HabitIcon
                              name={h.icon}
                              className="size-3 shrink-0"
                              style={{ color: h.color }}
                            />
                            <span className="truncate text-sm font-medium text-foreground">
                              {h.name}
                            </span>
                          </div>
                          <div className="h-1 mt-1.5 overflow-hidden rounded-full bg-[oklch(1_0_0_/_0.06)]">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${pct * 100}%`, background: h.color }}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        {currentStreak > 0 ? (
                          <span
                            className="flex items-center justify-end gap-0.5 font-mono text-[10px]"
                            style={{ color: h.color }}
                          >
                            <Flame className="size-2.5" />
                            {currentStreak}d
                          </span>
                        ) : (
                          <span className="font-mono text-[10px] text-muted-foreground">—</span>
                        )}
                      </div>
                      <div className="text-right font-mono text-[10px] text-muted-foreground">
                        {longestStreak > 0 ? `${longestStreak}d` : "—"}
                      </div>
                      <div
                        className="text-right font-mono text-xs font-semibold"
                        style={{ color: h.color }}
                      >
                        {Math.round(pct * 100)}%
                      </div>
                      <div className="text-right font-mono text-[10px] text-muted-foreground">
                        {daysRemaining > 0 ? (
                          `${daysRemaining}d`
                        ) : (
                          <span style={{ color: "var(--color-primary)" }}>✓</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Right column: Personal Records + Status Distribution */}
        <div className="space-y-5">
          <div
            className="rounded-2xl border border-border bg-card p-5"
            style={{ boxShadow: "var(--shadow-soft)" }}
          >
            <div className="mb-4 flex items-center gap-2">
              <Award className="size-3.5 text-muted-foreground" />
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Personal records
              </div>
            </div>
            <div className="space-y-4">
              {(
                [
                  {
                    label: "Longest streak",
                    value:
                      personalRecords.longestEver > 0 ? `${personalRecords.longestEver} days` : "—",
                    icon: <Flame className="size-3.5" />,
                    accent: true,
                  },
                  {
                    label: "Best single day",
                    value:
                      personalRecords.bestDayCount > 0
                        ? `${personalRecords.bestDayCount} habits`
                        : "—",
                    icon: <CalendarCheck className="size-3.5" />,
                    accent: false,
                  },
                  {
                    label: "Best 7-day week",
                    value:
                      personalRecords.bestWeekPct > 0 ? `${personalRecords.bestWeekPct}%` : "—",
                    icon: <TrendingUp className="size-3.5" />,
                    accent: false,
                  },
                ] as const
              ).map((r) => (
                <div key={r.label} className="flex items-center gap-3">
                  <div
                    className="flex size-8 shrink-0 items-center justify-center rounded-xl"
                    style={{
                      background: r.accent ? "var(--color-primary)" : "oklch(1 0 0 / 0.06)",
                      color: r.accent ? "white" : "var(--color-muted-foreground)",
                    }}
                  >
                    {r.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="font-mono text-[8px] uppercase tracking-[0.12em] text-muted-foreground">
                      {r.label}
                    </div>
                    <div className="font-display text-lg leading-tight text-foreground">
                      {r.value}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div
            className="rounded-2xl border border-border bg-card p-5"
            style={{ boxShadow: "var(--shadow-soft)" }}
          >
            <div className="mb-4 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Status breakdown
            </div>
            <div className="space-y-2.5">
              {(["ongoing", "upcoming", "finished", "pending"] as const).map((k) => {
                const count = counts[k];
                const pct = statusTotal > 0 ? (count / statusTotal) * 100 : 0;
                return (
                  <div key={k}>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="font-mono text-[9px] text-muted-foreground">
                        {statusLabels[k]}
                      </span>
                      <span className="font-mono text-[9px] font-medium text-foreground">
                        {count}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-[oklch(1_0_0_/_0.06)]">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, background: statusColors[k] }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1">
              {(["ongoing", "upcoming", "finished", "pending"] as const).map((k) => (
                <div key={k} className="flex items-center gap-1">
                  <span className="size-1.5 rounded-full" style={{ background: statusColors[k] }} />
                  <span className="font-mono text-[8px] text-muted-foreground">
                    {statusLabels[k]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── 30-day heatmap ── */}
      <div
        className="rounded-2xl border border-border bg-card p-6"
        style={{ boxShadow: "var(--shadow-soft)" }}
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Heatmap
            </div>
            <h3 className="mt-0.5 font-display text-xl text-foreground">Last 30 days</h3>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[8px] text-muted-foreground">Less</span>
            {[0.05, 0.25, 0.5, 0.75, 1].map((o) => (
              <span
                key={o}
                className="size-3 rounded-sm"
                style={{ background: "var(--color-primary)", opacity: o }}
              />
            ))}
            <span className="font-mono text-[8px] text-muted-foreground">More</span>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          {rollup30.map((d, i) => {
            const ratio = d.total ? d.done / d.total : 0;
            return (
              <div
                key={d.key}
                className="group relative"
                title={`${d.key}: ${d.done}/${d.total} (${Math.round(ratio * 100)}%)`}
              >
                <div
                  className="size-5 rounded-sm transition-all"
                  style={{
                    background: d.total === 0 ? "oklch(1 0 0 / 0.04)" : "var(--color-primary)",
                    opacity: d.total === 0 ? 1 : Math.max(0.1, ratio),
                    outline: i === rollup30.length - 1 ? "2px solid var(--color-primary)" : "none",
                    outlineOffset: 2,
                  }}
                />
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex items-center gap-6 font-mono text-[9px] text-muted-foreground">
          {rollup30
            .filter((d) => d.label)
            .map((d) => (
              <span key={d.key}>{d.label}</span>
            ))}
        </div>
      </div>
    </div>
  );
}

/* ── Mobile Habits ── */
function MobileHabits({
  filter,
  setFilter,
  counts,
  filtered,
  toggleToday,
  setOpenId,
  setEditId,
  handleDelete,
  habitSearch,
  setHabitSearch,
}: Pick<
  AppProps,
  | "filter"
  | "setFilter"
  | "counts"
  | "filtered"
  | "toggleToday"
  | "setOpenId"
  | "setEditId"
  | "handleDelete"
  | "habitSearch"
  | "setHabitSearch"
>) {

  return (
    <div className="space-y-4 pb-6 pt-5">
      {/* Status filter pills */}
      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className="shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-all active:scale-95"
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

      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={habitSearch}
          onChange={(e) => setHabitSearch(e.target.value)}
          placeholder="Search habits…"
          className="w-full rounded-xl border py-2 pl-9 pr-8 text-sm outline-none"
          style={{
            background: "var(--color-card)",
            borderColor: "oklch(1 0 0 / 0.08)",
            color: "var(--color-foreground)",
          }}
        />
        {habitSearch && (
          <button
            onClick={() => setHabitSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {/* Heading */}
      <div>
        <h2 className="font-display text-2xl text-foreground">
          {FILTERS.find((f) => f.id === filter)?.label}
        </h2>
        <div className="mt-0.5 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          <span>
            {filtered.length} {filtered.length === 1 ? "habit" : "habits"}
          </span>
          {habitSearch && <span>· matching "{habitSearch}"</span>}
        </div>
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        habitSearch ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/40 py-14 text-center">
            <Search className="mx-auto mb-3 size-7 text-muted-foreground opacity-40" />
            <p className="font-display text-lg text-foreground">No results for "{habitSearch}"</p>
            <p className="mt-1 text-sm text-muted-foreground">Try a different search term.</p>
          </div>
        ) : (
          <EmptyState filter={filter} />
        )
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
  );
}

/* ══════════════════════════════════════════════════════
   MOBILE / TABLET  < lg
══════════════════════════════════════════════════════ */
function MobileApp(p: AppProps) {
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

  const [pullY, setPullY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const pullStartY = useRef(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const PULL_THRESHOLD = 72;

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

  const r = 38,
    circ = 2 * Math.PI * r;
  const todayPct = stats.active ? stats.doneToday / stats.active : 0;
  const dashOff = circ * (1 - todayPct);

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
        {tab !== "today" && tab !== "todos" && (
          <button
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-xs font-medium text-primary-foreground transition-all active:scale-95"
          >
            <Plus className="size-3.5" /> New
          </button>
        )}
      </header>

      {/* Pull-to-refresh */}
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

      {/* Content */}
      <div
        ref={contentRef}
        className="flex-1 overflow-y-auto"
        style={{ paddingBottom: "calc(4.5rem + env(safe-area-inset-bottom))" }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="mx-auto w-full max-w-2xl px-4 sm:px-6">
          {/* TODAY */}
          {tab === "today" && (
            p.habitsLoading ? <MobileTodaySkeleton /> :
            <div className="space-y-4 pb-6 pt-4">
              {/* Date strip card */}
              <div
                className="rounded-2xl border border-border bg-card p-4"
                style={{ boxShadow: "var(--shadow-soft)" }}
              >
                <DateStrip
                  habits={p.habits}
                  selectedDate={p.selectedDate}
                  setSelectedDate={p.setSelectedDate}
                />
                {/* Summary below strip */}
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
                    const ratio = d.total ? d.done / d.total : 0,
                      hh = Math.max(6, ratio * 64),
                      isToday = i === rollup.length - 1,
                      isSelDay = d.key === p.selectedDateKey;
                    return (
                      <div key={d.key} className="flex flex-1 flex-col items-center gap-1.5">
                        <div className="relative w-full" style={{ height: 64 }}>
                          <div
                            className="absolute inset-x-1 bottom-0 rounded-sm"
                            style={{
                              height: "100%",
                              background: isSelDay ? "oklch(1 0 0 / 0.07)" : "oklch(1 0 0 / 0.04)",
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
          )}

          {/* HABITS */}
          {tab === "habits" && (
            <MobileHabits
              filter={p.filter}
              setFilter={p.setFilter}
              counts={p.counts}
              filtered={p.filtered}
              toggleToday={p.toggleToday}
              setOpenId={p.setOpenId}
              setEditId={p.setEditId}
              handleDelete={p.handleDelete}
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
        style={{
          paddingBottom: "env(safe-area-inset-bottom)",
          background: "oklch(0.165 0.008 240 / 0.92)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          borderTop: "1px solid oklch(1 0 0 / 0.08)",
        }}
      >
        <div className="mx-auto flex max-w-2xl items-stretch">
          {(
            [
              { id: "today" as AppTab, icon: <CheckCircle2 className="size-5" />, label: "Today" },
              { id: "habits" as AppTab, icon: <LayoutGrid className="size-5" />, label: "Habits" },
              {
                id: "progress" as AppTab,
                icon: <BarChart3 className="size-5" />,
                label: "Progress",
              },
              {
                id: "todos" as AppTab,
                icon: <ClipboardList className="size-5" />,
                label: "To-Do",
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

/* ── Mobile Progress ── */
function MobileProgress({
  stats,
  rollup,
  rollup30,
  rollupMonthly,
  habits,
  counts,
  progressRange,
  setProgressRange,
  progressSort,
  setProgressSort,
  setOpenId,
  weekdayStats,
  periodComparison,
  consistencyScore,
  perHabitExtended,
  personalRecords,
}: {
  stats: AppProps["stats"];
  rollup: AppProps["rollup"];
  rollup30: AppProps["rollup30"];
  rollupMonthly: AppProps["rollupMonthly"];
  habits: AppProps["habits"];
  counts: AppProps["counts"];
  progressRange: ProgressRange;
  setProgressRange: (r: ProgressRange) => void;
  progressSort: ProgressSort;
  setProgressSort: (s: ProgressSort) => void;
  setOpenId: (id: string) => void;
  weekdayStats: AppProps["weekdayStats"];
  periodComparison: AppProps["periodComparison"];
  consistencyScore: AppProps["consistencyScore"];
  perHabitExtended: AppProps["perHabitExtended"];
  personalRecords: AppProps["personalRecords"];
}) {
  const chartData = useMemo(() => {
    const raw =
      progressRange === "7d" ? rollup : progressRange === "30d" ? rollup30 : rollupMonthly;
    return raw.map((d) => ({ ...d, ratio: d.total ? Math.round((d.done / d.total) * 100) : 0 }));
  }, [progressRange, rollup, rollup30, rollupMonthly]);

  const sortedExtended = useMemo(() => {
    const h = [...perHabitExtended];
    if (progressSort === "pct") return h.sort((a, b) => b.pct - a.pct);
    if (progressSort === "streak") return h.sort((a, b) => b.currentStreak - a.currentStreak);
    return h.sort((a, b) => a.habit.name.localeCompare(b.habit.name));
  }, [perHabitExtended, progressSort]);

  const totalDone = chartData.reduce((a, x) => a + x.done, 0);
  const totalPossible = chartData.reduce((a, x) => a + x.total, 0);
  const overallPct = totalPossible ? Math.round((totalDone / totalPossible) * 100) : 0;
  const delta =
    progressRange === "7d"
      ? periodComparison.delta7
      : progressRange === "30d"
        ? periodComparison.delta30
        : 0;
  const showDelta = progressRange !== "all";
  const bestDay = weekdayStats.reduce((b, d) => (d.total > 0 && d.pct > b.pct ? d : b), {
    ...weekdayStats[0],
  });

  const scoreColor =
    consistencyScore >= 80
      ? "var(--color-primary)"
      : consistencyScore >= 55
        ? "#E4A12B"
        : "#E48068";
  const scoreTier =
    consistencyScore >= 85
      ? "Elite"
      : consistencyScore >= 65
        ? "Strong"
        : consistencyScore >= 40
          ? "Building"
          : habits.length > 0
            ? "Starting"
            : "—";
  const sortLabels: Record<ProgressSort, string> = {
    pct: "Progress",
    streak: "Streak",
    name: "Name",
  };

  return (
    <div className="space-y-4 pb-6 pt-4">
      {/* Title + sort */}
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-2xl text-foreground">Progress</h2>
        <button
          onClick={() => {
            const order: ProgressSort[] = ["pct", "streak", "name"];
            setProgressSort(order[(order.indexOf(progressSort) + 1) % order.length]);
          }}
          className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground active:scale-95"
        >
          <ArrowUpDown className="size-3" />
          {sortLabels[progressSort]}
        </button>
      </div>

      {/* Range pills */}
      <div className="flex items-center gap-1.5 rounded-xl border border-border bg-card p-1">
        {(["7d", "30d", "all"] as ProgressRange[]).map((r) => (
          <button
            key={r}
            onClick={() => setProgressRange(r)}
            className="flex-1 rounded-lg py-1.5 text-xs font-medium transition-all active:scale-95"
            style={
              progressRange === r
                ? { background: "var(--color-primary)", color: "var(--color-primary-foreground)" }
                : { color: "var(--color-muted-foreground)" }
            }
          >
            {r === "7d" ? "7 Days" : r === "30d" ? "30 Days" : "All Time"}
          </button>
        ))}
      </div>

      {/* KPI 2×2 grid */}
      <div className="grid grid-cols-2 gap-3">
        {[
          {
            label: "Tracked",
            value: stats.total.toString(),
            hint: "all time",
            icon: <LayoutGrid className="size-4" />,
            accent: false,
            delta: 0,
          },
          {
            label: "In motion",
            value: stats.active.toString(),
            hint: "active now",
            icon: <Zap className="size-4" />,
            accent: true,
            delta: 0,
          },
          {
            label: "Completion",
            value: `${overallPct}%`,
            hint:
              showDelta && delta !== 0 ? `${delta > 0 ? "+" : ""}${delta}% vs prev` : "this period",
            icon: <Activity className="size-4" />,
            accent: false,
            delta: showDelta ? delta : 0,
          },
          {
            label: "Best streak",
            value: `${personalRecords.longestEver}d`,
            hint: "longest run",
            icon: <Trophy className="size-4" />,
            accent: true,
            delta: 0,
          },
        ].map((k) => (
          <div
            key={k.label}
            className="relative overflow-hidden rounded-2xl border border-border bg-card p-4"
            style={{ boxShadow: "var(--shadow-soft)" }}
          >
            {k.accent && (
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.07]"
                style={{
                  background:
                    "radial-gradient(circle at top right, var(--color-primary) 0%, transparent 70%)",
                }}
              />
            )}
            <div className="flex items-center justify-between">
              <div
                style={{
                  color: k.accent ? "var(--color-primary)" : "var(--color-muted-foreground)",
                }}
              >
                {k.icon}
              </div>
              {k.delta !== 0 && (
                <span
                  className="flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-mono text-[8px]"
                  style={{
                    background:
                      k.delta > 0 ? "oklch(0.62 0.16 158 / 0.15)" : "oklch(0.55 0.2 25 / 0.15)",
                    color: k.delta > 0 ? "#20A973" : "#E48068",
                  }}
                >
                  {k.delta > 0 ? (
                    <TrendingUp className="size-2.5" />
                  ) : (
                    <TrendingDown className="size-2.5" />
                  )}
                  {k.delta > 0 ? "+" : ""}
                  {k.delta}%
                </span>
              )}
            </div>
            <div
              className="mt-2 font-display text-3xl leading-none"
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

      {/* Consistency Score */}
      <div
        className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4"
        style={{ boxShadow: "var(--shadow-soft)" }}
      >
        <svg width={72} height={72} viewBox="0 0 88 88" className="shrink-0">
          <circle cx="44" cy="44" r={36} fill="none" stroke="oklch(1 0 0 / 0.06)" strokeWidth={7} />
          <circle
            cx="44"
            cy="44"
            r={36}
            fill="none"
            stroke={scoreColor}
            strokeWidth={7}
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 36}
            strokeDashoffset={2 * Math.PI * 36 * (1 - consistencyScore / 100)}
            transform="rotate(-90 44 44)"
            style={{ transition: "stroke-dashoffset 0.8s ease" }}
          />
          <text
            x="44"
            y="50"
            textAnchor="middle"
            fill="white"
            fontSize="17"
            fontFamily="var(--font-display)"
            fontWeight="700"
          >
            {consistencyScore}
          </text>
        </svg>
        <div className="flex-1">
          <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
            Consistency Score
          </div>
          <div className="mt-0.5 font-display text-2xl leading-none" style={{ color: scoreColor }}>
            {scoreTier}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">Completion · Streak · Recency</div>
        </div>
      </div>

      {/* Chart */}
      <div
        className="rounded-2xl border border-border bg-card p-4"
        style={{ boxShadow: "var(--shadow-soft)" }}
      >
        <div className="mb-3 flex items-end justify-between">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              {progressRange === "7d"
                ? "Last 7 days"
                : progressRange === "30d"
                  ? "Last 30 days"
                  : "All time"}
            </div>
            <h3 className="mt-0.5 font-display text-lg text-foreground">Completion rhythm</h3>
          </div>
          <div className="text-right">
            <div
              className="font-display text-2xl leading-none"
              style={{ color: "var(--color-primary)" }}
            >
              {overallPct}%
            </div>
            <div className="font-mono text-[9px] text-muted-foreground">
              {totalDone}/{totalPossible}
            </div>
          </div>
        </div>
        {chartData.length === 0 ? (
          <div className="flex h-28 items-center justify-center text-xs text-muted-foreground">
            No data for this range
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={120}>
            <BarChart
              data={chartData}
              barCategoryGap={chartData.length > 20 ? "10%" : "22%"}
              margin={{ top: 2, right: 0, left: 0, bottom: 0 }}
            >
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "oklch(0.55 0.01 240)", fontSize: 8, fontFamily: "monospace" }}
                interval={chartData.length > 15 ? "preserveStartEnd" : 0}
              />
              <YAxis hide domain={[0, 100]} />
              <Tooltip
                cursor={{ fill: "oklch(1 0 0 / 0.03)" }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload as {
                    done: number;
                    total: number;
                    ratio: number;
                    key: string;
                  };
                  return (
                    <div className="rounded-xl border border-border bg-card px-3 py-2 text-xs shadow-lg">
                      <div className="font-mono text-muted-foreground">{d.key}</div>
                      <div className="font-medium text-foreground">
                        {d.done}/{d.total} · {d.ratio}%
                      </div>
                    </div>
                  );
                }}
              />
              <Bar dataKey="ratio" radius={[3, 3, 0, 0]} maxBarSize={32}>
                {chartData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={
                      i === chartData.length - 1
                        ? "var(--color-primary)"
                        : entry.ratio >= 80
                          ? "oklch(0.62 0.16 158 / 0.6)"
                          : entry.ratio >= 50
                            ? "oklch(1 0 0 / 0.18)"
                            : "oklch(1 0 0 / 0.07)"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Day-of-week analysis */}
      <div
        className="rounded-2xl border border-border bg-card p-4"
        style={{ boxShadow: "var(--shadow-soft)" }}
      >
        <div className="mb-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Patterns
          </div>
          <h3 className="mt-0.5 font-display text-lg text-foreground">Best days of week</h3>
          {bestDay.total > 0 && (
            <div className="mt-0.5 font-mono text-[9px]" style={{ color: "var(--color-primary)" }}>
              Peak: {bestDay.label} at {bestDay.pct}%
            </div>
          )}
        </div>
        <div className="space-y-2">
          {weekdayStats.map((d) => {
            const isBest = d.total > 0 && d.pct === bestDay.pct && bestDay.total > 0;
            return (
              <div key={d.day} className="flex items-center gap-3">
                <div className="w-7 shrink-0 font-mono text-[10px] text-muted-foreground">
                  {d.label}
                </div>
                <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-[oklch(1_0_0_/_0.06)]">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: d.total === 0 ? "0%" : `${d.pct}%`,
                      background: isBest ? "var(--color-primary)" : "oklch(1 0 0 / 0.22)",
                    }}
                  />
                </div>
                <div
                  className="w-9 shrink-0 text-right font-mono text-[10px]"
                  style={{
                    color: isBest ? "var(--color-primary)" : "var(--color-muted-foreground)",
                  }}
                >
                  {d.total === 0 ? "—" : `${d.pct}%`}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Personal Records */}
      <div
        className="rounded-2xl border border-border bg-card p-4"
        style={{ boxShadow: "var(--shadow-soft)" }}
      >
        <div className="mb-3 flex items-center gap-2">
          <Award className="size-3.5 text-muted-foreground" />
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Personal records
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              {
                label: "Longest streak",
                value: personalRecords.longestEver > 0 ? `${personalRecords.longestEver}d` : "—",
                icon: <Flame className="size-3.5" />,
                accent: true,
              },
              {
                label: "Best single day",
                value: personalRecords.bestDayCount > 0 ? `${personalRecords.bestDayCount}` : "—",
                icon: <CalendarCheck className="size-3.5" />,
                accent: false,
              },
              {
                label: "Best week",
                value: personalRecords.bestWeekPct > 0 ? `${personalRecords.bestWeekPct}%` : "—",
                icon: <TrendingUp className="size-3.5" />,
                accent: false,
              },
            ] as const
          ).map((r) => (
            <div
              key={r.label}
              className="flex flex-col items-center rounded-xl border border-border p-3 text-center"
              style={{ background: r.accent ? "var(--color-primary)" : "oklch(1 0 0 / 0.03)" }}
            >
              <div style={{ color: r.accent ? "white" : "var(--color-muted-foreground)" }}>
                {r.icon}
              </div>
              <div
                className="mt-1.5 font-display text-xl leading-none"
                style={{ color: r.accent ? "white" : "var(--color-foreground)" }}
              >
                {r.value}
              </div>
              <div
                className="mt-0.5 font-mono text-[8px] uppercase tracking-[0.1em]"
                style={{
                  color: r.accent ? "rgba(255,255,255,0.7)" : "var(--color-muted-foreground)",
                }}
              >
                {r.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 30-day heatmap */}
      <div
        className="rounded-2xl border border-border bg-card p-4"
        style={{ boxShadow: "var(--shadow-soft)" }}
      >
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Heatmap
            </div>
            <h3 className="mt-0.5 font-display text-lg text-foreground">Last 30 days</h3>
          </div>
          <div className="flex items-center gap-1">
            {[0.08, 0.3, 0.6, 1].map((o) => (
              <span
                key={o}
                className="size-3 rounded-sm"
                style={{ background: "var(--color-primary)", opacity: o }}
              />
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-1">
          {rollup30.map((d, i) => {
            const ratio = d.total ? d.done / d.total : 0;
            return (
              <div
                key={d.key}
                className="size-[18px] rounded-sm"
                title={`${d.key}: ${d.done}/${d.total}`}
                style={{
                  background: d.total === 0 ? "oklch(1 0 0 / 0.04)" : "var(--color-primary)",
                  opacity: d.total === 0 ? 1 : Math.max(0.08, ratio),
                  outline: i === rollup30.length - 1 ? "1.5px solid var(--color-primary)" : "none",
                  outlineOffset: 1,
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Status breakdown */}
      {habits.length > 0 && (
        <div
          className="rounded-2xl border border-border bg-card p-4"
          style={{ boxShadow: "var(--shadow-soft)" }}
        >
          <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Status breakdown
          </div>
          {(["ongoing", "upcoming", "finished", "pending"] as const).map((k) => {
            const statusColors = {
              ongoing: "#20A973",
              upcoming: "#5DA9E9",
              finished: "#7F52E0",
              pending: "#E48068",
            };
            const statusLabels = {
              ongoing: "In motion",
              upcoming: "Upcoming",
              finished: "Completed",
              pending: "Lapsed",
            };
            const count = counts[k];
            const total = Object.values(counts).reduce((a, v) => a + v, 0);
            const pct = total > 0 ? (count / total) * 100 : 0;
            return (
              <div key={k} className="mb-2">
                <div className="mb-1 flex items-center justify-between">
                  <span className="font-mono text-[9px] text-muted-foreground">
                    {statusLabels[k]}
                  </span>
                  <span className="font-mono text-[9px] text-foreground">{count}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-[oklch(1_0_0_/_0.06)]">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${pct}%`, background: statusColors[k] }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Per-habit breakdown */}
      {habits.length > 0 && (
        <div
          className="rounded-2xl border border-border bg-card overflow-hidden"
          style={{ boxShadow: "var(--shadow-soft)" }}
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Habit breakdown
            </div>
            <span className="font-mono text-[10px] text-muted-foreground">
              {habits.length} total
            </span>
          </div>
          <div className="divide-y divide-[oklch(1_0_0_/_0.05)]">
            {sortedExtended.map((item, i) => {
              const { habit: h, longestStreak, done, total, pct, currentStreak } = item;
              return (
                <button
                  key={h.id}
                  onClick={() => setOpenId(h.id)}
                  className="group flex w-full items-center gap-3 px-4 py-3 text-left active:bg-[oklch(1_0_0_/_0.03)]"
                >
                  <div
                    className="flex size-6 shrink-0 items-center justify-center rounded-md font-mono text-[9px] font-bold text-white"
                    style={{ background: h.color }}
                  >
                    {i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <HabitIcon
                          name={h.icon}
                          className="size-3 shrink-0"
                          style={{ color: h.color }}
                        />
                        <span className="truncate text-sm font-medium text-foreground">
                          {h.name}
                        </span>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        {currentStreak > 0 && (
                          <span
                            className="flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-mono text-[9px]"
                            style={{ background: `${h.color}20`, color: h.color }}
                          >
                            <Flame className="size-2.5" />
                            {currentStreak}d
                          </span>
                        )}
                        <span
                          className="font-mono text-xs font-semibold"
                          style={{ color: h.color }}
                        >
                          {Math.round(pct * 100)}%
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-[oklch(1_0_0_/_0.06)]">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${pct * 100}%`, background: h.color }}
                        />
                      </div>
                      <span className="shrink-0 font-mono text-[9px] text-muted-foreground">
                        {done}/{total}
                      </span>
                      {longestStreak > 0 && (
                        <span className="shrink-0 font-mono text-[9px] text-muted-foreground">
                          best {longestStreak}d
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-active:opacity-100" />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── tiny helpers ─── */
function QuickStat({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground">{icon}</span>
      <div>
        <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </div>
        <div
          className="font-display text-lg leading-none"
          style={accent ? { color: "var(--color-primary)" } : undefined}
        >
          {value}
        </div>
      </div>
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
        className="mt-0.5 font-display text-xl leading-none"
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
      <p className="mt-3 max-w-sm font-display text-xl leading-tight text-foreground">
        {copy[filter]}
      </p>
    </div>
  );
}

/* ─── TodayHabitList ─── */
function TodayHabitList({
  habits,
  dateKey,
  onToggle,
  onSaveNote,
  emptySlot,
  gridClass = "grid gap-2.5",
}: {
  habits: Habit[];
  dateKey: string;
  onToggle: (id: string) => void;
  onSaveNote: (id: string, note: string) => void;
  emptySlot?: React.ReactNode;
  gridClass?: string;
}) {
  if (habits.length === 0) return <>{emptySlot}</>;

  return (
    <div className={gridClass}>
      {habits.map((h) => (
        <TodayHabitRow
          key={h.id}
          habit={h}
          dateKey={dateKey}
          onToggle={onToggle}
          onSaveNote={onSaveNote}
        />
      ))}
    </div>
  );
}

/* ─── TodayHabitRow ─── */
function TodayHabitRow({
  habit: h,
  dateKey,
  onToggle,
  onSaveNote,
}: {
  habit: Habit;
  dateKey: string;
  onToggle: (id: string) => void;
  onSaveNote: (id: string, note: string) => void;
}) {
  const entry = h.track[dateKey];
  const firestoreDone = entry?.done ?? false;
  const inRange = entry !== undefined;
  const existingNote = entry?.note ?? "";
  const { pct } = progress(h);

  // ── Optimistic local done state ─────────────────────────
  // Separates completion state (Firestore) from display state (optimistic).
  // Celebrations fire ONLY in the click handler — never in useEffect watching done.
  const [localDone, setLocalDone] = useState(firestoreDone);

  // Sync from Firestore when data changes (date switch, page load, remote update).
  // This deliberately does NOT trigger any celebration side-effects.
  const firestoreDoneRef = useRef(firestoreDone);
  useEffect(() => {
    if (firestoreDone !== firestoreDoneRef.current) {
      firestoreDoneRef.current = firestoreDone;
      setLocalDone(firestoreDone);
    }
  }, [firestoreDone]);

  // Also sync whenever the dateKey changes (user switched to a different day)
  const prevDateKeyRef = useRef(dateKey);
  useEffect(() => {
    if (dateKey !== prevDateKeyRef.current) {
      prevDateKeyRef.current = dateKey;
      setLocalDone(firestoreDone);
    }
  }, [dateKey, firestoreDone]);

  const done = localDone;

  // ── Celebration state (UI-only, never persisted) ────────
  const { trigger: triggerConfetti } = useGlobalConfetti();
  const checkboxRef = useRef<HTMLButtonElement>(null);
  const [glowing, setGlowing] = useState(false);
  const [bouncing, setBouncing] = useState(false);

  useEffect(() => {
    if (!glowing) return;
    const id = setTimeout(() => setGlowing(false), 1350);
    return () => clearTimeout(id);
  }, [glowing]);

  useEffect(() => {
    if (!bouncing) return;
    const id = setTimeout(() => setBouncing(false), 700);
    return () => clearTimeout(id);
  }, [bouncing]);

  // ── Note editor ─────────────────────────────────────────
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState(existingNote);
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setNoteText(existingNote);
  }, [existingNote]);

  // ── Handlers ────────────────────────────────────────────
  const handleToggle = () => {
    if (!inRange) return;
    const completing = !done;
    // Optimistic update: instantly reflect in UI
    setLocalDone(completing);
    // Persist to Firestore
    onToggle(h.id);
    // Celebrations fire ONLY here — never in a useEffect watching done
    if (completing) {
      setGlowing(true);
      setBouncing(true);
      triggerConfetti(h.color, checkboxRef.current);
      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        playCompletionSound();
      }
      triggerHaptic();
    }
  };

  const toggleNote = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNoteOpen((prev) => {
      if (!prev) setTimeout(() => textareaRef.current?.focus(), 80);
      return !prev;
    });
  };

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setSaving(true);
    try {
      onSaveNote(h.id, noteText.trim());
    } finally {
      setSaving(false);
      setNoteOpen(false);
    }
  };

  const hasNote = existingNote.trim().length > 0;

  return (
    <div
      className="relative overflow-hidden rounded-2xl border transition-colors duration-300"
      style={{
        borderColor: done ? `${h.color}40` : "oklch(1 0 0 / 0.07)",
        background: done ? `${h.color}10` : "var(--color-card)",
        ["--glow-c" as string]: h.color,
        ["--glow-c-dim" as string]: h.color + "40",
        animation: glowing ? "row-glow 1.35s ease-out forwards" : undefined,
      }}
    >
      {/* Main row */}
      <div className="flex w-full items-center gap-3 p-4">
        {/* Checkbox button */}
        <button
          ref={checkboxRef}
          onClick={handleToggle}
          disabled={!inRange}
          className="shrink-0 disabled:opacity-50"
          style={{
            animation: bouncing
              ? "btn-complete 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) forwards"
              : undefined,
          }}
        >
          {done ? (
            <span
              style={{
                display: "inline-flex",
                animation: bouncing
                  ? "check-pop 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) forwards"
                  : undefined,
              }}
            >
              <CheckCircle2 className="size-6" style={{ color: h.color }} />
            </span>
          ) : (
            <Circle className="size-6 text-muted-foreground" />
          )}
        </button>

        {/* Name + description */}
        <div className="min-w-0 flex-1 cursor-pointer" onClick={handleToggle}>
          <div
            className="truncate font-medium text-foreground transition-all duration-200"
            style={{ textDecoration: done ? "line-through" : "none", opacity: done ? 0.55 : 1 }}
          >
            {h.name}
          </div>
          {h.description && (
            <div className="mt-0.5 truncate text-xs text-muted-foreground">{h.description}</div>
          )}
        </div>

        {/* Right side — note + progress */}
        <div className="flex shrink-0 items-center gap-2">
          {inRange && (
            <button
              onClick={toggleNote}
              className="relative rounded-lg p-1.5 transition-all hover:bg-[oklch(1_0_0_/_0.06)] active:scale-90"
              title={hasNote ? "Edit note" : "Add note"}
            >
              <StickyNote
                className="size-4"
                style={{
                  color: noteOpen ? h.color : hasNote ? h.color : "var(--color-muted-foreground)",
                  opacity: hasNote || noteOpen ? 1 : 0.6,
                }}
              />
              {hasNote && !noteOpen && (
                <span
                  className="absolute right-1 top-1 size-1.5 rounded-full"
                  style={{ background: h.color }}
                />
              )}
            </button>
          )}
          <div className="text-right">
            <div className="font-mono text-xs tabular-nums" style={{ color: h.color }}>
              {Math.round(pct * 100)}%
            </div>
            <div className="mt-0.5 h-1 w-12 overflow-hidden rounded-full bg-[oklch(1_0_0_/_0.08)]">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct * 100}%`, background: h.color }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Inline note editor */}
      {noteOpen && (
        <div
          className="border-t px-4 pb-4 pt-3"
          style={{ borderColor: `${h.color}25`, background: `${h.color}08` }}
        >
          <div className="mb-1.5 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            <StickyNote className="size-3" style={{ color: h.color }} /> Note for{" "}
            {dateKey === today() ? "today" : "this day"}
          </div>
          <textarea
            ref={textareaRef}
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="How did it go? Any reflection…"
            rows={3}
            className="w-full resize-none rounded-xl border border-border bg-[oklch(1_0_0_/_0.03)] px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 transition-colors"
            style={{ ["--tw-ring-color" as string]: h.color }}
            onKeyDown={(e) => {
              if (e.key === "Escape") setNoteOpen(false);
            }}
          />
          <div className="mt-2 flex items-center justify-between">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setNoteOpen(false);
                setNoteText(existingNote);
              }}
              className="rounded-lg px-3 py-1.5 text-xs text-muted-foreground transition-all hover:text-foreground active:scale-95"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg px-4 py-1.5 text-xs font-semibold text-white transition-all active:scale-95 disabled:opacity-40"
              style={{ background: h.color }}
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
