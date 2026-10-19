"use client";

import React, { useState } from "react";
import ServicesHistoryView from "./ServicesHistoryView";
import type { ServicesHistoryResult } from "@/actions/admin-history";
import { PAYMENT_METHODS, type PaymentMethod } from "@/lib/booking-money";

type MonthOption = { key: string; label: string };
type ServiceOption = { id: string; name: string; category: string };

export default function EstadisticasTabs({
  initialHistory,
  availableMonths,
  availableServices,
  completedJobsThisMonth,
  totalIncome,
  incomeByMethod,
  intakesThisMonth,
}: {
  initialHistory: ServicesHistoryResult;
  availableMonths: MonthOption[];
  availableServices: ServiceOption[];
  completedJobsThisMonth: number;
  totalIncome: number;
  incomeByMethod: [string, number][];
  intakesThisMonth: number;
}) {
  const [activeTab, setActiveTab] = useState<"history" | "cashflow">("history");

  return (
    <div className="space-y-6">
      {/* Selector de Pestañas Principal */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("history")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === "history"
              ? "bg-brand-cyan text-black shadow-[0_0_15px_rgba(0,229,255,0.3)]"
              : "text-gray-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          Historial de Servicios
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("cashflow")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === "cashflow"
              ? "bg-brand-cyan text-black shadow-[0_0_15px_rgba(0,229,255,0.3)]"
              : "text-gray-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Flujo de Caja del Mes
        </button>
      </div>

      {/* Contenido de la pestaña activa */}
      {activeTab === "history" ? (
        <ServicesHistoryView
          initialData={initialHistory}
          availableMonths={availableMonths}
          availableServices={availableServices}
        />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-brand-surface border border-white/5 rounded-2xl p-5 flex flex-col justify-center">
              <div className="text-sm font-semibold text-gray-400 mb-1">Trabajos Terminados Este Mes</div>
              <div className="text-3xl font-black text-brand-cyan">{completedJobsThisMonth}</div>
              <div className="text-xs text-gray-600 mt-2">Reservas con trabajo completado</div>
            </div>

            <div className="bg-brand-surface border border-white/5 rounded-2xl p-5 flex flex-col justify-center">
              <div className="text-sm font-semibold text-gray-400 mb-1">Ingresos del Mes</div>
              <div className="text-3xl font-black text-green-400">
                ${totalIncome.toLocaleString("es-CL")}
              </div>
              <div className="text-xs text-gray-600 mt-2 space-y-1">
                {incomeByMethod.length === 0 ? (
                  <span>Sin pagos registrados este mes</span>
                ) : (
                  incomeByMethod.map(([method, amount]) => (
                    <div key={method} className="flex justify-between gap-2">
                      <span className="text-gray-400">{PAYMENT_METHODS[method as PaymentMethod] ?? method}</span>
                      <span className="text-gray-200 font-semibold">${amount.toLocaleString("es-CL")}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-brand-surface border border-white/5 rounded-2xl p-5 flex flex-col justify-center">
              <div className="text-sm font-semibold text-gray-400 mb-1">Vehículos Recibidos Este Mes</div>
              <div className="text-3xl font-black text-white">{intakesThisMonth}</div>
              <div className="text-xs text-gray-600 mt-2">Registrados en recepción</div>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h2 className="text-sm font-bold text-white uppercase tracking-widest mb-2 flex items-center gap-2">
              <svg className="w-4 h-4 text-brand-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Acerca del Registro y Persistencia
            </h2>
            <p className="text-sm text-gray-400 leading-relaxed">
              Toda la información operativa (servicios agendados, trabajos terminados, recepción física e ingresos de vehículos) se almacena permanentemente en la base de datos de Lubrimax de forma automática. Aunque un servicio se marque como "Terminado" o "Entregado" y salga del tablero diario, sus datos persisten para siempre en el historial del negocio y pueden ser consultados y exportados en la pestaña <strong>Historial de Servicios</strong>.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
