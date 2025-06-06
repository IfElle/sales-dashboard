// src/components/AuthGuard.tsx
"use client";

import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation"; // Import usePathname
import { ReactNode, useEffect } from "react";

export default function AuthGuard({ children }: { children: ReactNode }) {
  // Your existing skipAuth logic
  const skipAuth = process.env.NEXT_PUBLIC_SKIP_AUTH === "true";

  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname(); // Get current path to redirect back to after login

  useEffect(() => {
    // If skipAuth is true, we don't perform any authentication checks
    if (skipAuth) {
      return;
    }

    if (status === "loading") {
      // Still loading session, do nothing or show a loading indicator
      return;
    }

    if (status === "unauthenticated") {
      // User is not authenticated, redirect to login page
      // Encode the current path as a callbackUrl to redirect back after successful login
      router.push(`/login?callbackUrl=${encodeURIComponent(pathname)}`);
    }
  }, [status, router, pathname, skipAuth]); // Add pathname and skipAuth to dependency array

  // Render children only if authenticated or if skipAuth is true
  if (skipAuth || status === "authenticated") {
    return <>{children}</>;
  }

  // Show a loading spinner/message while authentication status is being determined
  // or if the user is unauthenticated and being redirected.
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      <p className="ml-4 text-gray-700">Loading or redirecting...</p>
    </div>
  );
}