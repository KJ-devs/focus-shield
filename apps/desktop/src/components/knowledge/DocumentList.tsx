import { useTranslation } from "react-i18next";
import { useKnowledgeStore } from "@/stores/knowledge-store";
import { Button } from "@/components/ui/Button";

function IconDoc() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3h6l4 4v10a1 1 0 01-1 1H6a1 1 0 01-1-1V4a1 1 0 011-1z" />
      <path d="M12 3v4h4" />
      <path d="M8 10h4M8 13h4" />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6h12M8 6V4h4v2M6 6v10a1 1 0 001 1h6a1 1 0 001-1V6" />
    </svg>
  );
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

export function DocumentList() {
  const { t } = useTranslation();
  const { documents, selectedFolderId, selectedDocumentId, selectDocument, createDocument, deleteDocument } = useKnowledgeStore();

  if (!selectedFolderId) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <p className="text-xs text-gray-400 dark:text-gray-500">
          {t("knowledge.selectFolderFirst")}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="mb-2 flex items-center justify-between px-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          {t("knowledge.documents")}
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void createDocument(t("knowledge.untitledDocument"))}
          className="!px-2 !py-1 text-xs"
        >
          + {t("knowledge.newDocument")}
        </Button>
      </div>

      <div className="space-y-0.5">
        {documents.map((doc) => {
          const isSelected = selectedDocumentId === doc.id;
          return (
            <div
              key={doc.id}
              className={`group flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                isSelected
                  ? "bg-focus-50 text-focus-700 dark:bg-focus-900/30 dark:text-focus-400"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
              onClick={() => selectDocument(doc.id)}
            >
              <span className={`shrink-0 ${isSelected ? "text-focus-500" : "text-gray-400"}`}>
                <IconDoc />
              </span>
              <div className="flex-1 truncate">
                <p className="truncate font-medium">{doc.title || t("knowledge.untitledDocument")}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {formatDate(doc.updatedAt)}
                </p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); void deleteDocument(doc.id); }}
                className="hidden shrink-0 rounded p-0.5 text-gray-400 hover:bg-red-100 hover:text-red-600 group-hover:block dark:hover:bg-red-900/30 dark:hover:text-red-400"
                title={t("common.delete")}
              >
                <IconTrash />
              </button>
            </div>
          );
        })}
      </div>

      {documents.length === 0 && (
        <p className="px-3 py-4 text-center text-xs text-gray-400 dark:text-gray-500">
          {t("knowledge.noDocuments")}
        </p>
      )}
    </div>
  );
}
