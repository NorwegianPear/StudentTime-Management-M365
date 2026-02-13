import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { auth } from "@/lib/auth";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Student Access Management",
  description: "Manage student M365 access schedules for Bergan International School",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          {session ? (
            <div className="flex min-h-screen">
              <Sidebar />
              <div className="flex-1 flex flex-col">
                {/* Sticky header with toggles */}
                <header className="sticky top-0 z-30 theme-page-bg border-b theme-border px-8 py-3 flex items-center justify-end">
                  <TopBar />
                </header>
                <main className="flex-1 theme-page-bg p-8">
                  {children}
                </main>
              </div>
            </div>
          ) : (
            children
          )}
        </Providers>
      </body>
    </html>
  );
}
