import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Pencil } from "lucide-react";
import { Habit, COLORS, habitSchema, updateHabit } from "@/lib/habits";
import { DatePickerWithPresets } from "./DatePickerWithPresets";

type Props = {
  habit: Habit | null;
  onClose: () => void;
};

type FieldErrors = Partial<Record<keyof z.infer<typeof habitSchema>, string>>;

export function EditHabitDialog({ habit, onClose }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [plan, setPlan] = useState("");
  const [start, setStart] = useState<Date | undefined>();
  const [end, setEnd] = useState<Date | undefined>();
  const [color, setColor] = useState(COLORS[0]);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  useEffect(() => {
    if (!habit) return;
    setName(habit.name);
    setDescription(habit.description);
    setPlan(habit.plan);
    const s = new Date(habit.startDate);
    s.setHours(0, 0, 0, 0);
    const e = new Date(habit.endDate);
    e.setHours(0, 0, 0, 0);
    setStart(s);
    setEnd(e);
    setColor(habit.color);
    setErrors({});
  }, [habit]);

  const submit = async () => {
    if (!habit || !start || !end) return;
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
      await updateHabit(habit, result.data);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!habit} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-xl border-border bg-popover">
        <DialogHeader>
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            <Pencil className="size-3" />
            Edit commitment
          </div>
          <DialogTitle className="font-display text-4xl leading-none">
            Refine the habit.
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Adjust the intention, window, or plan.
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
            onClick={onClose}
            className="rounded-md px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={saving || !name.trim()}
            className="rounded-full px-5 py-2 text-sm font-medium text-white transition-opacity disabled:opacity-40"
            style={{ background: color }}
          >
            {saving ? "Saving…" : "Update"}
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
