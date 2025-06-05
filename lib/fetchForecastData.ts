import { supabase } from "./supabase";

export interface ForecastData {
  date: string;
  month: string;
  category: string;
  actual: number | null;
  forecast: number | null;
  is_future: boolean;
}



export async function fetchForecastData(months: number = 6): Promise<ForecastData[]> {
  try {
    const response = await fetch(`http://localhost:8000/api/forecast`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ months }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log("API Response:", result); // Debug log
    
    if (!result.data || !Array.isArray(result.data)) {
      throw new Error("Invalid data format received from API");
    }
    
    return result.data as ForecastData[];
  } catch (err) {
    console.error("Forecast API error:", err);
    throw new Error(`Failed to fetch forecast data: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export async function fetchForecastByDimension(
  dimension: string, 
  filterValue: string,
  months: number = 6
): Promise<ForecastData[]> {
  try {
    const response = await fetch(`http://localhost:8000/api/forecast-by-dimension`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ 
        months,
        dimension,
        filter_value: filterValue
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    if (!result.data || !Array.isArray(result.data)) {
      throw new Error("Invalid data format received from API");
    }
    
    return result.data as ForecastData[];
  } catch (err) {
    console.error("Forecast by dimension API error:", err);
    throw new Error(`Failed to fetch forecast data: ${err instanceof Error ? err.message : String(err)}`);
  }
}

// In fetchForecastData.ts, add this new function:

export async function fetchUniqueDimensionValues(dimension: string): Promise<string[]> {
  try {
    const response = await fetch(`http://localhost:8000/api/dimensions/unique-values?dimension=${encodeURIComponent(dimension)}`, {
      method: "GET", // This is a GET request
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    if (!result.data || !Array.isArray(result.data)) {
      throw new Error("Invalid data format for unique dimension values received from API");
    }
    
    return result.data as string[];
  } catch (err) {
    console.error(`Error fetching unique values for dimension ${dimension}:`, err);
    throw new Error(`Failed to fetch unique dimension values: ${err instanceof Error ? err.message : String(err)}`);
  }
}