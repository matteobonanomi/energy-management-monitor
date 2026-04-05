import type { ReactNode } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { ChartDatum } from "../lib/charts";
import { SectionCard } from "./Panel";

const chartPalette = [
  "#38bdf8",
  "#22c55e",
  "#f97316",
  "#a855f7",
  "#eab308",
  "#14b8a6",
];

function ChartFrame({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <SectionCard title={title} subtitle={subtitle}>
      <div className="chart-shell">{children}</div>
    </SectionCard>
  );
}

function SimpleChart({
  data,
  seriesKeys,
  forecastSeriesKeys = [],
  labelMap = {},
}: {
  data: ChartDatum[];
  seriesKeys: string[];
  forecastSeriesKeys?: string[];
  labelMap?: Record<string, string>;
}) {
  return (
    <div className="chart-shell">
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--grid-color)" />
          <XAxis dataKey="label" minTickGap={32} stroke="var(--muted-color)" />
          <YAxis stroke="var(--muted-color)" />
          <Tooltip
            contentStyle={{
              background: "var(--surface-raised)",
              border: "1px solid var(--border-color)",
              borderRadius: 16,
            }}
            formatter={tooltipFormatter}
          />
          <Legend />
          {seriesKeys.map((seriesKey, index) => (
            <Line
              key={seriesKey}
              type="monotone"
              dataKey={seriesKey}
              name={labelMap[seriesKey] ?? seriesKey.toUpperCase()}
              stroke={
                forecastSeriesKeys.includes(seriesKey)
                  ? "#f59e0b"
                  : chartPalette[index % chartPalette.length]
              }
              strokeWidth={forecastSeriesKeys.includes(seriesKey) ? 2.4 : 2.2}
              strokeDasharray={forecastSeriesKeys.includes(seriesKey) ? "7 4" : undefined}
              dot={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function tooltipFormatter(value: number | string | Array<string | number> | null) {
  if (Array.isArray(value)) {
    return value.join(" / ");
  }
  if (typeof value === "number") {
    return value.toLocaleString("it-IT", { maximumFractionDigits: 2 });
  }
  return value ?? "--";
}

const technologyPalette: Record<string, string> = {
  pv: "#fbbf24",
  wind: "#38bdf8",
  hydro: "#14b8a6",
  gas: "#f97316",
};

export function ProductionChart({
  data,
  seriesKeys,
  title,
  subtitle,
}: {
  data: ChartDatum[];
  seriesKeys: string[];
  title: string;
  subtitle: string;
}) {
  return (
    <ChartFrame title={title} subtitle={subtitle}>
      <ResponsiveContainer width="100%" height={320}>
        <AreaChart data={data}>
          <defs>
            {seriesKeys.map((seriesKey, index) => (
              <linearGradient
                key={seriesKey}
                id={`gradient-${seriesKey}`}
                x1="0"
                x2="0"
                y1="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  stopColor={chartPalette[index % chartPalette.length]}
                  stopOpacity={0.35}
                />
                <stop
                  offset="95%"
                  stopColor={chartPalette[index % chartPalette.length]}
                  stopOpacity={0.03}
                />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--grid-color)" />
          <XAxis dataKey="label" minTickGap={32} stroke="var(--muted-color)" />
          <YAxis stroke="var(--muted-color)" />
          <Tooltip
            contentStyle={{
              background: "var(--surface-raised)",
              border: "1px solid var(--border-color)",
              borderRadius: 16,
            }}
            formatter={tooltipFormatter}
          />
          <Legend />
          {seriesKeys.map((seriesKey, index) => (
            <Area
              key={seriesKey}
              type="monotone"
              dataKey={seriesKey}
              name={seriesKey.toUpperCase()}
              stroke={chartPalette[index % chartPalette.length]}
              fill={`url(#gradient-${seriesKey})`}
              strokeWidth={2}
              dot={false}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

export function PriceChart({
  data,
  seriesKeys,
  title,
  subtitle,
}: {
  data: ChartDatum[];
  seriesKeys: string[];
  title: string;
  subtitle: string;
}) {
  return (
    <ChartFrame title={title} subtitle={subtitle}>
      <SimpleChart data={data} seriesKeys={seriesKeys} />
    </ChartFrame>
  );
}

export function MonitorLineChart({
  data,
  seriesKeys,
  forecastSeriesKeys,
  labelMap,
}: {
  data: ChartDatum[];
  seriesKeys: string[];
  forecastSeriesKeys?: string[];
  labelMap?: Record<string, string>;
}) {
  return (
    <SimpleChart
      data={data}
      seriesKeys={seriesKeys}
      forecastSeriesKeys={forecastSeriesKeys}
      labelMap={labelMap}
    />
  );
}

export function MonitorStackedAreaChart({
  data,
  areaSeriesKeys,
  forecastSeriesKey = "forecast",
  labelMap = {},
}: {
  data: ChartDatum[];
  areaSeriesKeys: string[];
  forecastSeriesKey?: string;
  labelMap?: Record<string, string>;
}) {
  return (
    <div className="chart-shell">
      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={data}>
          <defs>
            {areaSeriesKeys.map((seriesKey) => (
              <linearGradient
                key={seriesKey}
                id={`monitor-gradient-${seriesKey}`}
                x1="0"
                x2="0"
                y1="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  stopColor={technologyPalette[seriesKey] ?? "#7dd3fc"}
                  stopOpacity={0.45}
                />
                <stop
                  offset="95%"
                  stopColor={technologyPalette[seriesKey] ?? "#7dd3fc"}
                  stopOpacity={0.06}
                />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--grid-color)" />
          <XAxis dataKey="label" minTickGap={32} stroke="var(--muted-color)" />
          <YAxis stroke="var(--muted-color)" />
          <Tooltip
            contentStyle={{
              background: "var(--surface-raised)",
              border: "1px solid var(--border-color)",
              borderRadius: 16,
            }}
            formatter={tooltipFormatter}
          />
          <Legend />
          {areaSeriesKeys.map((seriesKey) => (
            <Area
              key={seriesKey}
              type="monotone"
              dataKey={seriesKey}
              name={labelMap[seriesKey] ?? seriesKey.toUpperCase()}
              stackId="production"
              stroke={technologyPalette[seriesKey] ?? "#7dd3fc"}
              fill={`url(#monitor-gradient-${seriesKey})`}
              strokeWidth={1.8}
              dot={false}
            />
          ))}
          {data.some((row) => row[forecastSeriesKey] !== null && row[forecastSeriesKey] !== undefined) ? (
            <Line
              type="monotone"
              dataKey={forecastSeriesKey}
              name={labelMap[forecastSeriesKey] ?? "Forecast"}
              stroke="#0f766e"
              strokeDasharray="7 4"
              strokeWidth={2.6}
              dot={false}
            />
          ) : null}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ActualForecastChart({
  data,
  title,
  subtitle,
}: {
  data: ChartDatum[];
  title: string;
  subtitle: string;
}) {
  return (
    <ChartFrame title={title} subtitle={subtitle}>
      <ResponsiveContainer width="100%" height={340}>
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--grid-color)" />
          <XAxis dataKey="label" minTickGap={32} stroke="var(--muted-color)" />
          <YAxis stroke="var(--muted-color)" />
          <Tooltip
            contentStyle={{
              background: "var(--surface-raised)",
              border: "1px solid var(--border-color)",
              borderRadius: 16,
            }}
            formatter={tooltipFormatter}
          />
          <Legend />
          <Area
            type="monotone"
            dataKey="actual"
            name="Actual"
            stroke="#38bdf8"
            fill="rgba(56, 189, 248, 0.2)"
            strokeWidth={2.5}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="forecast"
            name="Forecast"
            stroke="#f59e0b"
            strokeDasharray="7 4"
            strokeWidth={2.5}
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
      <p className="legend-note">
        Actual in blu pieno, forecast in ambra tratteggiato per mantenere una
        distinzione visiva immediata.
      </p>
    </ChartFrame>
  );
}
