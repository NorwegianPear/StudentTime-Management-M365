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
              <main className="flex-1 theme-page-bg p-8 relative">
                <div className="absolute top-4 right-8 z-30">
                  <TopBar />
                </div>
                {children}
              </main>
            </div>
          ) : (
            children
          )}
        </Providers>
      </body>
    </html>
  );
}
