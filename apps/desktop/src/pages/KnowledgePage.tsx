import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useKnowledgeStore } from "@/stores/knowledge-store";
import { FolderTree } from "@/components/knowledge/FolderTree";
import { DocumentList } from "@/components/knowledge/DocumentList";
import { DocumentEditor } from "@/components/knowledge/DocumentEditor";
import { CardGeneratorPanel } from "@/components/knowledge/CardGeneratorPanel";

function IconCards() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="12" height="10" rx="1" />
      <path d="M6 2h12a1 1 0 011 1v10" />
    </svg>
  );
}

export function KnowledgePage() {
  const { t } = useTranslation();
  const { loadFolders, selectedFolderId } = useKnowledgeStore();
  const [showCardPanel, setShowCardPanel] = useState(false);

  useEffect(() => {
    void loadFolders();
  }, [loadFolders]);

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t("knowledge.title")}
        </h1>
        <button
          onClick={() => setShowCardPanel(!showCardPanel)}
          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            showCardPanel
              ? "bg-focus-100 text-focus-700 dark:bg-focus-900/30 dark:text-focus-400"
              : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          }`}
          title={t("knowledge.flashcards")}
        >
          <IconCards />
          <span className="hidden sm:inline">{t("knowledge.flashcards")}</span>
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar: folders + documents */}
        <div className="flex w-[250px] shrink-0 flex-col border-r border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/50">
          <div className="flex-1 overflow-y-auto py-3">
            <FolderTree />
          </div>

          {selectedFolderId && (
            <div className="border-t border-gray-200 py-3 dark:border-gray-700">
              <DocumentList />
            </div>
          )}
        </div>

        {/* Center: document editor */}
        <div className="flex-1 overflow-hidden bg-white dark:bg-gray-800">
          <DocumentEditor />
        </div>

        {/* Right panel: card generator */}
        {showCardPanel && (
          <CardGeneratorPanel onClose={() => setShowCardPanel(false)} />
        )}
      </div>
    </div>
  );
}
