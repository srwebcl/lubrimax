import React from "react";
import Navbar from "@/components/dom/Navbar";
import CartDrawer from "@/components/dom/CartDrawer";
import { CartProvider } from "@/components/providers/CartProvider";

export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <CartProvider>
      <header className="fixed top-0 w-full z-50 flex flex-col">
        <Navbar />
      </header>
      <CartDrawer />
      <main className="flex-grow">
        {children}
      </main>
    </CartProvider>
  );
}
