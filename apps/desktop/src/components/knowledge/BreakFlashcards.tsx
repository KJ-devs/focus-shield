import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { reviewCard } from "@focus-shield/knowledge";
import type { ReviewRating } from "@focus-shield/knowledge";
import {
  knowledgeGetDueFlashcards,
  knowledgeUpdateFlashcardReview,
} from "@/tauri/knowledge";
import type { FlashcardRecord } from "@/tauri/knowledge";
import { MarkdownContent } from "./MarkdownContent";

const MAX_CARDS = 5;

export function BreakFlashcards() {
  const { t } = useTranslation();
  const [cards, setCards] = useState<FlashcardRecord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const due = await knowledgeGetDueFlashcards();
        if (!cancelled) {
          setCards(due.slice(0, MAX_CARDS));
        }
      } catch {
        // IPC unavailable
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void load();
    return () => { cancelled = true; };
  }, []);

  const handleRate = useCallback(
    async (rating: ReviewRating) => {
      const card = cards[currentIndex];
      if (!card) return;

      const result = reviewCard(
        { ease: card.ease, interval: card.interval, repetitions: card.repetitions },
        rating,
      );

      try {
        await knowledgeUpdateFlashcardReview({
          id: card.id,
          ease: result.ease,
          interval: result.interval,
          repetitions: result.repetitions,
          nextReviewAt: result.nextReviewAt.toISOString(),
        });
      } catch {
        // IPC unavailable
      }

      setIsFlipped(false);

      if (currentIndex + 1 < cards.length) {
        setCurrentIndex((i) => i + 1);
      } else {
        setDone(true);
      }
    },
    [cards, currentIndex],
  );

  if (isLoading) {
    return null;
  }

  if (cards.length === 0 || done) {
    return (
      <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white/80 px-4 py-3 text-center dark:border-gray-700 dark:bg-gray-800/80">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t("session.noCardsToReview")}
        </p>
      </div>
    );
  }

  const card = cards[currentIndex];
  if (!card) return null;

  return (
    <div className="w-full max-w-sm space-y-3">
      {/* Card */}
      <button
        type="button"
        onClick={() => setIsFlipped((f) => !f)}
        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-4 text-left transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
      >
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs font-medium text-gray-400 dark:text-gray-500">
            {currentIndex + 1}/{cards.length}
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {isFlipped ? "Back" : "Front"}
          </span>
        </div>
        <MarkdownContent content={isFlipped ? card.back : card.front} className="text-sm" />
      </button>

      {/* Actions */}
      {isFlipped ? (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void handleRate("again")}
            className="flex-1 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
          >
            {t("session.dontKnowIt")}
          </button>
          <button
            type="button"
            onClick={() => void handleRate("good")}
            className="flex-1 rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-700 transition-colors hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30"
          >
            {t("session.knowIt")}
          </button>
        </div>
      ) : (
        <p className="text-center text-xs text-gray-400 dark:text-gray-500">
          {t("study.flipHint")}
        </p>
      )}
    </div>
  );
}
