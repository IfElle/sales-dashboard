"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Home, BarChart, Globe, LogOut, LogIn } from "lucide-react";
import clsx from "clsx";
// Import Supabase Auth Hooks
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  // Get the Supabase session and client from the auth helpers
  // These hooks require SessionContextProvider to be set up in your layout.tsx or _app.tsx
  const session = useSession(); // Access the current session
  const supabase = useSupabaseClient(); // Access the Supabase client

  // Remove the old debugging useEffect for NextAuth status, as 'status' is no longer relevant here.
  // If you want to debug session, you can use:
  // useEffect(() => {
  //   console.log("BottomNav: Supabase Session:", session);
  // }, [session]);

  const tabs = [
    { name: "Historical Data", path: "/raw", icon: Globe },
    { name: "Forecast", path: "/forecast", icon: BarChart },
    // Add other fixed tabs here if needed
  ];

  // Function to handle logout using Supabase
  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error logging out:", error.message);
      // Optionally display an error message to the user
    } else {
      router.push("/login"); // Redirect to the login page after successful logout
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white shadow-lg border-t border-gray-200 flex justify-around py-2 z-50">
      {tabs.map((tab) => {
        const isActive = pathname === tab.path;
        const Icon = tab.icon;

        return (
          <Link
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

      {/* Conditionally render Login or Logout button based on session existence */}
      {session ? ( // If a Supabase session exists, user is logged in
        <button
          key="logout"
          onClick={handleLogout} // Use the new Supabase logout handler
          className={clsx(
            "flex flex-col items-center text-sm p-2 rounded-md transition-colors duration-200",
            "text-red-600 hover:text-red-700 hover:bg-red-50" // Logout specific styling
          )}
        >
          <LogOut size={20} className="mb-1" />
          Logout
        </button>
      ) : ( // If no session, user is not logged in
        <Link
          key="login"
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