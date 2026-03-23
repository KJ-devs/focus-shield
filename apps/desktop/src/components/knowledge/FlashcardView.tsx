import { useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { FlashcardRecord } from "@/tauri/knowledge";

interface FlashcardViewProps {
  card: FlashcardRecord;
  isFlipped: boolean;
  onFlip: () => void;
}

const TYPE_LABELS: Record<string, string> = {
  qa: "Q&A",
  cloze: "Cloze",
  basic: "Basic",
};

export function FlashcardView({ card, isFlipped, onFlip }: FlashcardViewProps) {
  const { t } = useTranslation();
  const [animating, setAnimating] = useState(false);

  const handleFlip = useCallback(() => {
    if (animating) return;
    setAnimating(true);
    onFlip();
    setTimeout(() => setAnimating(false), 500);
  }, [animating, onFlip]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.code === "Space" && !isFlipped) {
        e.preventDefault();
        handleFlip();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleFlip, isFlipped]);

  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="mb-2 flex items-center justify-between">
        <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-400">
          {TYPE_LABELS[card.cardType] ?? card.cardType}
        </span>
        {!isFlipped && (
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {t("study.flipHint")}
          </span>
        )}
      </div>

      <div
        className="card-flip cursor-pointer"
        style={{ perspective: "1000px" }}
        onClick={handleFlip}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleFlip();
        }}
        aria-label={isFlipped ? t("study.showFront") : t("study.flipCard")}
      >
        <div
          className="card-inner relative"
          style={{
            transition: "transform 0.5s",
            transformStyle: "preserve-3d",
            transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
            minHeight: "280px",
          }}
        >
          {/* Front */}
          <div
            className="card-face absolute inset-0 flex items-center justify-center rounded-2xl border border-gray-200 bg-white p-8 shadow-lg dark:border-gray-700 dark:bg-gray-800"
            style={{ backfaceVisibility: "hidden" }}
          >
            <p className="text-center text-xl font-medium leading-relaxed text-gray-900 dark:text-white">
              {card.front}
            </p>
          </div>

          {/* Back */}
          <div
            className="card-back absolute inset-0 flex items-center justify-center rounded-2xl border border-focus-200 bg-focus-50 p-8 shadow-lg dark:border-focus-800 dark:bg-focus-900/20"
            style={{
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
            }}
          >
            <p className="text-center text-xl font-medium leading-relaxed text-gray-900 dark:text-white">
              {card.back}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
