"use client";

import { usePathname, useRouter } from "next/navigation";
import { Home, BarChart } from "lucide-react";
import clsx from "clsx";

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  const tabs = [
    { name: "Raw Data", path: "/raw", icon: Home },
    { name: "Forecast", path: "/forecast", icon: BarChart },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white shadow-lg border-t border-gray-200 flex justify-around py-2 z-50">
      {tabs.map((tab) => {
        const isActive = pathname === tab.path;
        const Icon = tab.icon;

        return (
          <button
            key={tab.path}
            onClick={() => router.push(tab.path)}
            className={clsx(
              "flex flex-col items-center text-sm",
              isActive ? "text-blue-600 font-semibold" : "text-gray-500"
            )}
          >
            <Icon size={20} className="mb-1" />
            {tab.name}
          </button>
        );
      })}
    </nav>
  );
}