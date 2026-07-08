import dynamic from "next/dynamic";
import Hero from "@/components/dom/Hero";

const ReelsGallery = dynamic(() => import("@/components/dom/ReelsGallery"), {
  loading: () => <div className="h-[500px] w-full animate-pulse bg-white/5 rounded-2xl flex items-center justify-center text-white/50">Cargando resultados...</div>
});
import Services from "@/components/dom/Services";
import Stats from "@/components/dom/Stats";
import FinalCTA from "@/components/dom/FinalCTA";
import Footer from "@/components/dom/Footer";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-brand-pure">
      <Hero />
      
      {/* Estadísticas de Alto Impacto (Confianza inmediata) */}
      <Stats />

      {/* Servicios Dinámicos (Oferta lógica) */}
      <Services />

      {/* Sección principal de Videos (Reels / Social Proof) */}
      <section id="resultados" className="py-24 max-w-7xl mx-auto px-4 w-full">
        <h2 className="text-3xl md:text-5xl font-bold italic uppercase tracking-widest text-brand-chrome mb-12 text-center flex flex-col md:block">
          <span>Resultados</span> <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-blue to-brand-cyan">Clínicos</span>
        </h2>
        <ReelsGallery />
      </section>

      {/* Llamado a la acción estratégico */}
      <FinalCTA />

      {/* Footer Corporativo */}
      <Footer />
    </div>
  );
}
