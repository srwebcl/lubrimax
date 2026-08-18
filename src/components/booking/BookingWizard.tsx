"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useSearchParams } from "next/navigation";
import { getServices, getAvailableSlots, getBookingById } from "@/actions/booking";
import { getSessionCustomer } from "@/actions/customer-auth";
import { VEHICLE_TYPES, getExactPrice as sharedGetExactPrice, RESERVATION_PERCENT } from "@/lib/booking-constants";

type Service = {
  id: string;
  name: string;
  duration: number;
  priceAuto: number | null;
  priceSuv2: number | null;
  priceSuv3: number | null;
  category: string;
  variants?: any;
};

type ConfirmedBooking = {
  serviceName: string;
  date: string;
  startTime: string;
  vehicleMake: string;
  vehicleModel: string;
  amount: number | null;
};

export default function BookingWizard() {
  const wizardRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();
  const [step, setStep] = useState(1);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [vehicleType, setVehicleType] = useState<string>("");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const selectedServicesData = services.filter(s => selectedServices.includes(s.id));

  const totalDurationMinutes = useMemo(() => {
    return selectedServicesData.reduce((sum, s) => {
      let duration = s.duration;
      const variantName = selectedVariants[s.id];
      if (s.variants && variantName) {
        const vObj = s.variants.find((v: any) => v.name === variantName);
        if (vObj && vObj.duration) duration = vObj.duration;
      }
      return sum + duration;
    }, 0);
  }, [selectedServicesData, selectedVariants]);

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    plate: "",
    vehicleMake: "",
    vehicleModel: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState("");
  // Se inicializa leyendo ?error= directamente (sin efecto: evita el
  // set-state-en-efecto que dispara un render en cascada innecesario para
  // un valor que ya conocemos en el primer render).
  const [paymentError, setPaymentError] = useState<string | null>(() => searchParams.get("error"));
  const [confirmed, setConfirmed] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<ConfirmedBooking | null>(null);
  const [customerInfo, setCustomerInfo] = useState<any>(null);

  useEffect(() => {
    async function loadServicesAndSession() {
      const data = await getServices();
      setServices(data as Service[]);

      // Auto-seleccionar servicio si viene en la URL
      const urlServiceId = searchParams.get("service");
      if (urlServiceId && data.some((s: any) => s.id === urlServiceId)) {
        setSelectedServices([urlServiceId]);
      }

      const session = await getSessionCustomer();
      if (session) {
        setCustomerInfo(session);
        setFormData(prev => ({
          ...prev,
          name: session.name,
          email: session.email,
          phone: session.phone || ""
        }));
      }
      setLoading(false);
    }
    loadServicesAndSession();
  }, []);

  // Al volver de Webpay, /agendar trae ?success=true&booking=<id> o
  // ?error=<mensaje>. Como el pago implica una navegación completa fuera
  // del SPA, el estado local del wizard se pierde: la confirmación se arma
  // de nuevo con los datos reales que quedaron en la BD, no con lo que
  // había en el formulario antes de salir.
  useEffect(() => {
    const bookingId = searchParams.get("booking");
    const success = searchParams.get("success");

    if (success && bookingId) {
      getBookingById(bookingId).then((booking) => {
        if (booking) {
          setConfirmedBooking({
            serviceName: booking.serviceName,
            date: format(new Date(booking.date), "dd 'de' MMMM", { locale: es }),
            startTime: booking.startTime,
            vehicleMake: booking.vehicleMake,
            vehicleModel: booking.vehicleModel,
            amount: booking.amount,
          });
          setConfirmed(true);
        }
      });
    }
  }, [searchParams]);

  // Fetch slots when date is selected
  useEffect(() => {
    if (selectedDate && selectedServices.length > 0) {
      async function fetchSlots() {
        setIsLoadingSlots(true);
        const slots = await getAvailableSlots(format(selectedDate!, "yyyy-MM-dd"), selectedServices);
        setAvailableSlots(slots);
        setSelectedSlot("");
        setIsLoadingSlots(false);
      }
      fetchSlots();
    }
  }, [selectedDate, selectedServices]);

  const handleNext = () => setStep((s) => s + 1);
  const handlePrev = () => setStep((s) => s - 1);

  // Auto-scroll to top of wizard when step changes
  useEffect(() => {
    if (wizardRef.current) {
      const yOffset = wizardRef.current.getBoundingClientRect().top + window.scrollY - 100;
      window.scrollTo({ top: yOffset, behavior: "smooth" });
    }
  }, [step]);

  // Precio "de vitrina" para que el usuario vea cuánto va a pagar; el monto
  // que realmente se cobra se recalcula en el servidor (ver
  // /api/webpay/booking/create) antes de crear la transacción Webpay.

  let totalAmount = selectedServicesData.reduce((sum, s) => {
    let source = s;
    if (s.variants && s.variants.length > 0 && selectedVariants[s.id]) {
      const selectedVariant = s.variants.find((v: any) => v.name === selectedVariants[s.id]);
      if (selectedVariant) source = selectedVariant;
    }
    return sum + sharedGetExactPrice(source as any, vehicleType);
  }, 0);

  // Aplicar descuento del club
  const discountPercent = customerInfo?.membership?.discountPercent || 0;
  if (discountPercent > 0) {
    totalAmount = totalAmount - (totalAmount * (discountPercent / 100));
  }

  const reservationAmount = Math.round(totalAmount * RESERVATION_PERCENT);

  const handlePayment = async (type: 'RESERVATION' | 'FULL') => {
    if (!formData.name || !formData.phone || !formData.plate || !formData.vehicleMake || !formData.vehicleModel) {
      alert("Por favor completa todos los datos obligatorios (Contacto y Vehículo).");
      return;
    }

    if (!selectedDate || !selectedSlot || selectedServices.length === 0) return;

    setSubmitting(true);
    setPaymentError(null);
    setPaymentStatus("Conectando con Webpay...");

    try {
      const response = await fetch("/api/webpay/booking/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: format(selectedDate, "yyyy-MM-dd"),
          startTime: selectedSlot,
          serviceIds: selectedServices,
          selectedVariants: selectedVariants,
          vehicleType,
          plate: formData.plate,
          make: formData.vehicleMake,
          model: formData.vehicleModel,
          customerName: formData.name,
          customerPhone: formData.phone,
          customerEmail: formData.email,
          paymentType: type,
        }),
      });

      const data = await response.json();

      if (data.token && data.url) {
        // Webpay exige un POST con el token como campo de formulario, no un
        // simple redirect GET (ver documentación de Webpay Plus).
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
      setPaymentError(err.message || "Error al conectar con Webpay.");
      setSubmitting(false);
    }
  };

  const variants = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  };

  if (loading) {
    return <div className="text-brand-chrome text-center py-20">Cargando sistema...</div>;
  }

  if (confirmed) {
    return (
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="max-w-2xl mx-auto p-8 bg-brand-surface/80 backdrop-blur-md border border-brand-cyan/30 rounded-lg text-center shadow-[0_0_50px_rgba(56,189,248,0.2)]"
      >
        <div className="w-24 h-24 bg-brand-cyan/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-12 h-12 text-brand-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-3xl font-bold text-white mb-4 uppercase tracking-widest">Reserva Confirmada</h2>
        <p className="text-gray-400 mb-8">
          Te esperamos el <strong className="text-brand-chrome">{confirmedBooking?.date}</strong> a las <strong className="text-brand-chrome">{confirmedBooking?.startTime} hrs</strong> para <strong className="text-brand-chrome">{confirmedBooking?.serviceName}</strong>.
        </p>
        <div className="bg-brand-pure p-4 rounded mb-8 text-sm text-brand-chrome border border-white/5">
          Vehículo: {confirmedBooking?.vehicleMake} | Patente: {confirmedBooking?.vehicleModel}
          {confirmedBooking?.amount != null && (
            <> | Pagado: ${confirmedBooking.amount.toLocaleString('es-CL')}</>
          )}
        </div>
        <button 
          onClick={() => window.location.href = '/'}
          className="bg-brand-pure border border-white/10 text-brand-chrome px-8 py-3 rounded hover:bg-brand-cyan hover:text-brand-pure transition-colors uppercase tracking-widest font-bold"
        >
          Volver al Inicio
        </button>
      </motion.div>
    );
  }

  return (
    <div ref={wizardRef} className="max-w-4xl mx-auto bg-brand-surface/60 backdrop-blur-xl border border-white/10 rounded-xl p-6 md:p-10 relative overflow-hidden">
      {paymentError && (
        <div className="mb-8 p-4 rounded border border-red-900/50 bg-red-900/10 text-red-400 text-sm text-center">
          {decodeURIComponent(paymentError)}. Tu horario no quedó bloqueado, puedes intentar de nuevo.
        </div>
      )}

      {/* Progreso */}
      <div className="flex justify-between mb-8 relative z-10 border-b border-white/5 pb-8">
        {[1, 2, 3, 4].map((num) => (
          <div key={num} className="flex flex-col items-center flex-1">
            <div className={`w-8 h-8 md:w-10 md:h-10 text-sm md:text-base rounded-full flex items-center justify-center font-bold mb-2 transition-colors duration-500 ${step >= num ? 'bg-brand-cyan text-brand-pure shadow-[0_0_15px_rgba(56,189,248,0.5)]' : 'bg-brand-pure border border-white/20 text-gray-500'}`}>
              {num}
            </div>
            <span className={`text-[9px] md:text-xs uppercase tracking-wider md:tracking-widest text-center ${step >= num ? 'text-brand-cyan' : 'text-gray-500'}`}>
              {num === 1 ? 'Vehículo' : num === 2 ? 'Servicio' : num === 3 ? 'Horario' : 'Checkout'}
            </span>
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div key="step1" variants={variants} initial="initial" animate="animate" exit="exit">
            <h3 className="text-2xl font-bold text-white mb-2 uppercase tracking-wider">1. ¿Qué vehículo conduces?</h3>
            <p className="text-gray-400 mb-8">Nuestros precios se ajustan al tamaño de tu vehículo para garantizar un trabajo perfecto.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              {VEHICLE_TYPES.map(type => (
                <button
                  key={type}
                  onClick={() => setVehicleType(type)}
                  className={`p-8 text-center border rounded-lg transition-all duration-300 ${vehicleType === type ? 'border-brand-cyan bg-brand-cyan/10 shadow-[0_0_20px_rgba(56,189,248,0.2)]' : 'border-white/10 hover:border-brand-cyan/50 hover:bg-white/5'}`}
                >
                  <div className="w-16 h-16 mx-auto mb-4 bg-brand-pure rounded-full flex items-center justify-center border border-white/5">
                    {/* Icono placeholder de auto */}
                    <svg className={`w-8 h-8 ${vehicleType === type ? 'text-brand-cyan' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h8M8 11h8M5 19h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="font-bold text-white">{type}</div>
                </button>
              ))}
            </div>

            <div className="flex justify-end">
              <button 
                disabled={!vehicleType}
                onClick={handleNext}
                className="w-full sm:w-auto bg-brand-chrome text-brand-pure px-4 md:px-8 py-3 rounded hover:bg-brand-cyan disabled:opacity-50 disabled:hover:bg-brand-chrome transition-colors uppercase tracking-wider md:tracking-widest font-bold text-xs md:text-sm whitespace-nowrap"
              >
                Continuar a Servicios
              </button>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div key="step2" variants={variants} initial="initial" animate="animate" exit="exit">
            <div className="flex justify-between items-end mb-8">
              <div>
                <h3 className="text-2xl font-bold text-white mb-2 uppercase tracking-wider">2. Selecciona tu Servicio</h3>
                <p className="text-gray-400 mb-1">Precios exactos para: <strong className="text-brand-cyan">{vehicleType}</strong></p>
                <p className="text-brand-cyan text-sm font-medium bg-brand-cyan/10 inline-block px-3 py-1 rounded border border-brand-cyan/20">Puedes seleccionar uno o más servicios</p>
              </div>
            </div>
            
            <div className="space-y-8 mb-8">
              {Array.from(new Set(services.map(s => s.category))).map(category => (
                <div key={category}>
                  <h4 className="text-sm font-bold text-brand-cyan uppercase tracking-widest mb-4 border-b border-brand-cyan/20 pb-2">
                    {category}
                  </h4>
                  <div className="flex flex-col gap-2.5">
                    {services.filter(s => s.category === category).map(s => {
                      const isSelected = selectedServices.includes(s.id);
                      
                      let exactPrice = sharedGetExactPrice(s as any, vehicleType);
                      const hasVariants = s.variants && s.variants.length > 0;
                      let selectedVariantName = selectedVariants[s.id];
                      
                      if (hasVariants) {
                        if (selectedVariantName) {
                          const variant = s.variants.find((v: any) => v.name === selectedVariantName);
                          if (variant) exactPrice = sharedGetExactPrice(variant, vehicleType);
                        } else if (s.variants[0]) {
                          exactPrice = sharedGetExactPrice(s.variants[0], vehicleType); // Mostrar "Desde" con la primera
                        }
                      }

                      return (
                        <div key={s.id} className={`border rounded-lg transition-all duration-300 flex flex-col ${isSelected ? 'border-brand-cyan bg-brand-cyan/10 shadow-[0_0_15px_rgba(56,189,248,0.2)]' : 'border-white/10 bg-black/20 hover:border-brand-cyan/50 hover:bg-white/5'}`}>
                          <button
                            onClick={() => {
                              if (isSelected) {
                                setSelectedServices(prev => prev.filter(id => id !== s.id));
                                const newVars = { ...selectedVariants };
                                delete newVars[s.id];
                                setSelectedVariants(newVars);
                              } else {
                                setSelectedServices(prev => [...prev, s.id]);
                                if (hasVariants && !selectedVariants[s.id]) {
                                  setSelectedVariants(prev => ({ ...prev, [s.id]: s.variants[0].name }));
                                }
                              }
                            }}
                            className="p-4 text-left w-full flex items-center justify-between gap-4"
                          >
                            <div className="flex items-center gap-4">
                              <div className={`w-5 h-5 rounded-[4px] border flex items-center justify-center flex-shrink-0 transition-colors ${isSelected ? 'border-brand-cyan bg-brand-cyan' : 'border-white/20 bg-black/20'}`}>
                                {isSelected && (
                                  <svg className="w-3.5 h-3.5 text-brand-pure" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </div>
                              <div className="font-bold text-sm md:text-base text-white leading-tight">{s.name}</div>
                            </div>
                            <div className="text-brand-cyan text-sm md:text-base font-black whitespace-nowrap">
                              {hasVariants && !isSelected ? "Desde " : ""}${exactPrice.toLocaleString('es-CL')}
                            </div>
                          </button>
                          
                          {isSelected && hasVariants && (
                            <div className="px-4 pb-4 border-t border-brand-cyan/20 pt-3 mt-auto relative z-10">
                              <label className="block text-gray-400 text-[10px] uppercase tracking-widest font-bold mb-2">Selecciona Opción</label>
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={() => setOpenDropdown(openDropdown === s.id ? null : s.id)}
                                  className="w-full bg-black/50 border border-brand-cyan/30 hover:border-brand-cyan/60 transition-colors rounded px-3 py-2.5 text-white text-xs flex justify-between items-center"
                                >
                                  <span>{selectedVariants[s.id] || "Seleccionar..."}</span>
                                  <svg className={`w-4 h-4 text-brand-cyan transition-transform ${openDropdown === s.id ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                </button>
                                
                                <AnimatePresence>
                                  {openDropdown === s.id && (
                                    <>
                                      <div className="fixed inset-0 z-40" onClick={() => setOpenDropdown(null)} />
                                      <motion.div 
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="relative w-full mt-1 bg-[#1a1f2e] border border-brand-cyan/30 rounded-lg overflow-hidden z-50"
                                      >
                                        {s.variants.map((v: any, idx: number) => {
                                          const isVarSelected = selectedVariants[s.id] === v.name;
                                          return (
                                            <button
                                              key={idx}
                                              type="button"
                                              onClick={() => {
                                                setSelectedVariants(prev => ({ ...prev, [s.id]: v.name }));
                                                setOpenDropdown(null);
                                              }}
                                              className={`w-full text-left px-4 py-3 text-xs flex justify-between items-center transition-colors ${isVarSelected ? 'bg-brand-cyan/20 text-brand-cyan font-bold' : 'text-gray-300 hover:bg-white/5 hover:text-white'}`}
                                            >
                                              <span>{v.name}</span>
                                              <span className="opacity-70 font-mono">${sharedGetExactPrice(v, vehicleType).toLocaleString('es-CL')}</span>
                                            </button>
                                          );
                                        })}
                                      </motion.div>
                                    </>
                                  )}
                                </AnimatePresence>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="sticky bottom-0 bg-[#0f1115]/95 backdrop-blur-md pt-4 pb-2 border-t border-white/10 z-20 mt-4">
              <div className="flex flex-col-reverse sm:flex-row justify-between gap-4">
                <button 
                  onClick={handlePrev}
                  className="w-full sm:w-auto bg-transparent border border-white/10 text-white px-4 md:px-8 py-3 rounded hover:bg-white/5 transition-colors uppercase tracking-wider md:tracking-widest font-bold text-xs md:text-sm whitespace-nowrap"
                >
                  Volver
                </button>
                <button 
                  disabled={selectedServices.length === 0}
                  onClick={handleNext}
                  className="w-full sm:w-auto bg-brand-chrome text-brand-pure px-4 md:px-8 py-3 rounded hover:bg-brand-cyan disabled:opacity-50 transition-colors uppercase tracking-wider md:tracking-widest font-bold text-xs md:text-sm whitespace-nowrap shadow-[0_0_15px_rgba(56,189,248,0.2)]"
                >
                  Continuar al Calendario
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div key="step3" variants={variants} initial="initial" animate="animate" exit="exit">
            <h3 className="text-2xl font-bold text-white mb-6 uppercase tracking-wider">3. Selecciona Fecha y Hora</h3>
            
            {totalDurationMinutes >= 300 && (
              <div className="mb-6 bg-brand-cyan/10 border border-brand-cyan/30 p-4 rounded-lg flex items-start gap-3">
                <svg className="w-5 h-5 text-brand-cyan flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <p className="text-sm text-brand-cyan/90 leading-relaxed">
                  <strong>Servicio Extenso:</strong> Has seleccionado servicios de larga duración. El sistema agendará la fecha y hora de <strong>ingreso</strong> del vehículo, pero la entrega final podría realizarse al día siguiente (se coordinará directamente en el taller).
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div className="bg-brand-pure p-4 rounded-xl border border-white/5 flex justify-center h-fit">
                <style>{`
                  .rdp { --rdp-accent-color: #38BDF8; --rdp-background-color: #1D4ED8; margin: 0; }
                  .rdp-day_selected { background-color: var(--rdp-accent-color); color: #000; font-weight: bold; }
                  .rdp-day:hover:not(.rdp-day_outside) { background-color: rgba(56,189,248,0.2); }
                  .rdp-button { border-radius: 0.375rem; }
                  .rdp-day, .rdp-caption_label, .rdp-head_cell { color: #E4E4E7; }
                  .rdp-nav_button { color: #38BDF8; }
                `}</style>
                <DayPicker 
                  mode="single" 
                  selected={selectedDate} 
                  onSelect={setSelectedDate}
                  locale={es}
                  disabled={{ before: new Date() }}
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm uppercase tracking-widest mb-4">Horarios Disponibles</label>
                {!selectedDate ? (
                  <p className="text-gray-500 text-sm bg-black/20 p-4 rounded border border-white/5">Selecciona un día en el calendario para calcular disponibilidad técnica.</p>
                ) : isLoadingSlots ? (
                  <div className="bg-black/20 p-8 rounded border border-white/5 flex flex-col items-center justify-center gap-3">
                    <div className="w-8 h-8 border-4 border-brand-cyan/20 border-t-brand-cyan rounded-full animate-spin"></div>
                    <p className="text-brand-cyan text-sm animate-pulse">Buscando horarios...</p>
                  </div>
                ) : availableSlots.length === 0 ? (
                  <p className="text-red-400 text-sm bg-red-900/10 p-4 rounded border border-red-900/50">Agenda completa o sin tiempo suficiente para este servicio.</p>
                ) : (
                  <div className="grid grid-cols-3 gap-3 max-h-[320px] overflow-y-auto pr-2 hide-scrollbar">
                    {availableSlots.map(slot => (
                      <button
                        key={slot}
                        onClick={() => setSelectedSlot(slot)}
                        className={`py-3 text-center rounded border transition-colors ${selectedSlot === slot ? 'bg-brand-cyan text-brand-pure border-brand-cyan font-bold shadow-[0_0_10px_rgba(56,189,248,0.3)]' : 'border-white/10 text-white hover:border-brand-cyan hover:text-brand-cyan bg-brand-pure/50'}`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-between gap-4">
              <button 
                onClick={handlePrev}
                className="w-full sm:w-auto bg-transparent border border-white/10 text-white px-4 md:px-8 py-3 rounded hover:bg-white/5 transition-colors uppercase tracking-wider md:tracking-widest font-bold text-xs md:text-sm whitespace-nowrap"
              >
                Volver
              </button>
              <button 
                disabled={!selectedDate || !selectedSlot}
                onClick={handleNext}
                className="w-full sm:w-auto bg-brand-chrome text-brand-pure px-4 md:px-8 py-3 rounded hover:bg-brand-cyan disabled:opacity-50 transition-colors uppercase tracking-wider md:tracking-widest font-bold text-xs md:text-sm whitespace-nowrap"
              >
                Continuar al Checkout
              </button>
            </div>
          </motion.div>
        )}

        {step === 4 && (
          <motion.div key="step4" variants={variants} initial="initial" animate="animate" exit="exit">
            <h3 className="text-2xl font-bold text-white mb-6 uppercase tracking-wider">4. Checkout y Confirmación</h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 mb-8">
              <div className="lg:col-span-3 space-y-6 pr-0 lg:pr-6">
                <h4 className="text-brand-cyan text-sm uppercase tracking-widest font-bold mb-6 border-b border-white/10 pb-4">Tus Datos de Contacto y Vehículo</h4>
                
                <div className="space-y-5">
                  {/* Fila 1: Nombre */}
                  <div>
                    <label className="block text-gray-400 text-xs uppercase tracking-widest mb-2 font-semibold">Nombre Completo</label>
                    <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-brand-cyan/30 focus:border-brand-cyan transition-all placeholder-gray-600" placeholder="Ej: Juan Pérez" />
                  </div>

                  {/* Fila 2: Email */}
                  <div>
                    <label className="block text-gray-400 text-xs uppercase tracking-widest mb-2 font-semibold">Email</label>
                    <input required type="email" placeholder="Ej: correo@gmail.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-brand-cyan/30 focus:border-brand-cyan transition-all placeholder-gray-600" />
                  </div>

                  {/* Fila 3: Teléfono */}
                  <div>
                    <label className="block text-gray-400 text-xs uppercase tracking-widest mb-2 font-semibold">Teléfono</label>
                    <input required type="text" placeholder="Ej: +56912345678" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-brand-cyan/30 focus:border-brand-cyan transition-all placeholder-gray-600" />
                  </div>

                  {/* Fila 4: Marca del Vehículo */}
                  <div>
                    <label className="block text-gray-400 text-xs uppercase tracking-widest mb-2 font-semibold">Marca del Vehículo</label>
                    <input required type="text" placeholder="Ej: Toyota" value={formData.vehicleMake} onChange={e => setFormData({...formData, vehicleMake: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-brand-cyan/30 focus:border-brand-cyan transition-all placeholder-gray-600" />
                  </div>

                  {/* Fila 5: Modelo */}
                  <div>
                    <label className="block text-gray-400 text-xs uppercase tracking-widest mb-2 font-semibold">Modelo</label>
                    <input required type="text" placeholder="Ej: Yaris" value={formData.vehicleModel} onChange={e => setFormData({...formData, vehicleModel: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-brand-cyan/30 focus:border-brand-cyan transition-all placeholder-gray-600" />
                  </div>

                  {/* Fila 6: Patente */}
                  <div>
                    <label className="block text-gray-400 text-xs uppercase tracking-widest mb-2 font-semibold">Patente</label>
                    <input required type="text" placeholder="Ej: XXYY12" value={formData.plate} onChange={e => setFormData({...formData, plate: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-brand-cyan/30 focus:border-brand-cyan transition-all placeholder-gray-600 uppercase" />
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2">
                <div className="bg-brand-pure border border-white/10 rounded-lg p-6 sticky top-6">
                  <h4 className="text-white text-sm uppercase tracking-widest font-bold mb-6 border-b border-white/10 pb-4">Resumen de Compra</h4>
                  
                  <div className="space-y-4 mb-6">
                    <div className="flex justify-between text-sm gap-4">
                      <span className="text-gray-400">Servicios</span>
                      <span className="text-white font-bold text-right">
                        {selectedServicesData.map(s => {
                          const variant = selectedVariants[s.id];
                          return variant ? `${s.name} (${variant})` : s.name;
                        }).join(" + ")}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Vehículo</span>
                      <span className="text-white">{vehicleType}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Fecha</span>
                      <span className="text-brand-cyan font-bold">
                        {selectedDate && format(selectedDate, "dd MMM", { locale: es })} @ {selectedSlot}
                      </span>
                    </div>
                    {discountPercent > 0 && (
                      <div className="flex justify-between text-sm bg-amber-500/10 border border-amber-500/20 p-2 rounded text-amber-500">
                        <span className="font-bold">✓ Club LUBRIMAX</span>
                        <span className="font-bold">-{discountPercent}% OFF</span>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-white/10 pt-4 mb-6">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-400 uppercase text-xs tracking-widest">Reserva (20%)</span>
                      <span className="text-white font-bold">${reservationAmount.toLocaleString('es-CL')}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-brand-cyan uppercase text-xs font-bold tracking-widest">Total Servicio</span>
                      <span className="text-brand-cyan text-xl font-black">${totalAmount.toLocaleString('es-CL')}</span>
                    </div>
                  </div>

                  {submitting ? (
                    <div className="text-center py-4 bg-brand-cyan/20 border border-brand-cyan/50 rounded text-brand-cyan font-bold uppercase tracking-widest animate-pulse">
                      {paymentStatus}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <button 
                        onClick={() => handlePayment('RESERVATION')}
                        className="w-full bg-brand-chrome text-brand-pure py-3 px-2 rounded hover:bg-brand-cyan transition-colors uppercase tracking-wider md:tracking-widest font-bold text-[10px] md:text-sm shadow-[0_0_15px_rgba(255,255,255,0.2)] hover:shadow-[0_0_20px_rgba(56,189,248,0.5)] flex flex-col sm:block items-center justify-center gap-1"
                      >
                        <span>Pagar Reserva</span> <span className="opacity-75">(${reservationAmount.toLocaleString('es-CL')})</span>
                      </button>
                      <button 
                        onClick={() => handlePayment('FULL')}
                        className="w-full bg-transparent border border-white/20 text-white py-3 px-2 rounded hover:border-brand-cyan hover:text-brand-cyan transition-colors uppercase tracking-wider md:tracking-widest font-bold text-[10px] md:text-xs flex flex-col sm:block items-center justify-center gap-1"
                      >
                        <span>Pagar Total</span> <span className="opacity-75">(${totalAmount.toLocaleString('es-CL')})</span>
                      </button>
                    </div>
                  )}
                  
                  <p className="text-[10px] text-gray-500 text-center mt-4 uppercase tracking-widest">Pago seguro vía Webpay Plus</p>
                </div>
              </div>
            </div>

            <div className="flex justify-start">
              <button 
                onClick={handlePrev}
                disabled={submitting}
                className="bg-transparent border border-white/10 text-white px-8 py-3 rounded hover:bg-white/5 transition-colors uppercase tracking-widest font-bold disabled:opacity-50"
              >
                Volver
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
