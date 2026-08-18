import dynamic from "next/dynamic";
import Hero from "@/components/dom/Hero";

const ReelsGallery = dynamic(() => import("@/components/dom/ReelsGallery"), {
  loading: () => <div className="h-[600px] md:h-[650px] w-full animate-pulse bg-white/5 rounded-2xl flex items-center justify-center text-white/50">Cargando resultados...</div>
});
import Services from "@/components/dom/Services";
import Stats from "@/components/dom/Stats";
import PromoTicker from "@/components/dom/PromoTicker";
import FinalCTA from "@/components/dom/FinalCTA";
import Footer from "@/components/dom/Footer";
import { getSettings } from "@/actions/admin-settings";

export default async function Home() {
  const settings = await getSettings();

  return (
    <div className="flex flex-col min-h-screen bg-brand-pure">
      <Hero />
      
      {/* Estadísticas de Alto Impacto (Confianza inmediata) */}
      <Stats />

      {/* Sección principal de Videos (Reels / Social Proof) */}
      <section id="resultados" className="pt-24 pb-8 md:pb-12 max-w-7xl mx-auto px-4 w-full">
        <h2 className="text-3xl md:text-5xl font-bold italic uppercase tracking-widest text-brand-chrome mb-4 text-center flex flex-col md:block">
          <span>Resultados</span> <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-blue to-brand-cyan">Clínicos</span>
        </h2>
        <p className="text-gray-400 text-center mb-8 max-w-2xl mx-auto">
          Desliza para ver nuestro trabajo en acción directamente desde Instagram
        </p>
        <div>
          <ReelsGallery reels={settings?.homeVideos || []} />
        </div>
      </section>

      {/* Servicios Dinámicos (Oferta lógica) */}
      <Services />

      {/* Llamado a la acción estratégico */}
      <FinalCTA />

      {/* Promoción Sorpresa antes del Footer */}
      <PromoTicker />

      {/* Footer Corporativo */}
      <Footer />
    </div>
  );
}
