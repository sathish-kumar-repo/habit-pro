/**
 * @file DesktopHabits.tsx
 * @description Desktop "My Habits" panel. Displays filter pills, a search input,
 * and a responsive grid of HabitCards.
 * @author Sathish Kumar
 */

import { Search, X } from "lucide-react";
import { FILTERS } from "@/types/app";
import type { AppProps } from "@/hooks/use-app-data";
import { HabitCard } from "@/components/habits/HabitCard";
import { EmptyState } from "@/components/ui/EmptyState";

/**
 * Full-width desktop habits management view. Supports filter tabs, fuzzy search,
 * and opens the detail or edit drawer via callbacks.
 */
export function DesktopHabits({
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
          type="search"
          value={habitSearch}
          onChange={(e) => setHabitSearch(e.target.value)}
          placeholder="Search habits…"
          aria-label="Search habits"
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
            aria-label="Clear search"
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
