/**
 * @file use-app-data.ts
 * @description Central data-orchestration hook. Owns all Firestore subscriptions,
 * derived memoized computations, and action handlers shared across Desktop and
 * Mobile layouts.
 *
 * All subscriptions are scoped to the authenticated user's uid — no data
 * leaks between accounts.
 */

import { useEffect, useMemo, useState } from "react";
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
import { Todo, subscribeTodos } from "@/lib/todos";
import type { FilterId, AppTab, ProgressRange, ProgressSort } from "@/types/app";

export function useAppData(uid: string) {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitsLoading, setHabitsLoading] = useState(true);
  const [habitsError, setHabitsError] = useState<string | null>(null);

  const [todos, setTodos] = useState<Todo[]>([]);
  const [todosLoading, setTodosLoading] = useState(true);
  const [todosError, setTodosError] = useState<string | null>(null);

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

  // Subscribe to the authenticated user's habits
  useEffect(() => {
    if (!uid) return;
    setHabitsLoading(true);
    setHabitsError(null);
    const unsub = subscribeHabits(
      uid,
      (data) => {
        setHabits(data);
        setHabitsLoading(false);
      },
      (err) => {
        setHabitsError(err.message ?? "Failed to load habits");
        setHabitsLoading(false);
      },
    );
    return unsub;
  }, [uid]);

  // Subscribe to the authenticated user's todos
  useEffect(() => {
    if (!uid) return;
    setTodosLoading(true);
    setTodosError(null);
    const unsub = subscribeTodos(
      uid,
      (data) => {
        setTodos(data);
        setTodosLoading(false);
      },
      (err) => {
        setTodosError(err.message ?? "Failed to load todos");
        setTodosLoading(false);
      },
    );
    return unsub;
  }, [uid]);

  const selectedDateKey = useMemo(() => fmtDate(selectedDate), [selectedDate]);

  const counts = useMemo(() => {
    const c: Record<FilterId, number> = { ongoing: 0, upcoming: 0, finished: 0, pending: 0 };
    habits.forEach((h) => {
      c[classify(h)]++;
    });
    return c;
  }, [habits]);

  const filtered = useMemo(() => {
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

  const handleDelete = (id: string) => void deleteHabitFs(uid, id);

  const toggleToday = (id: string) => {
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    if (selectedDate > todayDate) return;
    const h = habits.find((h) => h.id === id);
    if (h) void toggleHabitDay(uid, h, selectedDateKey);
  };

  const toggleDay = (id: string, day: string) => {
    const targetDate = new Date(day);
    targetDate.setHours(0, 0, 0, 0);
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    if (targetDate > todayDate) return;
    const h = habits.find((h) => h.id === id);
    if (h) void toggleHabitDay(uid, h, day);
  };

  const saveNote = (id: string, note: string) => {
    const h = habits.find((h) => h.id === id);
    if (h) void setHabitNote(uid, h, selectedDateKey, note);
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
    habitsError,
    todosLoading,
    todosError,
  };
}

/** Inferred shape of everything useAppData returns — used as the shared prop contract. */
export type AppProps = ReturnType<typeof useAppData>;
