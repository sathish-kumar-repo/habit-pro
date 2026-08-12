import { useEffect, useRef, useState } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { Color } from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import { TextStyle } from "@tiptap/extension-text-style"; // add this
import Link from "@tiptap/extension-link";
import {
  TextAlignCenter as AlignCenter,
  ChevronLeft as AlignLeft,
  Highlighter as AlignRight,
  Bold,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Palette,
  Redo2,
  Underline as UnderlineIcon,
  Undo2,
} from "lucide-react";
import { createPortal } from "react-dom";

type Props = {
  content: string;
  onChange: (html: string, plainText: string) => void;
  editable?: boolean;
};

const TEXT_COLORS = [
  "#ffffff",
  "#cbd5e1",
  "#f8d477",
  "#8ee6b8",
  "#78d4e8",
  "#8db8ff",
  "#c4a7ff",
  "#f5a3c7",
  "#ffad7a",
  "#ff7d75",
  "#74e0d2",
  "#b8c7d9",
];

const HIGHLIGHT_COLORS = [
  "#fef08a",
  "#fde68a",
  "#fed7aa",
  "#fca5a5",
  "#fbcfe8",
  "#ddd6fe",
  "#c7d2fe",
  "#bfdbfe",
  "#a7f3d0",
  "#bbf7d0",
  "#86efac",
  "#fcd5ce",
  "#f9a8d4",
  "#ddd6fe",
  "#a5b4fc",
  "#99f6e4",
  "#fef9c3",
  "#fdba74",
];

export function JournalEditor({ content, onChange, editable = true }: Props) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
      }),
      Underline,
      TextStyle,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Color,
      Highlight.configure({ multicolor: true }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "journal-link",
          style: "color: var(--color-primary); text-decoration: underline;",
        },
      }),
    ],
    content,
    editable,
    onUpdate({ editor }) {
      onChangeRef.current(editor.getHTML(), editor.getText());
    },
    editorProps: {
      attributes: {
        class: "journal-prose",
        style: "min-height: 300px; padding: 1rem 1.25rem; outline: none;",
      },
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
       editor.commands.setContent(content, { emitUpdate: false });
    }
  }, [content, editor]);

  if (!editor) return null;

  return (
    <div
      className="overflow-hidden rounded-2xl border"
      style={{
        borderColor: "var(--color-border)",
        background: "var(--color-card)",
        boxShadow: "var(--shadow-soft)",
      }}
    >
      <Toolbar editor={editor} />
      <div className="border-t" style={{ borderColor: "var(--color-border)" }}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  function setLink() {
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL:", previous ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }

  return (
    <div
      className="journal-toolbar flex items-center gap-0.5 overflow-x-auto px-3 py-2"
      style={{ background: "oklch(1 0 0 / 0.025)" }}
    >
      <ToolGroup>
        <ToolBtn
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          icon={<Undo2 className="size-3.5" />}
          label="Undo"
        />
        <ToolBtn
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          icon={<Redo2 className="size-3.5" />}
          label="Redo"
        />
      </ToolGroup>

      <Divider />

      <ToolGroup>
        <ToolBtn
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          active={editor.isActive("heading", { level: 1 })}
          icon={<Heading1 className="size-3.5" />}
          label="Heading 1"
        />
        <ToolBtn
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive("heading", { level: 2 })}
          icon={<Heading2 className="size-3.5" />}
          label="Heading 2"
        />
        <ToolBtn
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive("heading", { level: 3 })}
          icon={<Heading3 className="size-3.5" />}
          label="Heading 3"
        />
      </ToolGroup>

      <Divider />

      <ToolGroup>
        <ToolBtn
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
          icon={<Bold className="size-3.5" />}
          label="Bold"
        />
        <ToolBtn
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
          icon={<Italic className="size-3.5" />}
          label="Italic"
        />
        <ToolBtn
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive("underline")}
          icon={<UnderlineIcon className="size-3.5" />}
          label="Underline"
        />
      </ToolGroup>

      <Divider />

      <ToolGroup>
        <ToolBtn
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive("bulletList")}
          icon={<List className="size-3.5" />}
          label="Bullet list"
        />
        <ToolBtn
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive("orderedList")}
          icon={<ListOrdered className="size-3.5" />}
          label="Numbered list"
        />
      </ToolGroup>

      <Divider />

      <ToolGroup>
        <ToolBtn
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          active={editor.isActive({ textAlign: "left" })}
          icon={<AlignLeft className="size-3.5" />}
          label="Align left"
        />
        <ToolBtn
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          active={editor.isActive({ textAlign: "center" })}
          icon={<AlignCenter className="size-3.5" />}
          label="Align center"
        />
        <ToolBtn
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          active={editor.isActive({ textAlign: "right" })}
          icon={<AlignRight className="size-3.5" />}
          label="Align right"
        />
      </ToolGroup>

      <Divider />

      <ToolGroup>
        <ToolBtn
          onClick={setLink}
          active={editor.isActive("link")}
          icon={<LinkIcon className="size-3.5" />}
          label="Link"
        />
      </ToolGroup>

      <Divider />

      <ColorPopover
        icon={<Palette className="size-3.5" />}
        label="Text color"
        colors={TEXT_COLORS}
        onPick={(c) => editor.chain().focus().setColor(c).run()}
        onClear={() => editor.chain().focus().unsetColor().run()}
      />

      <ColorPopover
        icon={<Highlighter className="size-3.5" />}
        label="Highlight"
        colors={HIGHLIGHT_COLORS}
        onPick={(c) => editor.chain().focus().toggleHighlight({ color: c }).run()}
        onClear={() => editor.chain().focus().unsetHighlight().run()}
      />
    </div>
  );
}

