import { useState, useRef, useEffect, useCallback } from "react";
import { Todo, createTodo, toggleTodo, deleteTodo, updateTodoText, reorderTodos } from "@/lib/todos";
import { Plus, Trash2, Check, ClipboardList, Pencil, GripVertical } from "lucide-react";
import { useGlobalConfetti } from "@/hooks/use-global-confetti";

const TODO_CONFETTI_COLOR = "#10b981";

type Filter = "all" | "active" | "done";

type Props = {
  todos: Todo[];
};

// ---------------------------------------------------------------------------
// Done sound — generated via Web Audio API, no audio file required
// ---------------------------------------------------------------------------
function playDoneSound() {
  try {
    const ctx = new AudioContext();
    const notes = [523.25, 659.25, 783.99]; // C5 → E5 → G5
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      const start = ctx.currentTime + i * 0.1;
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.18, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);
      osc.start(start);
      osc.stop(start + 0.35);
    });
  } catch {
    // AudioContext not available (e.g. SSR) — silently skip
  }
}

// ---------------------------------------------------------------------------
// Helpers for merging Firestore updates with local drag order
// ---------------------------------------------------------------------------
function mergeIds(localIds: string[], incoming: Todo[]): string[] {
  const incomingIds = incoming.map((t) => t.id);
  const incomingSet = new Set(incomingIds);
  // Keep existing local order, remove deleted
  const kept = localIds.filter((id) => incomingSet.has(id));
  const keptSet = new Set(kept);
  // Prepend any brand-new ids
  const added = incomingIds.filter((id) => !keptSet.has(id));
  return [...added, ...kept];
}

