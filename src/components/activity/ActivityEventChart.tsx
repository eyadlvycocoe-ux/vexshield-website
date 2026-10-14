import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import {
  ACTIVITY_EVENT_KEYS,
  ACTIVITY_EVENT_META,
  type ActivityChartRow,
  chartYMax,
} from "@/lib/activity-event-chart";
import { cn } from "@/lib/utils";

const chartConfig = Object.fromEntries(
  ACTIVITY_EVENT_KEYS.map((key) => [key, { label: ACTIVITY_EVENT_META[key].label, color: ACTIVITY_EVENT_META[key].color }]),
) satisfies ChartConfig;

type Props = {
  data: ActivityChartRow[];
  className?: string;
};

export function ActivityEventChart({ data, className }: Props) {
  const yMax = useMemo(() => chartYMax(data), [data]);
  const xInterval = data.length > 14 ? Math.floor(data.length / 8) : data.length > 8 ? 1 : 0;

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      <ChartContainer config={chartConfig} className="aspect-auto min-h-[180px] w-full flex-1">
        <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <defs>
            {ACTIVITY_EVENT_KEYS.map((key) => (
              <linearGradient key={key} id={`activity-fill-${key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={ACTIVITY_EVENT_META[key].color} stopOpacity={0.55} />
                <stop offset="100%" stopColor={ACTIVITY_EVENT_META[key].color} stopOpacity={0.05} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="4 4" vertical={false} className="stroke-white/[0.06]" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            interval={xInterval}
            tick={{ fill: "#64748b", fontSize: 10 }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            domain={[0, yMax]}
            tickCount={6}
            width={28}
            tick={{ fill: "#64748b", fontSize: 10 }}
          />
          <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
          {ACTIVITY_EVENT_KEYS.map((key) => (
            <Area
              key={key}
              type="monotone"
              dataKey={key}
              stackId="events"
              stroke={ACTIVITY_EVENT_META[key].color}
              fill={`url(#activity-fill-${key})`}
              strokeWidth={1.5}
              dot={false}
            />
          ))}
        </AreaChart>
      </ChartContainer>

      <div className="mt-2 flex shrink-0 flex-wrap items-center justify-center gap-x-4 gap-y-1 px-1">
        {ACTIVITY_EVENT_KEYS.map((key) => (
          <span key={key} className="flex items-center gap-1.5 text-[10px] text-slate-400">
            <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: ACTIVITY_EVENT_META[key].color }} />
            {ACTIVITY_EVENT_META[key].label}
          </span>
        ))}
      </div>
    </div>
  );
}
