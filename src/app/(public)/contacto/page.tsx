import React from 'react';
import { MapPin, Phone, Mail, Clock, Send } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'Contacto | Lubrimax',
  description: 'Contáctanos para agendar tu servicio o resolver tus dudas.',
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-brand-pure text-white relative overflow-hidden">
      
      {/* Hero Background */}
      <div className="absolute top-0 left-0 w-full h-[40vh] z-0">
        <div 
          className="absolute inset-0 opacity-40 mix-blend-luminosity"
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&q=80')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-brand-pure via-brand-pure/60 to-brand-pure z-10" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 pt-32 pb-24">
        
        <header className="mb-16 text-center">
          <h1 className="text-4xl md:text-5xl font-black uppercase tracking-widest italic mb-4 drop-shadow-md">
            Ponte en <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-cyan to-blue-500">Contacto</span>
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto text-lg">
            ¿Tienes alguna duda o quieres cotizar un servicio especial? Escríbenos o visítanos directamente en nuestra clínica estética.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24">
          
          {/* Información de Contacto */}
          <div>
            <h2 className="text-2xl font-bold uppercase tracking-widest mb-8 text-brand-cyan">Información</h2>
            
            <div className="space-y-8">
              <div className="flex items-start gap-4 group">
                <div className="bg-brand-cyan/10 p-4 rounded-full text-brand-cyan group-hover:bg-brand-cyan group-hover:text-black transition-colors">
                  <MapPin className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg uppercase tracking-wider mb-1">Ubicación</h3>
                  <p className="text-gray-400 mb-2">Av. Gabriela Mistral 3061, La Serena, Coquimbo.</p>
                  <a 
                    href="https://www.google.com/maps/search/?api=1&query=Av.+Gabriela+Mistral+3061,+La+Serena"
                    target="_blank"
                    rel="noreferrer"
                    className="text-brand-cyan text-sm uppercase tracking-widest font-bold hover:text-white transition-colors"
                  >
                    Abrir en Google Maps →
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4 group">
                <div className="bg-brand-cyan/10 p-4 rounded-full text-brand-cyan group-hover:bg-brand-cyan group-hover:text-black transition-colors">
                  <Phone className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg uppercase tracking-wider mb-1">Teléfono / WhatsApp</h3>
                  <p className="text-gray-400 mb-2">+56 9 8270 3493</p>
                  <a 
                    href="https://wa.me/56982703493?text=Hola, me gustaría recibir más información."
                    target="_blank"
                    rel="noreferrer"
                    className="text-brand-cyan text-sm uppercase tracking-widest font-bold hover:text-white transition-colors"
                  >
                    Enviar Mensaje →
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4 group">
                <div className="bg-brand-cyan/10 p-4 rounded-full text-brand-cyan group-hover:bg-brand-cyan group-hover:text-black transition-colors">
                  <Mail className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg uppercase tracking-wider mb-1">Correo Electrónico</h3>
                  <p className="text-gray-400 mb-2">contacto@lubrimax.cl</p>
                  <a 
                    href="mailto:contacto@lubrimax.cl"
                    className="text-brand-cyan text-sm uppercase tracking-widest font-bold hover:text-white transition-colors"
                  >
                    Escribir Correo →
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4 group">
                <div className="bg-brand-cyan/10 p-4 rounded-full text-brand-cyan group-hover:bg-brand-cyan group-hover:text-black transition-colors">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg uppercase tracking-wider mb-1">Horarios</h3>
                  <p className="text-gray-400">Lunes a Viernes: 09:00 - 18:00</p>
                  <p className="text-gray-400">Sábados: 09:00 - 14:00 (Solo agendados)</p>
                </div>
              </div>
            </div>
          </div>

          {/* Formulario de Contacto */}
          <div className="bg-brand-surface/80 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-cyan/20 blur-[60px] rounded-full pointer-events-none" />
            <h2 className="text-2xl font-bold uppercase tracking-widest mb-8">Envíanos un Mensaje</h2>
            
            <form className="space-y-6 relative z-10">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="name" className="block text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-2">Nombre Completo</label>
                  <input type="text" id="name" placeholder="Ej. Juan Pérez" className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan transition-all" required />
                </div>
                <div>
                  <label htmlFor="phone" className="block text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-2">Teléfono</label>
                  <input type="tel" id="phone" placeholder="+56 9 XXXX XXXX" className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan transition-all" required />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-2">Correo Electrónico</label>
                <input type="email" id="email" placeholder="juan@ejemplo.com" className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan transition-all" required />
              </div>

              <div>
                <label htmlFor="subject" className="block text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-2">Asunto</label>
                <select id="subject" className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white appearance-none focus:outline-none focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan transition-all">
                  <option value="cotizacion">Cotización de Servicios</option>
                  <option value="duda">Dudas Generales</option>
                  <option value="reclamo">Sugerencias o Reclamos</option>
                  <option value="alianza">Alianzas y Empresas</option>
                </select>
              </div>

              <div>
                <label htmlFor="message" className="block text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-2">Mensaje</label>
                <textarea id="message" rows={4} placeholder="Escribe tu mensaje aquí..." className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan transition-all resize-none" required></textarea>
              </div>

              <button type="button" className="w-full bg-brand-cyan hover:bg-white text-black font-bold uppercase tracking-widest text-sm py-4 rounded-lg transition-colors flex items-center justify-center gap-2 group">
                <Send className="w-4 h-4 group-hover:-translate-y-1 group-hover:translate-x-1 transition-transform" />
                Enviar Mensaje
              </button>
              <p className="text-center text-xs text-gray-500 mt-4">
                También puedes escribirnos directamente por <a href="https://wa.me/56982703493" target="_blank" rel="noreferrer" className="text-[#25D366] hover:underline">WhatsApp</a> para una respuesta más rápida.
              </p>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
}
