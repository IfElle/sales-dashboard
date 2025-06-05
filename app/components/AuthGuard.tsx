"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ReactNode, useEffect } from "react";

export default function AuthGuard({ children }: { children: ReactNode }) {
  const skipAuth = process.env.NODE_ENV === "development" || process.env.NEXT_PUBLIC_SKIP_AUTH === "true";

  if (skipAuth) {
    return <>{children}</>;
  }

  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return <div className="p-8">Loading...</div>;
  }

  return <>{children}</>;
}