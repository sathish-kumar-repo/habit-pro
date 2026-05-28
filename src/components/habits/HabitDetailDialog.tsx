import { useEffect, useState, useRef, useMemo } from "react";
import { Habit, progress, streak, fmtDate, setHabitNote, toggleHabitDay } from "@/lib/habits";
import {
  Flame,
  Target,
  X,
  CheckCircle2,
  Circle,
  ChevronLeft,
  ChevronRight,
  StickyNote,
  CalendarDays,
  BookOpen,
} from "lucide-react";
import { HabitIcon } from "./HabitIcon";
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

/** Returns a hex color darkened by `amount` (0–1) */
function darken(hex: string, amount: number): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = Math.max(0, Math.round(((n >> 16) & 0xff) * (1 - amount)));
  const g = Math.max(0, Math.round(((n >> 8) & 0xff) * (1 - amount)));
  const b = Math.max(0, Math.round((n & 0xff) * (1 - amount)));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type CalCell =
  | { type: "empty" }
  | {
      type: "day";
      dayOfMonth: number;
      date: Date;
      dayKey: string;
      isHabitDay: boolean;
      isFuture: boolean;
      isToday: boolean;
      done: boolean;
      note: string;
    };

function buildCalendarGrid(year: number, month: number, habit: Habit, today: Date): CalCell[] {
  const firstOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = firstOfMonth.getDay(); // 0=Sun
  const cells: CalCell[] = [];

  for (let i = 0; i < startOffset; i++) cells.push({ type: "empty" });

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    date.setHours(0, 0, 0, 0);
    const dayKey = fmtDate(date);
    const entry = habit.track[dayKey];
    const isFuture = date > today;
    const isToday = date.getTime() === today.getTime();

    cells.push({
      type: "day",
      dayOfMonth: d,
      date,
      dayKey,
      isHabitDay: !!entry,
      isFuture,
      isToday,
      done: entry?.done ?? false,
      note: entry?.note ?? "",
    });
  }

  return cells;
}

