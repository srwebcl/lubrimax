"use client";

import React, { useState, useEffect } from "react";
import { getPublicProducts } from "@/actions/store";
import { useCart } from "@/components/providers/CartProvider";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

type Category = { id: string; name: string; };
type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  category: Category | null;
  image: string | null;
  variants: any[];
};

export default function TiendaPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { itemCount } = useCart();
  
  // Filters & Sorting
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"NEWEST" | "PRICE_ASC" | "PRICE_DESC">("NEWEST");

  useEffect(() => {
    async function load() {
      setLoading(true);
      const data = await getPublicProducts();
      setProducts(data as any[]);
      setLoading(false);
    }
    load();
  }, []);

  const categories = Array.from(new Set(products.map(p => p.category?.name))).filter(Boolean) as string[];

  // Apply filters and sorting
  const filteredProducts = products
    .filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = selectedCategory === "ALL" || p.category?.name === selectedCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      if (sortBy === "PRICE_ASC") return a.price - b.price;
      if (sortBy === "PRICE_DESC") return b.price - a.price;
      return 0; // NEWEST (default from DB)
    });

  return (
    <div className="min-h-screen bg-brand-pure font-sans">
      
      {/* 🌟 E-COMMERCE HERO BANNER */}
      <div className="relative pt-32 pb-20 px-6 lg:px-8 border-b border-white/5 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-brand-cyan/10 via-brand-pure to-brand-pure pointer-events-none"></div>
        <div className="absolute top-0 right-0 w-1/2 h-full bg-[url('/mesh-bg.svg')] opacity-20 mix-blend-overlay pointer-events-none"></div>
        
        <div className="max-w-7xl mx-auto relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-8">
          <motion.div 
            initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, ease: "easeOut" }}
            className="max-w-2xl"
          >
            <div className="inline-block px-4 py-1.5 rounded-full border border-brand-cyan/30 bg-brand-cyan/10 text-brand-cyan text-[10px] font-bold uppercase tracking-[0.2em] mb-6">
              Catálogo Oficial
            </div>
            <h1 className="text-5xl md:text-7xl font-bold text-white uppercase tracking-tighter mb-6 leading-none">
              LUBRIMAX <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-cyan to-brand-blue italic font-light tracking-widest">Store</span>
            </h1>
            <p className="text-gray-400 text-lg md:text-xl font-light leading-relaxed max-w-xl">
              Equipamiento premium, accesorios de detailing y aromas exclusivos. Eleva la estética de tu vehículo al estándar <span className="text-white font-bold">LUBRIMAX</span>.
            </p>
          </motion.div>
        </div>
      </div>

      {/* 🛍 E-COMMERCE MAIN LAYOUT */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col lg:flex-row gap-12">
          
          {/* LEFT SIDEBAR: FILTERS */}
          <div className="w-full lg:w-64 flex-shrink-0 space-y-10">
            {/* Search */}
            <div>
              <h3 className="text-white text-xs font-bold uppercase tracking-widest mb-4">Buscar</h3>
              <div className="relative group">
                <input 
                  type="text" 
                  placeholder="Ej: Aroma vainilla..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-brand-surface border border-white/10 rounded-xl px-4 py-3 pl-11 text-sm text-white focus:outline-none focus:border-brand-cyan transition-colors"
                />
                <svg className="w-4 h-4 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-brand-cyan transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {/* Categories */}
            <div>
              <h3 className="text-white text-xs font-bold uppercase tracking-widest mb-4 flex items-center justify-between">
                <span>Categorías</span>
                <span className="bg-white/5 text-gray-400 text-[9px] px-2 py-0.5 rounded-full">{categories.length}</span>
              </h3>
              <div className="flex flex-col gap-2">
                <button 
                  onClick={() => setSelectedCategory("ALL")}
                  className={`text-left px-4 py-3 rounded-xl text-sm transition-all flex items-center justify-between group ${
                    selectedCategory === "ALL" 
                      ? 'bg-brand-cyan/10 text-brand-cyan font-bold border border-brand-cyan/20' 
                      : 'text-gray-400 hover:bg-white/5 hover:text-white border border-transparent'
                  }`}
                >
                  Todas
                  {selectedCategory === "ALL" && <span className="w-1.5 h-1.5 rounded-full bg-brand-cyan"></span>}
                </button>
                
                {categories.map(cat => (
                  <button 
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`text-left px-4 py-3 rounded-xl text-sm transition-all flex items-center justify-between group ${
                      selectedCategory === cat 
                        ? 'bg-brand-cyan/10 text-brand-cyan font-bold border border-brand-cyan/20' 
                        : 'text-gray-400 hover:bg-white/5 hover:text-white border border-transparent'
                    }`}
                  >
                    {cat}
                    {selectedCategory === cat && <span className="w-1.5 h-1.5 rounded-full bg-brand-cyan"></span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Sorting */}
            <div>
              <h3 className="text-white text-xs font-bold uppercase tracking-widest mb-4">Ordenar Por</h3>
              <div className="relative">
                <select 
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full bg-brand-surface border border-white/10 rounded-xl px-4 py-3 text-sm text-white appearance-none focus:outline-none focus:border-brand-cyan transition-colors cursor-pointer"
                >
                  <option value="NEWEST">Más Recientes</option>
                  <option value="PRICE_ASC">Precio: Menor a Mayor</option>
                  <option value="PRICE_DESC">Precio: Mayor a Menor</option>
                </select>
                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-gray-500">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT SIDE: PRODUCT GRID */}
          <div className="flex-1">
            
            {/* Toolbar Top */}
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/5">
              <p className="text-sm text-gray-400 font-light">
                Mostrando <span className="text-white font-bold">{filteredProducts.length}</span> productos
              </p>
              <div className="hidden sm:flex gap-2">
                <button className="p-2 bg-brand-surface border border-white/10 rounded-lg text-white"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg></button>
                <button className="p-2 bg-transparent text-gray-500 hover:text-white transition-colors"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" /></svg></button>
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-32 space-y-4">
                <div className="w-12 h-12 border-4 border-brand-cyan/20 border-t-brand-cyan rounded-full animate-spin"></div>
                <p className="text-gray-500 text-xs font-bold uppercase tracking-widest animate-pulse">Cargando catálogo...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-32 bg-brand-surface/30 rounded-3xl border border-white/5 border-dashed">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">No hay resultados</h3>
                <p className="text-gray-400 text-sm max-w-md mx-auto">Prueba buscando con otras palabras o selecciona una categoría diferente.</p>
                <button onClick={() => {setSearchQuery(""); setSelectedCategory("ALL");}} className="mt-6 text-brand-cyan text-xs font-bold uppercase tracking-widest border border-brand-cyan/30 px-6 py-2 rounded-lg hover:bg-brand-cyan/10 transition-colors">Limpiar Filtros</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProducts.map((prod, i) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    key={prod.id} 
                  >
                    <Link href={`/tienda/${prod.id}`} className="block h-full group">
                      <div className="bg-brand-surface border border-white/5 rounded-2xl overflow-hidden transition-all duration-300 hover:border-brand-cyan/40 hover:shadow-[0_15px_40px_rgba(0,0,0,0.6)] hover:-translate-y-1 flex flex-col h-full relative">
                        
                        {/* Status Badges */}
                        <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
                          {prod.stock < 10 && prod.stock > 0 && (
                            <span className="bg-red-500 text-white text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full shadow-lg">
                              ¡Quedan {prod.stock}!
                            </span>
                          )}
                          {prod.variants && prod.variants.length > 0 && (
                            <span className="bg-brand-blue text-white text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full shadow-lg">
                              Multi-Opciones
                            </span>
                          )}
                        </div>

                        {/* Product Image */}
                        <div className="aspect-[4/5] sm:aspect-square bg-[#0a0a0a] relative overflow-hidden flex items-center justify-center p-6">
                          <div className="absolute inset-0 bg-[url('/mesh-bg.svg')] opacity-10 mix-blend-overlay"></div>
                          {prod.image ? (
                            <Image src={prod.image} alt={prod.name} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-contain p-6 filter drop-shadow-2xl transition-transform duration-700 group-hover:scale-110" />
                          ) : (
                            <svg className="w-16 h-16 text-white/5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                          )}
                          
                          {/* Hover Overlay Button */}
                          <div className="absolute inset-x-0 bottom-0 p-4 opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                            <div className="w-full bg-brand-cyan text-brand-pure text-xs font-bold uppercase tracking-widest py-3 rounded-lg text-center shadow-[0_0_20px_rgba(56,189,248,0.4)]">
                              Ver Detalles
                            </div>
                          </div>
                        </div>

                        {/* Product Info */}
                        <div className="p-5 flex flex-col flex-grow bg-gradient-to-b from-brand-surface to-black/40 border-t border-white/5">
                          <span className="text-[9px] text-gray-500 uppercase font-bold tracking-widest mb-1.5">
                            {prod.category?.name || "Sin Categoría"}
                          </span>
                          <h3 className="text-base font-bold text-white mb-2 leading-tight group-hover:text-brand-cyan transition-colors">{prod.name}</h3>
                          
                          <div className="mt-auto pt-4 flex items-end justify-between">
                            <div className="flex flex-col">
                              {prod.variants && prod.variants.length > 0 && (
                                <span className="text-[10px] text-gray-500 uppercase tracking-widest mb-0.5">Desde</span>
                              )}
                              <span className="text-xl font-bold text-white">
                                ${prod.price.toLocaleString('es-CL')}
                              </span>
                            </div>
                            
                            {/* Dummy rating stars for E-commerce feel */}
                            <div className="flex items-center gap-0.5 text-yellow-500/80">
                              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
