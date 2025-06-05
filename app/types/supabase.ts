// types/supabase.ts
export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      sales_raw_data: {
        Row: {
          id: number;
          date: string; // or `Date` if you parse it
          sector: string;
          airline: string;
          revenue: number;
          cost: number;
          profit: number;
          created_at: string;
        };
        Insert: {
          date: string;
          sector: string;
          airline: string;
          revenue: number;
          cost: number;
          profit: number;
          created_at?: string;
        };
        
        
        Update: Partial<Database['public']['Tables']['sales_raw_data']['Insert']>;
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
  };
}
export type SalesRawData = {
  Month: string;
  Airline: string;
  Product: string;
  Supplier: string;
  City: string;
  Sector: string;
  AgentName: string;
  AgCompany: string;
  Type: string;
  Website: string;
  Revenue: number;
  Commission: number;
  TxID: string;
  PaxNo: number;
  TxDate: string;
  JourneyDt: string;
};