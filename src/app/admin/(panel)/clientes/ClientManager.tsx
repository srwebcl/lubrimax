"use client";

import React, { useState } from "react";
import Link from "next/link";
import { formatPlate } from "@/lib/plate";
import { formatPhone, titleCase } from "@/lib/contact";
import { Screen, PageHead, Empty } from "@/components/admin/kit";

export type UnifiedClient = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  rut: string | null;
  source: "Taller" | "Web";
  vehicles: { plate: string; make: string; model: string }[];
  date: Date;
};

export default function ClientManager({ initialClients }: { initialClients: UnifiedClient[] }) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredClients = initialClients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (c.rut && c.rut.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (c.phone && c.phone.includes(searchTerm)) ||
    (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    c.vehicles.some(v => v.plate.toLowerCase().includes(searchTerm.toLowerCase()) || v.make.toLowerCase().includes(searchTerm.toLowerCase()) || v.model.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <Screen size="xl">
      <PageHead
        title="Directorio de Clientes"
        subtitle="Listado unificado de clientes registrados en el taller y por reservas web."
        action={
          <div className="relative w-64 hidden sm:block">
            <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar cliente, patente, teléfono..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-cyan transition-colors"
            />
          </div>
        }
      />
      
      {/* Buscador móvil */}
      <div className="sm:hidden relative w-full mb-4">
        <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Buscar cliente..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-cyan transition-colors"
        />
      </div>

      {initialClients.length === 0 ? (
        <Empty>Aún no hay clientes registrados en el sistema.</Empty>
      ) : filteredClients.length === 0 ? (
        <Empty>No se encontraron clientes que coincidan con la búsqueda.</Empty>
      ) : (
        <>
          {/* Escritorio: listado tipo tabla */}
          <div className="hidden md:block rounded-2xl border border-white/8 overflow-x-auto custom-scrollbar">
            <table className="w-full text-sm border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-white/[0.03] text-left text-[11px] uppercase tracking-wider text-gray-500">
                  <th className="py-3 pl-4 pr-3 font-semibold">Cliente</th>
                  <th className="py-3 px-3 font-semibold">Contacto</th>
                  <th className="py-3 pl-3 pr-4 font-semibold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/6">
                {filteredClients.map((c) => (
                  <tr key={c.id} className="hover:bg-white/[0.025] transition-colors">
                    <td className="py-4 pl-4 pr-3 align-middle">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-base whitespace-nowrap">{titleCase(c.name)}</span>
                        {c.rut && <span className="text-xs text-gray-500 bg-white/5 px-2 py-0.5 rounded-md whitespace-nowrap">{c.rut}</span>}
                      </div>
                    </td>
                    <td className="py-4 px-3 align-middle text-gray-400 text-sm">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                        {c.phone && <span className="text-white whitespace-nowrap">{formatPhone(c.phone)}</span>}
                        {c.email && <span className="text-xs truncate max-w-[200px]" title={c.email}>{c.email}</span>}
                      </div>
                    </td>
                    <td className="py-4 pl-3 pr-4 align-middle text-right">
                      <Link 
                        href={`/admin/clientes/${c.id}`}
                        className="inline-block text-xs font-bold px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-brand-cyan hover:bg-brand-cyan hover:text-black hover:border-brand-cyan transition-all whitespace-nowrap shadow-sm"
                      >
                        Ver Perfil
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Móvil: tarjetas */}
          <ul className="md:hidden space-y-3">
            {filteredClients.map((c) => (
              <li key={c.id} className="bg-brand-surface border border-white/5 p-4 rounded-2xl flex flex-col gap-3">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <div className="font-bold text-white text-lg">{titleCase(c.name)}</div>
                    {c.rut && <div className="text-xs text-gray-500">RUT: {c.rut}</div>}
                  </div>
                </div>
                
                <div className="text-sm text-gray-400 space-y-0.5">
                  {c.phone && <div>{formatPhone(c.phone)}</div>}
                  {c.email && <div>{c.email}</div>}
                </div>

                <div className="pt-2 border-t border-white/5">
                  <div className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold mb-1.5">Vehículos</div>
                  {c.vehicles.length === 0 ? (
                    <div className="text-xs text-gray-600 mb-3">Sin vehículos</div>
                  ) : (
                     <div className="flex flex-wrap gap-2 mb-3">
                      {c.vehicles.map((v, i) => (
                        <div key={i} className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-2 py-1 rounded-md text-xs">
                          {v.plate && (
                            <span className="text-white font-mono font-bold uppercase">
                              {formatPlate(v.plate)}
                            </span>
                          )}
                          <span className="text-gray-400">{v.make} {v.model}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <Link 
                    href={`/admin/clientes/${c.id}`}
                    className="w-full inline-block text-center text-xs font-bold px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-brand-cyan hover:bg-brand-cyan hover:text-black hover:border-brand-cyan transition-all shadow-sm"
                  >
                    Abrir Perfil de Cliente
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </Screen>
  );
}
