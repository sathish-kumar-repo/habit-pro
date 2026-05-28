import { useEffect, useState } from "react";
import { Habit, progress, streak, fmtDate } from "@/lib/habits";
import { Flame, Calendar, Target, X } from "lucide-react";
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
  if (!habit) return null;

  const { done, total, pct } = progress(habit);
  const s = streak(habit);
  const days = Object.keys(habit.track).sort(
    (a, b) => habit.track[a].date.getTime() - habit.track[b].date.getTime(),
  );
  const todayKey = fmtDate(new Date());
  const tDate = new Date();
  tDate.setHours(0, 0, 0, 0);

  const months: Record<string, string[]> = {};
  days.forEach((k) => {
    const d = habit.track[k].date;
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    (months[key] ||= []).push(k);
  });

  const body = (
    <div className="flex-1 overflow-y-auto px-5 pb-6">
      {/* Header info */}
      <div className="flex items-start justify-between pt-4 pb-2">
        <div className="min-w-0 flex-1 pr-4">
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            <span className="size-1.5 shrink-0 rounded-full" style={{ background: habit.color }} />
            {habit.startDate} → {habit.endDate}
          </div>
          {isDesktop ? (
            <DialogTitle className="mt-2 font-display text-3xl leading-tight text-foreground">
              {habit.name}
            </DialogTitle>
          ) : (
            <DrawerTitle className="mt-2 font-display text-4xl leading-tight text-foreground">
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

      {/* Calendar log */}
      <div>
        <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Daily log — click to toggle
        </div>
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
                    const eDate = new Date(entry.date);
                    eDate.setHours(0, 0, 0, 0);
                    const future = eDate > tDate;
                    return (
                      <button
                        key={dayKey}
                        onClick={() => !future && onToggleDay(habit.id, dayKey)}
                        disabled={future}
                        className="relative aspect-square rounded-xl border text-sm font-medium transition-all active:scale-95 disabled:cursor-not-allowed"
                        style={{
                          background: entry.done ? habit.color : "oklch(1 0 0 / 0.03)",
                          borderColor: isToday ? habit.color : "oklch(1 0 0 / 0.07)",
                          color: entry.done
                            ? "white"
                            : !future
                              ? "var(--color-foreground)"
                              : "var(--color-muted-foreground)",
                          opacity: future ? 0.3 : 1,
                          minHeight: 40,
                        }}
                      >
                        <span
                          className={future ? "line-through decoration-muted-foreground/40" : ""}
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
    </div>
  );

  const footer = (
    <div className="border-t border-border px-5 py-4">
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
        <div style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>{footer}</div>
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
