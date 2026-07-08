"use client";

import React, { useEffect, useState, Suspense } from "react";
import { getSessionCustomer, logoutCustomer } from "@/actions/customer-auth";
import { useCart } from "@/components/providers/CartProvider";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";

function PerfilContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { clearCart } = useCart();
  
  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Si viene de un pago exitoso
    if (searchParams.get("success") === "true") {
      clearCart();
    }

    async function load() {
      const data = await getSessionCustomer();
      if (!data) {
        router.push("/login");
      } else {
        setCustomer(data);
      }
      setLoading(false);
    }
    load();
  }, [searchParams, clearCart, router]);

  const handleLogout = async () => {
    await logoutCustomer();
    router.push("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-brand-cyan border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      
      {searchParams.get("success") === "true" && (
        <motion.div initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-green-500/10 border border-green-500/30 text-green-400 p-6 rounded-2xl mb-8 flex items-center gap-4">
          <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center text-2xl">✓</div>
          <div>
            <h3 className="font-bold text-lg">¡Pago Exitoso!</h3>
            <p className="text-sm">Tu compra ha sido procesada mediante Webpay Plus. Orden: #{searchParams.get("order")}</p>
          </div>
        </motion.div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-white uppercase tracking-widest italic mb-2">Mi Perfil</h1>
          <p className="text-gray-400">Bienvenido, {customer?.name}</p>
        </div>
        <button onClick={handleLogout} className="text-gray-400 hover:text-white border border-white/10 px-4 py-2 rounded-lg text-xs uppercase tracking-widest transition-colors font-bold">
          Cerrar Sesión
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* MEMBERSHIP CARD */}
        <div className="lg:col-span-1">
          <div className={`bg-gradient-to-br ${customer?.membership ? 'from-amber-600/20 to-black border-amber-500/50 shadow-[0_0_30px_rgba(245,158,11,0.1)]' : 'from-brand-surface to-black border-white/10'} border rounded-3xl p-8 relative overflow-hidden h-full flex flex-col`}>
            
            {customer?.membership ? (
              <>
                <div className="absolute -top-10 -right-10 text-9xl opacity-5">★</div>
                <div className="text-[10px] uppercase tracking-widest font-bold text-amber-500 border border-amber-500/30 bg-amber-500/10 inline-block px-3 py-1 rounded-full mb-6 w-max">
                  Socio VIP
                </div>
                <h3 className="text-3xl font-bold text-white uppercase tracking-widest mb-2">{customer.membership.name}</h3>
                <p className="text-gray-400 text-sm mb-6">Disfruta de tus beneficios exclusivos.</p>
                
                <div className="mt-auto bg-black/50 border border-white/5 rounded-xl p-4">
                  <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Descuento Automático</div>
                  <div className="text-2xl font-bold text-green-400">{customer.membership.discountPercent}% OFF</div>
                  <div className="text-xs text-gray-400 mt-1">En todos los servicios.</div>
                </div>
              </>
            ) : (
              <>
                <div className="text-[10px] uppercase tracking-widest font-bold text-gray-500 border border-white/10 bg-white/5 inline-block px-3 py-1 rounded-full mb-6 w-max">
                  Usuario Estándar
                </div>
                <h3 className="text-2xl font-bold text-white uppercase tracking-widest mb-4">No eres socio del Club</h3>
                <p className="text-gray-400 text-sm mb-8 flex-grow">Obtén descuentos permanentes y beneficios en nuestra red de comercios asociados.</p>
                
                <Link href="/club" className="w-full bg-gradient-to-r from-amber-500 to-yellow-600 text-black font-bold uppercase tracking-widest text-xs py-4 rounded-xl flex items-center justify-center gap-2 hover:scale-105 transition-transform">
                  <span>★</span> Ver Beneficios VIP
                </Link>
              </>
            )}
          </div>
        </div>

        {/* ORDER HISTORY */}
        <div className="lg:col-span-2">
          <div className="bg-brand-surface/50 border border-white/10 rounded-3xl p-8 h-full">
            <h3 className="text-xl font-bold text-white uppercase tracking-widest mb-6">Historial de Compras</h3>
            
            {/* Si no hay ordenes (mockeado para front end, ya que tendríamos que pasarlo del server) */}
            <div className="text-center py-12 bg-black/30 rounded-2xl border border-white/5 border-dashed">
              <svg className="w-12 h-12 text-gray-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              <p className="text-gray-400 text-sm">Pronto podrás ver aquí tus boletas y servicios realizados.</p>
              <Link href="/tienda" className="inline-block mt-4 text-brand-cyan text-xs font-bold uppercase tracking-widest hover:text-white transition-colors">
                Ir a la Tienda
              </Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function PerfilPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-brand-cyan border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <PerfilContent />
    </Suspense>
  );
}
