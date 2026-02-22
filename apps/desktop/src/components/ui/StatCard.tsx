import { Card } from "@/components/ui/Card";

type Trend = "up" | "down" | "neutral";

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: string;
  trend?: Trend;
}

const trendColors: Record<Trend, string> = {
  up: "text-green-500 dark:text-green-400",
  down: "text-red-500 dark:text-red-400",
  neutral: "text-gray-400 dark:text-gray-500",
};

const trendArrows: Record<Trend, string> = {
  up: "^",
  down: "v",
  neutral: "-",
};

export function StatCard({ label, value, icon, trend }: StatCardProps) {
  return (
    <Card className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
          {label}
        </span>
        {icon && <span className="text-2xl">{icon}</span>}
      </div>
      <div className="flex items-end gap-2">
        <span className="text-3xl font-bold text-gray-900 dark:text-white">
          {value}
        </span>
        {trend && (
          <span className={`text-sm font-medium ${trendColors[trend]}`}>
            {trendArrows[trend]}
          </span>
        )}
      </div>
    </Card>
  );
}
