import { useEffect, useRef, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { useKnowledgeStore } from "@/stores/knowledge-store";
import { EditorToolbar } from "./EditorToolbar";
import type { KnowledgeDocument } from "@/tauri/knowledge";

const AUTOSAVE_DELAY_MS = 1000;

export function DocumentEditor() {
  const { t } = useTranslation();
  const { selectedDocumentId, getDocument, updateDocument } = useKnowledgeStore();
  const [doc, setDoc] = useState<KnowledgeDocument | null>(null);
  const [title, setTitle] = useState("");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentDocIdRef = useRef<string | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: t("knowledge.editorPlaceholder"),
      }),
    ],
    editorProps: {
      attributes: {
        class: "prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[300px] px-6 py-4",
      },
    },
    onUpdate: ({ editor: ed }) => {
      scheduleSave(title, ed.getHTML());
    },
  });

  const scheduleSave = useCallback((currentTitle: string, currentContent: string) => {
    if (!currentDocIdRef.current) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    const docId = currentDocIdRef.current;
    saveTimerRef.current = setTimeout(() => {
      void updateDocument(docId, currentTitle, currentContent, doc?.tags ?? "");
    }, AUTOSAVE_DELAY_MS);
  }, [updateDocument, doc?.tags]);

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
    if (editor) {
      scheduleSave(newTitle, editor.getHTML());
    }
  }, [editor, scheduleSave]);

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
