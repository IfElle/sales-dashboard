import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! // Use anon key here
);

export async function fetchRawData() {
  const { data, error } = await supabase.from("sales_raw_data").select("*");

  if (error) {
    console.error("Error fetching sales raw data:", error.message);
    return [];
  }

  return data;
}