export function TodoList({ todos }: Props) {
  const [input, setInput] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [adding, setAdding] = useState(false);

  // Local ordering state — drives display order, synced to Firestore on drop
  const [localIds, setLocalIds] = useState<string[]>([]);

  // Sync localIds when Firestore todos change
  useEffect(() => {
    setLocalIds((prev) => (prev.length === 0 ? todos.map((t) => t.id) : mergeIds(prev, todos)));
  }, [todos]);

  // Build a map for O(1) lookup
  const todoMap = new Map(todos.map((t) => [t.id, t]));

  // Ordered list respecting localIds
  const ordered = localIds.map((id) => todoMap.get(id)).filter(Boolean) as Todo[];

  const active = todos.filter((t) => !t.done);
  const done = todos.filter((t) => t.done);

  const visible =
    filter === "all" ? ordered : filter === "active" ? ordered.filter((t) => !t.done) : ordered.filter((t) => t.done);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    setInput("");
    setAdding(true);
    try {
      await createTodo(text);
    } finally {
      setAdding(false);
    }
  }

  async function handleClearDone() {
    await Promise.all(done.map((t) => deleteTodo(t.id)));
  }

  // Called by TodoItem when a drag-drop reorder completes
  const handleReorder = useCallback(
    (dragId: string, overId: string) => {
      setLocalIds((prev) => {
        const next = [...prev];
        const from = next.indexOf(dragId);
        const to = next.indexOf(overId);
        if (from === -1 || to === -1 || from === to) return prev;
        next.splice(from, 1);
        next.splice(to, 0, dragId);
        // Persist to Firestore (fire-and-forget)
        reorderTodos(next).catch(console.error);
        return next;
      });
    },
    [],
  );

  return (
    <div className="space-y-4">
      {/* Add form */}
      <form
        onSubmit={handleAdd}
        className="flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3"
        style={{ boxShadow: "var(--shadow-soft)" }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Add a new task…"
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          disabled={adding}
        />
        <button
          type="submit"
          disabled={adding || !input.trim()}
          className="flex size-8 shrink-0 items-center justify-center rounded-xl transition-all active:scale-90 disabled:opacity-40"
          style={{ background: "var(--color-primary)", color: "var(--color-primary-foreground)" }}
        >
          <Plus className="size-4" />
        </button>
      </form>

      {/* Filter pills + clear */}
      {todos.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            {(["all", "active", "done"] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="rounded-full px-3 py-1 text-xs font-medium capitalize transition-all"
                style={{
                  background: filter === f ? "var(--color-primary)" : "oklch(1 0 0 / 0.05)",
                  color:
                    filter === f ? "var(--color-primary-foreground)" : "var(--color-muted-foreground)",
                }}
              >
                {f === "all" ? `All ${todos.length}` : f === "active" ? `Active ${active.length}` : `Done ${done.length}`}
              </button>
            ))}
          </div>
          {done.length > 0 && (
            <button
              onClick={handleClearDone}
              className="rounded-full px-3 py-1 text-xs text-muted-foreground transition-all hover:text-foreground"
            >
              Clear done
            </button>
          )}
        </div>
      )}

      {/* Empty state */}
      {todos.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
          <ClipboardList className="size-10 text-muted-foreground/40" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">No tasks yet</p>
            <p className="text-xs text-muted-foreground">Add your first task above</p>
          </div>
        </div>
      )}

      {visible.length === 0 && todos.length > 0 && (
        <div className="rounded-2xl border border-dashed border-border py-10 text-center text-xs text-muted-foreground">
          No {filter} tasks
        </div>
      )}

      {/* List */}
      {visible.length > 0 && (
        <ul className="space-y-2">
          {visible.map((todo) => (
            <TodoItem key={todo.id} todo={todo} onReorder={handleReorder} />
          ))}
        </ul>
      )}

      {/* Footer summary */}
      {active.length > 0 && (
        <p className="text-center text-xs text-muted-foreground">
          {active.length} task{active.length !== 1 ? "s" : ""} remaining
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// TodoItem
// ---------------------------------------------------------------------------
type TodoItemProps = {
  todo: Todo;
  onReorder: (dragId: string, overId: string) => void;
};

function TodoItem({ todo, onReorder }: TodoItemProps) {
  const { trigger: triggerConfetti } = useGlobalConfetti();
  const checkboxRef = useRef<HTMLButtonElement>(null);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(todo.text);
  const [saving, setSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const editRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) editRef.current?.focus();
  }, [editing]);

  // Keep editText in sync when todo.text changes externally
  useEffect(() => {
    if (!editing) setEditText(todo.text);
  }, [todo.text, editing]);

  async function handleToggle() {
    const completing = !todo.done;
    if (completing) {
      triggerConfetti(TODO_CONFETTI_COLOR, checkboxRef.current);
      playDoneSound();
    }
    await toggleTodo(todo.id, completing);
  }

  async function handleDelete() {
    await deleteTodo(todo.id);
  }

  async function handleSaveEdit() {
    if (!editText.trim() || editText.trim() === todo.text) {
      setEditing(false);
      setEditText(todo.text);
      return;
    }
    setSaving(true);
    try {
      await updateTodoText(todo.id, editText);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  // ---- Drag-and-drop handlers ----
  function handleDragStart(e: React.DragEvent) {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", todo.id);
    setIsDragging(true);
  }

  function handleDragEnd() {
    setIsDragging(false);
    setIsDragOver(false);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setIsDragOver(true);
  }

  function handleDragLeave() {
    setIsDragOver(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    const dragId = e.dataTransfer.getData("text/plain");
    if (dragId && dragId !== todo.id) {
      onReorder(dragId, todo.id);
    }
  }

  return (
    <li
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="group flex items-center gap-3 rounded-2xl border bg-card px-4 py-3 transition-all"
      style={{
        boxShadow: "var(--shadow-soft)",
        borderColor: isDragOver ? "var(--color-primary)" : "var(--color-border)",
        opacity: isDragging ? 0.4 : 1,
        cursor: isDragging ? "grabbing" : "default",
      }}
    >
      {/* Drag handle */}
      <span
        className="shrink-0 cursor-grab touch-none text-muted-foreground/40 transition-colors hover:text-muted-foreground active:cursor-grabbing"
        aria-hidden
      >
        <GripVertical className="size-4" />
      </span>

      {/* Checkbox */}
      <button
        ref={checkboxRef}
        onClick={handleToggle}
        className="flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-all active:scale-90"
        style={{
          borderColor: todo.done ? "var(--color-primary)" : "var(--color-border)",
          background: todo.done ? "var(--color-primary)" : "transparent",
        }}
      >
        {todo.done && <Check className="size-3 text-primary-foreground" strokeWidth={3} />}
      </button>

      {/* Text / Edit */}
      {editing ? (
        <input
          ref={editRef}
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onBlur={handleSaveEdit}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSaveEdit();
            if (e.key === "Escape") {
              setEditing(false);
              setEditText(todo.text);
            }
          }}
          disabled={saving}
          className="flex-1 bg-transparent text-sm text-foreground focus:outline-none"
        />
      ) : (
        <span
          onDoubleClick={() => !todo.done && setEditing(true)}
          className="flex-1 select-none text-sm"
          style={{
            color: todo.done ? "var(--color-muted-foreground)" : "var(--color-foreground)",
            textDecoration: todo.done ? "line-through" : "none",
          }}
        >
          {todo.text}
        </span>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1">
        {!todo.done && !editing && (
          <button
            onClick={() => setEditing(true)}
            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-all hover:bg-[oklch(1_0_0_/_0.06)] hover:text-foreground active:scale-90"
          >
            <Pencil className="size-3.5" />
          </button>
        )}
        <button
          onClick={handleDelete}
          className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-all hover:bg-[oklch(1_0_0_/_0.06)] hover:text-red-400 active:scale-90"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </li>
  );
}
