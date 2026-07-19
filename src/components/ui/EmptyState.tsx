/**
 * @file EmptyState.tsx
 * @description Full-height empty state shown when a habits filter returns no results.
 * @author Sathish Kumar
 */

import type { FilterId } from "@/types/app";

const COPY: Record<FilterId, string> = {
  ongoing: "No habits in motion. Start one and let momentum take care of the rest.",
  upcoming: "Nothing scheduled ahead. Plan your next commitment.",
  finished: "No completed habits yet. Stay consistent — they're coming.",
  pending: "Nothing lapsed. You're caught up.",
};

/**
 * Contextual empty-state card whose message is driven by the active filter.
 */
export function EmptyState({ filter }: { filter: FilterId }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/40 px-8 py-20 text-center">
      <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
        Empty
      </div>
      <p className="mt-3 max-w-sm font-display text-xl leading-tight text-foreground">
        {COPY[filter]}
      </p>
    </div>
  );
}
