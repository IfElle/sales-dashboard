"use client";
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid,
  Legend,
  ComposedChart,
  Area
} from 'recharts';
import { cn } from "@/lib/utils";

interface ChartProps {
  title: string;
  data: any[];
  xKey: string;
  yKey: string | string[];
  type?: "bar" | "line" | "composed";
  className?: string;
  colors?: string[];
  labels?: string[];
}

export default function Chart({ 
  title, 
  data, 
  xKey, 
  yKey, 
  type = "bar", 
  className,
  colors = ["#6366f1", "#10b981", "#ef4444", "#f59e0b"],
  labels
}: ChartProps) {
  const yKeys = Array.isArray(yKey) ? yKey : [yKey];
  const yLabels = labels || yKeys;

  const renderChart = () => {
    switch (type) {
      case "composed":
        return (
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xKey} />
            <YAxis />
            <Tooltip />
            <Legend />
            {yKeys.map((key, index) => (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                fill={colors[index % colors.length]}
                fillOpacity={0.2}
                stroke={colors[index % colors.length]}
                name={yLabels[index]}
              />
            ))}
            {yKeys.map((key, index) => (
              <Line
                key={`line-${key}`}
                type="monotone"
                dataKey={key}
                stroke={colors[index % colors.length]}
                name={yLabels[index]}
              />
            ))}
          </ComposedChart>
        );
      case "line":
        return (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xKey} />
            <YAxis />
            <Tooltip />
            <Legend />
            {yKeys.map((key, index) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={colors[index % colors.length]}
                name={yLabels[index]}
              />
            ))}
          </LineChart>
        );
      default: // bar
        return (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xKey} />
            <YAxis />
            <Tooltip />
            <Legend />
            {yKeys.map((key, index) => (
              <Bar
                key={key}
                dataKey={key}
                fill={colors[index % colors.length]}
                name={yLabels[index]}
              />
            ))}
          </BarChart>
        );
    }
  };

  return (
    <div className={cn("mb-6", className)} style={{ marginBottom: "5em" }}>
      {title && <h2 className="text-lg font-semibold mb-2">{title}</h2>}
      <ResponsiveContainer width="100%" height={400}>
        {renderChart()}
      </ResponsiveContainer>
    </div>
  );
}