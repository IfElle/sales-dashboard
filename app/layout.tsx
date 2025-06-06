// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "./providers"; // Ensure this import is correct

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Sales Dashboard",
  description: "Revenue Forecast and Analysis Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers> {/* This is critical: children wrapped in Providers */}
          <div className="flex-1 p-4">
            {children}
          </div>
          {/* REMOVE THE <nav> BLOCK FROM HERE */}
          {/* You should not have another nav here if BottomNav is already handling it */}
        </Providers>
      </body>
    </html>
  );
}