import { useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import type { ReviewRating } from "@focus-shield/knowledge";

interface ReviewButtonsProps {
  onRate: (rating: ReviewRating) => void;
  intervals: Record<ReviewRating, number>;
  disabled?: boolean;
}

function formatInterval(days: number): string {
  if (days < 1) return "<1d";
  if (days < 30) return `${days}d`;
  if (days < 365) return `${Math.round(days / 30)}mo`;
  return `${(days / 365).toFixed(1)}y`;
}

const RATINGS: { key: ReviewRating; shortcut: string; color: string; hoverColor: string }[] = [
  {
    key: "again",
    shortcut: "1",
    color: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
    hoverColor: "hover:bg-red-200 dark:hover:bg-red-900/50",
  },
  {
    key: "hard",
    shortcut: "2",
    color: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800",
    hoverColor: "hover:bg-orange-200 dark:hover:bg-orange-900/50",
  },
  {
    key: "good",
    shortcut: "3",
    color: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
    hoverColor: "hover:bg-green-200 dark:hover:bg-green-900/50",
  },
  {
    key: "easy",
    shortcut: "4",
    color: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
    hoverColor: "hover:bg-blue-200 dark:hover:bg-blue-900/50",
  },
];

export function ReviewButtons({ onRate, intervals, disabled }: ReviewButtonsProps) {
  const { t } = useTranslation();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (disabled) return;
      const map: Record<string, ReviewRating> = {
        "1": "again",
        "2": "hard",
        "3": "good",
        "4": "easy",
      };
      const rating = map[e.key];
      if (rating) {
        e.preventDefault();
        onRate(rating);
      }
    },
    [onRate, disabled],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="mx-auto grid w-full max-w-xl grid-cols-4 gap-3">
      {RATINGS.map(({ key, shortcut, color, hoverColor }) => (
        <button
          key={key}
          onClick={() => onRate(key)}
          disabled={disabled}
          className={`flex flex-col items-center gap-1 rounded-xl border px-3 py-4 text-sm font-medium transition-all active:scale-95 disabled:opacity-50 ${color} ${hoverColor}`}
        >
          <span className="text-base font-semibold">{t(`study.${key}`)}</span>
          <span className="text-xs opacity-75">{formatInterval(intervals[key])}</span>
          <kbd className="mt-1 rounded bg-black/10 px-1.5 py-0.5 text-[10px] dark:bg-white/10">
            {shortcut}
          </kbd>
        </button>
      ))}
    </div>
  );
}
