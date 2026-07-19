import { useState, useRef, useEffect } from "react";
import { Todo, createTodo, toggleTodo, deleteTodo, updateTodoText } from "@/lib/todos";
import { Plus, Trash2, Check, ClipboardList, Pencil } from "lucide-react";
import { useGlobalConfetti } from "@/hooks/use-global-confetti";

const TODO_CONFETTI_COLOR = "#10b981";

type Filter = "all" | "active" | "done";

type Props = {
  todos: Todo[];
};

export function TodoList({ todos }: Props) {
  const [input, setInput] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [adding, setAdding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const active = todos.filter((t) => !t.done);
  const done = todos.filter((t) => t.done);

  const visible =
    filter === "all" ? todos : filter === "active" ? active : done;

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

  return (
    <div className="space-y-4">
      {/* Add form */}
      <form
        onSubmit={handleAdd}
        className="flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3"
        style={{ boxShadow: "var(--shadow-soft)" }}
      >
        <input
          ref={inputRef}
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
                  background:
                    filter === f ? "var(--color-primary)" : "oklch(1 0 0 / 0.05)",
                  color:
                    filter === f
                      ? "var(--color-primary-foreground)"
                      : "var(--color-muted-foreground)",
                }}
              >
                {f === "all"
                  ? `All ${todos.length}`
                  : f === "active"
                    ? `Active ${active.length}`
                    : `Done ${done.length}`}
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
            <TodoItem key={todo.id} todo={todo} />
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

function TodoItem({ todo }: { todo: Todo }) {
  const { trigger: triggerConfetti } = useGlobalConfetti();
  const checkboxRef = useRef<HTMLButtonElement>(null);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(todo.text);
  const [saving, setSaving] = useState(false);
  const editRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) editRef.current?.focus();
  }, [editing]);

  async function handleToggle() {
    const completing = !todo.done;
    if (completing) {
      triggerConfetti(TODO_CONFETTI_COLOR, checkboxRef.current);
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

  return (
    <li
      className="group flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 transition-all"
      style={{ boxShadow: "var(--shadow-soft)" }}
    >
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

      {/* Actions — always visible so touch users can reach them */}
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
