import { Card } from "@/components/ui/Card";

export function AnalyticsPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-6 text-3xl font-bold text-gray-900 dark:text-white">
        Analytics
      </h1>
      <Card className="flex flex-col items-center gap-4 py-12">
        <span className="text-4xl">{"\uD83D\uDCCA"}</span>
        <p className="text-lg font-medium text-gray-500 dark:text-gray-400">
          Analytics &mdash; Coming soon
        </p>
        <p className="text-sm text-gray-400 dark:text-gray-500">
          View your focus statistics, trends, and insights.
        </p>
      </Card>
    </div>
  );
}