function ToolGroup({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-0.5">{children}</div>;
}

function Divider() {
  return <div className="mx-1 h-5 w-px" style={{ background: "oklch(1 0 0 / 0.08)" }} />;
}

function ToolBtn({
  onClick,
  active,
  disabled,
  icon,
  label,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className="flex size-7 items-center justify-center rounded-lg transition-all active:scale-90 disabled:opacity-30"
      style={{
        background: active ? "oklch(0.74 0.16 158 / 0.15)" : "transparent",
        color: active ? "var(--color-primary)" : "var(--color-muted-foreground)",
      }}
      onMouseEnter={(e) => {
        if (!active && !disabled) e.currentTarget.style.background = "oklch(1 0 0 / 0.06)";
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = "transparent";
      }}
    >
      {icon}
    </button>
  );
}

function ColorPopover({
  icon,
  label,
  colors,
  onPick,
  onClear,
}: {
  icon: React.ReactNode;
  label: string;
  colors: string[];
  onPick: (c: string) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);

  function toggleOpen() {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setCoords({ top: rect.bottom + 8, left: rect.left });
    }
    setOpen((v) => !v);
  }

  function pickColor(color: string) {
    onPick(color);
    setOpen(false);
  }

  function clearColor() {
    onClear();
    setOpen(false);
  }

  // close on scroll/resize so it doesn't float in the wrong spot
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  return (
    <div className="relative shrink-0">
      <button
        ref={btnRef}
        type="button"
        title={label}
        aria-label={label}
        aria-expanded={open}
        onClick={toggleOpen}
        className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-all hover:bg-[oklch(1_0_0_/_0.07)] hover:text-foreground active:scale-90"
        style={{ color: open ? "var(--color-primary)" : undefined }}
      >
        {icon}
      </button>
      {open &&
        createPortal(
          <>
            <button
              type="button"
              aria-label="Close color palette"
              className="fixed inset-0 z-40 cursor-default"
              onClick={() => setOpen(false)}
            />
            <div
              className="fixed z-50 grid w-[min(18rem,calc(100vw-2rem))] grid-cols-6 gap-2 rounded-2xl border p-3"
              style={{
                top: coords.top,
                left: coords.left,
                background: "var(--color-popover)",
                borderColor: "var(--color-border)",
                boxShadow: "var(--shadow-elevated)",
              }}
            >
              {colors.map((color) => (
                <button
                  key={color}
                  type="button"
                  title={color}
                  aria-label={`Use ${color}`}
                  onClick={() => pickColor(color)}
                  className="size-7 rounded-full border border-white/15 shadow-sm transition-transform hover:scale-110 active:scale-90"
                  style={{ background: color }}
                />
              ))}
              <button
                type="button"
                onClick={clearColor}
                className="col-span-2 rounded-lg border border-white/10 px-2 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
              >
                Clear color
              </button>
            </div>
          </>,
          document.body,
        )}
    </div>
  );
}
