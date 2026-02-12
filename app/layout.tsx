import type { Metadata } from "next";
import { Inter, JetBrains_Mono, DM_Serif_Display } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/Toaster";
import { LocaleProvider } from "@/lib/locale-context";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});
const dmSerifDisplay = DM_Serif_Display({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
});

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
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} ${dmSerifDisplay.variable}`}>
      <body className="antialiased font-body" suppressHydrationWarning>
        <LocaleProvider>
          {children}
          <Toaster />
        </LocaleProvider>
      </body>
    </html>
  );
}
