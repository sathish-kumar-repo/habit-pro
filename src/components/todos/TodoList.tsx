import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Todo,
  Category,
  createTodo,
  deleteTodo,
  reorderTodos,
} from "@/lib/todos";
import {
  Plus,
  Trash2,
  ClipboardList,
  Tag,
  Settings2,
  Check,
  Circle,
  ListTodo,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { CategoryPicker } from "./CategoryPicker";
import { CategoryManager } from "./CategoryManager";
import { TodoItem } from "./TodoItem";
import { cn } from "@/lib/utils";

type Filter = "all" | "active" | "done";
type GroupMode = "none" | "category";

type Props = {
  todos: Todo[];
  categories: Category[];
};

function mergeIds(localIds: string[], incoming: Todo[]): string[] {
  const incomingIds = incoming.map((t) => t.id);
  const incomingSet = new Set(incomingIds);
  const kept = localIds.filter((id) => incomingSet.has(id));
  const keptSet = new Set(kept);
  const added = incomingIds.filter((id) => !keptSet.has(id));
  return [...added, ...kept];
}

export function TodoList({ todos, categories }: Props) {
  const { user } = useAuth();
  const uid = user?.uid ?? "";
  const [input, setInput] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [adding, setAdding] = useState(false);

  const [newTodoCategoryId, setNewTodoCategoryId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | "all">("all");
  const [groupMode, setGroupMode] = useState<GroupMode>("none");
  const [managerOpen, setManagerOpen] = useState(false);

  const [localIds, setLocalIds] = useState<string[]>([]);

  useEffect(() => {
    setLocalIds((prev) =>
      prev.length === 0 ? todos.map((t) => t.id) : mergeIds(prev, todos),
    );
  }, [todos]);

  const todoMap = new Map(todos.map((t) => [t.id, t]));
  const ordered = localIds.map((id) => todoMap.get(id)).filter(Boolean) as Todo[];

  const active = todos.filter((t) => !t.done);
  const done = todos.filter((t) => t.done);
  const completionRate = todos.length > 0 ? Math.round((done.length / todos.length) * 100) : 0;

  const statusFiltered =
    filter === "all"
      ? ordered
      : filter === "active"
        ? ordered.filter((t) => !t.done)
        : ordered.filter((t) => t.done);

  const categoryFiltered =
    activeCategory === "all"
      ? statusFiltered
      : statusFiltered.filter((t) => t.categoryId === activeCategory);

  const groups = useMemo(() => {
    if (groupMode === "none") {
      return [{ label: null, items: categoryFiltered }] as {
        label: string | null;
        color?: string;
        items: Todo[];
      }[];
    }
    const byCat = new Map<string | null, Todo[]>();
    for (const t of categoryFiltered) {
      const key = t.categoryId ?? null;
      const arr = byCat.get(key) ?? [];
      arr.push(t);
      byCat.set(key, arr);
    }
    const result: { label: string | null; color?: string; items: Todo[] }[] = [];
    for (const cat of categories) {
      const items = byCat.get(cat.id);
      if (items?.length) result.push({ label: cat.name, color: cat.color, items });
    }
    const uncategorized = byCat.get(null);
    if (uncategorized?.length) result.push({ label: "Uncategorized", items: uncategorized });
    return result;
  }, [categoryFiltered, groupMode, categories]);

  const visible = categoryFiltered;
  const hasCategories = categories.length > 0;

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || !uid) return;
    setInput("");
    setAdding(true);
    try {
      await createTodo(uid, text, newTodoCategoryId);
    } finally {
      setAdding(false);
    }
  }

  async function handleClearDone() {
    if (!uid) return;
    await Promise.all(done.map((t) => deleteTodo(uid, t.id)));
  }

  const handleReorder = useCallback(
    (dragId: string, overId: string) => {
      if (!uid) return;
      setLocalIds((prev) => {
        const next = [...prev];
        const from = next.indexOf(dragId);
        const to = next.indexOf(overId);
        if (from === -1 || to === -1 || from === to) return prev;
        next.splice(from, 1);
        next.splice(to, 0, dragId);
        reorderTodos(uid, next).catch(console.error);
        return next;
      });
    },
    [uid],
  );

  const filterTabs: { id: Filter; label: string; count: number; icon: typeof Circle }[] = [
    { id: "all", label: "All", count: todos.length, icon: ListTodo },
    { id: "active", label: "Active", count: active.length, icon: Circle },
    { id: "done", label: "Done", count: done.length, icon: Check },
  ];

  return (
    <div className="space-y-5">
      {/* ── Progress header card ─────────────────────────────────────────── */}
      {todos.length > 0 && (
        <div
          className="glass overflow-hidden rounded-2xl p-5"
          style={{ boxShadow: "var(--shadow-soft)" }}
        >
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Progress
              </p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="font-display text-3xl font-light tabular-nums text-foreground">
                  {completionRate}
                  <span className="text-lg text-muted-foreground">%</span>
                </span>
                <span className="text-xs text-muted-foreground">
                  {done.length} of {todos.length} done
                </span>
              </div>
            </div>
            <div className="flex gap-6 text-right">
              <div>
                <p className="font-display text-xl font-light tabular-nums text-foreground">
                  {active.length}
                </p>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Remaining
                </p>
              </div>
              <div>
                <p className="font-display text-xl font-light tabular-nums text-foreground">
                  {done.length}
                </p>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Completed
                </p>
              </div>
            </div>
          </div>
          {/* Progress bar */}
          <div className="mt-4 h-1.5 overflow-hidden rounded-full" style={{ background: "oklch(1 0 0 / 0.06)" }}>
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${completionRate}%`,
                background: "linear-gradient(90deg, var(--color-primary), oklch(0.82 0.13 80))",
                boxShadow: "0 0 12px oklch(0.74 0.16 158 / 0.4)",
              }}
            />
          </div>
        </div>
      )}

      {/* ── Add task form ───────────────────────────────────────────────── */}
      <form
        onSubmit={handleAdd}
        className="glass flex items-center gap-2.5 rounded-2xl px-4 py-3.5"
        style={{ boxShadow: "var(--shadow-soft)" }}
      >
        <Plus
          className="size-4 shrink-0 text-muted-foreground"
          style={{ color: adding ? "var(--color-primary)" : undefined }}
        />
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Add a new task…"
          className="min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          disabled={adding}
        />
        {hasCategories && (
          <CategoryPicker
            categories={categories}
            selectedId={newTodoCategoryId}
            onSelect={setNewTodoCategoryId}
            onManage={() => setManagerOpen(true)}
          />
        )}
        <button
          type="submit"
          disabled={adding || !input.trim()}
          className="flex size-8 shrink-0 items-center justify-center rounded-xl transition-all active:scale-90 disabled:opacity-30"
          style={{
            background: "var(--color-primary)",
            color: "var(--color-primary-foreground)",
            boxShadow: "var(--shadow-soft)",
          }}
        >
          <Plus className="size-4" strokeWidth={2.5} />
        </button>
      </form>

      {/* ── Toolbar: filter tabs + actions ──────────────────────────────── */}
      {todos.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* Segmented filter */}
            <div
              className="flex flex-wrap gap-0.5 rounded-xl p-1"
              style={{ background: "oklch(1 0 0 / 0.04)" }}
            >
              {filterTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = filter === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setFilter(tab.id)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200",
                      isActive ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                    )}
                    style={{
                      background: isActive ? "var(--color-primary)" : "transparent",
                      boxShadow: isActive ? "var(--shadow-soft)" : "none",
                    }}
                  >
                    <Icon className="size-3" />
                    {tab.label}
                    <span
                      className="tabular-nums"
                      style={{ opacity: isActive ? 0.7 : 0.5 }}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-1.5">
              {hasCategories && (
                <button
                  onClick={() => setGroupMode((g) => (g === "none" ? "category" : "none"))}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all active:scale-95",
                    groupMode === "category"
                      ? "text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  style={{
                    background: groupMode === "category" ? "var(--color-primary)" : "oklch(1 0 0 / 0.04)",
                  }}
                >
                  <Tag className="size-3" />
                  Group
                </button>
              )}
              {hasCategories && (
                <button
                  onClick={() => setManagerOpen(true)}
                  className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-all hover:text-foreground active:scale-90"
                  style={{ background: "oklch(1 0 0 / 0.04)" }}
                  aria-label="Manage categories"
                >
                  <Settings2 className="size-3.5" />
                </button>
              )}
              {done.length > 0 && (
                <button
                  onClick={handleClearDone}
                  className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground transition-all hover:text-red-400"
                  style={{ background: "oklch(1 0 0 / 0.04)" }}
                >
                  <Trash2 className="size-3" />
                  Clear done
                </button>
              )}
            </div>
          </div>

          {/* Category filter chips */}
          {hasCategories && (
            <div className="flex flex-wrap items-center gap-1.5">
              <CategoryChip
                label="All"
                active={activeCategory === "all"}
                onClick={() => setActiveCategory("all")}
              />
              {categories.map((cat) => (
                <CategoryChip
                  key={cat.id}
                  label={cat.name}
                  color={cat.color}
                  active={activeCategory === cat.id}
                  onClick={() =>
                    setActiveCategory(activeCategory === cat.id ? "all" : cat.id)
                  }
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Empty state ─────────────────────────────────────────────────── */}
      {todos.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed py-20 text-center" style={{ borderColor: "oklch(1 0 0 / 0.08)" }}>
          <div
            className="flex size-14 items-center justify-center rounded-2xl"
            style={{ background: "oklch(1 0 0 / 0.04)" }}
          >
            <ClipboardList className="size-7 text-muted-foreground/40" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">No tasks yet</p>
            <p className="text-xs text-muted-foreground">
              Add your first task above to get started
            </p>
          </div>
        </div>
      )}

      {visible.length === 0 && todos.length > 0 && (
        <div
          className="rounded-2xl border border-dashed py-12 text-center text-xs text-muted-foreground"
          style={{ borderColor: "oklch(1 0 0 / 0.08)" }}
        >
          No {filter !== "all" ? filter : ""} tasks
          {activeCategory !== "all" ? " in this category" : ""}
        </div>
      )}

      {/* ── Task list / groups ──────────────────────────────────────────── */}
      {visible.length > 0 && (
        <div className="space-y-5">
          {groups.map((group, gi) => (
            <div key={gi} className="space-y-2">
              {group.label && (
                <div className="flex items-center gap-2 px-1">
                  {group.color && (
                    <span
                      className="size-2.5 rounded-full"
                      style={{ background: group.color }}
                    />
                  )}
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {group.label}
                  </span>
                  <span className="text-xs tabular-nums text-muted-foreground/50">
                    {group.items.length}
                  </span>
                  <div className="hairline flex-1" />
                </div>
              )}
              <ul className="space-y-2">
                {group.items.map((todo) => (
                  <TodoItem
                    key={todo.id}
                    todo={todo}
                    uid={uid}
                    categories={categories}
                    onReorder={handleReorder}
                    onManageCategories={() => setManagerOpen(true)}
                  />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <CategoryManager
        open={managerOpen}
        onOpenChange={setManagerOpen}
        categories={categories}
      />
    </div>
  );
}

// ── CategoryChip ────────────────────────────────────────────────────────────
function CategoryChip({
  label,
  color,
  active,
  onClick,
}: {
  label: string;
  color?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all duration-200 active:scale-95",
        active ? "text-white" : "text-muted-foreground hover:text-foreground",
      )}
      style={{
        background: active ? color ?? "var(--color-primary)" : "oklch(1 0 0 / 0.04)",
        border: active ? "none" : "1px solid oklch(1 0 0 / 0.06)",
      }}
    >
      {color && !active && (
        <span className="size-2 rounded-full" style={{ background: color }} />
      )}
      {label}
    </button>
  );
}
