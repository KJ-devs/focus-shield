import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { generateCardsWithFeedback } from "@focus-shield/knowledge";
import { useKnowledgeStore } from "@/stores/knowledge-store";
import { knowledgeCreateFlashcardsBatch } from "@/tauri/knowledge";
import type { FlashcardRecord } from "@/tauri/knowledge";
import { Button } from "@/components/ui/Button";

interface GeneratedCard {
  front: string;
  back: string;
  type: string;
}

const TYPE_COLORS: Record<string, string> = {
  qa: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  cloze: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  definition: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  list: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  basic: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400",
};

function IconCards() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="12" height="10" rx="1" />
      <path d="M6 2h12a1 1 0 011 1v10" />
    </svg>
  );
}

function IconClose() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M5 5l10 10M15 5L5 15" />
    </svg>
  );
}

function IconWarning() {
  return (
    <svg className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.168 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
    </svg>
  );
}

function CardPreview({ card, index }: { card: GeneratedCard; index: number }) {
  const [showBack, setShowBack] = useState(false);
  const colorClass = TYPE_COLORS[card.type] ?? TYPE_COLORS.basic;

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50">
      <div className="mb-1.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-400 dark:text-gray-500">
            #{index + 1}
          </span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${colorClass}`}>
            {card.type}
          </span>
        </div>
        <button
          onClick={() => setShowBack(!showBack)}
          className="text-xs text-focus-500 hover:text-focus-600 dark:text-focus-400"
        >
          {showBack ? "Front" : "Back"}
        </button>
      </div>
      <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300 line-clamp-4">
        {showBack ? card.back : card.front}
      </p>
    </div>
  );
}

interface CardGeneratorPanelProps {
  onClose: () => void;
}

export function CardGeneratorPanel({ onClose }: CardGeneratorPanelProps) {
  const { t } = useTranslation();
  const { selectedDocumentId, selectedFolderId, getDocument } = useKnowledgeStore();
  const [cards, setCards] = useState<GeneratedCard[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleGenerate = useCallback(async () => {
    if (!selectedDocumentId || !selectedFolderId) return;

    setIsGenerating(true);
    setSaved(false);
    setWarnings([]);

    try {
      const doc = await getDocument(selectedDocumentId);
      if (!doc) {
        setWarnings(["Could not load document"]);
        return;
      }

      if (!doc.content || !doc.content.trim()) {
        setWarnings(["Document is empty — write some content first"]);
        setCards([]);
        return;
      }

      const result = generateCardsWithFeedback(doc.id, selectedFolderId, doc.content);
      setCards(result.cards.map((c) => ({ front: c.front, back: c.back, type: c.type })));
      setWarnings(result.warnings);
    } catch (err) {
      console.error("[knowledge] card generation failed:", err);
      setWarnings(["Generation failed — check your document content"]);
    } finally {
      setIsGenerating(false);
    }
  }, [selectedDocumentId, selectedFolderId, getDocument]);

  const handleSaveAll = useCallback(async () => {
    if (!selectedDocumentId || !selectedFolderId || cards.length === 0) return;

    setIsSaving(true);
    try {
      const now = new Date().toISOString();
      const records: FlashcardRecord[] = cards.map((card) => ({
        id: crypto.randomUUID(),
        documentId: selectedDocumentId,
        folderId: selectedFolderId,
        front: card.front,
        back: card.back,
        cardType: card.type,
        ease: 2.5,
        interval: 0,
        repetitions: 0,
        nextReviewAt: now,
        lastReviewedAt: null,
        createdAt: now,
      }));

      await knowledgeCreateFlashcardsBatch(records);
      setSaved(true);
    } catch (err) {
      console.error("[knowledge] save failed:", err);
      setWarnings(["Failed to save cards"]);
    } finally {
      setIsSaving(false);
    }
  }, [selectedDocumentId, selectedFolderId, cards]);

  const typeCounts = cards.reduce<Record<string, number>>((acc, c) => {
    acc[c.type] = (acc[c.type] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="flex h-full w-[320px] flex-col border-l border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <span className="text-focus-500">
            <IconCards />
          </span>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            {t("knowledge.flashcards")}
          </h3>
        </div>
        <button
          onClick={onClose}
          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
        >
          <IconClose />
        </button>
      </div>

      <div className="p-4">
        <Button
          variant="primary"
          size="sm"
          className="w-full"
          onClick={() => void handleGenerate()}
          disabled={!selectedDocumentId || isGenerating}
        >
          {isGenerating ? t("common.loading") : t("knowledge.generateCards")}
        </Button>

        {!selectedDocumentId && (
          <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
            Select a document first
          </p>
        )}
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="mx-4 mb-3 space-y-1">
          {warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 dark:bg-amber-900/20">
              <span className="text-amber-500">
                <IconWarning />
              </span>
              <p className="text-xs leading-relaxed text-amber-700 dark:text-amber-400">
                {w}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Type breakdown */}
      {cards.length > 0 && (
        <div className="mx-4 mb-3 flex flex-wrap gap-1.5">
          {Object.entries(typeCounts).map(([type, count]) => (
            <span key={type} className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${TYPE_COLORS[type] ?? TYPE_COLORS.basic}`}>
              {count} {type}
            </span>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {cards.length === 0 && !isGenerating && warnings.length === 0 && (
          <p className="py-8 text-center text-xs text-gray-400 dark:text-gray-500">
            {t("knowledge.noCardsGenerated")}
          </p>
        )}

        {cards.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
              {cards.length} cards generated
            </p>
            {cards.map((card, idx) => (
              <CardPreview key={idx} card={card} index={idx} />
            ))}
          </div>
        )}
      </div>

      {cards.length > 0 && (
        <div className="border-t border-gray-200 p-4 dark:border-gray-700">
          <Button
            variant={saved ? "secondary" : "primary"}
            size="sm"
            className="w-full"
            onClick={() => void handleSaveAll()}
            disabled={isSaving || saved}
          >
            {saved ? t("knowledge.cardsSaved") : isSaving ? t("common.loading") : t("knowledge.saveAllCards")}
          </Button>
        </div>
      )}
    </div>
  );
}
