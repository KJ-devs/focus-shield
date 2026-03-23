import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { generateCardsFromDocument } from "@focus-shield/knowledge";
import { useKnowledgeStore } from "@/stores/knowledge-store";
import { knowledgeCreateFlashcardsBatch } from "@/tauri/knowledge";
import type { FlashcardRecord } from "@/tauri/knowledge";
import { Button } from "@/components/ui/Button";

interface GeneratedCard {
  front: string;
  back: string;
  type: string;
}

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

function CardPreview({ card, index }: { card: GeneratedCard; index: number }) {
  const [showBack, setShowBack] = useState(false);

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-medium text-gray-400 dark:text-gray-500">
          #{index + 1} - {card.type}
        </span>
        <button
          onClick={() => setShowBack(!showBack)}
          className="text-xs text-focus-500 hover:text-focus-600 dark:text-focus-400"
        >
          {showBack ? "Front" : "Back"}
        </button>
      </div>
      <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3">
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
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleGenerate = useCallback(async () => {
    if (!selectedDocumentId || !selectedFolderId) return;

    setIsGenerating(true);
    setSaved(false);

    try {
      const doc = await getDocument(selectedDocumentId);
      if (!doc) return;

      const generated = generateCardsFromDocument(doc.id, selectedFolderId, doc.content);
      setCards(generated.map((c) => ({ front: c.front, back: c.back, type: c.type })));
    } catch {
      // generation failed
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
    } catch {
      // save failed
    } finally {
      setIsSaving(false);
    }
  }, [selectedDocumentId, selectedFolderId, cards]);

  return (
    <div className="flex h-full w-[300px] flex-col border-l border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
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
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {cards.length === 0 && !isGenerating && (
          <p className="py-8 text-center text-xs text-gray-400 dark:text-gray-500">
            {t("knowledge.noCardsGenerated")}
          </p>
        )}

        {cards.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {cards.length} {t("knowledge.cardsGenerated")}
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
