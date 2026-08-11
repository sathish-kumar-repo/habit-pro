import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
import {
  Category,
  CATEGORY_COLORS,
  createCategory,
  updateCategory,
  deleteCategory,
  clearCategoryOnTodos,
} from "@/lib/todos";
import { useAuth } from "@/hooks/use-auth";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
};

export function CategoryManager({ open, onOpenChange, categories }: Props) {
  const { user } = useAuth();
  const uid = user?.uid ?? "";

  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(CATEGORY_COLORS[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState(CATEGORY_COLORS[0]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) {
      setNewName("");
      setNewColor(CATEGORY_COLORS[0]);
      setEditingId(null);
    }
  }, [open]);

  async function handleCreate() {
    if (!newName.trim() || !uid) return;
    setBusy(true);
    try {
      await createCategory(uid, newName, newColor);
      setNewName("");
      setNewColor(CATEGORY_COLORS[0]);
    } finally {
      setBusy(false);
    }
  }

  function startEdit(cat: Category) {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditColor(cat.color);
  }

  async function handleSaveEdit() {
    if (!editingId || !editName.trim() || !uid) return;
    setBusy(true);
    try {
      await updateCategory(uid, editingId, editName, editColor);
      setEditingId(null);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(cat: Category) {
    if (!uid) return;
    setBusy(true);
    try {
      await clearCategoryOnTodos(uid, cat.id);
      await deleteCategory(uid, cat.id);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Manage categories</DialogTitle>
          <DialogDescription>
            Create, edit, and organize your task categories.
          </DialogDescription>
        </DialogHeader>

        {/* Create new */}
        <div
          className="glass space-y-3 rounded-xl p-4"
          style={{ boxShadow: "var(--shadow-soft)" }}
        >
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
            }}
            placeholder="New category name…"
            className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            disabled={busy}
          />
          <ColorRow selected={newColor} onSelect={setNewColor} />
          <button
            onClick={handleCreate}
            disabled={busy || !newName.trim()}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition-all active:scale-[0.98] disabled:opacity-40"
            style={{
              background: "var(--color-primary)",
              color: "var(--color-primary-foreground)",
            }}
          >
            <Plus className="size-4" /> Add category
          </button>
        </div>

        {/* Existing list */}
        <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
          {categories.length === 0 && (
            <p className="py-6 text-center text-xs text-muted-foreground">
              No categories yet — create one above.
            </p>
          )}
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="flex items-center gap-2 rounded-xl px-3 py-2.5 transition-colors"
              style={{
                background: "oklch(1 0 0 / 0.03)",
                border: "1px solid oklch(1 0 0 / 0.06)",
              }}
            >
              {editingId === cat.id ? (
                <>
                  <ColorRow
                    selected={editColor}
                    onSelect={setEditColor}
                    compact
                  />
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveEdit();
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    className="flex-1 bg-transparent text-sm text-foreground focus:outline-none"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveEdit}
                    disabled={busy}
                    className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-all hover:text-foreground active:scale-90"
                  >
                    <Check className="size-3.5" />
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    disabled={busy}
                    className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-all hover:text-foreground active:scale-90"
                  >
                    <X className="size-3.5" />
                  </button>
                </>
              ) : (
                <>
                  <span
                    className="size-3 shrink-0 rounded-full"
                    style={{ background: cat.color }}
                  />
                  <span className="flex-1 text-sm text-foreground">{cat.name}</span>
                  <button
                    onClick={() => startEdit(cat)}
                    disabled={busy}
                    className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-all hover:text-foreground active:scale-90"
                  >
                    <Pencil className="size-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(cat)}
                    disabled={busy}
                    className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-all hover:text-red-400 active:scale-90"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ColorRow({
  selected,
  onSelect,
  compact,
}: {
  selected: string;
  onSelect: (c: string) => void;
  compact?: boolean;
}) {
  return (
    <div className={`flex flex-wrap gap-1.5 ${compact ? "" : "pb-0.5"}`}>
      {CATEGORY_COLORS.map((c) => (
        <button
          key={c}
          onClick={() => onSelect(c)}
          className="flex items-center justify-center rounded-full transition-all active:scale-90"
          style={{
            width: compact ? 22 : 26,
            height: compact ? 22 : 26,
            background: c,
            boxShadow:
              selected === c
                ? `0 0 0 2px var(--color-background), 0 0 0 4px ${c}`
                : "none",
          }}
        >
          {selected === c && <Check className="size-3 text-white" strokeWidth={3} />}
        </button>
      ))}
    </div>
  );
}
