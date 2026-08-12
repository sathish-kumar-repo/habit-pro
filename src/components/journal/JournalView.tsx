import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  JournalEntry,
  createJournal,
  updateJournal,
  deleteJournal,
  snippet,
  journalDateLabel,
} from "@/lib/journal";
import { useAuth } from "@/hooks/use-auth";
import { JournalEditor } from "./JournalEditor";
import { Plus, Search, Trash2, BookOpen, CalendarDays, Check, Loader as Loader2, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

type SaveStatus = "idle" | "saving" | "saved" | "error";

type Props = {
  journals: JournalEntry[];
  loading: boolean;
  isMobile?: boolean;
};

export function JournalView({ journals, loading, isMobile }: Props) {
  const { user } = useAuth();
  const uid = user?.uid ?? "";

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<"list" | "editor">("list");
  const [search, setSearch] = useState("");
  const [editingTitle, setEditingTitle] = useState("");
  const [editingContent, setEditingContent] = useState("");
  const [editingDate, setEditingDate] = useState<Date>(new Date());
  const [isNew, setIsNew] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestContent = useRef({ title: "", content: "", plainText: "" });
  const currentEntryId = useRef<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return journals;
    return journals.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.plainText.toLowerCase().includes(q),
    );
  }, [journals, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, JournalEntry[]>();
    for (const entry of filtered) {
      const d = new Date(entry.date);
      d.setHours(0, 0, 0, 0);
      const key = d.toISOString();
      const arr = map.get(key) ?? [];
      arr.push(entry);
      map.set(key, arr);
    }
    return Array.from(map.entries()).map(([key, items]) => ({
      key,
      date: new Date(key),
      items,
    }));
  }, [filtered]);

  const flushSave = useCallback(async () => {
    const { title, content, plainText } = latestContent.current;
    const id = currentEntryId.current;
    if (!uid) return;
    if (!title.trim() && !plainText.trim()) return;

    setSaveStatus("saving");
    try {
      if (id) {
        await updateJournal(uid, id, { title, content, plainText });
      } else {
        const newId = await createJournal(uid, {
          title,
          content,
          plainText,
          date: editingDate,
        });
        currentEntryId.current = newId;
        setIsNew(false);
      }
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (err) {
      console.error("[journal] save error:", err);
      setSaveStatus("error");
    }
  }, [uid, editingDate]);

  const scheduleSave = useCallback(
    (title: string, content: string, plainText: string) => {
      latestContent.current = { title, content, plainText };
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      setSaveStatus("idle");
      debounceTimer.current = setTimeout(() => flushSave(), 1200);
    },
    [flushSave],
  );

  const handleNew = useCallback(() => {
    setSelectedId(null);
    setIsNew(true);
    setEditingTitle("");
    setEditingContent("");
    setEditingDate(new Date());
    setSaveStatus("idle");
    setMode("editor");
    currentEntryId.current = null;
    latestContent.current = { title: "", content: "", plainText: "" };
  }, []);

  const handleOpen = useCallback((entry: JournalEntry) => {
    setSelectedId(entry.id);
    setIsNew(false);
    setEditingTitle(entry.title);
    setEditingContent(entry.content);
    setEditingDate(new Date(entry.date));
    setSaveStatus("idle");
    setMode("editor");
    currentEntryId.current = entry.id;
    latestContent.current = {
      title: entry.title,
      content: entry.content,
      plainText: entry.plainText,
    };
  }, []);

  const handleBack = useCallback(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
    }
    if (latestContent.current.title.trim() || latestContent.current.content.trim()) {
      flushSave();
    }
    setMode("list");
    setSelectedId(null);
    setIsNew(false);
  }, [flushSave]);

  const handleEditorChange = useCallback(
    (html: string, plainText: string) => {
      setEditingContent(html);
      scheduleSave(editingTitle, html, plainText);
    },
    [editingTitle, scheduleSave],
  );

  const handleTitleChange = useCallback(
    (value: string) => {
      setEditingTitle(value);
      scheduleSave(value, editingContent, latestContent.current.plainText);
    },
    [editingContent, scheduleSave],
  );

  const handleDateChange = useCallback((iso: string) => {
    const [y, m, d] = iso.split("-").map(Number);
    setEditingDate(new Date(y, m - 1, d));
  }, []);

  async function handleDelete(id: string) {
    if (!uid) return;
    setConfirmDelete(null);
    await deleteJournal(uid, id);
    if (selectedId === id) handleBack();
  }

  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ── Editor mode ──
  if (mode === "editor") {
    return (
      <div className={cn("space-y-5", isMobile ? "pb-6 pt-2" : "mx-auto max-w-3xl")}>
        {/* Editor top bar */}
        <div
          className="flex items-center gap-3 rounded-2xl border px-3 py-2.5"
          style={{
            borderColor: "var(--color-border)",
            background: "var(--color-card)",
            boxShadow: "var(--shadow-soft)",
          }}
        >
          <button
            onClick={handleBack}
            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-all hover:bg-[oklch(1_0_0_/_0.06)] hover:text-foreground active:scale-90"
            aria-label="Back to list"
          >
            <ChevronLeft className="size-5" />
          </button>
          <div
            className="flex items-center gap-2 rounded-lg border px-2.5 py-1.5"
            style={{ borderColor: "var(--color-border)", background: "oklch(1 0 0 / 0.03)" }}
          >
            <CalendarDays className="size-3.5 text-muted-foreground" />
            <input
              type="date"
              value={formatDateInput(editingDate)}
              onChange={(e) => handleDateChange(e.target.value)}
              className="bg-transparent text-xs text-foreground transition-colors focus:outline-none"
              style={{ colorScheme: "dark" }}
            />
          </div>
          {isNew && (
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider"
              style={{ background: "oklch(0.74 0.16 158 / 0.15)", color: "var(--color-primary)" }}
            >
              New
            </span>
          )}
          <div className="ml-auto flex items-center gap-2">
            <SaveStatusBadge status={saveStatus} />
            {!isNew && selectedId && (
              <button
                onClick={() => setConfirmDelete(selectedId)}
                className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-all hover:bg-[oklch(0.65_0.21_28_/_0.12)] hover:text-red-400 active:scale-90"
                aria-label="Delete entry"
              >
                <Trash2 className="size-4" />
              </button>
            )}
          </div>
        </div>

        {/* Title */}
        <div className="space-y-1">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Title
          </span>
          <input
            value={editingTitle}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Untitled entry…"
            className="w-full bg-transparent font-display text-2xl font-light tracking-tight text-foreground placeholder:text-muted-foreground/30 focus:outline-none"
          />
        </div>

        <JournalEditor content={editingContent} onChange={handleEditorChange} />

        {confirmDelete && (
          <DeleteDialog
            onCancel={() => setConfirmDelete(null)}
            onConfirm={() => handleDelete(confirmDelete)}
          />
        )}
      </div>
    );
  }

  // ── List mode ──
  return (
    <div className={cn("space-y-5", isMobile ? "pb-6 pt-2" : "mx-auto max-w-3xl space-y-6")}>
      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <span
            className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground"
            style={{ color: "var(--color-primary)" }}
          >
            Journal
          </span>
          <h2
            className={cn(
              "mt-1 font-display font-light tracking-tight text-foreground",
              isMobile ? "text-xl" : "text-2xl",
            )}
          >
            Your Journal
          </h2>
          <p className={cn("mt-0.5 text-muted-foreground", isMobile ? "text-xs" : "text-sm")}>
            Capture your thoughts, reflections, and memories.
          </p>
        </div>
        <button
          onClick={handleNew}
          className="flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-xs font-medium transition-all hover:brightness-110 active:scale-95"
          style={{
            background: "var(--color-primary)",
            color: "var(--color-primary-foreground)",
            boxShadow: "var(--shadow-soft)",
          }}
        >
          <Plus className="size-4" strokeWidth={2.5} />
          New entry
        </button>
      </div>

      {/* Search */}
      <div
        className="glass flex items-center gap-2.5 rounded-2xl px-4 py-3"
        style={{ boxShadow: "var(--shadow-soft)" }}
      >
        <Search className="size-4 shrink-0 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search journal entries…"
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Clear
          </button>
        )}
      </div>

      {/* Stats */}
      {journals.length > 0 && (
        <div
          className="grid grid-cols-3 divide-x rounded-2xl border py-3"
          style={{
            borderColor: "var(--color-border)",
            background: "var(--color-card)",
            boxShadow: "var(--shadow-soft)",
            divideColor: "oklch(1 0 0 / 0.06)",
          }}
        >
          <Stat label="Entries" value={journals.length} />
          <Stat
            label="This month"
            value={journals.filter((e) => {
              const d = new Date(e.date);
              const now = new Date();
              return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            }).length}
          />
          <Stat
            label="Last entry"
            value={journals.length > 0 ? journalDateLabel(new Date(journals[0].date)) : "—"}
            text
          />
        </div>
      )}

      {journals.length === 0 && (
        <div
          className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed py-20 text-center"
          style={{ borderColor: "oklch(1 0 0 / 0.08)" }}
        >
          <div
            className="flex size-14 items-center justify-center rounded-2xl"
            style={{ background: "oklch(1 0 0 / 0.04)" }}
          >
            <BookOpen className="size-7 text-muted-foreground/40" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">No journal entries yet</p>
            <p className="text-xs text-muted-foreground">Start writing to document your journey</p>
          </div>
          <button
            onClick={handleNew}
            className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition-all active:scale-95"
            style={{ background: "var(--color-primary)", color: "var(--color-primary-foreground)" }}
          >
            <Plus className="size-4" /> Write first entry
          </button>
        </div>
      )}

      {journals.length > 0 && filtered.length === 0 && (
        <div
          className="rounded-2xl border border-dashed py-12 text-center text-xs text-muted-foreground"
          style={{ borderColor: "oklch(1 0 0 / 0.08)" }}
        >
          No entries match "{search}"
        </div>
      )}

      {filtered.length > 0 && (
        <div className="space-y-5">
          {grouped.map((group) => (
            <div key={group.key} className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <CalendarDays className="size-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {journalDateLabel(group.date)}
                </span>
                <span className="text-xs tabular-nums text-muted-foreground/50">
                  {group.items.length}
                </span>
                <div className="hairline flex-1" />
              </div>
              <ul className="space-y-2">
                {group.items.map((entry) => (
                  <JournalCard
                    key={entry.id}
                    entry={entry}
                    onOpen={() => handleOpen(entry)}
                    onDelete={() => setConfirmDelete(entry.id)}
                  />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {confirmDelete && mode === "list" && (
        <DeleteDialog
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => handleDelete(confirmDelete)}
        />
      )}
    </div>
  );
}

function JournalCard({
  entry,
  onOpen,
  onDelete,
}: {
  entry: JournalEntry;
  onOpen: () => void;
  onDelete: () => void;
}) {
  return (
    <li
      className="group relative cursor-pointer overflow-hidden rounded-xl border px-4 py-3.5 transition-all duration-200 hover:border-[oklch(0.74_0.16_158_/_0.3)]"
      style={{
        background: "var(--color-card)",
        borderColor: "var(--color-border)",
        boxShadow: "var(--shadow-soft)",
      }}
      onClick={onOpen}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3
            className="text-sm font-medium text-foreground"
            style={{ display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden" }}
          >
            {entry.title || "Untitled entry"}
          </h3>
          <p
            className="mt-1 text-xs leading-relaxed text-muted-foreground"
            style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
          >
            {snippet(entry.plainText, 140) || "No content"}
          </p>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="flex size-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground/0 transition-all duration-200 hover:text-red-400 group-hover:text-muted-foreground/50 active:scale-90"
          aria-label="Delete entry"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/60">
          {new Date(entry.updatedAt).toLocaleDateString("en", { month: "short", day: "numeric" })}
        </span>
        {entry.updatedAt !== entry.createdAt && (
          <span className="text-[10px] text-muted-foreground/40">edited</span>
        )}
      </div>
    </li>
  );
}

function SaveStatusBadge({ status }: { status: SaveStatus }) {
  const config = {
    idle: { icon: null, text: "", color: "var(--color-muted-foreground)" },
    saving: { icon: <Loader2 className="size-3 animate-spin" />, text: "Saving…", color: "var(--color-muted-foreground)" },
    saved: { icon: <Check className="size-3" />, text: "Saved", color: "var(--color-primary)" },
    error: { icon: null, text: "Save failed", color: "var(--color-destructive)" },
  };
  const { icon, text, color } = config[status];
  if (status === "idle") return null;
  return (
    <div className="flex items-center gap-1.5 text-[11px] font-medium transition-all" style={{ color }}>
      {icon}
      {text}
    </div>
  );
}

function Stat({ label, value, text }: { label: string; value: number | string; text?: boolean }) {
  return (
    <div className="px-3 text-center">
      <p
        className={cn(
          "font-display font-light tabular-nums text-foreground",
          text ? "text-sm" : "text-xl",
        )}
      >
        {value}
      </p>
      <p className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  );
}

function DeleteDialog({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "oklch(0 0 0 / 0.7)" }}
      onClick={onCancel}
    >
      <div
        className="glass w-full max-w-sm rounded-2xl p-6 text-center"
        style={{ boxShadow: "var(--shadow-elevated)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full"
          style={{ background: "oklch(0.65 0.21 28 / 0.15)" }}
        >
          <Trash2 className="size-6 text-red-400" />
        </div>
        <h3 className="font-display text-lg text-foreground">Delete entry?</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          This journal entry will be permanently removed.
        </p>
        <div className="mt-5 flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 rounded-lg py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            style={{ background: "oklch(1 0 0 / 0.05)" }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-lg py-2.5 text-sm font-medium text-white transition-all active:scale-95"
            style={{ background: "var(--color-destructive)" }}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function formatDateInput(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}
