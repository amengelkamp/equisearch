"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

interface ScorePoint {
  date: string;
  score: number;
  label: string;
}

interface Props {
  data: ScorePoint[];
  title?: string;
}

export default function ScoreChart({ data, title }: Props) {
  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-4">
      {title && <p className="text-sm font-medium text-zinc-700 mb-3">{title}</p>}
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: "#a1a1aa" }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            angle={-35}
            textAnchor="end"
            height={45}
          />
          <YAxis
            domain={["auto", "auto"]}
            tick={{ fontSize: 11, fill: "#a1a1aa" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `${v.toFixed(1)}%`}
          />
          <Tooltip
            formatter={(v) => [`${typeof v === "number" ? v.toFixed(3) : v}%`, "Score"]}
            labelFormatter={(l) => {
              const point = data.find((d) => d.date === l);
              return point?.label ?? l;
            }}
            contentStyle={{ fontSize: 12, border: "1px solid #e4e4e7", borderRadius: 8 }}
          />
          <Line
            type="monotone"
            dataKey="score"
            stroke="#18181b"
            strokeWidth={2}
            dot={{ r: 3, fill: "#18181b" }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
