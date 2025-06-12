"use client"; // This directive marks the component as a Client Component

import { SessionContextProvider, Session } from '@supabase/auth-helpers-react';
import { createBrowserSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { useState, ReactNode } from 'react';

interface SupabaseProviderProps {
  initialSession: Session | null;
  children: ReactNode;
}

export default function SupabaseProvider({ initialSession, children }: SupabaseProviderProps) {
  // Create a new supabase client for the browser to use in client components.
  // This client will automatically refresh its session from the initialSession prop.
  const [supabaseClient] = useState(() => createBrowserSupabaseClient());

  return (
    <SessionContextProvider supabaseClient={supabaseClient} initialSession={initialSession}>
      {children}
    </SessionContextProvider>
  );
}