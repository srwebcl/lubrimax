"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { getServices, getAvailableSlots, createBooking } from "@/actions/booking";
import { getSessionCustomer } from "@/actions/customer-auth";

type Service = { 
  id: string; 
  name: string; 
  duration: number; 
  priceAuto: number | null;
  priceSuv2: number | null;
  priceSuv3: number | null;
  category: string;
};

const VEHICLE_TYPES = [
  'Auto / Hatchback',
  'SUV 2 Corridas',
  'SUV 3 Corridas / Camioneta'
] as const;

export default function BookingWizard() {
  const wizardRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(1);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [vehicleType, setVehicleType] = useState<string>("");
  const [selectedService, setSelectedService] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    plate: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [customerInfo, setCustomerInfo] = useState<any>(null);

  useEffect(() => {
    async function loadServicesAndSession() {
      const data = await getServices();
      setServices(data as Service[]);
      
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

  // Fetch slots when date is selected
  useEffect(() => {
    if (selectedDate && selectedService) {
      async function fetchSlots() {
        const slots = await getAvailableSlots(format(selectedDate!, "yyyy-MM-dd"), selectedService);
        setAvailableSlots(slots);
        setSelectedSlot("");
      }
      fetchSlots();
    }
  }, [selectedDate, selectedService]);

  const handleNext = () => setStep((s) => s + 1);
  const handlePrev = () => setStep((s) => s - 1);

  // Auto-scroll to top of wizard when step changes
  useEffect(() => {
    if (wizardRef.current) {
      const yOffset = wizardRef.current.getBoundingClientRect().top + window.scrollY - 100;
      window.scrollTo({ top: yOffset, behavior: "smooth" });
    }
  }, [step]);

  const getExactPrice = (service: Service): number => {
    if (vehicleType === VEHICLE_TYPES[1]) return service.priceSuv2 || 0;
    if (vehicleType === VEHICLE_TYPES[2]) return service.priceSuv3 || 0;
    return service.priceAuto || 0;
  };

  const selectedServiceData = services.find(s => s.id === selectedService);
  let totalAmount = selectedServiceData ? getExactPrice(selectedServiceData) : 0;
  
  // Aplicar descuento del club
  const discountPercent = customerInfo?.membership?.discountPercent || 0;
  if (discountPercent > 0) {
    totalAmount = totalAmount - (totalAmount * (discountPercent / 100));
  }
  
  const reservationAmount = totalAmount * 0.2;

  const handlePayment = async (type: 'RESERVATION' | 'FULL') => {
    // Validar form
    if (!formData.name || !formData.phone || !formData.plate) {
      alert("Por favor completa los datos de contacto y patente.");
      return;
    }

    setSubmitting(true);
    setPaymentStatus("Procesando Pago...");
    
    // Simulate payment gateway delay (2 seconds)
    await new Promise(resolve => setTimeout(resolve, 2000));
    setPaymentStatus("Confirmando Reserva...");

    if (!selectedDate || !selectedSlot || !selectedService) return;

    const res = await createBooking({
      date: format(selectedDate!, "yyyy-MM-dd"),
      startTime: selectedSlot,
      serviceId: selectedService,
      customerName: formData.name,
      customerPhone: formData.phone,
      customerEmail: formData.email,
      vehicleMake: vehicleType,
      vehicleModel: formData.plate,
      paymentStatus: type === 'RESERVATION' ? 'PAID_RESERVATION' : 'PAID_FULL',
    });

    if (res.success) {
      setConfirmed(true);
    } else {
      alert("Error al confirmar la reserva: " + res.error);
    }
    setSubmitting(false);
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
          Te esperamos el <strong className="text-brand-chrome">{selectedDate && format(selectedDate, "dd 'de' MMMM", { locale: es })}</strong> a las <strong className="text-brand-chrome">{selectedSlot} hrs</strong>.
        </p>
        <div className="bg-brand-pure p-4 rounded mb-8 text-sm text-brand-chrome border border-white/5">
          Vehículo: {vehicleType} | Patente: {formData.plate}
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
                <p className="text-gray-400">Precios exactos para: <strong className="text-brand-cyan">{vehicleType}</strong></p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              {services.map(s => {
                const exactPrice = getExactPrice(s);
                return (
                  <button
                    key={s.id}
                    onClick={() => setSelectedService(s.id)}
                    className={`p-6 text-left border rounded transition-all duration-300 flex flex-col ${selectedService === s.id ? 'border-brand-cyan bg-brand-cyan/10 shadow-[0_0_15px_rgba(56,189,248,0.2)]' : 'border-white/10 hover:border-brand-cyan/50'}`}
                  >
                    <div className="text-xs text-gray-500 uppercase tracking-widest mb-2">{s.category}</div>
                    <div className="font-bold text-lg text-white mb-1">{s.name}</div>
                    <div className="text-brand-cyan text-xl font-black mt-auto pt-4">${exactPrice.toLocaleString('es-CL')}</div>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-between gap-4">
              <button 
                onClick={handlePrev}
                className="w-full sm:w-auto bg-transparent border border-white/10 text-white px-4 md:px-8 py-3 rounded hover:bg-white/5 transition-colors uppercase tracking-wider md:tracking-widest font-bold text-xs md:text-sm whitespace-nowrap"
              >
                Volver
              </button>
              <button 
                disabled={!selectedService}
                onClick={handleNext}
                className="w-full sm:w-auto bg-brand-chrome text-brand-pure px-4 md:px-8 py-3 rounded hover:bg-brand-cyan disabled:opacity-50 transition-colors uppercase tracking-wider md:tracking-widest font-bold text-xs md:text-sm whitespace-nowrap"
              >
                Continuar al Calendario
              </button>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div key="step3" variants={variants} initial="initial" animate="animate" exit="exit">
            <h3 className="text-2xl font-bold text-white mb-6 uppercase tracking-wider">3. Selecciona Fecha y Hora</h3>
            
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
                  <p className="text-gray-500 text-sm bg-black/20 p-4 rounded">Selecciona un día en el calendario para calcular disponibilidad técnica.</p>
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
              <div className="lg:col-span-3 space-y-4">
                <h4 className="text-brand-cyan text-sm uppercase tracking-widest font-bold mb-4">Tus Datos</h4>
                <div>
                  <label className="block text-gray-400 text-xs uppercase tracking-widest mb-2">Nombre Completo</label>
                  <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-brand-pure border border-white/10 rounded p-3 text-white focus:outline-none focus:border-brand-cyan" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-400 text-xs uppercase tracking-widest mb-2">Teléfono</label>
                    <input required type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-brand-pure border border-white/10 rounded p-3 text-white focus:outline-none focus:border-brand-cyan" />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-xs uppercase tracking-widest mb-2">Patente</label>
                    <input required type="text" value={formData.plate} onChange={e => setFormData({...formData, plate: e.target.value})} className="w-full bg-brand-pure border border-white/10 rounded p-3 text-white focus:outline-none focus:border-brand-cyan" />
                  </div>
                </div>
                <div>
                  <label className="block text-gray-400 text-xs uppercase tracking-widest mb-2">Email</label>
                  <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-brand-pure border border-white/10 rounded p-3 text-white focus:outline-none focus:border-brand-cyan" />
                </div>
              </div>

              <div className="lg:col-span-2">
                <div className="bg-brand-pure border border-white/10 rounded-lg p-6 sticky top-6">
                  <h4 className="text-white text-sm uppercase tracking-widest font-bold mb-6 border-b border-white/10 pb-4">Resumen de Compra</h4>
                  
                  <div className="space-y-4 mb-6">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Servicio</span>
                      <span className="text-white font-bold">{selectedServiceData?.name}</span>
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
