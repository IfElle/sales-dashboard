// hooks/useRawSalesData.ts
"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import type { Database } from "../types/supabase"; 

type RawSales = {
  id: number;
  date: string;
  revenue: number;
  // Add more fields based on your actual schema
};

export default function useRawSalesData() {
  const [data, setData] = useState<RawSales[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClientComponentClient<Database>();

  useEffect(() => {
    const fetchData = async () => {
      const { data, error } = await supabase
        .from("raw_sales")
        .select("*")
        .order("date", { ascending: true });

      if (error) {
        setError(error.message);
        setLoading(false);
      } else {
        setData(data || []);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { data, loading, error };
}