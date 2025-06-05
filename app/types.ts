
// In your types file (e.g., ../types/supabase.ts)
export interface SalesRawData {
  // ... your existing SalesRawData fields
  Txid?: string | number | null;
  Website?: string | null;
  Month?: string | null; // e.g., Jan'24
  TxDate?: string | null; // e.g., 01/04/2024
  // ... other fields
  Revenue?: string | number | null; // Ensure this can be string or number
  Commission?: string | number | null;
  'Agent Name'?: string | null; // Field name with space
  'Ag Company'?: string | null; // Field name with space
  'Pax No'?: string | number | null;
  Journey?: string | null; // For Domestic/International
  Sector?: string | null;
  Airline?: string | null;
  Supplier?: string | null;
  Product?: string | null;
  City?: string | null;
  Type?: string | null; // Transaction Type
  // ... any other fields from your CSV/Supabase
}

export interface ForecastDataItem {
  date: string;       // YYYY-MM-DD
  month: string;      // YYYY-MM
  category: string;
  actual: number | null;
  forecast: number | null;
  is_future: boolean;
}