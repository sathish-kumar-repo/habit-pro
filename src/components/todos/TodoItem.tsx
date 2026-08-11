import { useState, useRef, useEffect } from "react";
import {
  Todo,
  Category,
  toggleTodo,
  deleteTodo,
  updateTodoText,
  updateTodoCategory,
} from "@/lib/todos";
import { Check, Pencil, Trash2, GripVertical } from "lucide-react";
import { useGlobalConfetti } from "@/hooks/use-global-confetti";
import { CategoryPicker } from "./CategoryPicker";
import { cn } from "@/lib/utils";

const TODO_CONFETTI_COLOR = "#10b981";

function playDoneSound() {
  try {
    const ctx = new AudioContext();
    const notes = [523.25, 659.25, 783.99];
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
    // SSR or no AudioContext
  }
}

type Props = {
  todo: Todo;
  uid: string;
  categories: Category[];
  onReorder: (dragId: string, overId: string) => void;
  onManageCategories: () => void;
};

export function TodoItem({
  todo,
  uid,
  categories,
  onReorder,
  onManageCategories,
}: Props) {
  const { trigger: triggerConfetti } = useGlobalConfetti();
  const checkboxRef = useRef<HTMLButtonElement>(null);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(todo.text);
  const [saving, setSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);
  const editRef = useRef<HTMLInputElement>(null);

  const category = categories.find((c) => c.id === todo.categoryId);

  useEffect(() => {
    if (editing) editRef.current?.focus();
  }, [editing]);

  useEffect(() => {
    if (!editing) setEditText(todo.text);
  }, [todo.text, editing]);

  async function handleToggle() {
    if (!uid) return;
    const completing = !todo.done;
    if (completing) {
      triggerConfetti(TODO_CONFETTI_COLOR, checkboxRef.current);
      playDoneSound();
      setJustCompleted(true);
      setTimeout(() => setJustCompleted(false), 600);
    }
    await toggleTodo(uid, todo.id, completing);
  }

  async function handleDelete() {
    if (!uid) return;
    await deleteTodo(uid, todo.id);
  }

  async function handleSaveEdit() {
    if (!editText.trim() || editText.trim() === todo.text) {
      setEditing(false);
      setEditText(todo.text);
      return;
    }
    if (!uid) return;
    setSaving(true);
    try {
      await updateTodoText(uid, todo.id, editText);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleCategoryChange(id: string | null) {
    if (!uid) return;
    await updateTodoCategory(uid, todo.id, id);
  }

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
    if (dragId && dragId !== todo.id) onReorder(dragId, todo.id);
  }

  return (
    <li
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="group relative flex items-center gap-3 overflow-hidden rounded-xl border px-4 py-3 transition-all duration-200"
      style={{
        background: "var(--color-card)",
        borderColor: isDragOver
          ? "var(--color-primary)"
          : "var(--color-border)",
        boxShadow: justCompleted
          ? "0 0 0 1px var(--color-primary), 0 0 20px oklch(0.74 0.16 158 / 0.3), var(--shadow-soft)"
          : "var(--shadow-soft)",
        opacity: isDragging ? 0.4 : 1,
        cursor: isDragging ? "grabbing" : "default",
        transform: isDragOver ? "translateY(-1px)" : "translateY(0)",
      }}
    >
      {/* Category accent line */}
      {category && (
        <span
          className="absolute left-0 top-0 h-full w-[3px]"
          style={{ background: category.color }}
        />
      )}

      {/* Drag handle — visible on hover */}
      <span
        className="shrink-0 cursor-grab touch-none text-muted-foreground/0 transition-all duration-200 group-hover:text-muted-foreground/40 active:cursor-grabbing"
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
          borderColor: todo.done ? "var(--color-primary)" : "oklch(1 0 0 / 0.15)",
          background: todo.done ? "var(--color-primary)" : "transparent",
          animation: justCompleted ? "check-pop 0.5s ease-out" : undefined,
        }}
      >
        {todo.done && (
          <Check
            className="size-3 text-primary-foreground"
            strokeWidth={3}
            style={{ animation: justCompleted ? "check-pop 0.4s ease-out" : undefined }}
          />
        )}
      </button>

      {/* Content */}
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
        <div className="flex flex-1 flex-col gap-1.5">
          <span
            onDoubleClick={() => !todo.done && setEditing(true)}
            className="select-none text-sm leading-snug transition-colors"
            style={{
              color: todo.done
                ? "var(--color-muted-foreground)"
                : "var(--color-foreground)",
              textDecoration: todo.done ? "line-through" : "none",
              textDecorationColor: "var(--color-muted-foreground)",
              textDecorationThickness: "1.5px",
            }}
          >
            {todo.text}
          </span>

          {/* Category badge / picker */}
          <div className="flex items-center gap-1.5">
            {category ? (
              <>
                <span
                  className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-opacity"
                  style={{
                    background: `${category.color}22`,
                    color: category.color,
                    border: `1px solid ${category.color}44`,
                  }}
                >
                  <span
                    className="size-1.5 rounded-full"
                    style={{ background: category.color }}
                  />
                  {category.name}
                </span>
                <CategoryPicker
                  categories={categories}
                  selectedId={todo.categoryId ?? null}
                  onSelect={handleCategoryChange}
                  onManage={onManageCategories}
                >
                  <button className="text-[10px] text-muted-foreground/50 transition-colors hover:text-muted-foreground">
                    Change
                  </button>
                </CategoryPicker>
              </>
            ) : (
              <CategoryPicker
                categories={categories}
                selectedId={todo.categoryId ?? null}
                onSelect={handleCategoryChange}
                onManage={onManageCategories}
              />
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-0.5">
        {!todo.done && !editing && (
          <button
            onClick={() => setEditing(true)}
            className="flex size-7 items-center justify-center rounded-lg text-muted-foreground/0 transition-all duration-200 hover:bg-[oklch(1_0_0_/_0.06)] hover:text-foreground group-hover:text-muted-foreground/60 active:scale-90"
          >
            <Pencil className="size-3.5" />
          </button>
        )}
        <button
          onClick={handleDelete}
          className="flex size-7 items-center justify-center rounded-lg text-muted-foreground/0 transition-all duration-200 hover:bg-[oklch(1_0_0_/_0.06)] hover:text-red-400 group-hover:text-muted-foreground/60 active:scale-90"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </li>
  );
}
