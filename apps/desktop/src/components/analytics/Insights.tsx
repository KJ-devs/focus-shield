interface InsightsProps {
  weeklyFocusMinutes: number;
  previousWeekFocusMinutes: number;
  peakHour: number;
  topDistractor: string;
  averageDailyMinutes: number;
}

interface InsightItem {
  icon: string;
  title: string;
  description: string;
  color: string;
}

function formatHourDisplay(hour: number): string {
  if (hour === 0 || hour === 24) return "12 AM";
  if (hour === 12) return "12 PM";
  if (hour < 12) return `${hour} AM`;
  return `${hour - 12} PM`;
}

function formatMinutesToHours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function computeInsights(props: InsightsProps): InsightItem[] {
  const {
    weeklyFocusMinutes,
    previousWeekFocusMinutes,
    peakHour,
    topDistractor,
    averageDailyMinutes,
  } = props;

  const insights: InsightItem[] = [];

  if (previousWeekFocusMinutes > 0) {
    const percentChange = Math.round(
      ((weeklyFocusMinutes - previousWeekFocusMinutes) /
        previousWeekFocusMinutes) *
        100,
    );
    const isUp = percentChange >= 0;
    insights.push({
      icon: isUp ? "^" : "v",
      title: `${Math.abs(percentChange)}% ${isUp ? "more" : "less"} productive`,
      description: `Compared to last week (${formatMinutesToHours(previousWeekFocusMinutes)})`,
      color: isUp
        ? "text-green-500 dark:text-green-400"
        : "text-red-500 dark:text-red-400",
    });
  }

  insights.push({
    icon: "~",
    title: `Peak focus at ${formatHourDisplay(peakHour)}`,
    description: "Your most productive hour of the day",
    color: "text-focus-500 dark:text-focus-400",
  });

  insights.push({
    icon: "!",
    title: `Top distraction: ${topDistractor}`,
    description: "Most attempted category during focus sessions",
    color: "text-amber-500 dark:text-amber-400",
  });

  insights.push({
    icon: "=",
    title: `${formatMinutesToHours(averageDailyMinutes)} daily average`,
    description: "Average focus time per day this month",
    color: "text-focus-500 dark:text-focus-400",
  });

  return insights;
}

export function Insights(props: InsightsProps) {
  const insights = computeInsights(props);

  return (
    <div className="flex flex-col gap-3">
      {insights.map((insight) => (
        <div
          key={insight.title}
          className="flex items-start gap-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-800/50"
        >
          <span
            className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${insight.color} bg-gray-100 dark:bg-gray-700`}
          >
            {insight.icon}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {insight.title}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {insight.description}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
