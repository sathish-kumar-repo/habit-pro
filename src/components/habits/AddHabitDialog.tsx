import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";
import { COLORS, createHabit, habitSchema } from "@/lib/habits";
import { DatePickerWithPresets } from "./DatePickerWithPresets";
import type { z } from "zod";

type FieldErrors = Partial<Record<keyof z.infer<typeof habitSchema>, string>>;

export function AddHabitDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [plan, setPlan] = useState("");
  const [start, setStart] = useState<Date | undefined>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [end, setEnd] = useState<Date | undefined>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [color, setColor] = useState(COLORS[0]);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  const reset = () => {
    setName("");
    setDescription("");
    setPlan("");
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    setStart(d);
    const e = new Date();
    e.setDate(e.getDate() + 30);
    e.setHours(0, 0, 0, 0);
    setEnd(e);
    setColor(COLORS[0]);
    setErrors({});
  };

  const submit = async () => {
    if (!start || !end) {
      setErrors({
        ...(!start ? { start: "Start date is required" } : {}),
        ...(!end ? { end: "End date is required" } : {}),
      });
      return;
    }
    const result = habitSchema.safeParse({
      name,
      description,
      plan,
      start,
      end,
      color,
    });
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
      reset();
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="group inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:scale-[1.02]"
          style={{ boxShadow: "var(--shadow-glow)" }}
        >
          <Plus className="size-4 transition-transform group-hover:rotate-90" />
          New habit
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl border-border bg-popover">
        <DialogHeader>
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            New commitment
          </div>
          <DialogTitle className="font-display text-4xl leading-none">Design a habit.</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Define the intention and the window. Show up daily.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-3">
          <Field label="Habit" error={errors.name}>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Read 20 pages"
              className={errors.name ? "border-destructive" : ""}
            />
          </Field>
          <Field label="Why it matters" error={errors.description}>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="The reason behind it"
              className={errors.description ? "border-destructive" : ""}
            />
          </Field>
          <Field label="Plan" error={errors.plan}>
            <Textarea
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              placeholder="When, where, how"
              rows={3}
              className={errors.plan ? "border-destructive" : ""}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <DatePickerWithPresets
              label="Start"
              value={start}
              onChange={setStart}
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
          <Field label="Accent">
            <div className="flex flex-wrap gap-2 pt-1">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className="size-7 rounded-full transition-transform hover:scale-110"
                  style={{
                    background: c,
                    outline: color === c ? `2px solid ${c}` : "1px solid oklch(1 0 0 / 0.1)",
                    outlineOffset: color === c ? 2 : 0,
                  }}
                  aria-label={`Color ${c}`}
                />
              ))}
            </div>
          </Field>
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          <button
            onClick={() => setOpen(false)}
            className="rounded-md px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={reset}
            className="rounded-md border border-border px-4 py-2 text-sm text-foreground transition-colors hover:bg-secondary"
          >
            Reset
          </button>
          <button
            onClick={submit}
            disabled={saving || !name.trim()}
            className="rounded-full px-5 py-2 text-sm font-medium text-white transition-opacity disabled:opacity-40"
            style={{ background: color }}
          >
            {saving ? "Creating..." : "Commit"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
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
