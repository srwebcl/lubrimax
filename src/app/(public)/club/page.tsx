"use client";

import React, { useEffect, useState } from "react";
import { getMemberships, getPartners } from "@/actions/admin-club";
import Link from "next/link";
import { motion } from "framer-motion";

type Membership = {
  id: string;
  name: string;
  price: number;
  discountPercent: number;
  features: string[];
};

type Partner = {
  id: string;
  name: string;
  description: string | null;
  benefits: string[];
  logo: string | null;
};

export default function ClubPage() {
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const m = await getMemberships();
      const p = await getPartners();
      // Filter only active
      setMemberships(m.filter((x: any) => x.isActive));
      setPartners(p.filter((x: any) => x.isActive));
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="min-h-screen pt-32 pb-20">
      
      {/* HERO CLUB */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto mb-20 text-center">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.8 }}>
          <div className="inline-block text-[10px] uppercase tracking-widest font-bold text-amber-500 border border-amber-500/30 bg-amber-500/10 px-4 py-2 rounded-full mb-6">
            Membresía Exclusiva
          </div>
          <h1 className="text-5xl md:text-7xl font-bold text-white uppercase tracking-widest italic mb-6">
            Club <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-600">VIP</span>
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto text-lg">
            Sube al siguiente nivel. Únete al Club LUBRIMAX y obtén descuentos de por vida en nuestros servicios, acceso prioritario y convenios exclusivos con las mejores marcas del rubro automotriz.
          </p>
        </motion.div>
      </section>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <>
          {/* MEMBERSHIP TIERS */}
          <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto mb-32">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 justify-center">
              {memberships.map((m, i) => (
                <motion.div 
                  key={m.id}
                  initial={{ y: 50, opacity: 0 }}
                  whileInView={{ y: 0, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-gradient-to-b from-brand-surface to-black border border-amber-500/30 rounded-3xl p-8 relative overflow-hidden group hover:border-amber-400 transition-colors shadow-[0_0_30px_rgba(245,158,11,0.05)] hover:shadow-[0_0_50px_rgba(245,158,11,0.15)] flex flex-col"
                >
                  <div className="absolute top-0 right-0 p-6 opacity-10 text-6xl group-hover:scale-110 transition-transform">★</div>
                  
                  <h3 className="text-2xl font-bold text-white uppercase tracking-widest mb-2">{m.name}</h3>
                  
                  <div className="text-4xl text-amber-500 font-bold mb-6">
                    ${m.price.toLocaleString('es-CL')} <span className="text-sm text-gray-500 font-normal">/mes</span>
                  </div>
                  
                  <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 p-4 rounded-xl mb-8">
                    <div className="text-xs uppercase tracking-widest font-bold mb-1">Descuento Permanente</div>
                    <div className="text-3xl font-bold">{m.discountPercent}% OFF</div>
                  </div>

                  <ul className="space-y-4 mb-10 flex-grow">
                    {m.features.map((f, j) => (
                      <li key={j} className="flex items-start gap-3 text-gray-300 text-sm">
                        <span className="text-amber-500 font-bold">✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>

                  {/* Checkout flow not implemented yet for subscriptions, just placeholder */}
                  <Link href="/login" className="w-full block text-center bg-amber-500 text-black font-bold uppercase tracking-widest py-4 rounded-xl hover:bg-amber-400 transition-colors mt-auto">
                    Suscribirse
                  </Link>
                </motion.div>
              ))}
            </div>
          </section>

          {/* PARTNERS NETWORK */}
          <section className="bg-brand-surface/50 border-t border-b border-white/5 py-24 relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('/mesh-bg.png')] opacity-10 mix-blend-overlay"></div>
            
            <div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative z-10">
              <div className="text-center mb-16">
                <h2 className="text-3xl font-bold text-white uppercase tracking-widest italic mb-4">Comercios Asociados</h2>
                <p className="text-gray-400 max-w-2xl mx-auto">
                  Tu membresía te abre las puertas a una red exclusiva de beneficios. Presenta tu perfil de Club LUBRIMAX en estos comercios.
                </p>
              </div>

              {partners.length === 0 ? (
                <div className="text-center text-gray-500 text-sm border border-white/10 rounded-2xl py-12">
                  Pronto anunciaremos nuevos convenios.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {partners.map((p, i) => (
                    <motion.div 
                      key={p.id}
                      initial={{ scale: 0.9, opacity: 0 }}
                      whileInView={{ scale: 1, opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.1 }}
                      className="bg-black/50 border border-white/10 p-6 rounded-2xl hover:border-brand-cyan/30 transition-colors flex flex-col h-full"
                    >
                      {p.logo && (
                        <div className="w-full h-24 mb-4 bg-white rounded-lg flex items-center justify-center p-2">
                          <img src={p.logo} alt={p.name} className="max-h-full max-w-full object-contain" />
                        </div>
                      )}
                      <h4 className="text-lg font-bold text-white mb-2 mt-auto">{p.name}</h4>
                      <p className="text-xs text-gray-500 mb-6">{p.description}</p>
                      
                      <div className="space-y-3">
                        {p.benefits.map((b, j) => (
                          <div key={j} className="flex gap-2 items-start text-brand-cyan text-sm">
                            <span className="shrink-0">🎁</span>
                            <span className="font-bold">{b}</span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
