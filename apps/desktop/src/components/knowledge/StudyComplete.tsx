import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

interface StudyCompleteProps {
  total: number;
  correct: number;
  wrong: number;
  elapsedMs: number;
  xpEarned?: number;
  onStudyAgain: () => void;
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  if (minutes === 0) return `${remaining}s`;
  return `${minutes}m ${remaining}s`;
}

export function StudyComplete({
  total,
  correct,
  wrong,
  elapsedMs,
  xpEarned,
  onStudyAgain,
}: StudyCompleteProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-6 py-8">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
        <svg className="h-10 w-10 text-green-600 dark:text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      </div>

      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t("study.complete")}
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {t("study.completeDesc")}
        </p>
      </div>

      <Card className="w-full">
        <div className="grid grid-cols-2 gap-4">
          <StatItem
            label={t("study.totalReviewed")}
            value={String(total)}
          />
          <StatItem
            label={t("study.accuracy")}
            value={`${accuracy}%`}
            color={accuracy >= 80 ? "text-green-600 dark:text-green-400" : accuracy >= 50 ? "text-orange-600 dark:text-orange-400" : "text-red-600 dark:text-red-400"}
          />
          <StatItem
            label={t("study.correct")}
            value={String(correct)}
            color="text-green-600 dark:text-green-400"
          />
          <StatItem
            label={t("study.wrong")}
            value={String(wrong)}
            color="text-red-600 dark:text-red-400"
          />
          <StatItem
            label={t("study.timeTaken")}
            value={formatDuration(elapsedMs)}
          />
          {xpEarned !== undefined && xpEarned > 0 && (
            <StatItem
              label={t("study.xpEarned")}
              value={`+${xpEarned}`}
              color="text-focus-600 dark:text-focus-400"
            />
          )}
        </div>
      </Card>

      <div className="flex w-full gap-3">
        <Button
          variant="secondary"
          className="flex-1"
          onClick={() => navigate("/knowledge")}
        >
          {t("study.backToKnowledge")}
        </Button>
        <Button
          variant="primary"
          className="flex-1"
          onClick={onStudyAgain}
        >
          {t("study.studyAgain")}
        </Button>
      </div>
    </div>
  );
}

function StatItem({
  label,
  value,
  color,
  className = "",
}: {
  label: string;
  value: string;
  color?: string;
  className?: string;
}) {
  return (
    <div className={`text-center ${className}`}>
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className={`text-2xl font-bold ${color ?? "text-gray-900 dark:text-white"}`}>
        {value}
      </p>
    </div>
  );
}
