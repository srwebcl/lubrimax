import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import FloatingWhatsApp from "@/components/dom/FloatingWhatsApp";
import ServiceWorkerRegister from "@/components/pwa/ServiceWorkerRegister";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://lubrimax.cl";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "LUBRIMAX - Clínica Automotriz",
  description: "Estética automotriz premium, detailing, sellado cerámico y pulido.",
  applicationName: "Lubrimax",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Lubrimax",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  colorScheme: "dark",
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
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
