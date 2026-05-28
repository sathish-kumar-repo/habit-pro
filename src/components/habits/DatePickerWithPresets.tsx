import * as React from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DATE_PRESETS } from "@/lib/habits";

type Props = {
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  label: string;
  minDate?: Date;
  error?: string;
};

export function DatePickerWithPresets({ value, onChange, label, minDate, error }: Props) {
  const [open, setOpen] = React.useState(false);

  const applyPreset = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    d.setHours(0, 0, 0, 0);
    onChange(d);
    setOpen(false);
  };

  return (
    <div className="grid gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !value && "text-muted-foreground",
              error && "border-destructive",
            )}
          >
            <CalendarIcon className="mr-2 size-4" />
            {value ? format(value, "PPP") : <span>Pick a date</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto overflow-hidden p-0" align="start">
          <div className="flex">
            {/* Quick presets sidebar */}
            <div className="flex flex-col gap-1 border-r border-border p-3">
              <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
                Quick
              </div>
              {DATE_PRESETS.map((p) => (
                <button
                  key={p.days}
                  onClick={() => applyPreset(p.days)}
                  className="rounded-md px-2.5 py-1.5 text-left text-xs font-medium transition-colors hover:bg-secondary hover:text-foreground"
                >
                  {p.label}
                </button>
              ))}
            </div>
            {/* Calendar */}
            <Calendar
              mode="single"
              selected={value}
              onSelect={(d) => {
                onChange(d);
                setOpen(false);
              }}
              disabled={minDate ? { before: minDate } : undefined}
              defaultMonth={value ?? minDate ?? new Date()}
              autoFocus
            />
          </div>
        </PopoverContent>
      </Popover>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
