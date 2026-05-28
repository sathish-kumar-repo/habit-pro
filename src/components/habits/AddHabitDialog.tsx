import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { X } from "lucide-react";
import { COLORS, createHabit, habitSchema } from "@/lib/habits";
import { DatePickerWithPresets } from "./DatePickerWithPresets";
import type { z } from "zod";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";

type FieldErrors = Partial<Record<keyof z.infer<typeof habitSchema>, string>>;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AddHabitDialog({ open, onOpenChange }: Props) {
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
    const result = habitSchema.safeParse({ name, description, plan, start, end, color });
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

  return (
    <Drawer open={open} onOpenChange={(o) => !o && handleClose()} shouldScaleBackground={false}>
      <DrawerContent
        className="border-border bg-[oklch(0.185_0.008_240)] focus:outline-none"
        style={{ maxHeight: "92dvh" }}
      >
        {/* Handle */}
        <div className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-[oklch(1_0_0_/_0.15)]" />

        {/* Sticky header */}
        <div className="flex items-start justify-between px-5 pt-4 pb-3">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              New commitment
            </div>
            <DrawerTitle className="mt-1 font-display text-3xl leading-none text-foreground">
              Design a habit.
            </DrawerTitle>
            <DrawerDescription className="mt-1 text-sm text-muted-foreground">
              Define the intention and the window.
            </DrawerDescription>
          </div>
          <button
            onClick={handleClose}
            className="mt-1 rounded-full p-2 text-muted-foreground transition-all hover:bg-secondary hover:text-foreground active:scale-95"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Scrollable form */}
        <div
          className="overflow-y-auto px-5 pb-3 flex-1"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <div className="space-y-4 pb-6">
            <Field label="Habit name" error={errors.name}>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Read 20 pages"
                className={`h-12 rounded-xl text-base ${errors.name ? "border-destructive" : ""}`}
                autoFocus
              />
            </Field>

            <Field label="Why it matters" error={errors.description}>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="The reason behind it"
                className={`h-12 rounded-xl text-base ${errors.description ? "border-destructive" : ""}`}
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
        </div>

        {/* Sticky footer */}
        <div
          className="flex gap-3 border-t border-border px-5 py-4"
          style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
        >
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
      </DrawerContent>
    </Drawer>
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
