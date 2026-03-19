import { Card } from "@/components/ui/Card";

type Trend = "up" | "down" | "neutral";

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: string;
  trend?: Trend;
  "data-testid"?: string;
}

const trendColors: Record<Trend, string> = {
  up: "text-green-500 dark:text-green-400",
  down: "text-red-500 dark:text-red-400",
  neutral: "text-gray-400 dark:text-gray-500",
};

function TrendArrow({ trend }: { trend: Trend }) {
  if (trend === "up") {
    return (
      <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 12V4M4 7l4-4 4 4" />
      </svg>
    );
  }
  if (trend === "down") {
    return (
      <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 4v8M4 9l4 4 4-4" />
      </svg>
    );
  }
  return (
    <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M3 8h10" />
    </svg>
  );
}

export function StatCard({ label, value, icon, trend, "data-testid": testId }: StatCardProps) {
  return (
    <Card data-testid={testId} className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
          {label}
        </span>
        {icon && (
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-focus-50 text-xl dark:bg-focus-900/20">
            {icon}
          </span>
        )}
      </div>
      <div className="flex items-end gap-2">
        <span className="text-3xl font-bold text-gray-900 dark:text-white">
          {value}
        </span>
        {trend && (
          <span className={`flex items-center gap-0.5 pb-1 text-sm font-medium ${trendColors[trend]}`}>
            <TrendArrow trend={trend} />
          </span>
        )}
      </div>
    </Card>
  );
}
