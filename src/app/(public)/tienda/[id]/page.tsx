"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getProductById } from "@/actions/store";
import { submitReview } from "@/actions/reviews";
import { getSessionCustomer } from "@/actions/customer-auth";
import { useCart } from "@/components/providers/CartProvider";
import { motion } from "framer-motion";

export default function ProductDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { addToCart } = useCart();
  
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Selection State
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);
  const [currentImageIdx, setCurrentImageIdx] = useState(0);

  // Review State
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewMsg, setReviewMsg] = useState<{type: 'success'|'error', text: string} | null>(null);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [customerInfo, setCustomerInfo] = useState<any>(null);
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    async function load() {
      if (!id) return;
      const data = await getProductById(id as string);
      if (!data) {
        router.push("/tienda");
        return;
      }
      setProduct(data);
      if (data.variants?.length > 0) {
        setSelectedVariant(data.variants[0]);
      }
      setLoading(false);
    }
    load();

    getSessionCustomer().then((session) => {
      setCustomerInfo(session);
      setSessionChecked(true);
    });
  }, [id, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-pure flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-brand-cyan border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Combine main image and additional images for the gallery
  const allImages = [];
  if (product.image) allImages.push(product.image);
  if (product.images) {
    product.images.forEach((img: any) => allImages.push(img.url));
  }

  const currentPrice = selectedVariant ? selectedVariant.price : product.price;
  const currentStock = selectedVariant ? selectedVariant.stock : product.stock;

  const handleAddToCart = () => {
    if (currentStock < quantity) {
      alert("Stock insuficiente");
      return;
    }
    addToCart({
      id: selectedVariant ? `${product.id}-${selectedVariant.id}` : product.id,
      name: selectedVariant ? `${product.name} (${selectedVariant.name})` : product.name,
      price: currentPrice,
      quantity: quantity,
      image: product.image,
      category: product.category?.name || "Uncategorized"
    });
    alert("Agregado al carrito");
  };

  const handleReviewSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmittingReview(true);
    setReviewMsg(null);
    const formData = new FormData(e.currentTarget);
    formData.append("productId", product.id);
    const res = await submitReview(formData);
    if (res.success) {
      setReviewMsg({ type: "success", text: "¡Gracias por tu reseña!" });
      // Reload product data to show new review
      const data = await getProductById(id as string);
      if (data) setProduct(data);
      e.currentTarget.reset();
    } else {
      setReviewMsg({ type: "error", text: res.error || "Error al enviar reseña." });
    }
    setIsSubmittingReview(false);
  };

  // Calcula rating promedio
  const avgRating = product.reviews?.length 
    ? (product.reviews.reduce((acc: number, r: any) => acc + r.rating, 0) / product.reviews.length).toFixed(1)
    : 0;

  return (
    <div className="min-h-screen bg-brand-pure pt-24 pb-20 px-4 md:px-8">
      <div className="max-w-6xl mx-auto">
        <button onClick={() => router.push("/tienda")} className="text-gray-400 hover:text-white uppercase tracking-widest text-xs font-bold mb-8 flex items-center gap-2">
          ← Volver a la Tienda
        </button>

        <div className="flex flex-col md:flex-row gap-12">
          {/* GALERÍA DE IMÁGENES */}
          <div className="w-full md:w-1/2 space-y-4">
            <div className="aspect-square bg-brand-surface rounded-2xl overflow-hidden border border-white/10 relative shadow-[0_0_50px_rgba(56,189,248,0.1)]">
              {allImages.length > 0 ? (
                <Image src={allImages[currentImageIdx]} alt={product.name} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" priority />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-500 uppercase tracking-widest text-sm">Sin imagen</div>
              )}
            </div>
            
            {allImages.length > 1 && (
              <div className="flex gap-4 overflow-x-auto pb-2">
                {allImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentImageIdx(idx)}
                    className={`relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all ${currentImageIdx === idx ? 'border-brand-cyan shadow-[0_0_15px_rgba(56,189,248,0.3)]' : 'border-transparent opacity-50 hover:opacity-100'}`}
                  >
                    <Image src={img} alt="Thumbnail" fill sizes="80px" className="object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* DETALLES DEL PRODUCTO */}
          <div className="w-full md:w-1/2 flex flex-col">
            <span className="text-brand-cyan uppercase tracking-widest text-xs font-bold mb-2">
              {product.category?.name || "Exclusivo"}
            </span>
            <h1 className="text-3xl md:text-5xl font-bold text-white uppercase tracking-widest italic mb-4">
              {product.name}
            </h1>
            
            <div className="text-4xl text-white font-bold mb-6">
              ${currentPrice.toLocaleString('es-CL')}
            </div>

            <p className="text-gray-300 leading-relaxed mb-8">
              {product.description || "Sin descripción detallada."}
            </p>

            {/* VARIANTES */}
            {product.variants && product.variants.length > 0 && (
              <div className="mb-8">
                <h3 className="text-white text-xs uppercase tracking-widest font-bold mb-3">Selecciona una opción:</h3>
                <div className="flex flex-wrap gap-3">
                  {product.variants.map((v: any) => (
                    <button 
                      key={v.id}
                      onClick={() => { setSelectedVariant(v); setQuantity(1); }}
                      className={`px-5 py-3 rounded-lg border text-sm uppercase tracking-widest font-bold transition-all ${
                        selectedVariant?.id === v.id 
                          ? 'bg-brand-cyan/20 border-brand-cyan text-brand-cyan shadow-[0_0_15px_rgba(56,189,248,0.2)]'
                          : 'bg-black/50 border-white/10 text-gray-400 hover:border-white/30 hover:text-white'
                      }`}
                    >
                      {v.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* AGREGAR AL CARRITO */}
            <div className="mt-auto pt-8 border-t border-white/10 flex items-center gap-4">
              <div className="flex items-center bg-black/50 border border-white/10 rounded-lg">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="px-4 py-3 text-white hover:text-brand-cyan transition-colors">-</button>
                <span className="w-10 text-center text-white font-bold">{quantity}</span>
                <button onClick={() => setQuantity(Math.min(currentStock, quantity + 1))} className="px-4 py-3 text-white hover:text-brand-cyan transition-colors">+</button>
              </div>

              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleAddToCart}
                disabled={currentStock === 0}
                className="flex-1 bg-brand-cyan text-brand-pure font-bold uppercase tracking-widest text-sm py-4 rounded-lg hover:bg-white transition-colors disabled:opacity-50 shadow-[0_0_30px_rgba(56,189,248,0.3)]"
              >
                {currentStock > 0 ? "Añadir al Carrito" : "Agotado"}
              </motion.button>
            </div>
            <div className="text-right mt-2">
              <span className={`text-[10px] uppercase font-bold tracking-widest ${currentStock > 5 ? 'text-green-400' : currentStock > 0 ? 'text-yellow-400' : 'text-red-400'}`}>
                Stock Disponible: {currentStock}
              </span>
            </div>
          </div>
        </div>

        {/* REVIEWS SECTION */}
        <div className="mt-20 border-t border-white/10 pt-12">
          <h2 className="text-2xl font-bold text-white uppercase tracking-widest italic mb-8">
            Reseñas <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-cyan to-brand-blue">({product.reviews?.length || 0})</span>
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            
            {/* Lista de Reseñas */}
            <div className="lg:col-span-2 space-y-6">
              {product.reviews?.length === 0 ? (
                <p className="text-gray-400 italic text-sm">Este producto aún no tiene reseñas. ¡Sé el primero!</p>
              ) : (
                product.reviews?.map((review: any) => (
                  <div key={review.id} className="bg-brand-surface/50 border border-white/5 p-6 rounded-2xl relative">
                    <div className="flex items-center gap-2 mb-3">
                      {[1,2,3,4,5].map(star => (
                        <svg key={star} className={`w-4 h-4 ${star <= review.rating ? 'text-yellow-400' : 'text-gray-600'}`} fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                    <p className="text-white text-sm mb-4 leading-relaxed">"{review.comment}"</p>
                    <div className="flex items-center justify-between text-[10px] uppercase font-bold tracking-widest text-gray-500">
                      <span>{review.customer.name} (Comprador Verificado ✓)</span>
                      <span>{new Date(review.createdAt).toLocaleDateString('es-CL')}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Formulario de Reseñas */}
            <div className="bg-black/40 border border-white/10 rounded-2xl p-6 lg:p-8 h-fit">
              <h3 className="text-white font-bold uppercase tracking-widest text-sm mb-4">¿Compraste este producto?</h3>

              {!sessionChecked ? null : !customerInfo ? (
                <div className="text-center py-4">
                  <p className="text-gray-400 text-xs mb-4 leading-relaxed">Inicia sesión con la cuenta que hizo la compra para dejar una reseña verificada.</p>
                  <Link href="/login" className="inline-block bg-brand-cyan text-brand-pure font-bold uppercase tracking-widest text-xs py-3 px-6 rounded-lg hover:bg-white transition-colors">
                    Iniciar sesión
                  </Link>
                </div>
              ) : (
                <>
                  <p className="text-gray-400 text-xs mb-6 leading-relaxed">Publicando como <strong className="text-brand-cyan">{customerInfo.name}</strong>. Solo se valida si tienes una orden entregada con este producto.</p>

                  <form onSubmit={handleReviewSubmit} className="space-y-4">
                    <div>
                      <label className="block text-[10px] text-gray-500 uppercase font-bold mb-2">Calificación</label>
                      <select name="rating" value={reviewRating} onChange={e => setReviewRating(Number(e.target.value))} className="w-full bg-brand-surface border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-brand-cyan text-sm">
                        <option value={5}>⭐⭐⭐⭐⭐ (Excelente)</option>
                        <option value={4}>⭐⭐⭐⭐ (Muy Bueno)</option>
                        <option value={3}>⭐⭐⭐ (Bueno)</option>
                        <option value={2}>⭐⭐ (Regular)</option>
                        <option value={1}>⭐ (Malo)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] text-gray-500 uppercase font-bold mb-2">Comentario</label>
                      <textarea name="comment" rows={3} required placeholder="¿Qué te pareció el producto?" className="w-full bg-brand-surface border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-brand-cyan text-sm"></textarea>
                    </div>

                    {reviewMsg && (
                      <div className={`p-3 rounded-lg text-xs font-bold text-center ${reviewMsg.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {reviewMsg.text}
                      </div>
                    )}

                    <button disabled={isSubmittingReview} type="submit" className="w-full bg-brand-cyan text-brand-pure font-bold uppercase tracking-widest text-xs py-3 rounded-lg hover:bg-white transition-colors disabled:opacity-50">
                      {isSubmittingReview ? "Enviando..." : "Publicar Reseña"}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
