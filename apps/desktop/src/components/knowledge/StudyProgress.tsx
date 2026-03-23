import { useTranslation } from "react-i18next";

interface StudyProgressProps {
  current: number;
  total: number;
  correct: number;
  wrong: number;
}

export function StudyProgress({ current, total, correct, wrong }: StudyProgressProps) {
  const { t } = useTranslation();
  const progress = total > 0 ? (current / total) * 100 : 0;

  return (
    <div className="mx-auto w-full max-w-xl space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-gray-700 dark:text-gray-300">
          {current} / {total}
        </span>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-green-600 dark:text-green-400">
            {t("study.correct")}: {correct}
          </span>
          <span className="text-red-600 dark:text-red-400">
            {t("study.wrong")}: {wrong}
          </span>
        </div>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
        <div
          className="h-full rounded-full bg-focus-500 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
