"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import BottomNav from "./BottomNav";

interface ForecastData {
  date: string;
  actual?: number;
  forecast?: number;
}

export default function ForecastChart() {
  const [data, setData] = useState<ForecastData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchForecast = async () => {
      const res = await fetch("/api/forecast");
      const json = await res.json();
      setData(json);
      setLoading(false);
    };

    fetchForecast();
  }, []);

  if (loading) return <p>Loading forecast...</p>;

  return (
    <div className="mt-6">
      <h2 className="text-xl font-semibold mb-4">Forecast vs Actuals</h2>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line
            type="monotone"
            dataKey="actual"
            stroke="#8884d8"
            strokeWidth={2}
            dot={false}
            name="Actual"
          />
          <Line
            type="monotone"
            dataKey="forecast"
            stroke="#82ca9d"
            strokeWidth={2}
            dot={{ r: 2 }}
            name="Forecast"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}