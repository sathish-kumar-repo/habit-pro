import { Habit, progress, streak, today, fmtDate } from "@/lib/habits";
import { Flame, Trash2, Check } from "lucide-react";
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
  onDelete: (id: string) => void;
};

function buildHeatmap(habit: Habit, weeks = 14) {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  // align to end of current week (Saturday)
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

export function HabitCard({ habit, onToggleToday, onOpen, onDelete }: Props) {
  const { done, total, pct } = progress(habit);
  const s = streak(habit);
  const t = today();
  const todayDone = habit.track[t]?.done ?? false;
  const inRange = habit.track[t] !== undefined;
  const grid = buildHeatmap(habit);

  return (
    <article
      className="group relative overflow-hidden rounded-2xl border bg-card transition-all hover:border-[oklch(1_0_0_/_0.12)]"
      style={{ boxShadow: "var(--shadow-soft)" }}
    >
      {/* color edge */}
      <span
        className="absolute left-0 top-0 h-full w-[3px]"
        style={{ background: `linear-gradient(180deg, ${habit.color}, transparent 80%)` }}
      />

      <div className="p-6">
        <div className="flex items-start justify-between gap-3">
          <button onClick={() => onOpen(habit.id)} className="flex-1 text-left">
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              <span className="size-1.5 rounded-full" style={{ background: habit.color }} />
              {habit.startDate} → {habit.endDate}
            </div>
            <h3 className="mt-2 font-display text-[28px] leading-[1.05] text-foreground">
              {habit.name}
            </h3>
            {habit.description && (
              <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                {habit.description}
              </p>
            )}
          </button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                className="rounded-md p-1.5 text-muted-foreground opacity-0 transition-all hover:bg-secondary hover:text-destructive group-hover:opacity-100 focus:opacity-100"
                aria-label="Delete habit"
              >
                <Trash2 className="size-3.5" />
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
                  onClick={() => onDelete(habit.id)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete habit
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* heatmap */}
        <div className="mt-5 flex gap-[3px]">
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

        {/* footer */}
        <div className="mt-5 flex items-end justify-between gap-3">
          <div className="grid grid-cols-3 gap-4 font-mono text-xs">
            <Stat
              label="Streak"
              value={`${s}d`}
              icon={<Flame className="size-3" style={{ color: habit.color }} />}
            />
            <Stat label="Done" value={`${done}/${total}`} />
            <Stat label="Progress" value={`${Math.round(pct * 100)}%`} />
          </div>
          <button
            onClick={() => onToggleToday(habit.id)}
            disabled={!inRange}
            className="group/btn relative inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-medium transition-all disabled:opacity-40"
            style={
              todayDone
                ? { background: habit.color, color: "white", borderColor: habit.color }
                : { borderColor: "oklch(1 0 0 / 0.12)", color: "var(--color-foreground)" }
            }
          >
            <span
              className="grid size-4 place-items-center rounded-full border"
              style={{
                borderColor: todayDone ? "white" : "oklch(1 0 0 / 0.2)",
                background: todayDone ? "white" : "transparent",
              }}
            >
              {todayDone && <Check className="size-2.5" style={{ color: habit.color }} />}
            </span>
            {todayDone ? "Done today" : inRange ? "Mark today" : "Off window"}
          </button>
        </div>
      </div>
    </article>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-0.5 text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}
