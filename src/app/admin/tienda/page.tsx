"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import {
  createProduct, updateProduct, deleteProduct, getProducts,
  getCategories, createCategory, deleteCategory, ProductPayload
} from "@/actions/admin-store";
import { motion, AnimatePresence } from "framer-motion";

type Category = { id: string; name: string; };
type Variant = { id?: string; name: string; price: number | null; stock: number; };
type ProductImage = { id: string; url: string; };

type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  categoryId: string | null;
  category?: Category | null;
  image: string | null;
  images: ProductImage[];
  variants: Variant[];
  isActive: boolean;
};

export default function TiendaPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Product Form State
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  // Dynamic Arrays for Form
  const [variants, setVariants] = useState<Variant[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  
  // Category Form State
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [savingCategory, setSavingCategory] = useState(false);

  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchData = async () => {
    setLoading(true);
    const [prods, cats] = await Promise.all([getProducts(), getCategories()]);
    setProducts(prods as Product[]);
    setCategories(cats);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openForm = (prod?: Product) => {
    if (prod) {
      setEditingProduct(prod);
      setVariants(prod.variants || []);
      setExistingImages(prod.images?.map(i => i.url) || []);
    } else {
      setEditingProduct(null);
      setVariants([]);
      setExistingImages([]);
    }
    setShowForm(true);
    window.scrollTo(0,0);
  };

  const uploadFileToR2 = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData
    });
    
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || "Fallo al subir archivo");
    
    return data.publicUrl;
  };

  const handleProductSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    const form = e.currentTarget;
    const formData = new FormData(form);
    
    let mainImageUrl = editingProduct?.image || "";
    let additionalImageUrls = [...existingImages];

    try {
      setMessage({ type: "success", text: "Procesando imágenes..." });
      
      // Upload Thumbnail
      const mainInput = form.querySelector<HTMLInputElement>('input[name="mainImage"]');
      if (mainInput?.files?.length) {
        mainImageUrl = await uploadFileToR2(mainInput.files[0]);
      }

      // Upload Additional Images
      const additionalInput = form.querySelector<HTMLInputElement>('input[name="additionalImages"]');
      if (additionalInput?.files?.length) {
        for (let i = 0; i < additionalInput.files.length; i++) {
          const url = await uploadFileToR2(additionalInput.files[i]);
          additionalImageUrls.push(url);
        }
      }

      setMessage({ type: "success", text: "Guardando datos en la base de datos..." });
      
      const payload: ProductPayload = {
        name: formData.get("name") as string,
        description: formData.get("description") as string,
        categoryId: formData.get("categoryId") as string,
        price: parseInt(formData.get("price") as string) || 0,
        stock: parseInt(formData.get("stock") as string) || 0,
        image: mainImageUrl,
        images: additionalImageUrls,
        variants: variants
      };

      let result;
      if (editingProduct) {
        result = await updateProduct(editingProduct.id, payload);
      } else {
        result = await createProduct(payload);
      }
      
      if (result.success) {
        setMessage({ type: "success", text: editingProduct ? "Producto actualizado correctamente." : "Producto agregado correctamente." });
        fetchData();
        setTimeout(() => {
          setShowForm(false);
          setEditingProduct(null);
          setMessage(null);
        }, 2000);
      } else {
        setMessage({ type: "error", text: result.error || "Error al procesar en la BD." });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: "Error: " + err.message });
    }
    setSaving(false);
  };

  const handleCategorySubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSavingCategory(true);
    const result = await createCategory(new FormData(e.currentTarget));
    if (result.success) { fetchData(); setShowCategoryForm(false); }
    else alert(result.error);
    setSavingCategory(false);
  };

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-12">
      <div className="border-b border-white/10 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-3xl font-bold text-white uppercase tracking-widest italic">Gestión de <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-cyan to-green-400">Tienda</span></h2>
          <p className="text-gray-400 text-sm mt-2">Inventario, Variantes e Imágenes 360.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          <button onClick={() => setShowCategoryForm(!showCategoryForm)} className="w-full sm:w-auto border border-brand-cyan text-brand-cyan hover:bg-brand-cyan/10 font-bold uppercase tracking-widest text-xs px-6 py-3 rounded-lg transition-colors">
            {showCategoryForm ? "✕" : "✚ Categoría"}
          </button>
          <button onClick={() => openForm()} className="w-full sm:w-auto bg-brand-cyan text-brand-pure font-bold uppercase tracking-widest text-xs px-6 py-3 rounded-lg hover:bg-white transition-colors shadow-[0_0_20px_rgba(56,189,248,0.2)]">
            {showForm ? "✕ Cancelar" : "✚ Producto Nuevo"}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showCategoryForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
             <div className="bg-brand-surface border border-white/10 rounded-2xl p-6 mb-8 flex flex-col md:flex-row gap-8">
              <div className="flex-1 border-b md:border-b-0 md:border-r border-white/5 pb-6 md:pb-0 md:pr-8">
                <h4 className="text-white text-sm font-bold uppercase tracking-widest mb-4">Nueva Categoría</h4>
                <form onSubmit={handleCategorySubmit} className="flex gap-4">
                  <input type="text" name="name" required placeholder="Nombre" className="flex-1 bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-brand-cyan" />
                  <button disabled={savingCategory} type="submit" className="bg-white/10 text-white px-6 rounded-lg text-xs font-bold uppercase tracking-widest">Guardar</button>
                </form>
              </div>
              <div className="flex-1">
                <h4 className="text-white text-sm font-bold uppercase tracking-widest mb-4">Categorías</h4>
                <div className="flex flex-wrap gap-2">
                  {categories.map(c => (
                    <span key={c.id} className="bg-black/50 border border-white/5 px-3 py-1 rounded-full text-xs text-gray-300 flex items-center gap-2">
                      {c.name}
                      <button type="button" onClick={() => deleteCategory(c.id).then(fetchData)} className="text-red-400 ml-2">×</button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="bg-gradient-to-b from-brand-surface to-brand-pure border border-brand-cyan/30 rounded-2xl p-6 sm:p-8 relative shadow-[0_0_30px_rgba(56,189,248,0.1)] mb-8">
              <h3 className="text-brand-cyan text-sm uppercase tracking-widest font-bold mb-6 flex items-center gap-2">
                {editingProduct ? `Editando: ${editingProduct.name}` : "Agregar Producto"}
              </h3>
              
              <form onSubmit={handleProductSubmit} className="space-y-8">
                {/* INFO BÁSICA */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-gray-400 text-xs uppercase tracking-widest font-bold mb-2">Nombre</label>
                    <input type="text" name="name" required defaultValue={editingProduct?.name || ""} className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-brand-cyan" />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-xs uppercase tracking-widest font-bold mb-2">Categoría</label>
                    <select name="categoryId" required defaultValue={editingProduct?.categoryId || ""} className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white appearance-none focus:outline-none focus:border-brand-cyan">
                      <option value="" disabled>Seleccione...</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-gray-400 text-xs uppercase tracking-widest font-bold mb-2">Precio Base ($)</label>
                    <input type="number" name="price" required defaultValue={editingProduct?.price || ""} className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-brand-cyan" />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-xs uppercase tracking-widest font-bold mb-2">Stock General</label>
                    <input type="number" name="stock" required defaultValue={editingProduct?.stock || 0} className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-brand-cyan" />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-400 text-xs uppercase tracking-widest font-bold mb-2">Descripción</label>
                  <textarea name="description" rows={3} defaultValue={editingProduct?.description || ""} className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-brand-cyan"></textarea>
                </div>

                {/* IMÁGENES */}
                <div className="p-6 border border-white/5 bg-black/20 rounded-xl space-y-6">
                  <h4 className="text-white text-sm font-bold uppercase tracking-widest border-b border-white/5 pb-2">Imágenes (Cloudflare R2)</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <label className="block text-gray-400 text-xs uppercase tracking-widest font-bold mb-2">Thumbnail Principal</label>
                      {editingProduct?.image && (
                        <div className="relative mb-4 w-24 h-24 rounded-lg overflow-hidden border border-white/10">
                          <Image src={editingProduct.image} alt="Main" fill sizes="96px" className="object-cover" />
                        </div>
                      )}
                      <input type="file" name="mainImage" accept="image/*" className="text-xs text-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-brand-cyan file:text-black cursor-pointer" />
                    </div>

                    <div>
                      <label className="block text-gray-400 text-xs uppercase tracking-widest font-bold mb-2">Galería Adicional (Multi)</label>
                      <input type="file" name="additionalImages" multiple accept="image/*" className="mb-4 text-xs text-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-white/10 file:text-white cursor-pointer" />
                      
                      {existingImages.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {existingImages.map((img, i) => (
                            <div key={i} className="relative w-16 h-16 rounded-md overflow-hidden group">
                              <Image src={img} alt="Gal" fill sizes="64px" className="object-cover" />
                              <button type="button" onClick={() => setExistingImages(prev => prev.filter((_, idx) => idx !== i))} className="absolute inset-0 bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 text-xs">Borrar</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* VARIANTES */}
                <div className="p-6 border border-white/5 bg-black/20 rounded-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <h4 className="text-white text-sm font-bold uppercase tracking-widest">Variantes (Tamaños, Olores, etc)</h4>
                    <button type="button" onClick={() => setVariants([...variants, { name: "", price: 0, stock: 0 }])} className="text-brand-cyan text-xs font-bold uppercase hover:text-white">+ Añadir Variante</button>
                  </div>
                  
                  {variants.map((v, idx) => (
                    <div key={idx} className="flex flex-col md:flex-row gap-4 items-start md:items-end bg-black/40 p-4 rounded-lg border border-white/5">
                      <div className="flex-1 w-full">
                        <label className="block text-gray-500 text-[10px] uppercase font-bold mb-1">Nombre (Ej: 1 Litro)</label>
                        <input type="text" required value={v.name} onChange={e => { const newV = [...variants]; newV[idx].name = e.target.value; setVariants(newV); }} className="w-full bg-transparent border-b border-white/20 text-white py-1 focus:outline-none focus:border-brand-cyan" />
                      </div>
                      <div className="w-full md:w-32">
                        <label className="block text-gray-500 text-[10px] uppercase font-bold mb-1">Precio Específico</label>
                        <input type="number" value={v.price || ""} onChange={e => { const newV = [...variants]; newV[idx].price = parseInt(e.target.value) || 0; setVariants(newV); }} className="w-full bg-transparent border-b border-white/20 text-white py-1 focus:outline-none focus:border-brand-cyan" />
                      </div>
                      <div className="w-full md:w-24">
                        <label className="block text-gray-500 text-[10px] uppercase font-bold mb-1">Stock</label>
                        <input type="number" required value={v.stock} onChange={e => { const newV = [...variants]; newV[idx].stock = parseInt(e.target.value) || 0; setVariants(newV); }} className="w-full bg-transparent border-b border-white/20 text-white py-1 focus:outline-none focus:border-brand-cyan" />
                      </div>
                      <button type="button" onClick={() => setVariants(variants.filter((_, i) => i !== idx))} className="w-full md:w-auto text-red-400 hover:text-red-300 px-3 py-2 md:py-1 bg-red-500/10 rounded mt-2 md:mt-0 font-bold uppercase text-xs md:text-sm">✕ Borrar</button>
                    </div>
                  ))}
                  {variants.length === 0 && <p className="text-xs text-gray-500 italic">No hay variantes configuradas. Se usará el precio y stock base.</p>}
                </div>

                {message && (
                  <div className={`p-4 rounded-lg text-sm font-bold flex items-center justify-center gap-2 ${message.type === 'success' ? 'bg-brand-cyan/20 text-brand-cyan' : 'bg-red-500/20 text-red-400'}`}>
                    {message.text}
                  </div>
                )}

                <div className="flex justify-end">
                  <button disabled={saving} type="submit" className="bg-brand-cyan text-brand-pure font-bold uppercase tracking-widest text-sm px-10 py-4 rounded-lg hover:bg-white transition-colors disabled:opacity-50">
                    {saving ? "Procesando..." : "Guardar Producto"}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* GRILLA DE PRODUCTOS */}
      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-brand-cyan border-t-transparent rounded-full animate-spin"></div></div>
      ) : products.length === 0 ? (
        <div className="text-center py-20 bg-white/5 rounded-2xl border border-white/10 border-dashed">
          <p className="text-gray-400 text-sm">Sin productos.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {products.map((prod) => (
            <div key={prod.id} className={`bg-brand-surface/80 border ${prod.isActive ? 'border-white/10 hover:border-brand-cyan/50' : 'border-red-500/30 opacity-50'} rounded-2xl p-4 transition-colors group flex flex-col md:flex-row items-center gap-6`}>
              <div className="w-full md:w-32 h-32 rounded-xl overflow-hidden bg-black/50 flex-shrink-0 flex items-center justify-center border border-white/5 relative">
                {prod.image ? <Image src={prod.image} alt={prod.name} fill sizes="128px" className="object-cover opacity-80" /> : <span className="text-xs text-gray-500 uppercase tracking-widest">Sin Img</span>}
              </div>
              <div className="flex-grow text-center md:text-left">
                <span className="text-[10px] text-brand-cyan uppercase font-bold tracking-widest px-3 py-1 rounded-full border border-brand-cyan/20 bg-brand-cyan/10 mb-2 inline-block">
                  {prod.category?.name || "Sin Categoría"}
                </span>
                <h4 className="text-lg font-bold text-white uppercase tracking-wider">{prod.name}</h4>
                {prod.variants?.length > 0 && (
                  <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-widest">{prod.variants.length} Variantes</p>
                )}
              </div>
              <div className="flex items-center gap-8 px-4 border-y md:border-y-0 md:border-l border-white/10 py-4 md:py-0">
                <div className="text-center md:text-right">
                  <div className="text-[9px] text-gray-500 uppercase tracking-widest mb-1">Precio Base</div>
                  <div className="text-white font-bold text-lg">${prod.price.toLocaleString('es-CL')}</div>
                </div>
                <div className="text-center md:text-right">
                  <div className="text-[9px] text-gray-500 uppercase tracking-widest mb-1">Stock Gral</div>
                  <div className={`font-bold text-lg ${prod.stock > 0 ? 'text-green-400' : 'text-red-400'}`}>{prod.stock}</div>
                </div>
              </div>
              <div className="flex md:flex-col gap-2 w-full md:w-32 flex-shrink-0">
                <button onClick={() => openForm(prod)} className="flex-1 md:w-full text-brand-cyan hover:text-white hover:bg-brand-cyan/20 text-[10px] uppercase font-bold tracking-widest border border-brand-cyan/20 py-3 md:py-2 rounded-lg transition-colors">Editar</button>
                {prod.isActive && (
                  <button onClick={() => { if(confirm("¿Desactivar?")) deleteProduct(prod.id).then(fetchData); }} className="flex-1 md:w-full text-red-400 hover:text-white hover:bg-red-500/20 text-[10px] uppercase font-bold tracking-widest border border-red-500/20 py-3 md:py-2 rounded-lg transition-colors">Bajar</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
