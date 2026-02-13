import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Sidebar } from "@/components/Sidebar";
import { auth } from "@/lib/auth";

const inter = Inter({
  variable: "--font-inter",
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
      <body className={`${inter.variable} antialiased`}>
        <Providers>
          {session ? (
            <div className="flex min-h-screen">
              <Sidebar />
              <main className="flex-1 theme-page-bg overflow-y-auto">
                <div className="px-8 py-6 max-w-[1400px]">
                  {children}
                </div>
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
