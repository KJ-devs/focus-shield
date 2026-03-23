import type { Editor } from "@tiptap/react";

interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  title: string;
  children: React.ReactNode;
}

function ToolbarButton({ onClick, isActive, title, children }: ToolbarButtonProps) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`rounded px-2 py-1 text-sm font-medium transition-colors ${
        isActive
          ? "bg-focus-100 text-focus-700 dark:bg-focus-900/40 dark:text-focus-400"
          : "text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
      }`}
    >
      {children}
    </button>
  );
}

interface EditorToolbarProps {
  editor: Editor;
}

export function EditorToolbar({ editor }: EditorToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-gray-200 px-3 py-1.5 dark:border-gray-700">
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive("bold")}
        title="Bold"
      >
        <strong>B</strong>
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive("italic")}
        title="Italic"
      >
        <em>I</em>
      </ToolbarButton>

      <div className="mx-1 h-5 w-px bg-gray-200 dark:bg-gray-700" />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        isActive={editor.isActive("heading", { level: 1 })}
        title="Heading 1"
      >
        H1
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive("heading", { level: 2 })}
        title="Heading 2"
      >
        H2
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        isActive={editor.isActive("heading", { level: 3 })}
        title="Heading 3"
      >
        H3
      </ToolbarButton>

      <div className="mx-1 h-5 w-px bg-gray-200 dark:bg-gray-700" />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive("bulletList")}
        title="Bullet List"
      >
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <circle cx="4" cy="6" r="1.5" />
          <circle cx="4" cy="10" r="1.5" />
          <circle cx="4" cy="14" r="1.5" />
          <rect x="8" y="5" width="10" height="2" rx="0.5" />
          <rect x="8" y="9" width="10" height="2" rx="0.5" />
          <rect x="8" y="13" width="10" height="2" rx="0.5" />
        </svg>
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive("orderedList")}
        title="Ordered List"
      >
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <text x="2" y="8" fontSize="6" fontWeight="bold">1</text>
          <text x="2" y="12" fontSize="6" fontWeight="bold">2</text>
          <text x="2" y="16" fontSize="6" fontWeight="bold">3</text>
          <rect x="8" y="5" width="10" height="2" rx="0.5" />
          <rect x="8" y="9" width="10" height="2" rx="0.5" />
          <rect x="8" y="13" width="10" height="2" rx="0.5" />
        </svg>
      </ToolbarButton>

      <div className="mx-1 h-5 w-px bg-gray-200 dark:bg-gray-700" />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        isActive={editor.isActive("codeBlock")}
        title="Code Block"
      >
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 5L3 10l4 5M13 5l4 5-4 5" />
        </svg>
      </ToolbarButton>
    </div>
  );
}
