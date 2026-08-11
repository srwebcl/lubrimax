"use client";

import React from "react";
import { useCart } from "@/components/providers/CartProvider";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";

export default function CartDrawer() {
  const { isCartOpen, closeCart, items, total, removeFromCart, updateQuantity } = useCart();

  return (
    <AnimatePresence>
      {isCartOpen && (
        <>
          {/* Overlay */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeCart}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999]"
          />

          {/* Drawer */}
          <motion.div 
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full max-w-md bg-brand-surface border-l border-white/10 z-[1000] flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <h2 className="text-xl font-bold text-white uppercase tracking-widest italic flex items-center gap-2">
                <svg className="w-6 h-6 text-brand-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                Tu Carrito
              </h2>
              <button 
                onClick={closeCart}
                className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-full transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-60">
                  <svg className="w-16 h-16 text-gray-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <p className="text-white text-sm uppercase tracking-widest font-bold">Carrito Vacío</p>
                  <p className="text-gray-400 text-xs mt-2">Agrega productos exclusivos para continuar.</p>
                </div>
              ) : (
                items.map((item) => (
                  <div key={item.id} className="flex gap-4 bg-black/30 p-3 rounded-xl border border-white/5">
                    <div className="relative w-20 h-20 bg-black/50 rounded-lg flex-shrink-0 flex items-center justify-center border border-white/5 overflow-hidden">
                      {item.image ? (
                        <Image src={item.image} alt={item.name} fill sizes="80px" className="object-cover opacity-80" />
                      ) : (
                        <span className="text-[10px] text-gray-600 uppercase">Img</span>
                      )}
                    </div>
                    
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <div className="text-[9px] text-brand-cyan uppercase tracking-widest font-bold mb-0.5 line-clamp-1">{item.category}</div>
                        <h4 className="text-white text-sm font-bold leading-tight line-clamp-2">{item.name}</h4>
                        <div className="text-xs text-gray-400 mt-1">${item.price.toLocaleString('es-CL')} c/u</div>
                      </div>
                      
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-2 bg-black/50 rounded-md border border-white/5 px-2 py-1">
                          <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="text-gray-400 hover:text-white px-1">-</button>
                          <span className="text-white font-bold text-xs w-4 text-center">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="text-gray-400 hover:text-white px-1">+</button>
                        </div>
                        <button onClick={() => removeFromCart(item.id)} className="text-gray-500 hover:text-red-400 text-xs uppercase tracking-widest font-bold">
                          Quitar
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer / Checkout */}
            {items.length > 0 && (
              <div className="p-6 border-t border-white/10 bg-gradient-to-b from-transparent to-black/50">
                <div className="flex justify-between items-center mb-6">
                  <span className="text-gray-400 uppercase tracking-widest text-xs font-bold">Total</span>
                  <span className="text-2xl font-bold text-brand-cyan">${total.toLocaleString('es-CL')}</span>
                </div>
                
                <Link href="/checkout" onClick={closeCart}>
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full bg-brand-cyan text-brand-pure font-bold uppercase tracking-widest text-sm py-4 rounded-xl hover:bg-white transition-all shadow-[0_0_20px_rgba(56,189,248,0.2)] flex items-center justify-center gap-2"
                  >
                    Ir a Pagar
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                  </motion.button>
                </Link>
                <button 
                  onClick={closeCart}
                  className="w-full mt-4 text-gray-500 hover:text-white text-xs uppercase tracking-widest font-bold transition-colors"
                >
                  Seguir Comprando
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
