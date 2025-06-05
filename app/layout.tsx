import "./globals.css";
import { ReactNode } from "react";
import Providers from "./providers";
import { Home, BarChart2 } from "lucide-react";
import Link from "next/link";

export default function RootLayout({ children }: { children: ReactNode }) {
  const pathname = typeof window !== "undefined" ? window.location.pathname : "";

  return (
    <html lang="en">
      <body className="bg-gray-100 min-h-screen flex flex-col">
        <Providers>
          <div className="flex-1 p-4">{children}</div>
          <nav className="fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around py-2 shadow-md z-50">
            <Link href="/raw" className={`flex flex-col items-center text-sm ${pathname === "/raw" ? "text-blue-600" : "text-gray-600"}`}>
              <Home className="w-5 h-5 mb-1" /> Raw Data
            </Link>
            <Link href="/forecast" className={`flex flex-col items-center text-sm ${pathname === "/forecast" ? "text-blue-600" : "text-gray-600"}`}>
              <BarChart2 className="w-5 h-5 mb-1" /> Forecast
            </Link>
          </nav>
        </Providers>
      </body>
    </html>
  );
}