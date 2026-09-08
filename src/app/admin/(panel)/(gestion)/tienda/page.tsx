"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import {
  createProduct, updateProduct, deleteProduct, getProducts,
  getCategories, createCategory, deleteCategory, ProductPayload,
} from "@/actions/admin-store";
import { Screen, PageHead, AddBtn, GhostBtn, Sheet, Field, INPUT, CARD, Msg, Spinner, Empty, PrimaryBtn } from "@/components/admin/kit";

type Category = { id: string; name: string };
type Variant = { id?: string; name: string; price: number | null; stock: number };
type ProductImage = { id: string; url: string };
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

  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);

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

  useEffect(() => { fetchData(); }, []);

  const openForm = (prod?: Product) => {
    if (prod) {
      setEditingProduct(prod);
      setVariants(prod.variants || []);
      setExistingImages(prod.images?.map((i) => i.url) || []);
    } else {
      setEditingProduct(null);
      setVariants([]);
      setExistingImages([]);
    }
    setMessage(null);
    setShowForm(true);
  };

  const uploadFileToR2 = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: formData });
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
    const additionalImageUrls = [...existingImages];
    try {
      const mainInput = form.querySelector<HTMLInputElement>('input[name="mainImage"]');
      if (mainInput?.files?.length) mainImageUrl = await uploadFileToR2(mainInput.files[0]);
      const additionalInput = form.querySelector<HTMLInputElement>('input[name="additionalImages"]');
      if (additionalInput?.files?.length) {
        for (let i = 0; i < additionalInput.files.length; i++) {
          additionalImageUrls.push(await uploadFileToR2(additionalInput.files[i]));
        }
      }
      const payload: ProductPayload = {
        name: formData.get("name") as string,
        description: formData.get("description") as string,
        categoryId: formData.get("categoryId") as string,
        price: parseInt(formData.get("price") as string) || 0,
        stock: parseInt(formData.get("stock") as string) || 0,
        image: mainImageUrl,
        images: additionalImageUrls,
        variants,
      };
      const result = editingProduct
        ? await updateProduct(editingProduct.id, payload)
        : await createProduct(payload);
      if (result.success) {
        await fetchData();
        setShowForm(false);
        setEditingProduct(null);
      } else {
        setMessage({ type: "error", text: result.error || "Error al guardar." });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Error: " + (err as Error).message });
    }
    setSaving(false);
  };

  const handleCategorySubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSavingCategory(true);
    const result = await createCategory(new FormData(e.currentTarget));
    if (result.success) { await fetchData(); e.currentTarget.reset(); }
    else alert(result.error);
    setSavingCategory(false);
  };

  return (
    <Screen size="lg">
      <PageHead
        title="Productos"
        subtitle="Inventario, variantes e imágenes de la tienda."
        action={<AddBtn label="Producto" onClick={() => openForm()} />}
      />

      <GhostBtn onClick={() => setShowCategoryForm(true)} className="h-9 text-xs">
        Gestionar categorías ({categories.length})
      </GhostBtn>

      {loading ? (
        <Spinner />
      ) : products.length === 0 ? (
        <Empty>Sin productos.</Empty>
      ) : (
        <ul className="space-y-3">
          {products.map((prod) => (
            <li key={prod.id} className={`${CARD} ${prod.isActive ? "" : "opacity-55"} flex gap-3`}>
              <div className="w-20 h-20 rounded-xl overflow-hidden bg-black/40 shrink-0 relative">
                {prod.image ? (
                  <Image src={prod.image} alt={prod.name} fill sizes="80px" className="object-cover" />
                ) : (
                  <span className="absolute inset-0 grid place-items-center text-[10px] text-gray-600">Sin foto</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] text-brand-cyan font-bold uppercase tracking-wider">
                  {prod.category?.name || "Sin categoría"}
                </div>
                <div className="font-bold text-white truncate">{prod.name}</div>
                <div className="text-sm text-gray-400">
                  ${prod.price.toLocaleString("es-CL")} ·{" "}
                  <span className={prod.stock > 0 ? "text-green-400" : "text-red-400"}>stock {prod.stock}</span>
                  {prod.variants?.length > 0 && ` · ${prod.variants.length} variantes`}
                </div>
                <div className="mt-2 flex gap-2">
                  <button onClick={() => openForm(prod)} className="text-xs font-bold px-3 py-1.5 rounded-lg border border-brand-cyan/25 text-brand-cyan">Editar</button>
                  {prod.isActive && (
                    <button onClick={() => { if (confirm("¿Dar de baja este producto?")) deleteProduct(prod.id).then(fetchData); }} className="text-xs font-bold px-3 py-1.5 rounded-lg border border-red-500/25 text-red-400">Dar de baja</button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Sheet: categorías */}
      <Sheet open={showCategoryForm} onClose={() => setShowCategoryForm(false)} title="Categorías de la tienda">
        <form onSubmit={handleCategorySubmit} className="flex gap-2">
          <input type="text" name="name" required placeholder="Nueva categoría" className={INPUT} />
          <button disabled={savingCategory} type="submit" className="h-11 px-4 rounded-xl bg-white/10 text-white text-sm font-bold shrink-0">Agregar</button>
        </form>
        <div className="mt-4 flex flex-wrap gap-2">
          {categories.map((c) => (
            <span key={c.id} className="bg-white/5 border border-white/8 px-3 py-1.5 rounded-full text-xs text-gray-300 flex items-center gap-2">
              {c.name}
              <button type="button" onClick={() => deleteCategory(c.id).then(fetchData)} className="text-red-400 text-sm leading-none">×</button>
            </span>
          ))}
        </div>
      </Sheet>

      {/* Sheet: producto */}
      <Sheet open={showForm} onClose={() => { setShowForm(false); setEditingProduct(null); }} title={editingProduct ? `Editar: ${editingProduct.name}` : "Nuevo producto"}>
        <form onSubmit={handleProductSubmit} className="space-y-4">
          <Field label="Nombre">
            <input type="text" name="name" required defaultValue={editingProduct?.name || ""} className={INPUT} />
          </Field>
          <Field label="Categoría">
            <select name="categoryId" required defaultValue={editingProduct?.categoryId || ""} className={INPUT}>
              <option value="" disabled>Seleccionar…</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Precio base ($)">
              <input type="number" name="price" required defaultValue={editingProduct?.price || ""} className={INPUT} />
            </Field>
            <Field label="Stock general">
              <input type="number" name="stock" required defaultValue={editingProduct?.stock ?? 0} className={INPUT} />
            </Field>
          </div>
          <Field label="Descripción">
            <textarea name="description" rows={3} defaultValue={editingProduct?.description || ""} className={INPUT} />
          </Field>

          <Field label="Foto principal">
            {editingProduct?.image && (
              <img src={editingProduct.image} alt="" className="w-20 h-20 object-cover rounded-lg mb-2" />
            )}
            <input type="file" name="mainImage" accept="image/*" className="w-full text-xs text-white file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-brand-cyan file:text-black" />
          </Field>

          <Field label="Galería adicional">
            <input type="file" name="additionalImages" multiple accept="image/*" className="w-full text-xs text-white file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-white/10 file:text-white" />
            {existingImages.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {existingImages.map((img, i) => (
                  <div key={i} className="relative w-14 h-14 rounded-lg overflow-hidden">
                    <Image src={img} alt="" fill sizes="56px" className="object-cover" />
                    <button type="button" onClick={() => setExistingImages((p) => p.filter((_, idx) => idx !== i))} className="absolute inset-0 bg-red-500/80 text-white text-[10px] font-bold opacity-0 hover:opacity-100 grid place-items-center">Quitar</button>
                  </div>
                ))}
              </div>
            )}
          </Field>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Variantes</span>
              <button type="button" onClick={() => setVariants([...variants, { name: "", price: 0, stock: 0 }])} className="text-brand-cyan text-xs font-bold">+ Añadir</button>
            </div>
            {variants.length === 0 ? (
              <p className="text-[11px] text-gray-600">Sin variantes: se usa precio y stock base.</p>
            ) : (
              <div className="space-y-2">
                {variants.map((v, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_5rem_4rem_auto] gap-2 items-center">
                    <input type="text" required value={v.name} onChange={(e) => { const n = [...variants]; n[idx].name = e.target.value; setVariants(n); }} placeholder="1 Litro" className={`${INPUT} py-2`} />
                    <input type="number" value={v.price ?? ""} onChange={(e) => { const n = [...variants]; n[idx].price = parseInt(e.target.value) || 0; setVariants(n); }} placeholder="$" className={`${INPUT} py-2`} />
                    <input type="number" required value={v.stock} onChange={(e) => { const n = [...variants]; n[idx].stock = parseInt(e.target.value) || 0; setVariants(n); }} placeholder="stk" className={`${INPUT} py-2`} />
                    <button type="button" onClick={() => setVariants(variants.filter((_, i) => i !== idx))} className="text-red-400 px-2">×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {message && <Msg kind={message.type === "success" ? "ok" : "err"}>{message.text}</Msg>}
          <PrimaryBtn type="submit" disabled={saving} className="w-full">
            {saving ? "Guardando…" : "Guardar producto"}
          </PrimaryBtn>
        </form>
      </Sheet>
    </Screen>
  );
}
