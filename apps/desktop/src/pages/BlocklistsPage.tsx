import { Card } from "@/components/ui/Card";

export function BlocklistsPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-6 text-3xl font-bold text-gray-900 dark:text-white">
        Blocklists
      </h1>
      <Card className="flex flex-col items-center gap-4 py-12">
        <span className="text-4xl">{"\uD83D\uDEE1\uFE0F"}</span>
        <p className="text-lg font-medium text-gray-500 dark:text-gray-400">
          Blocklists &mdash; Coming soon
        </p>
        <p className="text-sm text-gray-400 dark:text-gray-500">
          Manage domains and processes to block during focus sessions.
        </p>
      </Card>
    </div>
  );
}
