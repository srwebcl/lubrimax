"use client";

import React, { useState, useEffect } from "react";
import { getAdminCategories, createCategory, updateCategory, deleteCategory } from "@/actions/admin-categories";
import { motion, AnimatePresence } from "framer-motion";
import { ServiceCategory } from "@prisma/client";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ServiceCategory | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const formRef = React.useRef<HTMLDivElement>(null);

  const fetchCategories = async () => {
    setLoading(true);
    const data = await getAdminCategories();
    setCategories(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchCategories();
  }, []);

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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    
    const form = e.currentTarget;
    const formData = new FormData(form);
    
    try {
      // Handle image upload if a file was selected
      const imageInput = form.querySelector<HTMLInputElement>('input[name="imageFile"]');
      if (imageInput?.files?.length) {
        setMessage({ type: "success", text: "Subiendo imagen..." });
        const imageUrl = await uploadFileToR2(imageInput.files[0]);
        formData.set("image", imageUrl); // overwrite with uploaded URL
      }

      setMessage({ type: "success", text: "Guardando categoría..." });
    
    let result;
    if (editingCategory) {
      result = await updateCategory(editingCategory.id, formData);
    } else {
      result = await createCategory(formData);
    }
    
      if (result.success) {
        setMessage({ type: "success", text: editingCategory ? "Categoría actualizada exitosamente." : "Categoría creada exitosamente." });
        fetchCategories();
        setTimeout(() => {
          setShowForm(false);
          setEditingCategory(null);
          setMessage(null);
        }, 2000);
      } else {
        setMessage({ type: "error", text: result.error || "Error al procesar la solicitud." });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: "Error: " + err.message });
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar esta categoría? Solo será posible si no tiene servicios asociados.")) return;
    
    const result = await deleteCategory(id);
    if (result.success) {
      fetchCategories();
    } else {
      alert(result.error);
    }
  };

  const handleEdit = (cat: ServiceCategory) => {
    setEditingCategory(cat);
    setShowForm(true);
    setMessage(null);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingCategory(null);
    setMessage(null);
  };

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto">
      {/* HEADER */}
      <div className="mb-8 border-b border-white/10 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-3xl font-bold text-white uppercase tracking-widest italic">Categorías <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-blue to-brand-cyan">de Servicios</span></h2>
          <p className="text-gray-400 text-sm mt-2">Agrupa tus servicios, sube imágenes representativas y configura colores.</p>
        </div>
        <button 
          onClick={() => showForm ? handleCancelForm() : setShowForm(true)}
          className="w-full md:w-auto bg-brand-cyan text-brand-pure font-bold uppercase tracking-widest text-xs px-6 py-3 rounded-lg hover:bg-white transition-colors shadow-[0_0_20px_rgba(56,189,248,0.2)] whitespace-nowrap"
        >
          {showForm ? "✕ Cancelar" : "➕ Nueva Categoría"}
        </button>
      </div>

      {/* FORMULARIO DESPLEGABLE */}
      <AnimatePresence>
        {showForm && (
          <motion.div 
            ref={formRef}
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: "auto", marginBottom: 32 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-gradient-to-b from-brand-surface to-brand-pure border border-brand-cyan/30 rounded-2xl p-6 sm:p-8 relative shadow-[0_0_30px_rgba(56,189,248,0.1)]">
              <h3 className="text-brand-cyan text-sm uppercase tracking-widest font-bold mb-6 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                {editingCategory ? `Editando: ${editingCategory.name}` : "Configurar Nueva Categoría"}
              </h3>
              
              <form key={editingCategory ? editingCategory.id : "new"} onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-gray-400 text-xs uppercase tracking-widest font-bold mb-2">Nombre de la Categoría</label>
                    <input type="text" name="name" required defaultValue={editingCategory?.name || ""} placeholder="Ej. Detailing Avanzado" className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan transition-all" />
                  </div>

                  <div>
                    <label className="block text-gray-400 text-xs uppercase tracking-widest font-bold mb-2">Imagen de Portada (Subir Archivo o URL)</label>
                    <div className="space-y-3">
                      {editingCategory?.image && (
                        <div className="w-full h-24 relative rounded-lg overflow-hidden border border-white/10 bg-black/50">
                          <img src={editingCategory.image} alt="Preview" className="w-full h-full object-cover opacity-70" />
                        </div>
                      )}
                      <input type="file" name="imageFile" accept="image/*" className="w-full text-xs text-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-brand-cyan file:text-black cursor-pointer" />
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 text-[10px] uppercase font-bold">O ingresar URL:</span>
                        <input type="text" name="image" defaultValue={editingCategory?.image || ""} placeholder="Ej. /images/detailing.jpeg" className="flex-1 bg-black/50 border border-white/10 rounded px-2 py-1 text-white text-xs placeholder-gray-600 focus:outline-none focus:border-brand-cyan" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-gray-400 text-xs uppercase tracking-widest font-bold mb-2">Clases de Color (Opcional)</label>
                    <input type="text" name="color" defaultValue={editingCategory?.color || ""} placeholder="Ej. from-blue-500 to-brand-cyan" className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan transition-all" />
                  </div>

                  <div className="flex items-center pt-8">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" name="isActive" value="true" defaultChecked={editingCategory ? editingCategory.isActive : true} className="w-5 h-5 bg-black/50 border-white/10 text-brand-cyan focus:ring-brand-cyan rounded transition-all" />
                      <span className="text-gray-300 text-sm font-bold uppercase tracking-widest">Activo (Visible en web)</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-gray-400 text-xs uppercase tracking-widest font-bold mb-2">Descripción Breve</label>
                  <textarea name="description" rows={2} defaultValue={editingCategory?.description || ""} placeholder="Descripción que aparecerá en el Home..." className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan transition-all"></textarea>
                </div>

                {message && (
                  <div className={`p-4 rounded-lg text-sm font-bold border flex items-center justify-center gap-2 ${message.type === 'success' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                    {message.type === 'success' ? '✓' : '⚠'} {message.text}
                  </div>
                )}

                <div className="flex flex-col-reverse sm:flex-row justify-end pt-4 gap-4">
                  <button type="button" onClick={handleCancelForm} className="w-full sm:w-auto text-gray-400 font-bold uppercase tracking-widest text-sm px-6 py-4 hover:text-white transition-colors">
                    Cancelar
                  </button>
                  <button disabled={saving} type="submit" className="w-full sm:w-auto bg-brand-cyan text-brand-pure font-bold uppercase tracking-widest text-sm px-10 py-4 rounded-lg hover:bg-white transition-colors disabled:opacity-50">
                    {saving ? "Guardando..." : (editingCategory ? "Actualizar Categoría" : "Crear Categoría")}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LISTADO DE CATEGORÍAS */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-brand-cyan border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : categories.length === 0 ? (
        <div className="text-center py-20 bg-white/5 rounded-2xl border border-white/10 border-dashed">
          <h3 className="text-xl font-bold text-white mb-2">No hay categorías</h3>
          <p className="text-gray-400 text-sm">Crea la primera categoría para organizar tus servicios.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((cat) => (
            <div key={cat.id} className="bg-brand-surface/80 border border-white/10 rounded-2xl p-6 hover:border-brand-cyan/50 transition-colors flex flex-col h-full relative overflow-hidden group">
              
              {cat.image && (
                <div 
                  className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity bg-cover bg-center"
                  style={{ backgroundImage: `url(${cat.image})` }}
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-brand-surface via-brand-surface/90 to-transparent" />

              <div className="relative z-10 flex-1">
                <div className="flex justify-between items-start mb-4">
                  <h4 className="text-2xl font-black text-white uppercase tracking-widest">{cat.name}</h4>
                  <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest ${cat.isActive ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                    {cat.isActive ? 'Activa' : 'Inactiva'}
                  </span>
                </div>
                
                <p className="text-gray-400 text-sm mb-6">{cat.description || "Sin descripción"}</p>
              </div>

              <div className="relative z-10 grid grid-cols-2 gap-2 mt-auto pt-4 border-t border-white/10">
                <button 
                  onClick={() => handleEdit(cat)} 
                  className="w-full text-brand-cyan hover:text-white hover:bg-brand-cyan/20 text-[10px] uppercase font-bold tracking-widest border border-brand-cyan/20 py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                  Editar
                </button>
                <button 
                  onClick={() => handleDelete(cat.id)} 
                  className="w-full text-red-400 hover:text-white hover:bg-red-500/20 text-[10px] uppercase font-bold tracking-widest border border-red-500/20 py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
