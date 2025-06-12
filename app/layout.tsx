// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Suspense } from 'react';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
// Import the new client component SupabaseProvider
import SupabaseProvider from '../app/components/SupabaseProvider';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Sales Dashboard",
  description: "Revenue Forecast and Analysis Dashboard",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Create a Supabase client for server components to fetch the initial session
  const supabase = createServerComponentClient({ cookies });

  // Fetch the initial session on the server
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return (
    <html lang="en">
      <body className={inter.className}>
        <Suspense fallback={null}>
          {/*
            Wrap children with the new client SupabaseProvider.
            The initial session fetched on the server is passed to it.
          */}
          <SupabaseProvider initialSession={session}>
            <div className="flex-1 p-4">
              {children}
            </div>
          </SupabaseProvider>
        </Suspense>
      </body>
    </html>
  );
}