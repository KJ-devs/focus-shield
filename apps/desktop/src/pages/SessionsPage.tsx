import { Card } from "@/components/ui/Card";

export function SessionsPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-6 text-3xl font-bold text-gray-900 dark:text-white">
        Sessions
      </h1>
      <Card className="flex flex-col items-center gap-4 py-12">
        <span className="text-4xl">{"\u25B6\uFE0F"}</span>
        <p className="text-lg font-medium text-gray-500 dark:text-gray-400">
          Sessions &mdash; Coming in US-08
        </p>
        <p className="text-sm text-gray-400 dark:text-gray-500">
          Configure and manage your focus sessions here.
        </p>
      </Card>
    </div>
  );
}
