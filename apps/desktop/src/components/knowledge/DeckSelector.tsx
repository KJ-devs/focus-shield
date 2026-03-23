import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useKnowledgeStore } from "@/stores/knowledge-store";
import {
  knowledgeGetDueFlashcards,
  knowledgeListFlashcards,
} from "@/tauri/knowledge";
import type { KnowledgeFolder } from "@/tauri/knowledge";

interface FolderWithCounts {
  folder: KnowledgeFolder;
  totalCards: number;
  dueCards: number;
}

export function DeckSelector() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { folders, loadFolders } = useKnowledgeStore();
  const [folderData, setFolderData] = useState<FolderWithCounts[]>([]);
  const [totalDue, setTotalDue] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void loadFolders();
  }, [loadFolders]);

  useEffect(() => {
    async function loadCounts() {
      setIsLoading(true);
      try {
        const results: FolderWithCounts[] = [];
        let allDue = 0;

        for (const folder of folders) {
          const [allCards, dueCards] = await Promise.all([
            knowledgeListFlashcards(folder.id),
            knowledgeGetDueFlashcards(folder.id),
          ]);
          results.push({
            folder,
            totalCards: allCards.length,
            dueCards: dueCards.length,
          });
          allDue += dueCards.length;
        }

        setFolderData(results);
        setTotalDue(allDue);
      } catch {
        // IPC unavailable
      } finally {
        setIsLoading(false);
      }
    }

    if (folders.length > 0) {
      void loadCounts();
    } else {
      setIsLoading(false);
    }
  }, [folders]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-gray-500 dark:text-gray-400">{t("common.loading")}</p>
      </div>
    );
  }

  if (folders.length === 0 || totalDue === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
          <IconCards className="h-8 w-8 text-gray-400" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          {t("study.noCards")}
        </h2>
        <p className="text-center text-sm text-gray-500 dark:text-gray-400">
          {t("study.noCardsDesc")}
        </p>
        <Button variant="secondary" onClick={() => navigate("/knowledge")}>
          {t("study.goToKnowledge")}
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t("study.deckSelector")}
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {totalDue} {t("study.cardsDue")}
        </p>
      </div>

      {totalDue > 0 && (
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          onClick={() => navigate("/study/all")}
        >
          {t("study.studyAll")} ({totalDue})
        </Button>
      )}

      <div className="space-y-3">
        {folderData.map(({ folder, totalCards, dueCards }) => (
          <Card
            key={folder.id}
            className={`cursor-pointer transition-all ${
              dueCards > 0
                ? "hover:border-focus-400 dark:hover:border-focus-500"
                : "opacity-60"
            }`}
            onClick={dueCards > 0 ? () => navigate(`/study/${folder.id}`) : undefined}
          >
            <div className="flex items-center gap-4">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-lg text-lg"
                style={{ backgroundColor: `${folder.color}20`, color: folder.color }}
              >
                <IconCards className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-gray-900 dark:text-white">
                  {folder.name}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {totalCards} {t("study.totalCards")}
                </p>
              </div>
              {dueCards > 0 && (
                <span className="rounded-full bg-focus-100 px-3 py-1 text-sm font-semibold text-focus-700 dark:bg-focus-900/30 dark:text-focus-400">
                  {dueCards} {t("study.due")}
                </span>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function IconCards({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="3" width="12" height="14" rx="2" />
      <path d="M8 7h4M8 10h4M8 13h2" />
    </svg>
  );
}
