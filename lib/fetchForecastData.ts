// lib/fetchForecastData.ts
"use client"; // ADD THIS LINE at the very top

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"; // CHANGE THIS IMPORT

export interface ForecastData {
  date: string;
  month: string;
  category: string;
  actual: number | null;
  forecast: number | null;
  is_future: boolean;
}

/**
 * Helper function to get the authorization headers with the Supabase access token.
 * This ensures all API calls to the backend include the required authentication.
 */
async function getAuthHeaders() {
  // Create a client-side Supabase client instance here to ensure it picks up browser session
  const supabase = createClientComponentClient();

  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError) {
    throw new Error(`Failed to retrieve session: ${sessionError.message}`);
  }

  if (!session) {
    throw new Error("No active session found. Please log in.");
  }
  const accessToken = session.access_token;
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${accessToken}`, // Crucial: Send the access token in the Authorization header
  };
}


// REMOVE 'accessToken' parameter from these function signatures
export async function fetchForecastData(months: number = 6): Promise<ForecastData[]> {
  try {
    const headers = await getAuthHeaders(); // Get headers with auth token

    const response = await fetch(`http://localhost:8000/api/forecast`, {
      method: "POST",
      headers: headers, // Use the headers with authentication
      body: JSON.stringify({ months }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 401) {
        throw new Error("Authentication failed: Invalid or expired token for forecast data. Please log in again.");
      }
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    if (!result.data || !Array.isArray(result.data)) {
        throw new Error("Invalid data format for forecast data received from API.");
    }
    return result.data as ForecastData[];
  } catch (err) {
    console.error("Error fetching forecast data:", err);
    throw new Error(`Failed to fetch forecast data: ${err instanceof Error ? err.message : String(err)}`);
  }
}

// REMOVE 'accessToken' parameter from these function signatures
export async function fetchForecastByDimension(
  months: number,
  dimension: string,
  filterValue: string
): Promise<ForecastData[]> {
  try {
    const headers = await getAuthHeaders(); // Get headers with auth token

    const body = JSON.stringify({ months, dimension, filter_value: filterValue });

    const response = await fetch(`http://localhost:8000/api/forecast-by-dimension`, {
      method: "POST",
      headers: headers, // Use the headers with authentication
      body: body,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 401) {
        throw new Error("Authentication failed: Invalid or expired token for forecast by dimension. Please log in again.");
      }
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    if (!result.data || !Array.isArray(result.data)) {
        throw new Error("Invalid data format for forecast by dimension data received from API.");
    }
    return result.data as ForecastData[];
  } catch (err) {
    console.error("Error fetching forecast by dimension data:", err);
    throw new Error(`Failed to fetch forecast data by dimension: ${err instanceof Error ? err.message : String(err)}`);
  }
}

// REMOVE 'accessToken' parameter from these function signatures
export async function fetchUniqueDimensionValues(dimension: string): Promise<string[]> {
  try {
    const headers = await getAuthHeaders(); // Get headers with auth token

    const response = await fetch(`http://localhost:8000/api/dimensions/unique-values?dimension=${encodeURIComponent(dimension)}`, {
      method: "GET", // This is a GET request
      headers: headers, // Use the headers with authentication
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 401) {
        throw new Error("Authentication failed: Invalid or expired token for unique dimension values. Please log in again.");
      }
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log("API Response for /api/dimensions/unique-values:", result); // Debug log
    
    if (!result.data || !Array.isArray(result.data)) {
      throw new Error("Invalid data format for unique dimension values received from API.");
    }
    
    return result.data as string[];
  } catch (err) {
    console.error(`Error fetching unique values for dimension ${dimension}:`, err);
    throw new Error(`Failed to fetch unique dimension values: ${err instanceof Error ? err.message : String(err)}`);
  }
}