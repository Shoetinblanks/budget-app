import type { Metadata } from "next";
import { ClerkProvider } from '@clerk/nextjs';
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Shoe Budgeting",
  applicationName: "Shoe Budgeting",
  description: "Shoe Budgeting is a personal finance and budget management platform provided by Shoetinblanks LLC to help you track expenses, categorize income, parse check stubs, and manage your budget.",
  openGraph: {
    title: "Shoe Budgeting",
    description: "Shoe Budgeting is a personal finance platform provided by Shoetinblanks LLC to manage budgets, expenses, and cash flow.",
    url: "https://budget.shoetinblanks.com",
    siteName: "Shoe Budgeting",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className="dark">
        <body className={`${inter.className} antialiased bg-zinc-950 text-white min-h-screen`}>
          <div className="flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-1">
              {children}
            </main>
            <Footer />
          </div>
        </body>
      </html>
    </ClerkProvider>
  );
}
