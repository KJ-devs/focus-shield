import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import type { TrendPoint } from "@/data/mock-analytics";

interface TrendChartProps {
  data: TrendPoint[];
  days: 30 | 90;
}

function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatMinutesAsHours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

interface TooltipPayloadEntry {
  value: number;
  payload: TrendPoint;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const entry = payload[0];
  if (!entry) return null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-lg dark:border-gray-700 dark:bg-gray-800">
      <p className="text-sm font-medium text-gray-900 dark:text-white">
        {formatDateLabel(entry.payload.date)}
      </p>
      <p className="text-sm text-focus-600 dark:text-focus-400">
        {formatMinutesAsHours(entry.value)}
      </p>
    </div>
  );
}

function yAxisFormatter(value: number): string {
  return `${Math.floor(value / 60)}h`;
}

export function TrendChart({ data, days }: TrendChartProps) {
  const tickInterval = days === 30 ? 6 : 14;

  return (
    <div className="h-48 w-full sm:h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            className="stroke-gray-200 dark:stroke-gray-700"
          />
          <XAxis
            dataKey="date"
            tickFormatter={formatDateLabel}
            interval={tickInterval}
            tick={{ fontSize: 11 }}
            className="text-gray-500 dark:text-gray-400"
          />
          <YAxis
            tickFormatter={yAxisFormatter}
            tick={{ fontSize: 11 }}
            className="text-gray-500 dark:text-gray-400"
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="minutes"
            stroke="#3b82f6"
            fill="#3b82f6"
            fillOpacity={0.15}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: "#3b82f6" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
