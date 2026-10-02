import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "NiyamSetu — National Regulatory Compliance & Approval Engine",
  description:
    "National Regulatory Compliance & Approval Engine for Indian businesses. Single-window statutory discovery, smart document vault, and clearance tracking.",
};

import { Suspense } from "react";
import { AIAssistantWidget } from "@/components/AIAssistantWidget";
import { AuthProvider } from "@/context/AuthContext";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} min-h-screen bg-slate-50 text-slate-900 flex flex-col antialiased selection:bg-amber-100 selection:text-amber-900`}>
        <AuthProvider>
          {children}
          <Suspense fallback={null}>
            <AIAssistantWidget />
          </Suspense>
        </AuthProvider>
      </body>
    </html>
  );
}
