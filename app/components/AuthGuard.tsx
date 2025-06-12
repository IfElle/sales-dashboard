// components/AuthGuard.tsx (Conceptual example - adjust based on your actual file)
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@supabase/auth-helpers-nextjs';

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const supabase = createBrowserSupabaseClient(); // Get Supabase client

  useEffect(() => {
    const checkAuth = async () => {
      setLoading(true);
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error || !session) {
        // Not authenticated, redirect to login
        router.push('/login'); // Or your login path
        setIsAuthenticated(false);
      } else {
        setIsAuthenticated(true);
      }
      setLoading(false);
    };

    checkAuth();

    // Optional: Listen for auth state changes if you want real-time updates
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        // User logged out
        router.push('/login');
        setIsAuthenticated(false);
      } else {
        setIsAuthenticated(true);
      }
    });

    return () => {
      authListener?.subscription.unsubscribe(); // Clean up the listener
    };
  }, [router, supabase]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-xl">Checking authentication...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Optionally render nothing or a specific message before redirect
    return null;
  }

  return <>{children}</>;
}