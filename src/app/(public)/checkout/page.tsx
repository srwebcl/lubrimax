"use client";

import React, { useState } from "react";
import { useCart } from "@/components/providers/CartProvider";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { validateCoupon } from "@/actions/coupons";
import { validateClubRut } from "@/actions/club-public";

export default function CheckoutPage() {
  const { items, total, removeFromCart, updateQuantity, clearCart } = useCart();
  const router = useRouter();
  const [isSuccess, setIsSuccess] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get("success") === "true") {
        setIsSuccess(true);
        setOrderId(searchParams.get("order"));
        clearCart();
      }
    }
  }, [clearCart]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Coupon State
  const [couponCode, setCouponCode] = useState("");
  const [clubRut, setClubRut] = useState("");
  const [discountPct, setDiscountPct] = useState(0);
  const [couponMsg, setCouponMsg] = useState<{ type: 'success'|'error', text: string } | null>(null);

  // Final math
  const discountAmount = Math.round(total * (discountPct / 100));
  const finalTotal = total - discountAmount;

  // Guest User State
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");

  // Shipping State
  const [shippingType, setShippingType] = useState<"PICKUP" | "DELIVERY">("PICKUP");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");

  const handlePayment = async () => {
    if (items.length === 0) return;
    
    if (!customerName || !customerEmail) {
      setError("Por favor, ingresa tu Nombre y Correo para el recibo.");
      return;
    }

    if (shippingType === "DELIVERY" && (!address || !city)) {
      setError("Por favor, completa los datos de tu dirección de envío.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/webpay/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: finalTotal,
          items: items.map(i => ({ id: i.id, quantity: i.quantity, price: i.price })),
          customerName,
          customerEmail,
          shippingType,
          address,
          city,
          couponCode: discountPct > 0 ? couponCode : undefined
        })
      });

      const data = await response.json();

      if (data.token && data.url) {
        const form = document.createElement("form");
        form.action = data.url;
        form.method = "POST";
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = "token_ws";
        input.value = data.token;
        form.appendChild(input);
        document.body.appendChild(form);
        form.submit();
      } else {
        throw new Error(data.error || "No se pudo iniciar el pago.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error al conectar con Webpay.");
      setLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen pt-32 pb-20 flex flex-col items-center justify-center px-4">
        <div className="w-24 h-24 bg-green-500/20 border border-green-500 rounded-full flex items-center justify-center mb-6">
          <svg className="w-12 h-12 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-3xl font-bold text-white mb-2 uppercase tracking-widest text-center">¡Gracias por tu compra!</h2>
        <p className="text-gray-400 mb-8 text-center max-w-md">
          Tu pago ha sido procesado exitosamente mediante Webpay Plus.
        </p>
        {orderId && (
          <p className="text-gray-300 mb-8 font-mono bg-black/50 px-6 py-3 rounded-lg border border-white/10 flex flex-col items-center text-sm gap-1">
            <span className="text-gray-500 uppercase text-[10px]">Número de Orden</span>
            <span className="text-brand-cyan">{orderId.toUpperCase()}</span>
          </p>
        )}
        <div className="flex flex-col sm:flex-row gap-4">
          <Link href="/tienda" className="bg-brand-surface border border-white/10 text-white font-bold px-8 py-3 rounded-lg uppercase tracking-widest text-sm hover:bg-white/5 transition-colors text-center">
            Volver a la Tienda
          </Link>
          <Link href="/login" className="bg-brand-cyan text-brand-pure font-bold px-8 py-3 rounded-lg uppercase tracking-widest text-sm hover:bg-white transition-colors text-center">
            Ver mi Perfil
          </Link>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen pt-32 pb-20 flex flex-col items-center justify-center px-4">
        <div className="w-20 h-20 bg-brand-surface border border-white/10 rounded-full flex items-center justify-center mb-6">
          <svg className="w-10 h-10 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Tu carrito está vacío</h2>
        <p className="text-gray-400 mb-8">Agrega productos de nuestra tienda para continuar.</p>
        <Link href="/tienda" className="bg-brand-cyan text-brand-pure font-bold px-8 py-3 rounded-lg uppercase tracking-widest text-sm hover:bg-white transition-colors">
          Volver a la Tienda
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-white uppercase tracking-widest italic">Checkout</h1>
        <p className="text-gray-400">Revisa tus productos y procesa el pago seguro con Webpay Plus.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        
        {/* Lado Izquierdo: Carrito y Entrega */}
        <div className="lg:col-span-2 space-y-10">
                    {/* Datos Personales */}
            <div className="bg-brand-surface/50 border border-white/10 rounded-2xl p-6 md:p-8">
              <h3 className="text-xl font-bold text-white mb-6 uppercase tracking-widest flex items-center gap-2">
                <svg className="w-5 h-5 text-brand-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                Tus Datos
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 text-xs uppercase tracking-widest font-bold mb-2">Nombre Completo</label>
                  <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} required placeholder="Ej. Juan Pérez" className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-brand-cyan" />
                </div>
                <div>
                  <label className="block text-gray-400 text-xs uppercase tracking-widest font-bold mb-2">Correo Electrónico</label>
                  <input type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} required placeholder="juan@correo.com" className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-brand-cyan" />
                </div>
              </div>
            </div>

            {/* Opciones de Entrega */}
            <div className="bg-brand-surface/50 border border-white/10 rounded-2xl p-6 md:p-8">
            <h3 className="text-xl font-bold text-white mb-6 uppercase tracking-widest flex items-center gap-2">
              <svg className="w-5 h-5 text-brand-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
              Método de Entrega
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <button 
                onClick={() => setShippingType("PICKUP")}
                className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${shippingType === "PICKUP" ? "bg-brand-cyan/10 border-brand-cyan text-brand-cyan shadow-[0_0_15px_rgba(56,189,248,0.2)]" : "border-white/10 text-gray-400 hover:border-white/30"}`}
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                <span className="font-bold text-sm uppercase tracking-widest">Retiro en Local</span>
                <span className="text-xs opacity-75">Gratis</span>
              </button>
              
              <button 
                onClick={() => setShippingType("DELIVERY")}
                className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${shippingType === "DELIVERY" ? "bg-brand-cyan/10 border-brand-cyan text-brand-cyan shadow-[0_0_15px_rgba(56,189,248,0.2)]" : "border-white/10 text-gray-400 hover:border-white/30"}`}
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" /></svg>
                <span className="font-bold text-sm uppercase tracking-widest">Envío a Domicilio</span>
                <span className="text-xs opacity-75">Por pagar (Starken)</span>
              </button>
            </div>

            <AnimatePresence>
              {shippingType === "DELIVERY" && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <div className="pt-4 border-t border-white/10 space-y-4">
                    <p className="text-xs text-gray-400 mb-4">* Los envíos se realizan vía Starken "Por Pagar" a tu domicilio o sucursal más cercana.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-gray-400 text-xs uppercase tracking-widest font-bold mb-2">Dirección Completa</label>
                        <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} required placeholder="Calle, Número, Depto..." className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-brand-cyan" />
                      </div>
                      <div>
                        <label className="block text-gray-400 text-xs uppercase tracking-widest font-bold mb-2">Comuna / Ciudad</label>
                        <input type="text" value={city} onChange={(e) => setCity(e.target.value)} required placeholder="Ej. La Serena" className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-brand-cyan" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Cart Items */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-white mb-6 uppercase tracking-widest">Tus Productos</h3>
            {items.map((item) => (
              <div key={item.id} className="bg-brand-surface/50 border border-white/10 p-4 rounded-xl flex flex-wrap sm:flex-nowrap items-center gap-4">
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 bg-black/50 rounded-lg flex-shrink-0 flex items-center justify-center border border-white/5">
                  {item.image ? (
                    <Image src={item.image} alt={item.name} fill sizes="80px" className="object-cover rounded-lg opacity-80" />
                  ) : (
                    <span className="text-xs text-gray-600 uppercase">Img</span>
                  )}
                </div>
                <div className="flex-grow min-w-[150px]">
                  <div className="text-[10px] text-brand-cyan uppercase tracking-widest font-bold mb-1">{item.category}</div>
                  <h4 className="text-white font-bold leading-tight">{item.name}</h4>
                  <div className="text-sm text-gray-400 mt-1">${item.price.toLocaleString('es-CL')} c/u</div>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="w-8 h-8 rounded bg-white/5 text-white hover:bg-white/20 flex items-center justify-center">-</button>
                  <span className="text-white font-bold w-4 text-center">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-8 h-8 rounded bg-white/5 text-white hover:bg-white/20 flex items-center justify-center">+</button>
                </div>
                <div className="w-24 text-right">
                  <div className="text-white font-bold">${(item.price * item.quantity).toLocaleString('es-CL')}</div>
                </div>
                <button onClick={() => removeFromCart(item.id)} className="p-2 text-gray-500 hover:text-red-400 transition-colors">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            ))}
          </div>

        </div>

        {/* Order Summary & Payment */}
        <div className="bg-gradient-to-b from-brand-surface to-brand-pure border border-white/10 rounded-2xl p-6 lg:p-8 h-fit sticky top-32">
          <h3 className="text-xl font-bold text-white mb-6 uppercase tracking-widest">Resumen</h3>
          
          <div className="space-y-4 mb-6 text-sm">
            <div className="flex justify-between text-gray-400">
              <span>Subtotal Productos</span>
              <span>${total.toLocaleString('es-CL')}</span>
            </div>
            {shippingType === "DELIVERY" && (
              <div className="flex justify-between text-brand-cyan">
                <span>Envío (Starken)</span>
                <span>Por Pagar</span>
              </div>
            )}
            
            {/* CUPON O RUT CLUB */}
            <div className="pt-2 border-t border-white/5 space-y-4">
              {/* Cupón */}
              <div>
                <label className="block text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-2">Código de Descuento</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={couponCode} 
                    onChange={e => setCouponCode(e.target.value)}
                    disabled={discountPct > 0}
                    placeholder="Ej: CYBER26" 
                    className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white uppercase focus:outline-none focus:border-brand-cyan disabled:opacity-50" 
                  />
                  {!discountPct ? (
                    <button 
                      onClick={async () => {
                        if(!couponCode) return;
                        setCouponMsg(null);
                        const res = await validateCoupon(couponCode);
                        if(res.valid && res.discountPct) {
                          setDiscountPct(res.discountPct);
                          setCouponMsg({ type: 'success', text: `Cupón aplicado: -${res.discountPct}%` });
                        } else {
                          setCouponMsg({ type: 'error', text: res.error || "Cupón inválido" });
                        }
                      }}
                      className="bg-white/10 hover:bg-brand-cyan hover:text-black text-white text-[10px] uppercase tracking-widest font-bold px-4 rounded-lg transition-colors"
                    >
                      Aplicar
                    </button>
                  ) : (
                    <button 
                      onClick={() => { setDiscountPct(0); setCouponCode(""); setClubRut(""); setCouponMsg(null); }}
                      className="bg-red-500/10 hover:bg-red-500/30 text-red-400 text-[10px] uppercase tracking-widest font-bold px-4 rounded-lg transition-colors"
                    >
                      Quitar
                    </button>
                  )}
                </div>
              </div>
              
              {/* Club Lubrimax */}
              {!discountPct && (
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-2 flex items-center justify-between">
                    <span>¿Eres Socio del Club?</span>
                    <span className="text-brand-cyan">Descuentos Automáticos</span>
                  </label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={clubRut} 
                      onChange={e => setClubRut(e.target.value)}
                      placeholder="Tu RUT (Ej: 12345678-9)" 
                      className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-brand-cyan" 
                    />
                    <button 
                      onClick={async () => {
                        if(!clubRut) return;
                        setCouponMsg(null);
                        const res = await validateClubRut(clubRut);
                        if(res.valid && res.discountPct) {
                          setDiscountPct(res.discountPct);
                          setCouponMsg({ type: 'success', text: `¡Hola ${res.customerName}! Tienes -${res.discountPct}% Club.` });
                        } else {
                          setCouponMsg({ type: 'error', text: res.error || "RUT inválido" });
                        }
                      }}
                      className="bg-white/10 hover:bg-brand-cyan hover:text-black text-white text-[10px] uppercase tracking-widest font-bold px-4 rounded-lg transition-colors"
                    >
                      Validar
                    </button>
                  </div>
                </div>
              )}

              {couponMsg && (
                <div className={`mt-2 text-[10px] font-bold uppercase tracking-widest ${couponMsg.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                  {couponMsg.text}
                </div>
              )}
            </div>

            {discountPct > 0 && (
              <div className="flex justify-between text-green-400 border-t border-white/5 pt-4 mt-4">
                <span>Descuento Aplicado ({discountPct}%)</span>
                <span>-${discountAmount.toLocaleString('es-CL')}</span>
              </div>
            )}
          </div>

          <div className="border-t border-white/10 pt-4 mb-8">
            <div className="flex justify-between items-center">
              <span className="text-white uppercase tracking-widest font-bold">Total a Pagar</span>
              <span className="text-2xl font-bold text-brand-cyan">${finalTotal.toLocaleString('es-CL')}</span>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg text-center font-bold">
              {error}
            </div>
          )}

          <button 
            onClick={handlePayment}
            disabled={loading}
            className="w-full bg-brand-cyan text-brand-pure font-bold uppercase tracking-widest py-4 rounded-xl hover:bg-white transition-all shadow-[0_0_20px_rgba(56,189,248,0.2)] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>Procesando...</>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                Pagar con Webpay Plus
              </>
            )}
          </button>
          
          <div className="mt-4 flex items-center justify-center gap-2 opacity-50 grayscale">
            <span className="text-[10px] text-white uppercase tracking-widest font-bold">Pago Seguro por Transbank</span>
          </div>
        </div>

      </div>
    </div>
  );
}
