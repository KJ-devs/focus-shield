import { useEffect, useRef, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Highlight from "@tiptap/extension-highlight";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Typography from "@tiptap/extension-typography";
import Superscript from "@tiptap/extension-superscript";
import Subscript from "@tiptap/extension-subscript";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { Markdown } from "tiptap-markdown";
import type { MarkdownStorage } from "tiptap-markdown";
import { common, createLowlight } from "lowlight";
import { useKnowledgeStore } from "@/stores/knowledge-store";
import { EditorToolbar } from "./EditorToolbar";
import type { KnowledgeDocument } from "@/tauri/knowledge";

const lowlight = createLowlight(common);

const AUTOSAVE_DELAY_MS = 1000;

function getEditorMarkdown(editor: ReturnType<typeof useEditor>): string {
  if (!editor) return "";
  const store = editor.storage as unknown as Record<string, MarkdownStorage>;
  return store.markdown?.getMarkdown() ?? editor.getHTML();
}

export function DocumentEditor() {
  const { t } = useTranslation();
  const { selectedDocumentId, getDocument, updateDocument } = useKnowledgeStore();
  const [doc, setDoc] = useState<KnowledgeDocument | null>(null);
  const [title, setTitle] = useState("");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentDocIdRef = useRef<string | null>(null);

  // Use refs so the onUpdate callback always has the latest values
  const titleRef = useRef(title);
  titleRef.current = title;
  const tagsRef = useRef(doc?.tags ?? "");
  tagsRef.current = doc?.tags ?? "";

  const doSave = useCallback((docId: string, currentTitle: string, currentContent: string, currentTags: string) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void updateDocument(docId, currentTitle, currentContent, currentTags);
    }, AUTOSAVE_DELAY_MS);
  }, [updateDocument]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
      }),
      Placeholder.configure({
        placeholder: t("knowledge.editorPlaceholder"),
      }),
      Markdown.configure({
        html: true,
        tightLists: false,
        linkify: true,
        breaks: false,
        transformPastedText: true,
        transformCopiedText: true,
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        HTMLAttributes: {
          class: "text-focus-600 dark:text-focus-400 underline cursor-pointer",
        },
      }),
      Image.configure({
        inline: false,
        allowBase64: true,
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Highlight.configure({
        multicolor: true,
      }),
      Underline,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Typography,
      Superscript,
      Subscript,
      CodeBlockLowlight.configure({
        lowlight,
      }),
    ],
    editorProps: {
      attributes: {
        class: "prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[300px] px-6 py-4",
      },
    },
    onUpdate: ({ editor: ed }) => {
      const docId = currentDocIdRef.current;
      if (!docId) return;
      const store = ed.storage as unknown as Record<string, MarkdownStorage>;
      const content = store.markdown?.getMarkdown() ?? ed.getHTML();
      doSave(docId, titleRef.current, content, tagsRef.current);
    },
  });

  // Load document when selection changes
  useEffect(() => {
    if (!selectedDocumentId) {
      setDoc(null);
      setTitle("");
      currentDocIdRef.current = null;
      editor?.commands.setContent("");
      return;
    }

    currentDocIdRef.current = selectedDocumentId;

    void getDocument(selectedDocumentId).then((loaded) => {
      if (!loaded) return;
      if (currentDocIdRef.current !== loaded.id) return;

      setDoc(loaded);
      setTitle(loaded.title);
      editor?.commands.setContent(loaded.content || "");
    });
  }, [selectedDocumentId, getDocument, editor]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  const handleTitleChange = useCallback((newTitle: string) => {
    setTitle(newTitle);
    const docId = currentDocIdRef.current;
    if (!docId || !editor) return;
    doSave(docId, newTitle, getEditorMarkdown(editor), tagsRef.current);
  }, [editor, doSave]);

  if (!selectedDocumentId) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-gray-400 dark:text-gray-500">
        <svg className="mb-3 h-12 w-12" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 8h14l8 8v24a2 2 0 01-2 2H14a2 2 0 01-2-2V10a2 2 0 012-2z" />
          <path d="M28 8v8h8" />
          <path d="M18 24h12M18 30h8" />
        </svg>
        <p className="text-sm">{t("knowledge.selectDocument")}</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-gray-200 px-6 py-3 dark:border-gray-700">
        <input
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder={t("knowledge.untitledDocument")}
          className="w-full bg-transparent text-xl font-bold text-gray-900 placeholder-gray-300 focus:outline-none dark:text-white dark:placeholder-gray-600"
        />
      </div>

      {editor && <EditorToolbar editor={editor} />}

      <div className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
