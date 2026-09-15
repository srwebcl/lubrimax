"use client";

import React, { useState, useEffect } from "react";
import { getAdminCategories, createCategory, updateCategory, deleteCategory } from "@/actions/admin-categories";
import { ServiceCategory } from "@prisma/client";
import { uploadFileToR2 } from "@/lib/uploadClient";
import { Screen, PageHead, AddBtn, Sheet, Field, INPUT, LABEL, CARD, Msg, Spinner, Empty, PrimaryBtn } from "@/components/admin/kit";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ServiceCategory | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchCategories = async () => {
    setLoading(true);
    setCategories(await getAdminCategories());
    setLoading(false);
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    const form = e.currentTarget;
    const formData = new FormData(form);
    try {
      const imageInput = form.querySelector<HTMLInputElement>('input[name="imageFile"]');
      if (imageInput?.files?.length) {
        const imageUrl = await uploadFileToR2(imageInput.files[0]);
        formData.set("image", imageUrl);
      }
      const result = editing
        ? await updateCategory(editing.id, formData)
        : await createCategory(formData);
      if (result.success) {
        await fetchCategories();
        closeForm();
      } else {
        setMessage({ type: "error", text: result.error || "Error al procesar la solicitud." });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Error: " + (err as Error).message });
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta categoría? Solo si no tiene servicios asociados.")) return;
    const result = await deleteCategory(id);
    if (result.success) fetchCategories();
    else alert(result.error);
  };

  const openNew = () => { setEditing(null); setMessage(null); setShowForm(true); };
  const openEdit = (cat: ServiceCategory) => { setEditing(cat); setMessage(null); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditing(null); setMessage(null); };

  return (
    <Screen>
      <PageHead
        title="Categorías"
        subtitle="Agrupan los servicios en la web."
        action={<AddBtn label="Categoría" onClick={openNew} />}
      />

      {loading ? (
        <Spinner />
      ) : categories.length === 0 ? (
        <Empty>Crea la primera categoría para organizar tus servicios.</Empty>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {categories.map((cat) => (
            <li key={cat.id} className={`${CARD} relative overflow-hidden`}>
              {cat.image && (
                <div
                  className="absolute inset-0 opacity-20 bg-cover bg-center"
                  style={{ backgroundImage: `url(${cat.image})` }}
                />
              )}
              <div className="relative">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-lg font-bold text-white">{cat.name}</h3>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cat.isActive ? "bg-green-500/15 text-green-400" : "bg-white/10 text-gray-400"}`}>
                    {cat.isActive ? "Activa" : "Inactiva"}
                  </span>
                </div>
                <p className="text-sm text-gray-400 mt-1 line-clamp-2">{cat.description || "Sin descripción"}</p>
                <div className="mt-3 flex gap-2">
                  <button onClick={() => openEdit(cat)} className="flex-1 text-xs font-bold py-2 rounded-lg border border-brand-cyan/25 text-brand-cyan">Editar</button>
                  <button onClick={() => handleDelete(cat.id)} className="flex-1 text-xs font-bold py-2 rounded-lg border border-red-500/25 text-red-400">Eliminar</button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Sheet open={showForm} onClose={closeForm} title={editing ? `Editar: ${editing.name}` : "Nueva categoría"}>
        <form key={editing?.id ?? "new"} onSubmit={handleSubmit} className="space-y-4">
          <Field label="Nombre">
            <input type="text" name="name" required defaultValue={editing?.name || ""} placeholder="Detailing Avanzado" className={INPUT} />
          </Field>
          <Field label="Descripción breve">
            <textarea name="description" rows={2} defaultValue={editing?.description || ""} placeholder="Aparece en el inicio…" className={INPUT} />
          </Field>
          <Field label="Imagen de portada" hint="Sube un archivo o pega una URL">
            {editing?.image && (
              <img src={editing.image} alt="" className="w-full h-24 object-cover rounded-lg mb-2 opacity-70" />
            )}
            <input type="file" name="imageFile" accept="image/*" className="w-full text-xs text-white file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-brand-cyan file:text-black" />
            <input type="text" name="image" defaultValue={editing?.image || ""} placeholder="/images/detailing.jpg" className={`${INPUT} mt-2`} />
          </Field>
          <Field label="Clases de color" hint="Opcional · ej: from-blue-500 to-brand-cyan">
            <input type="text" name="color" defaultValue={editing?.color || ""} className={INPUT} />
          </Field>
          <label className="flex items-center gap-3">
            <input type="checkbox" name="isActive" value="true" defaultChecked={editing ? editing.isActive : true} className="w-5 h-5 rounded bg-white/5 border-white/15 text-brand-cyan" />
            <span className={LABEL + " mb-0"}>Visible en la web</span>
          </label>
          {message && <Msg kind="err">{message.text}</Msg>}
          <PrimaryBtn type="submit" disabled={saving} className="w-full">
            {saving ? "Guardando…" : editing ? "Guardar cambios" : "Crear categoría"}
          </PrimaryBtn>
        </form>
      </Sheet>
    </Screen>
  );
}
