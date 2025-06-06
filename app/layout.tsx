// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import { Suspense } from 'react'; // <--- 1. Import Suspense

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
        {/* 2. Wrap the Providers component in a Suspense boundary */}
        <Suspense fallback={null}>
          <Providers>
            <div className="flex-1 p-4">
              {children}
            </div>
          </Providers>
        </Suspense>
      </body>
    </html>
  );
}