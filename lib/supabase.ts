// lib/supabase.ts
import { createBrowserClient } from "@supabase/ssr";
import type { SalesRawData } from "../app/types/supabase"; 

export const supabase = createBrowserClient<SalesRawData>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
