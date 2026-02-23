import { Card } from "@/components/ui/Card";
import type { LeaderboardEntry } from "@/lib/sync-client";

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  challengeTitle: string;
  isLoading: boolean;
}

function formatFocusTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) {
    return `${mins}m`;
  }
  return `${hours}h ${mins}m`;
}

function getRankDisplay(rank: number): string {
  if (rank === 1) return "\uD83E\uDD47";
  if (rank === 2) return "\uD83E\uDD48";
  if (rank === 3) return "\uD83E\uDD49";
  return `#${rank}`;
}

function LeaderboardRow({ entry }: { entry: LeaderboardEntry }) {
  const isTopThree = entry.rank <= 3;

  return (
    <div
      className={`flex items-center justify-between rounded-lg border px-4 py-3 ${
        isTopThree
          ? "border-focus-200 bg-focus-50 dark:border-focus-800 dark:bg-focus-900/20"
          : "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="w-10 text-center text-lg font-bold">
          {getRankDisplay(entry.rank)}
        </span>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-focus-100 text-sm font-semibold text-focus-700 dark:bg-focus-900/30 dark:text-focus-400">
          {entry.displayName.charAt(0).toUpperCase()}
        </div>
        <span className="font-medium text-gray-900 dark:text-white">
          {entry.displayName}
        </span>
      </div>
      <div className="flex items-center gap-6 text-sm">
        <div className="text-right">
          <p className="font-semibold text-gray-900 dark:text-white">
            {formatFocusTime(entry.totalFocusMinutes)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">focus time</p>
        </div>
        <div className="text-right">
          <p className="font-semibold text-gray-900 dark:text-white">
            {entry.sessionsCompleted}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">sessions</p>
        </div>
      </div>
    </div>
  );
}

export function Leaderboard({
  entries,
  challengeTitle,
  isLoading,
}: LeaderboardProps) {
  if (isLoading) {
    return (
      <Card>
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Leaderboard
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
      </Card>
    );
  }

  return (
    <Card>
      <h3 className="mb-1 text-lg font-semibold text-gray-900 dark:text-white">
        Leaderboard
      </h3>
      <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        {challengeTitle}
      </p>

      {entries.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No participants yet.
        </p>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <LeaderboardRow key={entry.userId} entry={entry} />
          ))}
        </div>
      )}
    </Card>
  );
}
