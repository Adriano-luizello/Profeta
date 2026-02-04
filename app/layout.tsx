import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/Toaster";

export const metadata: Metadata = {
  title: "Profeta - AI Inventory Demand Forecaster",
  description: "Smart inventory management powered by AI and Prophet forecasting",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased" suppressHydrationWarning>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
