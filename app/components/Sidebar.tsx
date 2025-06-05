"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart, FileText } from "lucide-react";

const navItems = [
  { label: "Raw Data", href: "/raw", icon: FileText },
  { label: "Forecast", href: "/forecast", icon: BarChart },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-md flex justify-around p-2 z-50">
      {navItems.map(({ label, href, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={`flex flex-col items-center text-sm ${
            pathname === href ? "text-blue-600" : "text-gray-500"
          }`}
        >
          <Icon className="h-5 w-5 mb-1" />
          {label}
        </Link>
      ))}
    </nav>
  );
}
