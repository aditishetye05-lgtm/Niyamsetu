import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "NiyamSetu | Business Approval & Compliance Navigator",
  description:
    "Intelligent compliance and business approval navigation platform for Smart India Hackathon. Navigate government clearances, statutory approvals, and licenses effortlessly.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} min-h-screen bg-slate-50 text-slate-900 flex flex-col antialiased selection:bg-amber-100 selection:text-amber-900`}>
        {children}
      </body>
    </html>
  );
}
