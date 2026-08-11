import { useState, ReactNode } from "react";
import { Tag, Check, Plus } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Category } from "@/lib/todos";
import { cn } from "@/lib/utils";

type Props = {
  categories: Category[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onManage: () => void;
  children?: ReactNode;
};

export function CategoryPicker({
  categories,
  selectedId,
  onSelect,
  onManage,
  children,
}: Props) {
  const [open, setOpen] = useState(false);
  const selected = categories.find((c) => c.id === selectedId);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {children ?? (
          <button
            type="button"
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all active:scale-95",
              selected
                ? "text-white"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
            style={
              selected
                ? { borderColor: selected.color, background: selected.color }
                : undefined
            }
          >
            {selected ? (
              <span
                className="size-2 rounded-full bg-white"
                style={{ background: "rgba(255,255,255,0.9)" }}
              />
            ) : (
              <Tag className="size-3" />
            )}
            <span>{selected ? selected.name : "Category"}</span>
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-2">
        <div className="max-h-60 overflow-y-auto">
          <button
            onClick={() => {
              onSelect(null);
              setOpen(false);
            }}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-[oklch(1_0_0_/_0.06)]"
          >
            <span className="flex size-4 items-center justify-center">
              {!selectedId && <Check className="size-3" />}
            </span>
            <span>No category</span>
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                onSelect(cat.id);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-[oklch(1_0_0_/_0.06)]"
              style={{ color: "var(--color-foreground)" }}
            >
              <span
                className="size-3 shrink-0 rounded-full"
                style={{ background: cat.color }}
              />
              <span className="flex-1 text-left">{cat.name}</span>
              {selectedId === cat.id && <Check className="size-3 text-muted-foreground" />}
            </button>
          ))}
          {categories.length === 0 && (
            <p className="px-2 py-3 text-center text-xs text-muted-foreground">
              No categories yet
            </p>
          )}
        </div>
        <div className="mt-1 border-t border-border pt-1">
          <button
            onClick={() => {
              setOpen(false);
              onManage();
            }}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-[oklch(1_0_0_/_0.06)] hover:text-foreground"
          >
            <Plus className="size-3.5" />
            <span>Manage categories</span>
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
