import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import FloatingWhatsApp from "@/components/dom/FloatingWhatsApp";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LUBRIMAX - Clínica Automotriz",
  description: "Estética automotriz premium, detailing, sellado cerámico y pulido.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body suppressHydrationWarning className="bg-brand-pure text-brand-chrome antialiased overflow-x-hidden min-h-full flex flex-col relative selection:bg-brand-cyan/30 selection:text-white">
        {children}
        <FloatingWhatsApp />
      </body>
    </html>
  );
}