export function HabitDetailDialog({ habit, onClose, onToggleDay }: Props) {
  const isDesktop = useIsDesktop();
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [viewYear, setViewYear] = useState(0);
  const [viewMonth, setViewMonth] = useState(0);
  const [planExpanded, setPlanExpanded] = useState(false);
  const noteRef = useRef<HTMLTextAreaElement>(null);

  const todayDate = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const todayKey = useMemo(() => fmtDate(new Date()), []);

  // When habit changes, reset to the "best" default month
  useEffect(() => {
    if (!habit) return;
    setSelectedDay(null);
    setNoteText("");
    setPlanExpanded(false);

    const now = new Date();
    // Find the range of months in this habit
    const keys = Object.keys(habit.track);
    if (keys.length === 0) {
      setViewYear(now.getFullYear());
      setViewMonth(now.getMonth());
      return;
    }
    // Default to current month if it overlaps the habit, else first habit month
    const firstEntry = habit.track[keys[0]];
    const lastEntry = habit.track[keys[keys.length - 1]];
    const habitStart = new Date(firstEntry.date);
    const habitEnd = new Date(lastEntry.date);

    if (now >= habitStart && now <= habitEnd) {
      setViewYear(now.getFullYear());
      setViewMonth(now.getMonth());
    } else if (now > habitEnd) {
      setViewYear(habitEnd.getFullYear());
      setViewMonth(habitEnd.getMonth());
    } else {
      setViewYear(habitStart.getFullYear());
      setViewMonth(habitStart.getMonth());
    }
  }, [habit?.id]);

  // Populate note text when a day is selected
  useEffect(() => {
    if (selectedDay && habit) {
      setNoteText(habit.track[selectedDay]?.note ?? "");
      setTimeout(() => noteRef.current?.focus(), 120);
    }
  }, [selectedDay, habit]);

  if (!habit) return null;

  const { done, total, pct } = progress(habit);
  const s = streak(habit);
  const color = habit.color;
  const colorDark = darken(color, 0.35);

  // Calendar navigation bounds
  const allKeys = Object.keys(habit.track).sort();
  const firstDate = allKeys.length ? new Date(habit.track[allKeys[0]].date) : new Date();
  const lastDate = allKeys.length
    ? new Date(habit.track[allKeys[allKeys.length - 1]].date)
    : new Date();
  const minYear = firstDate.getFullYear();
  const minMonth = firstDate.getMonth();
  const maxYear = lastDate.getFullYear();
  const maxMonth = lastDate.getMonth();

  const canGoPrev = viewYear > minYear || (viewYear === minYear && viewMonth > minMonth);
  const canGoNext = viewYear < maxYear || (viewYear === maxYear && viewMonth < maxMonth);

  const goToPrev = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
    setSelectedDay(null);
  };

  const goToNext = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
    setSelectedDay(null);
  };

  const calCells = buildCalendarGrid(viewYear, viewMonth, habit, todayDate);

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleString("en", {
    month: "long",
    year: "numeric",
  });

  const selectedEntry = selectedDay ? habit.track[selectedDay] : null;

  const handleDayClick = (dayKey: string, isFuture: boolean) => {
    if (isFuture) return;
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

  // Progress ring
  const ringR = 30;
  const ringCirc = 2 * Math.PI * ringR;
  const ringDash = ringCirc * (1 - pct);

  const body = (
    <div className="flex flex-col overflow-hidden" style={{ flex: 1, minHeight: 0 }}>
      {/* ── Hero Header ── */}
      <div
        className="relative shrink-0 overflow-hidden px-5 pb-5 pt-5"
        style={{
          background: `linear-gradient(135deg, ${colorDark} 0%, ${color}cc 60%, ${color}88 100%)`,
        }}
      >
        {/* Subtle noise texture overlay */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E\")",
            opacity: 0.4,
          }}
        />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex size-8 items-center justify-center rounded-full transition-all active:scale-90"
          style={{ background: "rgba(0,0,0,0.2)", color: "rgba(255,255,255,0.85)" }}
        >
          <X className="size-4" />
        </button>

        <div className="relative z-10 flex items-start gap-4">
          {/* Text */}
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-center gap-2">
              <span
                className="flex size-8 shrink-0 items-center justify-center rounded-xl"
                style={{ background: "rgba(0,0,0,0.22)" }}
              >
                <HabitIcon name={habit.icon} className="size-4 text-white" />
              </span>
              <span
                className="rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.2em]"
                style={{ background: "rgba(0,0,0,0.2)", color: "rgba(255,255,255,0.75)" }}
              >
                {habit.startDate} → {habit.endDate}
              </span>
            </div>

            {isDesktop ? (
              <DialogTitle className="font-display text-2xl leading-tight text-white xl:text-3xl">
                {habit.name}
              </DialogTitle>
            ) : (
              <DrawerTitle className="font-display text-2xl leading-tight text-white">
                {habit.name}
              </DrawerTitle>
            )}
            {isDesktop ? (
              <DialogDescription className="sr-only">
                Habit details for {habit.name}
              </DialogDescription>
            ) : (
              <DrawerDescription className="sr-only">
                Habit details for {habit.name}
              </DrawerDescription>
            )}

            {habit.description && (
              <p
                className="mt-1.5 line-clamp-2 text-sm leading-relaxed"
                style={{ color: "rgba(255,255,255,0.7)" }}
              >
                {habit.description}
              </p>
            )}
          </div>

          {/* Progress ring */}
          <div className="relative shrink-0">
            <svg width="76" height="76" viewBox="0 0 76 76">
              <circle
                cx="38"
                cy="38"
                r={ringR}
                fill="rgba(0,0,0,0.18)"
                strokeWidth="5"
                stroke="rgba(255,255,255,0.15)"
              />
              <circle
                cx="38"
                cy="38"
                r={ringR}
                fill="none"
                strokeWidth="5"
                stroke="rgba(255,255,255,0.95)"
                strokeDasharray={ringCirc}
                strokeDashoffset={ringDash}
                strokeLinecap="round"
                transform="rotate(-90 38 38)"
                style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display text-lg leading-none text-white">
                {Math.round(pct * 100)}
              </span>
              <span className="font-mono text-[8px] text-white/70">%</span>
            </div>
          </div>
        </div>

        {/* Stat chips */}
        <div className="relative z-10 mt-4 flex gap-2">
          <StatChip
            icon={<Flame className="size-3" />}
            label="Streak"
            value={`${s}d`}
            color={color}
          />
          <StatChip
            icon={<CheckCircle2 className="size-3" />}
            label="Done"
            value={`${done}/${total}`}
            color={color}
          />
          <StatChip
            icon={<Target className="size-3" />}
            label="Rate"
            value={`${Math.round(pct * 100)}%`}
            color={color}
          />
        </div>

        {/* Progress bar */}
        <div
          className="relative z-10 mt-3 h-1.5 overflow-hidden rounded-full"
          style={{ background: "rgba(0,0,0,0.2)" }}
        >
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${pct * 100}%`, background: "rgba(255,255,255,0.9)" }}
          />
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto">
        {/* Plan section */}
        {habit.plan && (
          <div className="border-b px-5 py-4" style={{ borderColor: "oklch(1 0 0 / 0.06)" }}>
            <button
              onClick={() => setPlanExpanded((v) => !v)}
              className="flex w-full items-center justify-between gap-2 text-left"
            >
              <div className="flex items-center gap-2">
                <BookOpen className="size-3.5 shrink-0" style={{ color }} />
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  The plan
                </span>
              </div>
              <ChevronRight
                className="size-3.5 shrink-0 text-muted-foreground transition-transform duration-200"
                style={{ transform: planExpanded ? "rotate(90deg)" : "rotate(0deg)" }}
              />
            </button>
            {planExpanded && (
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                {habit.plan}
              </p>
            )}
          </div>
        )}

        {/* ── Monthly Calendar ── */}
        <div className="px-5 pt-5 pb-2">
          {/* Month nav header */}
          <div className="mb-4 flex items-center justify-between">
            <button
              onClick={goToPrev}
              disabled={!canGoPrev}
              className="flex size-8 items-center justify-center rounded-full border transition-all active:scale-90 disabled:opacity-25"
              style={{ borderColor: "oklch(1 0 0 / 0.1)" }}
            >
              <ChevronLeft className="size-4 text-muted-foreground" />
            </button>

            <div className="text-center">
              <div className="font-display text-base leading-tight text-foreground">
                {monthLabel}
              </div>
              <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
                {
                  calCells.filter(
                    (c) => c.type === "day" && (c as { type: "day"; done: boolean }).done,
                  ).length
                }{" "}
                completed
              </div>
            </div>

            <button
              onClick={goToNext}
              disabled={!canGoNext}
              className="flex size-8 items-center justify-center rounded-full border transition-all active:scale-90 disabled:opacity-25"
              style={{ borderColor: "oklch(1 0 0 / 0.1)" }}
            >
              <ChevronRight className="size-4 text-muted-foreground" />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="mb-2 grid grid-cols-7">
            {WEEK_DAYS.map((d) => (
              <div
                key={d}
                className="text-center font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground"
              >
                {d[0]}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {calCells.map((cell, i) => {
              if (cell.type === "empty") {
                return <div key={`empty-${i}`} />;
              }

              const c = cell;
              const isSelected = c.dayKey === selectedDay;
              const isClickable = c.isHabitDay && !c.isFuture;

              let bg = "transparent";
              let border = "transparent";
              let textColor = "oklch(1 0 0 / 0.15)";

              if (c.isHabitDay && !c.isFuture) {
                if (isSelected) {
                  bg = color;
                  border = color;
                  textColor = "white";
                } else if (c.done) {
                  bg = `${color}28`;
                  border = `${color}50`;
                  textColor = "var(--color-foreground)";
                } else {
                  bg = "oklch(1 0 0 / 0.04)";
                  border = "oklch(1 0 0 / 0.08)";
                  textColor = "var(--color-foreground)";
                }
              } else if (c.isFuture && c.isHabitDay) {
                bg = "oklch(1 0 0 / 0.02)";
                border = "oklch(1 0 0 / 0.05)";
                textColor = "oklch(1 0 0 / 0.2)";
              }

              return (
                <button
                  key={c.dayKey}
                  onClick={() => isClickable && handleDayClick(c.dayKey, c.isFuture)}
                  disabled={!isClickable}
                  className="relative flex flex-col items-center justify-center rounded-xl transition-all active:scale-90"
                  style={{
                    background: bg,
                    border: `1.5px solid ${border}`,
                    color: textColor,
                    height: 42,
                    cursor: isClickable ? "pointer" : "default",
                    outline: c.isToday && !isSelected ? `2px solid ${color}` : "none",
                    outlineOffset: -2,
                  }}
                  title={c.isHabitDay ? c.dayKey : undefined}
                >
                  <span className="font-mono text-[11px] font-medium leading-none">
                    {c.dayOfMonth}
                  </span>

                  {/* Done dot */}
                  {c.isHabitDay && c.done && !isSelected && (
                    <span className="mt-0.5 size-1 rounded-full" style={{ background: color }} />
                  )}

                  {/* Note indicator */}
                  {c.isHabitDay && c.note && !c.isFuture && !isSelected && (
                    <span
                      className="absolute right-1 top-1 size-1.5 rounded-full"
                      style={{ background: isSelected ? "white" : `${color}cc` }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Calendar legend */}
          <div className="mt-3 flex items-center gap-4">
            <LegendItem
              dot={
                <span
                  className="size-2 rounded-full"
                  style={{ background: `${color}28`, border: `1px solid ${color}50` }}
                />
              }
              label="Missed"
            />
            <LegendItem
              dot={<span className="size-2 rounded-full" style={{ background: color }} />}
              label="Done"
            />
            <LegendItem
              dot={<span className="size-2 rounded-full border-2" style={{ borderColor: color }} />}
              label="Today"
            />
            <LegendItem
              dot={
                <span className="relative size-2">
                  <span
                    className="absolute right-0 top-0 size-1.5 rounded-full"
                    style={{ background: `${color}cc` }}
                  />
                </span>
              }
              label="Has note"
            />
          </div>
        </div>

        {/* ── Selected Day Panel ── */}
        {selectedDay && selectedEntry && (
          <div className="mx-5 mb-5 mt-3">
            <div
              className="overflow-hidden rounded-2xl border"
              style={{
                borderColor: `${color}40`,
                background: `${color}0d`,
                boxShadow: `0 0 0 1px ${color}15, 0 4px 20px ${color}10`,
              }}
            >
              {/* Day header */}
              <div
                className="flex items-center justify-between px-4 py-3"
                style={{ borderBottom: `1px solid ${color}25` }}
              >
                <div>
                  <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
                    {new Date(selectedEntry.date).toLocaleDateString("en", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    })}
                  </div>
                  {selectedDay === todayKey && (
                    <div className="mt-0.5 font-display text-sm" style={{ color }}>
                      Today
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onToggleDay(habit.id, selectedDay)}
                    className="flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold transition-all active:scale-90"
                    style={
                      selectedEntry.done
                        ? { background: color, color: "white" }
                        : {
                            background: "oklch(1 0 0 / 0.06)",
                            color: "var(--color-foreground)",
                            border: `1px solid oklch(1 0 0 / 0.1)`,
                          }
                    }
                  >
                    {selectedEntry.done ? (
                      <CheckCircle2 className="size-3.5" />
                    ) : (
                      <Circle className="size-3.5 text-muted-foreground" />
                    )}
                    {selectedEntry.done ? "Done" : "Mark done"}
                  </button>

                  <button
                    onClick={() => setSelectedDay(null)}
                    className="flex size-7 items-center justify-center rounded-full text-muted-foreground transition-all hover:text-foreground active:scale-90"
                    style={{ background: "oklch(1 0 0 / 0.04)" }}
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              </div>

              {/* Note editor */}
              <div className="px-4 py-3">
                <div className="mb-2 flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
                  <StickyNote className="size-3" style={{ color }} />
                  Journal note
                </div>
                <textarea
                  ref={noteRef}
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="How did it go? Any reflections…"
                  maxLength={500}
                  rows={3}
                  className="w-full resize-none rounded-xl border bg-[oklch(0_0_0_/_0.15)] px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none transition-colors"
                  style={{
                    borderColor: `${color}30`,
                    focusBorderColor: color,
                  }}
                  onFocus={(e) => (e.target.style.borderColor = `${color}80`)}
                  onBlur={(e) => (e.target.style.borderColor = `${color}30`)}
                />
                <div className="mt-2 flex items-center justify-between">
                  <span className="font-mono text-[9px] text-muted-foreground">
                    {noteText.length}/500
                  </span>
                  <button
                    onClick={handleSaveNote}
                    disabled={savingNote}
                    className="rounded-lg px-4 py-1.5 text-xs font-bold text-white transition-all active:scale-90 disabled:opacity-40"
                    style={{ background: color }}
                  >
                    {savingNote ? "Saving…" : "Save note"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bottom spacer for comfortable scrolling */}
        {!selectedDay && <div className="h-4" />}
      </div>

      {/* ── Footer ── */}
      <div
        className="shrink-0 border-t px-5 py-4"
        style={{
          borderColor: "oklch(1 0 0 / 0.06)",
          paddingBottom: isDesktop ? undefined : "max(1rem, env(safe-area-inset-bottom))",
        }}
      >
        <div className="flex items-center gap-3">
          <CalendarDays className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="flex-1 truncate font-mono text-[10px] text-muted-foreground">
            {allKeys.length} day{allKeys.length !== 1 ? "s" : ""} tracked · tap a day to log
          </span>
          <button
            onClick={onClose}
            className="rounded-xl border px-5 py-2 text-xs font-medium text-muted-foreground transition-all hover:text-foreground active:scale-95"
            style={{ borderColor: "oklch(1 0 0 / 0.1)" }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );

  if (isDesktop) {
    return (
      <Dialog open={!!habit} onOpenChange={(o) => !o && onClose()}>
        <DialogContent
          className="border-border p-0 focus:outline-none"
          style={{
            background: "oklch(0.185 0.008 240)",
            borderRadius: "1.25rem",
            maxHeight: "88dvh",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            maxWidth: 480,
          }}
        >
          {body}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={!!habit} onOpenChange={(o) => !o && onClose()} shouldScaleBackground={false}>
      <DrawerContent
        className="border-border focus:outline-none"
        style={{
          background: "oklch(0.185 0.008 240)",
          maxHeight: "96dvh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full"
          style={{ background: "oklch(1 0 0 / 0.15)" }}
        />
        {body}
      </DrawerContent>
    </Drawer>
  );
}

function StatChip({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div
      className="flex flex-1 flex-col items-center rounded-xl py-2 px-1"
      style={{ background: "rgba(0,0,0,0.2)" }}
    >
      <div className="flex items-center gap-1 text-white/70">
        {icon}
        <span className="font-mono text-[8px] uppercase tracking-[0.15em]">{label}</span>
      </div>
      <div className="mt-0.5 font-display text-base leading-none text-white">{value}</div>
    </div>
  );
}

function LegendItem({ dot, label }: { dot: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex size-3 shrink-0 items-center justify-center">{dot}</div>
      <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </span>
    </div>
  );
}
