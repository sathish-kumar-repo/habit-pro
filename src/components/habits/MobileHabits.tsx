/**
 * @file MobileHabits.tsx
 * @description Mobile "Habits" panel. Horizontally-scrollable filter pills,
 * search input, and a stacked list of HabitCards.
 * @author Sathish Kumar
 */

import { Search, X } from "lucide-react";
import { FILTERS } from "@/types/app";
import type { AppProps } from "@/hooks/use-app-data";
import { HabitCard } from "@/components/habits/HabitCard";
import { EmptyState } from "@/components/ui/EmptyState";

type MobileHabitsProps = Pick<
  AppProps,
  | "filter" | "setFilter" | "counts" | "filtered"
  | "toggleToday" | "setOpenId" | "setEditId" | "handleDelete"
  | "habitSearch" | "setHabitSearch"
>;

/**
 * Mobile-optimized habits view with touch-friendly scrollable filter pills.
 */
export function MobileHabits({
  filter, setFilter, counts, filtered,
  toggleToday, setOpenId, setEditId, handleDelete,
  habitSearch, setHabitSearch,
}: MobileHabitsProps) {
  return (
    <div className="space-y-4 pb-6 pt-5">
      {/* Filter pills */}
      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className="shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-all active:scale-95"
            style={
              filter === f.id
                ? { background: "var(--color-primary)", color: "var(--color-primary-foreground)", borderColor: "var(--color-primary)" }
                : { borderColor: "oklch(1 0 0 / 0.08)", color: "var(--color-muted-foreground)", background: "var(--color-card)" }
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
          type="search"
          value={habitSearch}
          onChange={(e) => setHabitSearch(e.target.value)}
          placeholder="Search habits…"
          aria-label="Search habits"
          className="w-full rounded-xl border py-2 pl-9 pr-8 text-sm outline-none"
          style={{ background: "var(--color-card)", borderColor: "oklch(1 0 0 / 0.08)", color: "var(--color-foreground)" }}
        />
        {habitSearch && (
          <button onClick={() => setHabitSearch("")} aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
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
          <span>{filtered.length} {filtered.length === 1 ? "habit" : "habits"}</span>
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
