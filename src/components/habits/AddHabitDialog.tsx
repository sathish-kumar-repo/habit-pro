import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { X } from "lucide-react";
import { COLORS, createHabit, habitSchema } from "@/lib/habits";
import { DatePickerWithPresets } from "./DatePickerWithPresets";
import { HABIT_ICONS, HabitIcon, DEFAULT_ICON } from "./HabitIcon";
import type { z } from "zod";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

type FieldErrors = Partial<Record<keyof z.infer<typeof habitSchema>, string>>;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

export function AddHabitDialog({ open, onOpenChange }: Props) {
  const isDesktop = useIsDesktop();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [plan, setPlan] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [icon, setIcon] = useState<string>(DEFAULT_ICON);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [start, setStart] = useState<Date | undefined>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [end, setEnd] = useState<Date | undefined>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 29); // 30 total days including today
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [durationDays, setDurationDays] = useState(30);

  useEffect(() => {
    if (!start || !end) return;
    const diff = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    setDurationDays(Math.max(1, diff));
  }, [start, end]);

  const reset = () => {
    setName("");
    setDescription("");
    setPlan("");
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    setStart(d);
    const e = new Date();
    e.setDate(e.getDate() + 29);
    e.setHours(0, 0, 0, 0);
    setEnd(e);
    setColor(COLORS[0]);
    setIcon(DEFAULT_ICON);
    setErrors({});
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  const submit = async () => {
    if (!start || !end) {
      setErrors({
        ...(!start ? { start: "Start date is required" } : {}),
        ...(!end ? { end: "End date is required" } : {}),
      });
      return;
    }
    const result = habitSchema.safeParse({ name, description, plan, start, end, color, icon });
    if (!result.success) {
      const fe: FieldErrors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof FieldErrors;
        if (!fe[key]) fe[key] = issue.message;
      }
      setErrors(fe);
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      await createHabit(result.data);
      handleClose();
    } finally {
      setSaving(false);
    }
  };

  const handleDurationChange = (value: number) => {
    const days = Math.min(365, Math.max(1, value));
    setDurationDays(days);
    if (!start) return;
    const newEnd = new Date(start);
    newEnd.setDate(start.getDate() + days - 1);
    setEnd(newEnd);
  };

  const formBody = (
    <div className="space-y-4">
      <Field label="Habit name" error={errors.name}>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Read 20 pages"
          className={`h-11 rounded-xl text-base ${errors.name ? "border-destructive" : ""}`}
          autoFocus
        />
      </Field>
      <Field label="Why it matters" error={errors.description}>
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="The reason behind it"
          className={`h-11 rounded-xl text-base ${errors.description ? "border-destructive" : ""}`}
        />
      </Field>
      <Field label="Plan" error={errors.plan}>
        <Textarea
          value={plan}
          onChange={(e) => setPlan(e.target.value)}
          placeholder="When, where, how"
          rows={3}
          className={`rounded-xl text-base ${errors.plan ? "border-destructive" : ""}`}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <DatePickerWithPresets
          label="Start"
          value={start}
          onChange={(date) => {
            setStart(date);
            if (!date) return;
            const newEnd = new Date(date);
            newEnd.setDate(date.getDate() + durationDays - 1);
            setEnd(newEnd);
          }}
          error={errors.start}
        />
        <DatePickerWithPresets
          label="End"
          value={end}
          onChange={setEnd}
          minDate={start}
          error={errors.end}
        />
      </div>
      <Field label="Duration (days)">
        <Input
          type="number"
          min={1}
          max={365}
          value={durationDays}
          onChange={(e) => handleDurationChange(Number(e.target.value) || 1)}
          placeholder="30"
          className="h-11 rounded-xl text-base"
        />
      </Field>
      <Field label="Icon">
        <div className="grid grid-cols-8 gap-1.5 pt-1">
          {HABIT_ICONS.map((iconName) => {
            const selected = icon === iconName;
            return (
              <button
                key={iconName}
                onClick={() => setIcon(iconName)}
                className="flex items-center justify-center rounded-xl transition-all active:scale-90"
                style={{
                  height: 40,
                  background: selected ? color : "oklch(1 0 0 / 0.05)",
                  outline: selected ? `2px solid ${color}` : "1px solid oklch(1 0 0 / 0.08)",
                  outlineOffset: selected ? 2 : 0,
                }}
                aria-label={iconName}
              >
                <HabitIcon
                  name={iconName}
                  className="size-4"
                  style={{ color: selected ? "white" : "oklch(0.65 0.01 240)" }}
                />
              </button>
            );
          })}
        </div>
      </Field>
      <Field label="Color accent">
        <div className="flex flex-wrap gap-3 pt-1">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className="size-9 rounded-full transition-all active:scale-90"
              style={{
                background: c,
                outline: color === c ? `3px solid ${c}` : "2px solid oklch(1 0 0 / 0.1)",
                outlineOffset: color === c ? 3 : 0,
              }}
              aria-label={`Color ${c}`}
            />
          ))}
        </div>
      </Field>
    </div>
  );

  const footer = (
    <div className="flex gap-3">
      <button
        onClick={handleClose}
        className="flex-1 rounded-xl border border-border py-3 text-sm font-medium text-muted-foreground transition-all hover:text-foreground active:scale-95"
      >
        Cancel
      </button>
      <button
        onClick={submit}
        disabled={saving || !name.trim()}
        className="flex-1 rounded-xl py-3 text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-40"
        style={{ background: color, boxShadow: `0 4px 20px ${color}50` }}
      >
        {saving ? "Creating…" : "Commit"}
      </button>
    </div>
  );

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
        <DialogContent
          className="border-border bg-[oklch(0.185_0.008_240)] p-0 sm:max-w-lg focus:outline-none"
          style={{ borderRadius: "1.25rem" }}
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b border-border px-6 py-5">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                New commitment
              </div>
              <DialogTitle className="mt-1 font-display text-2xl leading-none text-foreground">
                Design a habit.
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm text-muted-foreground">
                Define the intention and the window.
              </DialogDescription>
            </div>
            <button
              onClick={handleClose}
              className="rounded-full p-2 text-muted-foreground transition-all hover:bg-secondary hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>
          {/* Body */}
          <div className="overflow-y-auto px-6 py-5" style={{ maxHeight: "calc(80dvh - 160px)" }}>
            {formBody}
          </div>
          {/* Footer */}
          <div className="border-t border-border px-6 py-4">{footer}</div>
        </DialogContent>
      </Dialog>
    );
  }

  return open ? (
    <div className="fixed inset-0 z-50 bg-[oklch(0.185_0.008_240)]">
      <div className="flex h-[100dvh] flex-col overflow-hidden">
        {/* Header */}
        <div
          className="flex items-start justify-between border-b border-border px-5 pt-5 pb-4 shrink-0"
          style={{
            paddingTop: "max(1.25rem, env(safe-area-inset-top))",
          }}
        >
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              New commitment
            </div>

            <h2 className="mt-1 font-display text-3xl leading-none text-foreground">
              Design a habit.
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Define the intention and the window.
            </p>
          </div>

          <button
            onClick={handleClose}
            className="rounded-full p-2 text-muted-foreground transition-all hover:bg-secondary hover:text-foreground active:scale-95"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Body */}
        <div
          className="flex-1 overflow-y-auto px-5 py-4 overscroll-contain"
          style={{
            WebkitOverflowScrolling: "touch",
          }}
        >
          {formBody}
        </div>

        {/* Footer */}
        <div
          className="shrink-0 border-t border-border px-5 py-4"
          style={{
            paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
          }}
        >
          {footer}
        </div>
      </div>
    </div>
  ) : null;
}

function Field({
  label,
  children,
  error,
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
}) {
  return (
    <div className="grid gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </span>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
