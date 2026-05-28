import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Habit, progress, streak, fmtDate } from "@/lib/habits";
import { Flame, Calendar, Target } from "lucide-react";

type Props = {
  habit: Habit | null;
  onClose: () => void;
  onToggleDay: (id: string, day: string) => void;
};

export function HabitDetailDialog({ habit, onClose, onToggleDay }: Props) {
  if (!habit) return null;
  const { done, total, pct } = progress(habit);
  const s = streak(habit);

  // build month-grouped grid
  const days = Object.keys(habit.track).sort(
    (a, b) => habit.track[a].date.getTime() - habit.track[b].date.getTime(),
  );
  const today = fmtDate(new Date());
  const tDate = new Date();
  tDate.setHours(0, 0, 0, 0);

  const months: Record<string, string[]> = {};
  days.forEach((k) => {
    const d = habit.track[k].date;
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    (months[key] ||= []).push(k);
  });

  return (
    <Dialog open={!!habit} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-border bg-popover sm:max-w-3xl">
        <DialogHeader>
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            <span className="size-1.5 rounded-full" style={{ background: habit.color }} />
            Habit · {habit.startDate} → {habit.endDate}
          </div>
          <DialogTitle className="font-display text-5xl leading-[1] text-foreground">
            {habit.name}
          </DialogTitle>
        </DialogHeader>

        {habit.description && (
          <p className="text-sm leading-relaxed text-muted-foreground">{habit.description}</p>
        )}

        {/* stats row */}
        <div className="grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-border bg-border">
          <StatBlock
            icon={<Flame className="size-3.5" style={{ color: habit.color }} />}
            label="Current streak"
            value={`${s} days`}
          />
          <StatBlock
            icon={<Target className="size-3.5 text-muted-foreground" />}
            label="Completion"
            value={`${Math.round(pct * 100)}%`}
          />
          <StatBlock
            icon={<Calendar className="size-3.5 text-muted-foreground" />}
            label="Days done"
            value={`${done} / ${total}`}
          />
        </div>

        {habit.plan && (
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              The plan
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
              {habit.plan}
            </p>
          </div>
        )}

        {/* calendar grid */}
        <div>
          <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Daily log — tap to toggle
          </div>
          <div className="space-y-5">
            {Object.entries(months).map(([k, keys]) => {
              const first = habit.track[keys[0]].date;
              const monthName = first.toLocaleString("en", { month: "long", year: "numeric" });
              return (
                <div key={k}>
                  <div className="mb-2 flex items-center gap-3">
                    <h4 className="font-display text-lg text-foreground">{monthName}</h4>
                    <div className="hairline flex-1" />
                  </div>
                  <div className="grid grid-cols-7 gap-1.5">
                    {keys.map((dayKey) => {
                      const entry = habit.track[dayKey];
                      const dNum = entry.date.getDate();
                      const isToday = dayKey === today;
                      const eDate = new Date(entry.date);
                      eDate.setHours(0, 0, 0, 0);
                      const past = eDate <= tDate;
                      const future = eDate > tDate;
                      return (
                        <button
                          key={dayKey}
                          onClick={() => !future && onToggleDay(habit.id, dayKey)}
                          disabled={future}
                          className="relative aspect-square rounded-md border text-xs font-medium transition-all enabled:hover:scale-[1.04] disabled:cursor-not-allowed"
                          style={{
                            background: entry.done ? habit.color : "oklch(1 0 0 / 0.03)",
                            borderColor: isToday ? habit.color : "oklch(1 0 0 / 0.07)",
                            color: entry.done
                              ? "white"
                              : past
                                ? "var(--color-foreground)"
                                : "var(--color-muted-foreground)",
                            opacity: entry.done ? 1 : past ? 1 : 0.35,
                          }}
                          title={future ? `${dayKey} · future` : dayKey}
                        >
                          <span
                            className={future ? "line-through decoration-muted-foreground/60" : ""}
                          >
                            {dNum}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StatBlock({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-card p-4">
      <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1 font-display text-2xl text-foreground">{value}</div>
    </div>
  );
}
