// src/components/BottomNav.tsx
"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Home, BarChart, Globe, LogOut, LogIn } from "lucide-react"; // Import LogOut and LogIn icons
import clsx from "clsx";
import { signOut, useSession } from "next-auth/react"; // Import useSession and signOut
import { useEffect } from "react"; // For debugging console logs

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession(); // Get session data and status

  // --- Debugging logs (keep these until the logout button works reliably) ---
  useEffect(() => {
    console.log("BottomNav: Session Status:", status);
    console.log("BottomNav: Session Data:", session);
  }, [session, status]);
  // -----------------------------------------------------------------------

  // Define your core navigation tabs (excluding login/logout for now)
  const tabs = [
    { name: "Historical Data", path: "/raw", icon: Globe },
    { name: "Forecast", path: "/forecast", icon: BarChart },
    // Add other fixed tabs here if needed
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white shadow-lg border-t border-gray-200 flex justify-around py-2 z-50">
      {tabs.map((tab) => {
        const isActive = pathname === tab.path;
        const Icon = tab.icon;

        return (
          <Link // Use Link for navigation tabs
            key={tab.path}
            href={tab.path}
            className={clsx(
              "flex flex-col items-center text-sm p-2 rounded-md transition-colors duration-200",
              isActive ? "text-blue-600 font-semibold bg-blue-50" : "text-gray-500 hover:text-blue-600 hover:bg-gray-100"
            )}
          >
            <Icon size={20} className="mb-1" />
            {tab.name}
          </Link>
        );
      })}

      {/* Conditionally render Login or Logout button */}
      {session ? ( // If session data exists, user is logged in
        <button
          key="logout" // Key for React list rendering
          onClick={() => signOut({ callbackUrl: "/login" })} // Actual logout action
          className={clsx(
            "flex flex-col items-center text-sm p-2 rounded-md transition-colors duration-200",
            "text-red-600 hover:text-red-700 hover:bg-red-50" // Logout specific styling
          )}
        >
          <LogOut size={20} className="mb-1" />
          Logout
        </button>
      ) : ( // If no session data, user is not logged in
        <Link
          key="login" // Key for React list rendering
          href="/login"
          className={clsx(
            "flex flex-col items-center text-sm p-2 rounded-md transition-colors duration-200",
            pathname === "/login" ? "text-blue-600 font-semibold bg-blue-50" : "text-gray-500 hover:text-blue-600 hover:bg-gray-100"
          )}
        >
          <LogIn size={20} className="mb-1" />
          Login
        </Link>
      )}
    </nav>
  );
}