/**
 * @file MobileProgress.tsx
 * @description Mobile "Progress" analytics panel. KPI grid, consistency score,
 * completion rhythm chart, day-of-week breakdown, personal records, activity
 * heatmap, and per-habit table — all optimised for narrow viewports.
 * @author Sathish Kumar
 */

import { useMemo } from "react";
import {
  Activity,
  ArrowUpDown,
  Award,
  CalendarCheck,
  ChevronRight,
  Flame,
  LayoutGrid,
  TrendingDown,
  TrendingUp,
  Trophy,
  Zap,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { HabitIcon } from "@/components/habits/HabitIcon";
import type { AppProps } from "@/hooks/use-app-data";
import type { ProgressRange, ProgressSort } from "@/types/app";

const STATUS_COLORS = {
  ongoing: "#20A973",
  upcoming: "#5DA9E9",
  finished: "#7F52E0",
  pending: "#E48068",
};
const STATUS_LABELS = {
  ongoing: "In motion",
  upcoming: "Upcoming",
  finished: "Completed",
  pending: "Lapsed",
};

type MobileProgressProps = Pick<
  AppProps,
  | "stats"
  | "rollup"
  | "rollup30"
  | "rollupMonthly"
  | "habits"
  | "counts"
  | "progressRange"
  | "setProgressRange"
  | "progressSort"
  | "setProgressSort"
  | "setOpenId"
  | "weekdayStats"
  | "periodComparison"
  | "consistencyScore"
  | "perHabitExtended"
  | "personalRecords"
>;

/**
 * Mobile analytics view. Mirrors DesktopProgress in content but uses a
 * single-column stacked layout with touch-friendly controls.
 */
export function MobileProgress({
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
}: MobileProgressProps) {
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
  const SORT_LABELS: Record<ProgressSort, string> = {
    pct: "Progress",
    streak: "Streak",
    name: "Name",
  };

  return (
    <div className="space-y-4 pb-6 pt-4">
      {/* Title + sort toggle */}
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
          {SORT_LABELS[progressSort]}
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

      {/* KPI 2×2 */}
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

      {/* Consistency score */}
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

      {/* Day-of-week */}
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

      {/* Personal records */}
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
            const count = counts[k];
            const total = Object.values(counts).reduce((a, v) => a + v, 0);
            const pct = total > 0 ? (count / total) * 100 : 0;
            return (
              <div key={k} className="mb-2">
                <div className="mb-1 flex items-center justify-between">
                  <span className="font-mono text-[9px] text-muted-foreground">
                    {STATUS_LABELS[k]}
                  </span>
                  <span className="font-mono text-[9px] text-foreground">{count}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-[oklch(1_0_0_/_0.06)]">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${pct}%`, background: STATUS_COLORS[k] }}
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
