import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HBOS - Hafara Business Operating System",
  description:
    "Sistem operasi bisnis terpadu untuk perusahaan training, consulting, dan human development. Pantau seluruh aktivitas bisnis secara real-time.",
  keywords: [
    "HBOS", "Hafara", "Business Operating System", "Training", "Consulting",
    "CRM", "KPI", "Dashboard",
  ],
  authors: [{ name: "Hafara Group" }],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
