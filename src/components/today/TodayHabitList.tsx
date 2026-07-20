/**
 * @file TodayHabitList.tsx
 * @description Sorted habit check-off list for a selected date. Incomplete habits
 * appear first; completed habits sink to the bottom. Includes the TodayHabitRow
 * sub-component with optimistic toggle, note editor, and celebration effects.
 * @author Sathish Kumar
 */

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Circle, StickyNote } from "lucide-react";
import type { Habit } from "@/lib/habits";
import { progress, today } from "@/lib/habits";
import { useGlobalConfetti } from "@/hooks/use-global-confetti";
import { playCompletionSound, triggerHaptic } from "@/lib/completion-fx";

// ─── TodayHabitList ──────────────────────────────────────────────────────────

interface TodayHabitListProps {
  habits: Habit[];
  dateKey: string;
  onToggle: (id: string) => void;
  onSaveNote: (id: string, note: string) => void;
  emptySlot?: React.ReactNode;
  gridClass?: string;
}

/**
 * Renders a grid of TodayHabitRow cards sorted so incomplete habits always
 * appear before completed ones.
 */
export function TodayHabitList({
  habits,
  dateKey,
  onToggle,
  onSaveNote,
  emptySlot,
  gridClass = "grid gap-2.5",
}: TodayHabitListProps) {
  if (habits.length === 0) return <>{emptySlot}</>;

  const sorted = [...habits].sort((a, b) => {
    const aDone = a.track[dateKey]?.done ? 1 : 0;
    const bDone = b.track[dateKey]?.done ? 1 : 0;
    return aDone - bDone;
  });

  return (
    <div className={gridClass}>
      {sorted.map((h) => (
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

// ─── TodayHabitRow ───────────────────────────────────────────────────────────

interface TodayHabitRowProps {
  habit: Habit;
  dateKey: string;
  onToggle: (id: string) => void;
  onSaveNote: (id: string, note: string) => void;
}

/**
 * A single habit row with:
 * - Optimistic toggle (instant UI, async Firestore write)
 * - Confetti + sound + haptic on completion
 * - Inline sticky-note editor
 */
function TodayHabitRow({ habit: h, dateKey, onToggle, onSaveNote }: TodayHabitRowProps) {
  const entry = h.track[dateKey];
  const firestoreDone = entry?.done ?? false;
  const inRange = entry !== undefined;
  const existingNote = entry?.note ?? "";
  const { pct } = progress(h);

  // ── Optimistic done state ─────────────────────────────────────────────────
  // Celebrations fire ONLY in the click handler — never in a useEffect watching done.
  const [localDone, setLocalDone] = useState(firestoreDone);

  const firestoreDoneRef = useRef(firestoreDone);
  useEffect(() => {
    if (firestoreDone !== firestoreDoneRef.current) {
      firestoreDoneRef.current = firestoreDone;
      setLocalDone(firestoreDone);
    }
  }, [firestoreDone]);

  const prevDateKeyRef = useRef(dateKey);
  useEffect(() => {
    if (dateKey !== prevDateKeyRef.current) {
      prevDateKeyRef.current = dateKey;
      setLocalDone(firestoreDone);
    }
  }, [dateKey, firestoreDone]);

  const done = localDone;

  // ── Celebration state ─────────────────────────────────────────────────────
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

  // ── Note editor ───────────────────────────────────────────────────────────
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState(existingNote);
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setNoteText(existingNote);
  }, [existingNote]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleToggle = () => {
    if (!inRange) return;
    const completing = !done;
    setLocalDone(completing);
    onToggle(h.id);
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
        <button
          ref={checkboxRef}
          onClick={handleToggle}
          disabled={!inRange}
          aria-label={done ? `Mark ${h.name} incomplete` : `Complete ${h.name}`}
          aria-pressed={done}
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

        <div className="flex shrink-0 items-center gap-2">
          {inRange && (
            <button
              onClick={toggleNote}
              className="relative rounded-lg p-1.5 transition-all hover:bg-[oklch(1_0_0_/_0.06)] active:scale-90"
              title={hasNote ? "Edit note" : "Add note"}
              aria-label={hasNote ? "Edit note" : "Add note"}
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
            <StickyNote className="size-3" style={{ color: h.color }} />
            Note for {dateKey === today() ? "today" : "this day"}
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
