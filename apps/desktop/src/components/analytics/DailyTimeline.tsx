import type { TimelineEntry } from "@/data/mock-analytics";

interface DailyTimelineProps {
  entries: TimelineEntry[];
}

const TOTAL_HOURS = 24;

const HOUR_LABELS = [0, 6, 12, 18, 24] as const;

const typeColors: Record<TimelineEntry["type"], string> = {
  focus: "bg-focus-500",
  break: "bg-amber-400",
  idle: "bg-gray-200 dark:bg-gray-700",
};

const typeLabelColors: Record<TimelineEntry["type"], string> = {
  focus: "bg-focus-500",
  break: "bg-amber-400",
  idle: "bg-gray-300 dark:bg-gray-600",
};

export function DailyTimeline({ entries }: DailyTimelineProps) {
  return (
    <div>
      <div className="relative h-8 w-full overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
        {entries.map((entry, index) => {
          const leftPercent = (entry.startHour / TOTAL_HOURS) * 100;
          const widthPercent =
            ((entry.endHour - entry.startHour) / TOTAL_HOURS) * 100;

          return (
            <div
              key={`${entry.type}-${index}`}
              className={`absolute top-0 h-full ${typeColors[entry.type]} transition-opacity hover:opacity-80`}
              style={{
                left: `${leftPercent}%`,
                width: `${widthPercent}%`,
              }}
              title={`${entry.type}: ${entry.startHour}:00 - ${entry.endHour}:00`}
            />
          );
        })}
      </div>

      <div className="relative mt-1 h-4">
        {HOUR_LABELS.map((hour) => {
          const leftPercent = (hour / TOTAL_HOURS) * 100;
          return (
            <span
              key={`hour-${hour}`}
              className="absolute -translate-x-1/2 text-[10px] text-gray-400 dark:text-gray-500"
              style={{ left: `${leftPercent}%` }}
            >
              {hour === 0
                ? "12am"
                : hour === 6
                  ? "6am"
                  : hour === 12
                    ? "12pm"
                    : hour === 18
                      ? "6pm"
                      : "12am"}
            </span>
          );
        })}
      </div>

      <div className="mt-3 flex items-center gap-4">
        {(["focus", "break", "idle"] as const).map((type) => (
          <div key={type} className="flex items-center gap-1.5">
            <div className={`h-2.5 w-2.5 rounded-sm ${typeLabelColors[type]}`} />
            <span className="text-xs capitalize text-gray-500 dark:text-gray-400">
              {type}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
