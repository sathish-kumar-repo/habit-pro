/**
 * @file DesktopProgress.tsx
 * @description Desktop "My Progress" analytics panel. KPI cards, completion
 * rhythm bar chart, day-of-week heatmap, per-habit breakdown table, personal
 * records, status distribution, and a 30-day activity heatmap.
 * @author Sathish Kumar
 */

import { useMemo, useState } from "react";
import {
  Activity, ArrowUpDown, Award, CalendarCheck, Flame,
  LayoutGrid, TrendingDown, TrendingUp, Trophy, Zap,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { HabitIcon } from "@/components/habits/HabitIcon";
import type { AppProps } from "@/hooks/use-app-data";
import type { ProgressRange, ProgressSort } from "@/types/app";

const STATUS_COLORS = { ongoing: "#20A973", upcoming: "#5DA9E9", finished: "#7F52E0", pending: "#E48068" };
const STATUS_LABELS = { ongoing: "In motion", upcoming: "Upcoming", finished: "Completed", pending: "Lapsed" };
const RANGE_LABELS: Record<string, string> = { "7d": "Last 7 days", "30d": "Last 30 days", all: "All time" };
const SORT_LABELS: Record<string, string> = { pct: "By progress", streak: "By streak", name: "By name" };
const SORT_OPTIONS: ProgressSort[] = ["pct", "streak", "name"];

/**
 * Rich analytics view for desktop. All metrics are derived from the shared
 * AppProps hook data — no local data fetching.
 */
export function DesktopProgress({
  stats, rollup, rollup30, rollupMonthly, habits, counts,
  progressRange, setProgressRange, progressSort, setProgressSort,
  setOpenId, weekdayStats, periodComparison, consistencyScore,
  perHabitExtended, personalRecords,
}: AppProps) {
  const [sortOpen, setSortOpen] = useState(false);

  const chartData = useMemo(() => {
    const raw = progressRange === "7d" ? rollup : progressRange === "30d" ? rollup30 : rollupMonthly;
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
  const delta = progressRange === "7d" ? periodComparison.delta7 : progressRange === "30d" ? periodComparison.delta30 : 0;
  const showDelta = progressRange !== "all";
  const bestDay = weekdayStats.reduce((b, d) => (d.total > 0 && d.pct > b.pct ? d : b), { ...weekdayStats[0] });

  const scoreR = 36, scoreCirc = 2 * Math.PI * scoreR;
  const scoreDash = scoreCirc * (1 - consistencyScore / 100);
  const scoreColor = consistencyScore >= 80 ? "var(--color-primary)" : consistencyScore >= 55 ? "#E4A12B" : "#E48068";
  const scoreTier = consistencyScore >= 85 ? "Elite" : consistencyScore >= 65 ? "Strong" : consistencyScore >= 40 ? "Building" : habits.length > 0 ? "Starting" : "—";
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
              style={progressRange === r
                ? { background: "var(--color-primary)", color: "var(--color-primary-foreground)" }
                : { color: "var(--color-muted-foreground)" }}
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
            {SORT_LABELS[progressSort]}
          </button>
          {sortOpen && (
            <div
              className="absolute right-0 top-full z-50 mt-1.5 min-w-[140px] overflow-hidden rounded-xl border border-border bg-card shadow-lg"
              onMouseLeave={() => setSortOpen(false)}
            >
              {SORT_OPTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => { setProgressSort(s); setSortOpen(false); }}
                  className="flex w-full items-center justify-between px-4 py-2.5 text-xs transition-colors hover:bg-[oklch(1_0_0_/_0.04)]"
                  style={{ color: progressSort === s ? "var(--color-primary)" : "var(--color-foreground)" }}
                >
                  {SORT_LABELS[s]}
                  {progressSort === s && <span className="size-1.5 rounded-full" style={{ background: "var(--color-primary)" }} />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── KPI row ── */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-5">
        {/* Total */}
        <div className="rounded-2xl border border-border bg-card p-5" style={{ boxShadow: "var(--shadow-soft)" }}>
          <LayoutGrid className="size-4 text-muted-foreground" />
          <div className="mt-3 font-display text-4xl leading-none xl:text-5xl">{stats.total}</div>
          <div className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Habits tracked</div>
          <div className="mt-0.5 text-xs text-muted-foreground">all time</div>
        </div>
        {/* Active */}
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-5" style={{ boxShadow: "var(--shadow-soft)" }}>
          <div className="pointer-events-none absolute inset-0 opacity-[0.06]" style={{ background: "radial-gradient(circle at top right, var(--color-primary) 0%, transparent 70%)" }} />
          <Zap className="size-4" style={{ color: "var(--color-primary)" }} />
          <div className="mt-3 font-display text-4xl leading-none xl:text-5xl" style={{ color: "var(--color-primary)" }}>{stats.active}</div>
          <div className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">In motion</div>
          <div className="mt-0.5 text-xs text-muted-foreground">active now</div>
        </div>
        {/* Completion rate */}
        <div className="rounded-2xl border border-border bg-card p-5" style={{ boxShadow: "var(--shadow-soft)" }}>
          <div className="flex items-center justify-between">
            <Activity className="size-4 text-muted-foreground" />
            {showDelta && delta !== 0 && (
              <span
                className="flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-mono text-[9px] font-medium"
                style={{ background: delta > 0 ? "oklch(0.62 0.16 158 / 0.15)" : "oklch(0.55 0.2 25 / 0.15)", color: delta > 0 ? "#20A973" : "#E48068" }}
              >
                {delta > 0 ? <TrendingUp className="size-2.5" /> : <TrendingDown className="size-2.5" />}
                {delta > 0 ? "+" : ""}{delta}%
              </span>
            )}
          </div>
          <div className="mt-3 font-display text-4xl leading-none xl:text-5xl">{overallPct}%</div>
          <div className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Completion rate</div>
          <div className="mt-0.5 text-xs text-muted-foreground">{showDelta ? "vs prev period" : "all time avg"}</div>
        </div>
        {/* Longest streak */}
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-5" style={{ boxShadow: "var(--shadow-soft)" }}>
          <div className="pointer-events-none absolute inset-0 opacity-[0.06]" style={{ background: "radial-gradient(circle at top right, var(--color-primary) 0%, transparent 70%)" }} />
          <Trophy className="size-4" style={{ color: "var(--color-primary)" }} />
          <div className="mt-3 font-display text-4xl leading-none xl:text-5xl" style={{ color: "var(--color-primary)" }}>{personalRecords.longestEver}d</div>
          <div className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Longest streak</div>
          <div className="mt-0.5 text-xs text-muted-foreground">personal record</div>
        </div>
        {/* Consistency score */}
        <div className="rounded-2xl border border-border bg-card p-5 flex flex-col" style={{ boxShadow: "var(--shadow-soft)" }}>
          <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Consistency</div>
          <div className="flex flex-1 items-center gap-3 mt-3">
            <svg width={80} height={80} viewBox="0 0 88 88" className="shrink-0">
              <circle cx="44" cy="44" r={scoreR} fill="none" stroke="oklch(1 0 0 / 0.06)" strokeWidth={7} />
              <circle cx="44" cy="44" r={scoreR} fill="none" stroke={scoreColor} strokeWidth={7} strokeLinecap="round"
                strokeDasharray={scoreCirc} strokeDashoffset={scoreDash} transform="rotate(-90 44 44)"
                style={{ transition: "stroke-dashoffset 0.8s ease" }}
              />
              <text x="44" y="50" textAnchor="middle" fill="white" fontSize="17" fontFamily="var(--font-display)" fontWeight="700">{consistencyScore}</text>
            </svg>
            <div>
              <div className="font-display text-xl leading-none" style={{ color: scoreColor }}>{scoreTier}</div>
              <div className="mt-1 font-mono text-[8px] uppercase tracking-[0.12em] text-muted-foreground">/ 100 pts</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Chart + Day-of-week ── */}
      <div className="grid gap-5 xl:grid-cols-[1fr_280px]">
        <div className="rounded-2xl border border-border bg-card p-6" style={{ boxShadow: "var(--shadow-soft)" }}>
          <div className="mb-5 flex items-end justify-between">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{RANGE_LABELS[progressRange]}</div>
              <h3 className="mt-0.5 font-display text-2xl text-foreground">Completion rhythm</h3>
            </div>
            <div className="text-right">
              <div className="font-display text-3xl leading-none" style={{ color: "var(--color-primary)" }}>{overallPct}%</div>
              <div className="font-mono text-[10px] text-muted-foreground">{totalDone}/{totalPossible} done</div>
            </div>
          </div>
          {chartData.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">No data for this range</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData} barCategoryGap={chartData.length > 20 ? "15%" : "28%"} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "oklch(0.55 0.01 240)", fontSize: 9, fontFamily: "monospace" }} interval={chartData.length > 15 ? "preserveStartEnd" : 0} />
                <YAxis hide domain={[0, 100]} />
                <Tooltip cursor={{ fill: "oklch(1 0 0 / 0.03)" }} content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload as { done: number; total: number; ratio: number };
                  return (
                    <div className="rounded-xl border border-border bg-card px-3 py-2 text-xs shadow-lg">
                      <div className="font-medium text-foreground">{label || `${d.done}/${d.total}`}</div>
                      <div className="mt-0.5 font-mono text-muted-foreground">{d.done}/{d.total} · {d.ratio}%</div>
                    </div>
                  );
                }} />
                <Bar dataKey="ratio" radius={[4, 4, 0, 0]} maxBarSize={40}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={i === chartData.length - 1 ? "var(--color-primary)" : entry.ratio >= 80 ? "oklch(0.62 0.16 158 / 0.65)" : entry.ratio >= 50 ? "oklch(1 0 0 / 0.18)" : "oklch(1 0 0 / 0.07)"} />
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

        {/* Day-of-week */}
        <div className="rounded-2xl border border-border bg-card p-5" style={{ boxShadow: "var(--shadow-soft)" }}>
          <div className="mb-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Patterns</div>
            <h3 className="mt-0.5 font-display text-xl text-foreground">Best days</h3>
            {bestDay.total > 0 && (
              <div className="mt-1 flex items-center gap-1.5">
                <span className="font-mono text-[9px] text-muted-foreground">Peak day:</span>
                <span className="font-mono text-[9px] font-semibold" style={{ color: "var(--color-primary)" }}>{bestDay.label} · {bestDay.pct}%</span>
              </div>
            )}
          </div>
          <div className="space-y-3">
            {weekdayStats.map((d) => {
              const isBest = d.total > 0 && d.pct === bestDay.pct && bestDay.total > 0;
              return (
                <div key={d.day} className="flex items-center gap-3">
                  <div className="w-8 shrink-0 font-mono text-[10px] text-muted-foreground">{d.label}</div>
                  <div className="flex-1 h-2 overflow-hidden rounded-full bg-[oklch(1_0_0_/_0.06)]">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: d.total === 0 ? "0%" : `${d.pct}%`, background: isBest ? "var(--color-primary)" : "oklch(1 0 0 / 0.22)" }} />
                  </div>
                  <div className="w-9 shrink-0 text-right font-mono text-[10px]" style={{ color: isBest ? "var(--color-primary)" : "var(--color-muted-foreground)" }}>
                    {d.total === 0 ? "—" : `${d.pct}%`}
                  </div>
                </div>
              );
            })}
          </div>
          {weekdayStats.every((d) => d.total === 0) && (
            <div className="mt-3 text-center text-xs text-muted-foreground">Track habits to see patterns</div>
          )}
        </div>
      </div>

      {/* ── Habit table + Records + Status ── */}
      <div className="grid gap-5 xl:grid-cols-[1fr_268px]">
        <div className="flex flex-col rounded-2xl border border-border bg-card" style={{ boxShadow: "var(--shadow-soft)" }}>
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Habit breakdown</div>
            <span className="font-mono text-[10px] text-muted-foreground">{habits.length} total</span>
          </div>
          {habits.length === 0 ? (
            <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">No habits yet</div>
          ) : (
            <>
              <div className="grid grid-cols-[1fr_60px_60px_52px_48px] items-center border-b border-border px-5 py-2">
                {[["Habit", "left"], ["Streak", "right"], ["Best", "right"], ["Rate", "right"], ["Left", "right"]].map(([h, align]) => (
                  <div key={h} className={`font-mono text-[8px] uppercase tracking-[0.15em] text-muted-foreground text-${align}`}>{h}</div>
                ))}
              </div>
              <div className="flex-1 overflow-y-auto divide-y divide-[oklch(1_0_0_/_0.04)]">
                {sortedExtended.map((item, i) => {
                  const { habit: h, longestStreak, daysRemaining, done, total, pct, currentStreak } = item;
                  return (
                    <button key={h.id} onClick={() => setOpenId(h.id)} className="group w-full grid grid-cols-[1fr_60px_60px_52px_48px] items-center px-4 py-3 text-left transition-all hover:bg-[oklch(1_0_0_/_0.03)]">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex size-7 shrink-0 items-center justify-center rounded-lg font-mono text-[9px] text-white" style={{ background: h.color }}>{i + 1}</div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <HabitIcon name={h.icon} className="size-3 shrink-0" style={{ color: h.color }} />
                            <span className="truncate text-sm font-medium text-foreground">{h.name}</span>
                          </div>
                          <div className="h-1 mt-1.5 overflow-hidden rounded-full bg-[oklch(1_0_0_/_0.06)]">
                            <div className="h-full rounded-full" style={{ width: `${pct * 100}%`, background: h.color }} />
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        {currentStreak > 0 ? (
                          <span className="flex items-center justify-end gap-0.5 font-mono text-[10px]" style={{ color: h.color }}><Flame className="size-2.5" />{currentStreak}d</span>
                        ) : <span className="font-mono text-[10px] text-muted-foreground">—</span>}
                      </div>
                      <div className="text-right font-mono text-[10px] text-muted-foreground">{longestStreak > 0 ? `${longestStreak}d` : "—"}</div>
                      <div className="text-right font-mono text-xs font-semibold" style={{ color: h.color }}>{Math.round(pct * 100)}%</div>
                      <div className="text-right font-mono text-[10px] text-muted-foreground">
                        {daysRemaining > 0 ? `${daysRemaining}d` : <span style={{ color: "var(--color-primary)" }}>✓</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div className="space-y-5">
          {/* Personal records */}
          <div className="rounded-2xl border border-border bg-card p-5" style={{ boxShadow: "var(--shadow-soft)" }}>
            <div className="mb-4 flex items-center gap-2">
              <Award className="size-3.5 text-muted-foreground" />
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Personal records</div>
            </div>
            <div className="space-y-4">
              {([
                { label: "Longest streak", value: personalRecords.longestEver > 0 ? `${personalRecords.longestEver} days` : "—", icon: <Flame className="size-3.5" />, accent: true },
                { label: "Best single day", value: personalRecords.bestDayCount > 0 ? `${personalRecords.bestDayCount} habits` : "—", icon: <CalendarCheck className="size-3.5" />, accent: false },
                { label: "Best 7-day week", value: personalRecords.bestWeekPct > 0 ? `${personalRecords.bestWeekPct}%` : "—", icon: <TrendingUp className="size-3.5" />, accent: false },
              ] as const).map((r) => (
                <div key={r.label} className="flex items-center gap-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-xl" style={{ background: r.accent ? "var(--color-primary)" : "oklch(1 0 0 / 0.06)", color: r.accent ? "white" : "var(--color-muted-foreground)" }}>{r.icon}</div>
                  <div className="min-w-0">
                    <div className="font-mono text-[8px] uppercase tracking-[0.12em] text-muted-foreground">{r.label}</div>
                    <div className="font-display text-lg leading-tight text-foreground">{r.value}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Status distribution */}
          <div className="rounded-2xl border border-border bg-card p-5" style={{ boxShadow: "var(--shadow-soft)" }}>
            <div className="mb-4 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Status breakdown</div>
            <div className="space-y-2.5">
              {(["ongoing", "upcoming", "finished", "pending"] as const).map((k) => {
                const count = counts[k];
                const pct = statusTotal > 0 ? (count / statusTotal) * 100 : 0;
                return (
                  <div key={k}>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="font-mono text-[9px] text-muted-foreground">{STATUS_LABELS[k]}</span>
                      <span className="font-mono text-[9px] font-medium text-foreground">{count}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-[oklch(1_0_0_/_0.06)]">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: STATUS_COLORS[k] }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1">
              {(["ongoing", "upcoming", "finished", "pending"] as const).map((k) => (
                <div key={k} className="flex items-center gap-1">
                  <span className="size-1.5 rounded-full" style={{ background: STATUS_COLORS[k] }} />
                  <span className="font-mono text-[8px] text-muted-foreground">{STATUS_LABELS[k]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── 30-day heatmap ── */}
      <div className="rounded-2xl border border-border bg-card p-6" style={{ boxShadow: "var(--shadow-soft)" }}>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Heatmap</div>
            <h3 className="mt-0.5 font-display text-xl text-foreground">Last 30 days</h3>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[8px] text-muted-foreground">Less</span>
            {[0.05, 0.25, 0.5, 0.75, 1].map((o) => <span key={o} className="size-3 rounded-sm" style={{ background: "var(--color-primary)", opacity: o }} />)}
            <span className="font-mono text-[8px] text-muted-foreground">More</span>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          {rollup30.map((d, i) => {
            const ratio = d.total ? d.done / d.total : 0;
            return (
              <div key={d.key} className="group relative" title={`${d.key}: ${d.done}/${d.total} (${Math.round(ratio * 100)}%)`}>
                <div className="size-5 rounded-sm transition-all" style={{ background: d.total === 0 ? "oklch(1 0 0 / 0.04)" : "var(--color-primary)", opacity: d.total === 0 ? 1 : Math.max(0.1, ratio), outline: i === rollup30.length - 1 ? "2px solid var(--color-primary)" : "none", outlineOffset: 2 }} />
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex items-center gap-6 font-mono text-[9px] text-muted-foreground">
          {rollup30.filter((d) => d.label).map((d) => <span key={d.key}>{d.label}</span>)}
        </div>
      </div>
    </div>
  );
}
