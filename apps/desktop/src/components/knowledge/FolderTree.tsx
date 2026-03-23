import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useKnowledgeStore } from "@/stores/knowledge-store";
import type { KnowledgeFolder } from "@/tauri/knowledge";

function IconFolder() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684L10 5h5a2 2 0 012 2v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5z" />
    </svg>
  );
}

function IconChevron({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-3 w-3 transition-transform duration-150 ${open ? "rotate-90" : ""}`}
      viewBox="0 0 20 20"
      fill="currentColor"
    >
      <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M10 4v12M4 10h12" />
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

interface FolderNodeProps {
  folder: KnowledgeFolder;
  folders: KnowledgeFolder[];
  documents: { folderId: string }[];
  selectedId: string | null;
  depth: number;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onCreateChild: (parentId: string) => void;
}

function FolderNode({ folder, folders, documents, selectedId, depth, onSelect, onDelete, onCreateChild }: FolderNodeProps) {
  const [expanded, setExpanded] = useState(true);
  const children = folders.filter((f) => f.parentId === folder.id);
  const docCount = documents.filter((d) => d.folderId === folder.id).length;
  const isSelected = selectedId === folder.id;
  const hasChildren = children.length > 0;

  return (
    <div>
      <div
        className={`group flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm cursor-pointer transition-colors ${
          isSelected
            ? "bg-focus-50 text-focus-700 dark:bg-focus-900/30 dark:text-focus-400"
            : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => onSelect(folder.id)}
      >
        {hasChildren ? (
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            className="shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <IconChevron open={expanded} />
          </button>
        ) : (
          <span className="w-3 shrink-0" />
        )}

        <span
          className="shrink-0 rounded"
          style={{ color: folder.color }}
        >
          <IconFolder />
        </span>

        <span className="flex-1 truncate">{folder.name}</span>

        {docCount > 0 && (
          <span className="shrink-0 text-xs text-gray-400 dark:text-gray-500">{docCount}</span>
        )}

        <div className="hidden shrink-0 items-center gap-0.5 group-hover:flex">
          <button
            onClick={(e) => { e.stopPropagation(); onCreateChild(folder.id); }}
            className="rounded p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
            title="New subfolder"
          >
            <IconPlus />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(folder.id); }}
            className="rounded p-0.5 text-gray-400 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400"
            title="Delete folder"
          >
            <IconTrash />
          </button>
        </div>
      </div>

      {expanded && children.map((child) => (
        <FolderNode
          key={child.id}
          folder={child}
          folders={folders}
          documents={documents}
          selectedId={selectedId}
          depth={depth + 1}
          onSelect={onSelect}
          onDelete={onDelete}
          onCreateChild={onCreateChild}
        />
      ))}
    </div>
  );
}

export function FolderTree() {
  const { t } = useTranslation();
  const { folders, documents, selectedFolderId, selectFolder, createFolder, deleteFolder } = useKnowledgeStore();
  const [isCreating, setIsCreating] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderParentId, setNewFolderParentId] = useState<string | null>(null);

  const rootFolders = folders.filter((f) => f.parentId === null);

  const handleCreateFolder = useCallback(async () => {
    const name = newFolderName.trim();
    if (!name) return;
    await createFolder(name, newFolderParentId);
    setNewFolderName("");
    setIsCreating(false);
    setNewFolderParentId(null);
  }, [newFolderName, newFolderParentId, createFolder]);

  const startCreating = useCallback((parentId: string | null) => {
    setNewFolderParentId(parentId);
    setNewFolderName("");
    setIsCreating(true);
  }, []);

  return (
    <div className="flex flex-col">
      <div className="mb-2 flex items-center justify-between px-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          {t("knowledge.folders")}
        </h3>
        <button
          onClick={() => startCreating(null)}
          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          title={t("knowledge.newFolder")}
        >
          <IconPlus />
        </button>
      </div>

      {isCreating && (
        <div className="mb-1 px-2">
          <input
            autoFocus
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleCreateFolder();
              if (e.key === "Escape") { setIsCreating(false); setNewFolderName(""); }
            }}
            onBlur={() => { if (newFolderName.trim()) { void handleCreateFolder(); } else { setIsCreating(false); } }}
            placeholder={t("knowledge.folderName")}
            className="w-full rounded-lg border border-focus-300 bg-white px-2.5 py-1.5 text-sm text-gray-900 focus:border-focus-500 focus:outline-none focus:ring-1 focus:ring-focus-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
        </div>
      )}

      <div className="space-y-0.5">
        {rootFolders.map((folder) => (
          <FolderNode
            key={folder.id}
            folder={folder}
            folders={folders}
            documents={documents}
            selectedId={selectedFolderId}
            depth={0}
            onSelect={selectFolder}
            onDelete={(id) => void deleteFolder(id)}
            onCreateChild={startCreating}
          />
        ))}
      </div>

      {folders.length === 0 && !isCreating && (
        <p className="px-3 py-4 text-center text-xs text-gray-400 dark:text-gray-500">
          {t("knowledge.noFolders")}
        </p>
      )}
    </div>
  );
}
