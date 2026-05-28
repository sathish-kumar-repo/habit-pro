import { useRef, useState } from "react";
import { Habit, progress, streak, today, fmtDate } from "@/lib/habits";
import { Flame, Trash2, Check, Pencil, CheckCircle2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type Props = {
  habit: Habit;
  onToggleToday: (id: string) => void;
  onOpen: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
};

function buildHeatmap(habit: Habit, weeks = 14) {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  const end = new Date(t);
  end.setDate(end.getDate() + (6 - end.getDay()));
  const start = new Date(end);
  start.setDate(start.getDate() - weeks * 7 + 1);

  const cols: { date: Date; key: string; state: "done" | "miss" | "future" | "outside" }[][] = [];
  const cur = new Date(start);
  for (let w = 0; w < weeks; w++) {
    const col: (typeof cols)[number] = [];
    for (let d = 0; d < 7; d++) {
      const key = fmtDate(cur);
      const entry = habit.track[key];
      let state: "done" | "miss" | "future" | "outside" = "outside";
      if (entry) {
        if (entry.done) state = "done";
        else if (cur > t) state = "future";
        else state = "miss";
      }
      col.push({ date: new Date(cur), key, state });
      cur.setDate(cur.getDate() + 1);
    }
    cols.push(col);
  }
  return cols;
}

const REVEAL_WIDTH = 156; // px — width of the action tray
const SWIPE_THRESHOLD = 72;

export function HabitCard({ habit, onToggleToday, onOpen, onEdit, onDelete }: Props) {
  const { done, total, pct } = progress(habit);
  const s = streak(habit);
  const t = today();
  const todayDone = habit.track[t]?.done ?? false;
  const inRange = habit.track[t] !== undefined;
  const grid = buildHeatmap(habit);

  // Swipe state
  const [translateX, setTranslateX] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const direction = useRef<"h" | "v" | null>(null);
  const dragging = useRef(false);

  const snapTo = (revealed: boolean) => {
    const target = revealed ? -REVEAL_WIDTH : 0;
    setTranslateX(target);
    setIsRevealed(revealed);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    direction.current = null;
    dragging.current = false;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - startX.current;
    const dy = e.touches[0].clientY - startY.current;

    if (direction.current === null) {
      if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
        direction.current = Math.abs(dx) > Math.abs(dy) ? "h" : "v";
      }
    }

    if (direction.current !== "h") return;
    dragging.current = true;

    if (isRevealed) {
      // Already revealed — allow swiping right to close
      const raw = -REVEAL_WIDTH + dx;
      setTranslateX(Math.min(0, Math.max(-REVEAL_WIDTH, raw)));
    } else {
      // Not revealed — only allow left swipe
      if (dx < 0) {
        setTranslateX(Math.max(-REVEAL_WIDTH, dx * 0.85));
      }
    }
  };

  const onTouchEnd = () => {
    if (!dragging.current) return;

    if (isRevealed) {
      const shouldClose = translateX > -REVEAL_WIDTH + 40;
      snapTo(!shouldClose);
    } else {
      snapTo(translateX < -SWIPE_THRESHOLD);
    }
  };

  const handleCardTap = () => {
    if (isRevealed) {
      snapTo(false);
    } else {
      onOpen(habit.id);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl" style={{ touchAction: "pan-y" }}>
      {/* Action tray — sits behind the card */}
      <div
        className="absolute inset-y-0 right-0 flex items-stretch"
        style={{ width: REVEAL_WIDTH }}
      >
        <button
          onClick={() => {
            snapTo(false);
            onEdit(habit.id);
          }}
          className="flex flex-1 flex-col items-center justify-center gap-1.5 bg-[oklch(0.3_0.02_240)] transition-all active:brightness-90"
        >
          <Pencil className="size-5 text-foreground" />
          <span className="text-[10px] font-medium uppercase tracking-wide text-foreground">
            Edit
          </span>
        </button>
        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogTrigger asChild>
            <button className="flex flex-1 flex-col items-center justify-center gap-1.5 bg-destructive transition-all active:brightness-90">
              <Trash2 className="size-5 text-white" />
              <span className="text-[10px] font-medium uppercase tracking-wide text-white">
                Delete
              </span>
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete "{habit.name}"?</AlertDialogTitle>
              <AlertDialogDescription>
                This permanently removes the habit and all of its tracking history. This action
                cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  snapTo(false);
                  onDelete(habit.id);
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete habit
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Main card — slides left to reveal tray */}
      <article
        className="relative border bg-card"
        style={{
          transform: `translateX(${translateX}px)`,
          transition: dragging.current
            ? "none"
            : "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
          borderRadius: "1rem",
          boxShadow: "var(--shadow-soft)",
          borderColor: isRevealed ? "oklch(1 0 0 / 0.12)" : "oklch(1 0 0 / 0.07)",
          overflow: "hidden",
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* color edge */}
        <span
          className="absolute left-0 top-0 h-full w-[3px]"
          style={{ background: `linear-gradient(180deg, ${habit.color}, transparent 80%)` }}
        />

        <div className="p-5">
          {/* Header row */}
          <div className="flex items-start justify-between gap-3">
            <button onClick={handleCardTap} className="flex-1 text-left">
              <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                <span className="size-1.5 rounded-full" style={{ background: habit.color }} />
                {habit.startDate} → {habit.endDate}
              </div>
              <h3 className="mt-1.5 font-display text-[22px] leading-tight text-foreground">
                {habit.name}
              </h3>
              {habit.description && (
                <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                  {habit.description}
                </p>
              )}
            </button>

            {/* Desktop-only action buttons (hover) */}
            <div className="hidden items-center gap-1 opacity-0 transition-all group-hover:opacity-100 focus-within:opacity-100 lg:flex">
              <button
                onClick={() => onEdit(habit.id)}
                className="rounded-md p-1.5 text-muted-foreground transition-all hover:bg-secondary hover:text-foreground"
                aria-label="Edit habit"
              >
                <Pencil className="size-3.5" />
              </button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    className="rounded-md p-1.5 text-muted-foreground transition-all hover:bg-secondary hover:text-destructive"
                    aria-label="Delete habit"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete "{habit.name}"?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This permanently removes the habit and all of its tracking history.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => onDelete(habit.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete habit
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          {/* Heatmap */}
          <div className="mt-4 flex gap-[3px]">
            {grid.map((col, ci) => (
              <div key={ci} className="flex flex-col gap-[3px]">
                {col.map((cell) => {
                  const isToday = cell.key === t;
                  let bg = "oklch(1 0 0 / 0.04)";
                  let opacity = 1;
                  if (cell.state === "done") bg = habit.color;
                  else if (cell.state === "miss") bg = "oklch(1 0 0 / 0.06)";
                  else if (cell.state === "future") {
                    bg = habit.color;
                    opacity = 0.12;
                  } else {
                    opacity = 0.5;
                  }
                  return (
                    <span
                      key={cell.key}
                      title={`${cell.key} · ${cell.state}`}
                      className="size-2.5 rounded-[3px]"
                      style={{
                        background: bg,
                        opacity,
                        outline: isToday ? `1px solid ${habit.color}` : "none",
                        outlineOffset: 1,
                      }}
                    />
                  );
                })}
              </div>
            ))}
          </div>

          {/* Footer row */}
          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="grid grid-cols-3 gap-3 font-mono text-xs">
              <Stat
                label="Streak"
                value={`${s}d`}
                icon={<Flame className="size-3" style={{ color: habit.color }} />}
              />
              <Stat label="Done" value={`${done}/${total}`} />
              <Stat label="Prog." value={`${Math.round(pct * 100)}%`} />
            </div>

            {/* Mark today button — touch friendly */}
            <button
              onClick={() => onToggleToday(habit.id)}
              disabled={!inRange}
              className="flex items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-medium transition-all active:scale-95 disabled:opacity-40"
              style={
                todayDone
                  ? { background: habit.color, color: "white", borderColor: habit.color }
                  : { borderColor: "oklch(1 0 0 / 0.12)", color: "var(--color-foreground)" }
              }
            >
              {todayDone ? (
                <CheckCircle2 className="size-4" style={{ color: "white" }} />
              ) : (
                <Check className="size-4" style={{ color: "var(--color-muted-foreground)" }} />
              )}
              <span>{todayDone ? "Done" : inRange ? "Mark" : "N/A"}</span>
            </button>
          </div>

          {/* Progress bar */}
          <div className="mt-3 h-0.5 overflow-hidden rounded-full bg-[oklch(1_0_0_/_0.06)]">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${pct * 100}%`, background: habit.color }}
            />
          </div>
        </div>
      </article>

      {/* Swipe hint label — fades in when card is swiped */}
      {translateX < -20 && !isRevealed && (
        <div
          className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
          style={{ opacity: Math.min(1, Math.abs(translateX) / SWIPE_THRESHOLD) }}
        >
          Actions
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-0.5 text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}
