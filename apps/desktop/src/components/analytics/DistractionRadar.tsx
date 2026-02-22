import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
} from "recharts";
import type { DistractionCategory } from "@/data/mock-analytics";

interface DistractionRadarProps {
  data: DistractionCategory[];
}

export function DistractionRadar({ data }: DistractionRadarProps) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid className="stroke-gray-200 dark:stroke-gray-700" />
          <PolarAngleAxis
            dataKey="category"
            tick={{ fontSize: 11 }}
            className="text-gray-600 dark:text-gray-400"
          />
          <Radar
            dataKey="count"
            stroke="#3b82f6"
            fill="#3b82f6"
            fillOpacity={0.3}
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
