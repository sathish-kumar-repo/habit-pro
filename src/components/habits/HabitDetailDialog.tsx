import { useEffect, useState, useRef } from "react";
import { Habit, progress, streak, fmtDate, setHabitNote, toggleHabitDay } from "@/lib/habits";
import { Flame, Calendar, Target, X, CheckCircle2, Circle, StickyNote } from "lucide-react";
import { Drawer, DrawerContent, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

type Props = {
  habit: Habit | null;
  onClose: () => void;
  onToggleDay: (id: string, day: string) => void;
};

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== "undefined" && window.innerWidth >= 1024,
  );
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isDesktop;
}

export function HabitDetailDialog({ habit, onClose, onToggleDay }: Props) {
  const isDesktop = useIsDesktop();
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const noteRef = useRef<HTMLTextAreaElement>(null);

  // Reset selected day when habit changes
  useEffect(() => {
    setSelectedDay(null);
    setNoteText("");
  }, [habit?.id]);

  // Populate note text when a day is selected
  useEffect(() => {
    if (selectedDay && habit) {
      setNoteText(habit.track[selectedDay]?.note ?? "");
      setTimeout(() => noteRef.current?.focus(), 80);
    }
  }, [selectedDay, habit]);

  if (!habit) return null;

  const { done, total, pct } = progress(habit);
  const s = streak(habit);
  const todayKey = fmtDate(new Date());
  const tDate = new Date();
  tDate.setHours(0, 0, 0, 0);

  const days = Object.keys(habit.track).sort(
    (a, b) => habit.track[a].date.getTime() - habit.track[b].date.getTime(),
  );
  const months: Record<string, string[]> = {};
  days.forEach((k) => {
    const d = habit.track[k].date;
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    (months[key] ||= []).push(k);
  });

  const selectedEntry = selectedDay ? habit.track[selectedDay] : null;
  const selectedIsFuture = selectedEntry
    ? (() => {
        const d = new Date(selectedEntry.date);
        d.setHours(0, 0, 0, 0);
        return d > tDate;
      })()
    : false;

  const handleDayClick = (dayKey: string) => {
    const entry = habit.track[dayKey];
    const eDate = new Date(entry.date);
    eDate.setHours(0, 0, 0, 0);
    if (eDate > tDate) return;
    setSelectedDay((prev) => (prev === dayKey ? null : dayKey));
  };

  const handleSaveNote = async () => {
    if (!selectedDay || !habit) return;
    setSavingNote(true);
    try {
      await setHabitNote(habit, selectedDay, noteText.trim());
    } finally {
      setSavingNote(false);
    }
  };

  const body = (
    <div className="flex-1 overflow-y-auto px-5 pb-6">
      {/* Header */}
      <div className="flex items-start justify-between pt-4 pb-2">
        <div className="min-w-0 flex-1 pr-4">
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            <span className="size-1.5 shrink-0 rounded-full" style={{ background: habit.color }} />
            {habit.startDate} → {habit.endDate}
          </div>
          {isDesktop ? (
            <>
              <DialogTitle className="mt-2 font-display text-3xl leading-tight text-foreground">
                {habit.name}
              </DialogTitle>
              <DialogDescription className="sr-only">
                Habit details for {habit.name}
              </DialogDescription>
            </>
          ) : (
            <>
              <DrawerTitle className="mt-2 font-display text-4xl leading-tight text-foreground">
                {habit.name}
              </DrawerTitle>
              <DrawerDescription className="sr-only">
                Habit details for {habit.name}
              </DrawerDescription>
            </>
          )}
        </div>
        <button
          onClick={onClose}
          className="mt-1 shrink-0 rounded-full p-2 text-muted-foreground transition-all hover:bg-secondary hover:text-foreground active:scale-95"
        >
          <X className="size-4" />
        </button>
      </div>

      {habit.description && (
        <p className="mb-4 text-sm leading-relaxed text-muted-foreground">{habit.description}</p>
      )}

      {/* Stats row */}
      <div className="mb-4 grid grid-cols-3 gap-2">
        <StatCard
          icon={<Flame className="size-4" style={{ color: habit.color }} />}
          label="Streak"
          value={`${s}d`}
        />
        <StatCard
          icon={<Target className="size-4 text-muted-foreground" />}
          label="Done"
          value={`${Math.round(pct * 100)}%`}
        />
        <StatCard
          icon={<Calendar className="size-4 text-muted-foreground" />}
          label="Days"
          value={`${done}/${total}`}
        />
      </div>

      {/* Progress bar */}
      <div className="mb-4 h-2 overflow-hidden rounded-full bg-[oklch(1_0_0_/_0.06)]">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct * 100}%`, background: habit.color }}
        />
      </div>

      {/* Plan */}
      {habit.plan && (
        <div className="mb-5 rounded-2xl border border-border bg-card p-4">
          <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            The plan
          </div>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
            {habit.plan}
          </p>
        </div>
      )}

      {/* Daily log */}
      <div>
        <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Daily log — click a day to toggle or add a note
        </div>

        {/* Selected day detail panel */}
        {selectedDay && selectedEntry && !selectedIsFuture && (
          <div
            className="mb-4 rounded-2xl border border-border bg-card p-4"
            style={{ borderColor: `${habit.color}40`, boxShadow: `0 0 0 1px ${habit.color}20` }}
          >
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  {new Date(selectedEntry.date).toLocaleDateString("en", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                </div>
                <div className="mt-0.5 text-sm font-medium text-foreground">
                  {selectedDay === todayKey ? "Today" : ""}
                </div>
              </div>
              {/* Toggle done button */}
              <button
                onClick={() => onToggleDay(habit.id, selectedDay)}
                className="flex items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-medium transition-all active:scale-95"
                style={
                  selectedEntry.done
                    ? { background: habit.color, color: "white", borderColor: habit.color }
                    : { borderColor: "oklch(1 0 0 / 0.12)", color: "var(--color-foreground)" }
                }
              >
                {selectedEntry.done ? (
                  <CheckCircle2 className="size-4" />
                ) : (
                  <Circle className="size-4 text-muted-foreground" />
                )}
                {selectedEntry.done ? "Done" : "Mark done"}
              </button>
            </div>

            {/* Note textarea */}
            <div>
              <div className="mb-1.5 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                <StickyNote className="size-3" /> Note for this day
              </div>
              <textarea
                ref={noteRef}
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="How did it go? Any reflection…"
                rows={3}
                className="w-full resize-none rounded-xl border border-border bg-[oklch(1_0_0_/_0.03)] px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] transition-colors"
              />
              <div className="mt-2 flex items-center justify-between">
                <span className="font-mono text-[10px] text-muted-foreground">
                  {noteText.length}/500
                </span>
                <button
                  onClick={handleSaveNote}
                  disabled={savingNote}
                  className="rounded-lg px-4 py-1.5 text-xs font-semibold text-white transition-all active:scale-95 disabled:opacity-40"
                  style={{ background: habit.color }}
                >
                  {savingNote ? "Saving…" : "Save note"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Month calendars */}
        <div className="space-y-5">
          {Object.entries(months).map(([k, keys]) => {
            const first = habit.track[keys[0]].date;
            const monthName = first.toLocaleString("en", { month: "long", year: "numeric" });
            return (
              <div key={k}>
                <div className="mb-3 flex items-center gap-3">
                  <h4 className="font-display text-lg text-foreground">{monthName}</h4>
                  <div className="hairline flex-1" />
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {keys.map((dayKey) => {
                    const entry = habit.track[dayKey];
                    const dNum = entry.date.getDate();
                    const isToday = dayKey === todayKey;
                    const isSelected = dayKey === selectedDay;
                    const eDate = new Date(entry.date);
                    eDate.setHours(0, 0, 0, 0);
                    const future = eDate > tDate;
                    const hasNote = entry.note && entry.note.trim().length > 0;
                    return (
                      <button
                        key={dayKey}
                        onClick={() => handleDayClick(dayKey)}
                        disabled={future}
                        className="relative flex flex-col items-center justify-center rounded-xl border text-sm font-medium transition-all active:scale-95 disabled:cursor-not-allowed"
                        style={{
                          background: isSelected
                            ? habit.color
                            : entry.done
                              ? `${habit.color}30`
                              : "oklch(1 0 0 / 0.03)",
                          borderColor: isSelected
                            ? habit.color
                            : isToday
                              ? habit.color
                              : "oklch(1 0 0 / 0.07)",
                          color: isSelected
                            ? "white"
                            : entry.done
                              ? "var(--color-foreground)"
                              : !future
                                ? "var(--color-foreground)"
                                : "var(--color-muted-foreground)",
                          opacity: future ? 0.3 : 1,
                          minHeight: 44,
                          paddingTop: hasNote ? 6 : undefined,
                          paddingBottom: hasNote ? 2 : undefined,
                        }}
                        title={future ? `${dayKey} · future` : hasNote ? entry.note : dayKey}
                      >
                        <span
                          className={future ? "line-through decoration-muted-foreground/40" : ""}
                        >
                          {dNum}
                        </span>
                        {/* Note dot indicator */}
                        {hasNote && (
                          <span
                            className="mt-0.5 size-1 rounded-full"
                            style={{ background: isSelected ? "white" : habit.color }}
                          />
                        )}
                        {/* Done checkmark */}
                        {entry.done && !isSelected && (
                          <span
                            className="absolute right-1 top-1 size-2 rounded-full"
                            style={{ background: habit.color }}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const footer = (
    <div
      className="border-t border-border px-5 py-4"
      style={{ paddingBottom: isDesktop ? undefined : "max(1rem, env(safe-area-inset-bottom))" }}
    >
      <button
        onClick={onClose}
        className="w-full rounded-xl border border-border py-3 text-sm font-medium text-muted-foreground transition-all hover:text-foreground active:scale-95"
      >
        Close
      </button>
    </div>
  );

  if (isDesktop) {
    return (
      <Dialog open={!!habit} onOpenChange={(o) => !o && onClose()}>
        <DialogContent
          className="border-border bg-[oklch(0.185_0.008_240)] p-0 sm:max-w-xl focus:outline-none"
          style={{
            borderRadius: "1.25rem",
            maxHeight: "85dvh",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {body}
          {footer}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={!!habit} onOpenChange={(o) => !o && onClose()} shouldScaleBackground={false}>
      <DrawerContent
        className="border-border bg-[oklch(0.185_0.008_240)] focus:outline-none"
        style={{ maxHeight: "96dvh" }}
      >
        <div className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-[oklch(1_0_0_/_0.15)]" />
        {body}
        {footer}
      </DrawerContent>
    </Drawer>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3 text-center">
      <div className="mb-1 flex items-center justify-center">{icon}</div>
      <div className="font-display text-xl text-foreground">{value}</div>
      <div className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">
        {label}
      </div>
    </div>
  );
}
