import { Card } from "@/components/ui/Card";
import type { WeeklyReportData } from "@/lib/sync-client";

interface WeeklyReportProps {
  reports: WeeklyReportData[];
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

function ReportCard({ report }: { report: WeeklyReportData }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <h4 className="mb-3 font-semibold text-gray-900 dark:text-white">
        {report.challengeTitle}
      </h4>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-2xl font-bold text-focus-600 dark:text-focus-400">
            {formatFocusTime(report.totalFocusMinutes)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Total focus time
          </p>
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {report.sessionsCompleted}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Sessions completed
          </p>
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            #{report.rank}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Current rank
          </p>
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {report.totalParticipants}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Participants
          </p>
        </div>
      </div>
    </div>
  );
}

export function WeeklyReport({ reports, isLoading }: WeeklyReportProps) {
  if (isLoading) {
    return (
      <Card>
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Weekly Report
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
      </Card>
    );
  }

  return (
    <Card>
      <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
        Weekly Report
      </h3>

      {reports.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No active challenges to report on. Create or join a challenge to see
          your weekly stats here.
        </p>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <ReportCard key={report.challengeTitle} report={report} />
          ))}
        </div>
      )}
    </Card>
  );
}
