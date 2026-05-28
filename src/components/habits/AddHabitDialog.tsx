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
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { COLORS, createHabit, fmtDateInput, parseInputDate } from "@/lib/habits";

export function AddHabitDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [plan, setPlan] = useState("");
  const today = fmtDateInput(new Date());
  const in30 = fmtDateInput(new Date(Date.now() + 30 * 86400_000));
  const [start, setStart] = useState(today);
  const [end, setEnd] = useState(in30);
  const [color, setColor] = useState(COLORS[0]);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setName("");
    setDescription("");
    setPlan("");
    setStart(today);
    setEnd(in30);
    setColor(COLORS[0]);
  };

  const submit = async () => {
    if (!name.trim() || !start || !end || end < start) return;
    setSaving(true);
    try {
      await createHabit({
        name: name.trim(),
        description: description.trim(),
        plan: plan.trim(),
        start: parseInputDate(start),
        end: parseInputDate(end),
        color,
      });
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
          <Field label="Habit">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Read 20 pages"
            />
          </Field>
          <Field label="Why it matters">
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="The reason behind it"
            />
          </Field>
          <Field label="Plan">
            <Textarea
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              placeholder="When, where, how"
              rows={3}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start">
              <Input
                type="date"
                min={today}
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </Field>
            <Field label="End">
              <Input
                type="date"
                min={start || today}
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </Field>
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
            {saving ? "Creating…" : "Commit"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}
