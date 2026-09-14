"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import {
  createProduct, updateProduct, deleteProduct, getProducts,
  getCategories, createCategory, deleteCategory, ProductPayload,
} from "@/actions/admin-store";
import { Screen, PageHead, AddBtn, GhostBtn, Sheet, Field, INPUT, CARD, Msg, Spinner, Empty, PrimaryBtn } from "@/components/admin/kit";

type Category = { id: string; name: string; _count?: { products: number } };
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
  const [categoryFormError, setCategoryFormError] = useState<string | null>(null);
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null);

  // Categoría del producto en edición + creación rápida sin salir del formulario
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [showInlineNewCategory, setShowInlineNewCategory] = useState(false);
  const [inlineCategoryName, setInlineCategoryName] = useState("");
  const [savingInlineCategory, setSavingInlineCategory] = useState(false);
  const [inlineCategoryError, setInlineCategoryError] = useState<string | null>(null);

  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [query, setQuery] = useState("");

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
      setSelectedCategoryId(prod.categoryId || "");
    } else {
      setEditingProduct(null);
      setVariants([]);
      setExistingImages([]);
      setSelectedCategoryId("");
    }
    setMessage(null);
    setShowInlineNewCategory(false);
    setInlineCategoryName("");
    setInlineCategoryError(null);
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
    if (showInlineNewCategory) {
      setMessage({ type: "error", text: "Termina de crear la categoría (o cancélala) antes de guardar." });
      return;
    }
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
    setCategoryFormError(null);
    const result = await createCategory(new FormData(e.currentTarget));
    if (result.success && result.category) {
      setCategories((prev) => [...prev, result.category!].sort((a, b) => a.name.localeCompare(b.name)));
      e.currentTarget.reset();
    } else {
      setCategoryFormError(result.error || "No se pudo crear la categoría.");
    }
    setSavingCategory(false);
  };

  const handleDeleteCategory = async (cat: Category) => {
    if (!confirm(`¿Eliminar la categoría "${cat.name}"? Solo se puede si no tiene productos.`)) return;
    setDeletingCategoryId(cat.id);
    const result = await deleteCategory(cat.id);
    if (result.success) {
      setCategories((prev) => prev.filter((c) => c.id !== cat.id));
    } else {
      alert(result.error);
    }
    setDeletingCategoryId(null);
  };

  /** Crear categoría sin salir del formulario de producto: la deja seleccionada al toque. */
  const handleAddCategoryInline = async () => {
    const name = inlineCategoryName.trim();
    if (!name) return;
    setSavingInlineCategory(true);
    setInlineCategoryError(null);
    const fd = new FormData();
    fd.set("name", name);
    const result = await createCategory(fd);
    if (result.success && result.category) {
      setCategories((prev) => [...prev, result.category!].sort((a, b) => a.name.localeCompare(b.name)));
      setSelectedCategoryId(result.category.id);
      setInlineCategoryName("");
      setShowInlineNewCategory(false);
    } else {
      setInlineCategoryError(result.error || "No se pudo crear la categoría.");
    }
    setSavingInlineCategory(false);
  };

  const filtered = query.trim()
    ? products.filter((p) => p.name.toLowerCase().includes(query.trim().toLowerCase()))
    : products;

  return (
    <Screen size="xl">
      <PageHead
        title="Productos"
        subtitle="Inventario, variantes e imágenes de la tienda."
        action={<AddBtn label="Producto" onClick={() => openForm()} />}
      />

      <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar producto…"
          className={`${INPUT} sm:max-w-xs`}
        />
        <GhostBtn
          onClick={() => { setCategoryFormError(null); setShowCategoryForm(true); }}
          className="h-11 sm:h-9 text-xs shrink-0"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
          </svg>
          Categorías ({categories.length})
        </GhostBtn>
      </div>

      {loading ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <Empty>{products.length === 0 ? "Sin productos." : "Sin resultados para esa búsqueda."}</Empty>
      ) : (
        <>
          {/* Escritorio: listado tipo tabla (denso, tipo Shopify) */}
          <div className="hidden md:block rounded-2xl border border-white/8 overflow-hidden">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-white/[0.03] text-left text-[11px] uppercase tracking-wider text-gray-500">
                  <th className="py-3 pl-4 pr-3 font-semibold">Producto</th>
                  <th className="py-3 px-3 font-semibold">Categoría</th>
                  <th className="py-3 px-3 font-semibold text-right">Precio</th>
                  <th className="py-3 px-3 font-semibold text-right">Stock</th>
                  <th className="py-3 px-3 font-semibold">Estado</th>
                  <th className="py-3 pl-3 pr-4 font-semibold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/6">
                {filtered.map((prod) => (
                  <tr key={prod.id} className={`hover:bg-white/[0.025] transition-colors ${prod.isActive ? "" : "opacity-50"}`}>
                    <td className="py-2.5 pl-4 pr-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-11 h-11 rounded-lg overflow-hidden bg-black/40 shrink-0 relative">
                          {prod.image ? (
                            <Image src={prod.image} alt={prod.name} fill sizes="44px" className="object-cover" />
                          ) : (
                            <span className="absolute inset-0 grid place-items-center text-[9px] text-gray-600">—</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-white truncate">{prod.name}</div>
                          {prod.variants?.length > 0 && (
                            <div className="text-[11px] text-gray-500">{prod.variants.length} variantes</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-gray-400">{prod.category?.name || "—"}</td>
                    <td className="py-2.5 px-3 text-right text-white font-medium tabular-nums">
                      ${prod.price.toLocaleString("es-CL")}
                    </td>
                    <td className={`py-2.5 px-3 text-right tabular-nums font-medium ${prod.stock > 0 ? "text-green-400" : "text-red-400"}`}>
                      {prod.stock}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${prod.isActive ? "bg-green-500/15 text-green-400" : "bg-white/8 text-gray-400"}`}>
                        {prod.isActive ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="py-2.5 pl-3 pr-4 text-right whitespace-nowrap">
                      <button onClick={() => openForm(prod)} className="text-xs font-bold px-3 py-1.5 rounded-lg border border-brand-cyan/25 text-brand-cyan mr-2">Editar</button>
                      {prod.isActive && (
                        <button onClick={() => { if (confirm("¿Dar de baja este producto?")) deleteProduct(prod.id).then(fetchData); }} className="text-xs font-bold px-3 py-1.5 rounded-lg border border-red-500/25 text-red-400">Dar de baja</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Móvil: tarjetas */}
          <ul className="md:hidden space-y-3">
            {filtered.map((prod) => (
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
        </>
      )}

      {/* Sheet: categorías */}
      <Sheet open={showCategoryForm} onClose={() => setShowCategoryForm(false)} title="Categorías de la tienda">
        <form onSubmit={handleCategorySubmit} className="space-y-3">
          <Field label="Nueva categoría">
            <div className="flex gap-2">
              <input
                type="text"
                name="name"
                required
                placeholder="Ej. Aceites y lubricantes"
                className={`${INPUT} flex-1`}
              />
              <button
                disabled={savingCategory}
                type="submit"
                className="h-[46px] px-5 rounded-xl bg-brand-cyan text-brand-pure text-sm font-bold shrink-0 disabled:opacity-50"
              >
                {savingCategory ? "…" : "Agregar"}
              </button>
            </div>
          </Field>
          {categoryFormError && <Msg kind="err">{categoryFormError}</Msg>}
        </form>

        <div className="mt-5 pt-4 border-t border-white/8">
          <div className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-2">
            {categories.length} {categories.length === 1 ? "categoría" : "categorías"}
          </div>
          {categories.length === 0 ? (
            <p className="text-sm text-gray-500 py-4">Aún no hay categorías. Crea la primera arriba.</p>
          ) : (
            <ul className="divide-y divide-white/6 -mx-1">
              {categories.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 px-1 py-2.5">
                  <div className="min-w-0">
                    <div className="text-white font-medium truncate">{c.name}</div>
                    <div className="text-[11px] text-gray-500">
                      {c._count?.products ?? 0} {c._count?.products === 1 ? "producto" : "productos"}
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={deletingCategoryId === c.id}
                    onClick={() => handleDeleteCategory(c)}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg border border-red-500/25 text-red-400 shrink-0 disabled:opacity-50"
                  >
                    {deletingCategoryId === c.id ? "…" : "Eliminar"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Sheet>

      {/* Sheet: producto */}
      <Sheet open={showForm} onClose={() => { setShowForm(false); setEditingProduct(null); }} title={editingProduct ? `Editar: ${editingProduct.name}` : "Nuevo producto"}>
        <form onSubmit={handleProductSubmit} className="space-y-4">
          <Field label="Nombre">
            <input type="text" name="name" required defaultValue={editingProduct?.name || ""} className={INPUT} />
          </Field>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Categoría</label>
              <button
                type="button"
                onClick={() => { setShowInlineNewCategory((v) => !v); setInlineCategoryError(null); }}
                className="text-brand-cyan text-xs font-bold"
              >
                {showInlineNewCategory ? "Cancelar" : "+ Nueva categoría"}
              </button>
            </div>

            {showInlineNewCategory ? (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    autoFocus
                    value={inlineCategoryName}
                    onChange={(e) => setInlineCategoryName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { e.preventDefault(); handleAddCategoryInline(); }
                    }}
                    placeholder="Nombre de la categoría"
                    className={`${INPUT} flex-1`}
                  />
                  <button
                    type="button"
                    disabled={savingInlineCategory || !inlineCategoryName.trim()}
                    onClick={handleAddCategoryInline}
                    className="h-[46px] px-4 rounded-xl bg-brand-cyan text-brand-pure text-sm font-bold shrink-0 disabled:opacity-50"
                  >
                    {savingInlineCategory ? "…" : "Crear"}
                  </button>
                </div>
                {inlineCategoryError && <Msg kind="err">{inlineCategoryError}</Msg>}
              </div>
            ) : (
              <select
                name="categoryId"
                required
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                className={INPUT}
              >
                <option value="" disabled>Seleccionar…</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
          </div>
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
