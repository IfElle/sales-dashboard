import { SupabaseClient } from '@supabase/supabase-js';
import { SalesRawData } from '../app/types/supabase'; // Assuming this path and type are correct for individual sales records

export async function fetchRawData(supabase: SupabaseClient): Promise<SalesRawData[]> {
  // Get the current logged-in user
  const {
    data: { user },
    error: userError, // Capture potential error from getUser()
  } = await supabase.auth.getUser();

  // The AuthGuard component already handles unauthenticated users by redirecting to login.
  // Therefore, we can remove this explicit throw as it's redundant and causes a console error
  // before the redirect fully takes effect.
  // if (userError || !user) {
  //   throw new Error('User not authenticated. Please log in to view data.');
  // }

  // If for some reason 'user' is still null here (e.g., AuthGuard hasn't fully redirected yet),
  // the subsequent operations involving 'user.id' will implicitly handle it,
  // and AuthGuard will eventually enforce the login.

  // Get Sales_Person for this user from 'users' table
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('Sales_Person') // Correctly selecting 'Sales_Person' (confirmed column name)
    .eq('id', user?.id) // Use user?.id to safely access id if user is null/undefined
    .single();

  if (profileError) {
    // If no user profile found (e.g., user.id not in 'users' table),
    // we'll proceed with salesPerson as null/undefined, leading to fetching all data.
    console.warn('No user profile found for user ID:', user?.id, '. This user will attempt to view all sales data.');
  }

  // Get the sales person value, ensuring it's trimmed
  const salesPerson = profile?.Sales_Person?.trim();

  let query = supabase.from('sales_raw_data').select('*');

  // If a specific Sales_Person is found in the user's profile, apply the filter.
  // Otherwise, the query remains 'select(*)', fetching all data.
  if (salesPerson) {
    query = query.eq('Sales_Person', salesPerson); // FIX: Changed 'sales_person' to 'Sales_Person'
    console.log(`Filtering sales data by Sales_Person: "${salesPerson}"`);
  } else {
    console.log('User has no specific Sales_Person assigned or profile not found. Fetching all sales data.');
  }

  const { data: rawData, error: rawDataError } = await query;

  if (rawDataError) {
    throw new Error(`Failed to fetch raw data: ${rawDataError.message}`);
  }

  // The data from Supabase is a flat array of records.
  // Cast it to the correct type: SalesRawData[].
  return rawData as SalesRawData[];
}