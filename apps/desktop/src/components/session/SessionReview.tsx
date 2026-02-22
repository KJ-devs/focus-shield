import type { SessionReview as SessionReviewData } from "@/stores/session-store";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

interface SessionReviewProps {
  review: SessionReviewData;
  onDismiss: () => void;
}

function formatDuration(ms: number): string {
  const totalMinutes = Math.round(ms / 60_000);
  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (minutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${minutes}min`;
}

function getScoreColor(score: number): string {
  if (score >= 80) return "text-green-500 dark:text-green-400";
  if (score >= 60) return "text-yellow-500 dark:text-yellow-400";
  return "text-red-500 dark:text-red-400";
}

function getScoreBg(score: number): string {
  if (score >= 80) return "bg-green-50 dark:bg-green-900/20";
  if (score >= 60) return "bg-yellow-50 dark:bg-yellow-900/20";
  return "bg-red-50 dark:bg-red-900/20";
}

export function SessionReview({ review, onDismiss }: SessionReviewProps) {
  return (
    <div className="mx-auto w-full max-w-lg">
      <Card className="flex flex-col items-center gap-6 py-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Session Complete
        </h2>

        <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
          {review.sessionName}
        </p>

        {/* Focus score */}
        <div
          className={`flex flex-col items-center gap-1 rounded-2xl px-8 py-4 ${getScoreBg(review.focusScore)}`}
        >
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Focus Score
          </span>
          <span
            className={`text-5xl font-bold ${getScoreColor(review.focusScore)}`}
          >
            {review.focusScore}
          </span>
        </div>

        {/* Status badge */}
        <Badge variant={review.completedNormally ? "success" : "warning"}>
          {review.completedNormally ? "Completed" : "Stopped early"}
        </Badge>

        {/* Stats grid */}
        <div className="grid w-full grid-cols-2 gap-4 px-4">
          <div className="flex flex-col items-center rounded-lg bg-gray-50 p-3 dark:bg-gray-700/50">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Duration
            </span>
            <span className="text-lg font-semibold text-gray-900 dark:text-white">
              {formatDuration(review.actualFocusMs)}
            </span>
          </div>
          <div className="flex flex-col items-center rounded-lg bg-gray-50 p-3 dark:bg-gray-700/50">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Planned
            </span>
            <span className="text-lg font-semibold text-gray-900 dark:text-white">
              {formatDuration(review.totalDurationMs)}
            </span>
          </div>
          <div className="col-span-2 flex flex-col items-center rounded-lg bg-gray-50 p-3 dark:bg-gray-700/50">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Distractions Blocked
            </span>
            <span className="text-lg font-semibold text-gray-900 dark:text-white">
              {review.distractionCount}
            </span>
          </div>
        </div>

        <Button variant="primary" size="lg" onClick={onDismiss}>
          Done
        </Button>
      </Card>
    </div>
  );
}
