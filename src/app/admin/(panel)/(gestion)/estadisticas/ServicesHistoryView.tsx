"use client";

import React, { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import {
  getServicesHistory,
  type HistoryFilterParams,
  type ServicesHistoryResult,
  type HistoryServiceItem,
} from "@/actions/admin-history";
import { formatPlate } from "@/lib/plate";

type MonthOption = { key: string; label: string };
type ServiceOption = { id: string; name: string; category: string };

const clp = (n: number) => `$${n.toLocaleString("es-CL")}`;

export default function ServicesHistoryView({
  initialData,
  availableMonths,
  availableServices,
}: {
  initialData: ServicesHistoryResult;
  availableMonths: MonthOption[];
  availableServices: ServiceOption[];
}) {
  const [data, setData] = useState<ServicesHistoryResult>(initialData);
  const [isPending, startTransition] = useTransition();

  // Filtros de estado local
  const [periodPreset, setPeriodPreset] = useState<HistoryFilterParams["periodPreset"]>("this_month");
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [selectedService, setSelectedService] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<HistoryFilterParams["statusFilter"]>("REALIZED");
  const [customStart, setCustomStart] = useState<string>("");
  const [customEnd, setCustomEnd] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Manejo de cambio de filtros
  const applyFilters = (newParams: Partial<HistoryFilterParams>) => {
    startTransition(async () => {
      const params: HistoryFilterParams = {
        periodPreset: newParams.periodPreset !== undefined ? newParams.periodPreset : periodPreset,
        month: newParams.month !== undefined ? newParams.month : selectedMonth,
        startDate: newParams.startDate !== undefined ? newParams.startDate : customStart,
        endDate: newParams.endDate !== undefined ? newParams.endDate : customEnd,
        serviceId: newParams.serviceId !== undefined ? newParams.serviceId : selectedService,
        statusFilter: newParams.statusFilter !== undefined ? newParams.statusFilter : statusFilter,
        search: newParams.search !== undefined ? newParams.search : searchTerm,
      };

      const result = await getServicesHistory(params);
      setData(result);
    });
  };

  const handlePresetChange = (preset: HistoryFilterParams["periodPreset"]) => {
    setPeriodPreset(preset);
    setSelectedMonth("");
    applyFilters({ periodPreset: preset, month: undefined });
  };

  const handleMonthSelect = (monthKey: string) => {
    setSelectedMonth(monthKey);
    setPeriodPreset("custom");
    applyFilters({ month: monthKey, periodPreset: "custom" });
  };

  const handleServiceChange = (serviceId: string) => {
    setSelectedService(serviceId);
    applyFilters({ serviceId });
  };

  const handleStatusChange = (status: HistoryFilterParams["statusFilter"]) => {
    setStatusFilter(status);
    applyFilters({ statusFilter: status });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters({ search: searchTerm });
  };

  // Exportar a archivo CSV (con BOM para compatibilidad con Excel)
  const exportToCsv = () => {
    const headers = [
      "Fecha",
      "Hora",
      "Cliente",
      "Teléfono",
      "Email",
      "Vehículo",
      "Patente",
      "Servicios",
      "Monto Total (CLP)",
      "Pagado (CLP)",
      "Saldo (CLP)",
      "Estado de Pago",
      "Estado de Trabajo",
    ];

    const rows = data.items.map((item) => [
      item.dateStr,
      item.time,
      `"${item.customerName.replace(/"/g, '""')}"`,
      `"${item.customerPhone}"`,
      `"${item.customerEmail || ""}"`,
      `"${item.vehicleMake} ${item.vehicleModel}"`,
      item.plate ? formatPlate(item.plate) : "",
      `"${item.services.join(" + ").replace(/"/g, '""')}"`,
      item.totalPrice,
      item.paidAmount,
      item.balance,
      item.paymentStatus,
      item.workStatus,
    ]);

    const csvContent = "\uFEFF" + [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `lubrimax-historial-servicios-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* ──────── BARRA DE CONTROL Y FILTROS ──────── */}
      <div className="bg-brand-surface border border-white/10 rounded-2xl p-5 shadow-xl space-y-4">
        
        {/* Fila 1: Presets de Período y Botón Exportar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-white/5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs uppercase tracking-wider text-gray-500 font-bold mr-1">Período:</span>
            
            <button
              type="button"
              onClick={() => handlePresetChange("this_month")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                periodPreset === "this_month" && !selectedMonth
                  ? "bg-brand-cyan text-black shadow-[0_0_12px_rgba(0,229,255,0.4)]"
                  : "bg-white/5 text-gray-300 hover:bg-white/10"
              }`}
            >
              Este mes
            </button>
            
            <button
              type="button"
              onClick={() => handlePresetChange("last_month")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                periodPreset === "last_month" && !selectedMonth
                  ? "bg-brand-cyan text-black shadow-[0_0_12px_rgba(0,229,255,0.4)]"
                  : "bg-white/5 text-gray-300 hover:bg-white/10"
              }`}
            >
              Mes anterior
            </button>

            <button
              type="button"
              onClick={() => handlePresetChange("last_3_months")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                periodPreset === "last_3_months"
                  ? "bg-brand-cyan text-black shadow-[0_0_12px_rgba(0,229,255,0.4)]"
                  : "bg-white/5 text-gray-300 hover:bg-white/10"
              }`}
            >
              Últimos 3 meses
            </button>

            <button
              type="button"
              onClick={() => handlePresetChange("this_year")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                periodPreset === "this_year"
                  ? "bg-brand-cyan text-black shadow-[0_0_12px_rgba(0,229,255,0.4)]"
                  : "bg-white/5 text-gray-300 hover:bg-white/10"
              }`}
            >
              Este año
            </button>

            <button
              type="button"
              onClick={() => handlePresetChange("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                periodPreset === "all"
                  ? "bg-brand-cyan text-black shadow-[0_0_12px_rgba(0,229,255,0.4)]"
                  : "bg-white/5 text-gray-300 hover:bg-white/10"
              }`}
            >
              Todo
            </button>

            <button
              type="button"
              onClick={() => {
                setPeriodPreset("custom");
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                periodPreset === "custom" && !selectedMonth
                  ? "bg-brand-cyan text-black shadow-[0_0_12px_rgba(0,229,255,0.4)]"
                  : "bg-white/5 text-gray-300 hover:bg-white/10"
              }`}
            >
              Personalizado...
            </button>
          </div>

          {/* Botón de exportación */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={exportToCsv}
              disabled={data.items.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/15 text-white border border-white/10 transition-all disabled:opacity-40"
              title="Descargar datos en formato CSV para Excel"
            >
              <svg className="w-4 h-4 text-brand-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Exportar CSV
            </button>
          </div>
        </div>

        {/* Fila 2: Selectores de Mes, Servicio, Estado y Rango Personalizado */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          
          {/* Selector de Mes Directo */}
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-1">
              Ver por Mes:
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => handleMonthSelect(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:border-brand-cyan focus:outline-none"
            >
              <option value="" disabled={!selectedMonth}>
                {selectedMonth ? "Mes seleccionado" : "Elegir un mes específico..."}
              </option>
              {availableMonths.map((m) => (
                <option key={m.key} value={m.key} className="bg-gray-900 text-white">
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* Selector de Servicio */}
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-1">
              Filtrar por Servicio:
            </label>
            <select
              value={selectedService}
              onChange={(e) => handleServiceChange(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:border-brand-cyan focus:outline-none"
            >
              <option value="all" className="bg-gray-900 text-white">
                Todos los servicios ({availableServices.length})
              </option>
              <option value="custom" className="bg-gray-900 text-white">
                [Personalizado] Ingreso local
              </option>
              {availableServices.map((s) => (
                <option key={s.id} value={s.id} className="bg-gray-900 text-white">
                  {s.name} ({s.category})
                </option>
              ))}
            </select>
          </div>

          {/* Selector de Estado Operativo */}
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-1">
              Estado del Trabajo:
            </label>
            <select
              value={statusFilter}
              onChange={(e) => handleStatusChange(e.target.value as any)}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:border-brand-cyan focus:outline-none"
            >
              <option value="REALIZED" className="bg-gray-900 text-white">
                ✅ Realizados (Terminados)
              </option>
              <option value="ALL" className="bg-gray-900 text-white">
                Todos los estados
              </option>
              <option value="IN_PROGRESS" className="bg-gray-900 text-white">
                ⏳ En proceso
              </option>
              <option value="PENDING" className="bg-gray-900 text-white">
                🕒 Pendientes
              </option>
            </select>
          </div>

          {/* Buscador de Texto */}
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-1">
              Búsqueda Rápida:
            </label>
            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                type="text"
                placeholder="Cliente, patente, auto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/40 pl-3 pr-8 py-2 text-sm text-white placeholder-gray-600 focus:border-brand-cyan focus:outline-none"
              />
              <button
                type="submit"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand-cyan"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </form>
          </div>

        </div>

        {/* Fila Opcional: Rango personalizado Desde / Hasta */}
        {periodPreset === "custom" && !selectedMonth && (
          <div className="pt-2 border-t border-white/5 flex flex-wrap items-center gap-3">
            <span className="text-xs text-brand-cyan font-semibold">Rango personalizado:</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Desde:</span>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="rounded-xl border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-white focus:border-brand-cyan focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Hasta:</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="rounded-xl border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-white focus:border-brand-cyan focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => applyFilters({ startDate: customStart, endDate: customEnd, periodPreset: "custom" })}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-brand-cyan text-black hover:bg-cyan-300 transition-colors"
            >
              Aplicar Rango
            </button>
          </div>
        )}

      </div>

      {/* Indicador de carga sutil */}
      {isPending && (
        <div className="flex items-center justify-center gap-2 py-2 text-xs text-brand-cyan animate-pulse">
          <div className="w-2 h-2 rounded-full bg-brand-cyan"></div>
          Actualizando historial de servicios...
        </div>
      )}

      {/* ──────── TARJETAS KPI DEL PERÍODO SELECCIONADO ──────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-brand-surface border border-white/8 rounded-2xl p-4.5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-brand-cyan/5 rounded-full blur-xl group-hover:bg-brand-cyan/10 transition-all"></div>
          <div className="text-xs font-semibold text-gray-400 mb-1">Servicios Realizados</div>
          <div className="text-2xl sm:text-3xl font-black text-brand-cyan">
            {data.kpis.totalJobs}
          </div>
          <div className="text-[11px] text-gray-500 mt-1.5 truncate">
            {data.activePeriodLabel}
          </div>
        </div>

        <div className="bg-brand-surface border border-white/8 rounded-2xl p-4.5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/5 rounded-full blur-xl group-hover:bg-green-500/10 transition-all"></div>
          <div className="text-xs font-semibold text-gray-400 mb-1">Facturación Generada</div>
          <div className="text-2xl sm:text-3xl font-black text-green-400">
            {clp(data.kpis.totalRevenue)}
          </div>
          <div className="text-[11px] text-gray-500 mt-1.5">
            Total recaudado en el período
          </div>
        </div>

        <div className="bg-brand-surface border border-white/8 rounded-2xl p-4.5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-xl group-hover:bg-purple-500/10 transition-all"></div>
          <div className="text-xs font-semibold text-gray-400 mb-1">Ticket Promedio</div>
          <div className="text-2xl sm:text-3xl font-black text-white">
            {clp(data.kpis.avgTicket)}
          </div>
          <div className="text-[11px] text-gray-500 mt-1.5">
            Promedio por vehículo
          </div>
        </div>

        <div className="bg-brand-surface border border-white/8 rounded-2xl p-4.5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl group-hover:bg-amber-500/10 transition-all"></div>
          <div className="text-xs font-semibold text-gray-400 mb-1">Vehículos Atendidos</div>
          <div className="text-2xl sm:text-3xl font-black text-amber-400">
            {data.kpis.uniqueVehicles}
          </div>
          <div className="text-[11px] text-gray-500 mt-1.5">
            Autos únicos registrados
          </div>
        </div>
      </div>

      {/* ──────── DESGLOSE POR SERVICIO Y EVOLUCIÓN MENSUAL ──────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Columna Izquierda: Desglose por Servicio (Ranking) */}
        <div className="lg:col-span-2 bg-brand-surface border border-white/8 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/5">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Desglose por Servicio Realizado
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Volumen y proporción de cada tratamiento en el período seleccionado.
              </p>
            </div>
            {selectedService !== "all" && (
              <button
                type="button"
                onClick={() => handleServiceChange("all")}
                className="text-xs text-brand-cyan hover:underline font-semibold"
              >
                Limpiar filtro
              </button>
            )}
          </div>

          {data.servicesBreakdown.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">No hay datos de servicios para este filtro.</p>
          ) : (
            <div className="space-y-3.5">
              {data.servicesBreakdown.map((s) => {
                const isSelected = selectedService === s.serviceId;
                return (
                  <div
                    key={s.serviceId}
                    onClick={() => handleServiceChange(s.serviceId)}
                    className={`p-2.5 rounded-xl transition-all cursor-pointer border ${
                      isSelected
                        ? "bg-brand-cyan/10 border-brand-cyan/40 shadow-[0_0_15px_rgba(0,229,255,0.15)]"
                        : "bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-white/10"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{s.serviceName}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-gray-400 font-medium">
                          {s.category}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-gray-400">
                          <strong className="text-brand-cyan">{s.count}</strong> veces ({s.percentage}%)
                        </span>
                        <span className="font-semibold text-green-400">
                          {clp(s.estimatedRevenue)}
                        </span>
                      </div>
                    </div>

                    {/* Barra de Progreso */}
                    <div className="w-full h-1.5 bg-black/50 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-brand-cyan to-blue-500 rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(s.percentage, 3)}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Columna Derecha: Evolución por Mes */}
        <div className="bg-brand-surface border border-white/8 rounded-2xl p-5 flex flex-col">
          <div className="mb-4 pb-2 border-b border-white/5">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Evolución Mensual
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Comparativa por período de facturación.
            </p>
          </div>

          {data.monthlyBreakdown.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">Sin registros.</p>
          ) : (
            <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar">
              {data.monthlyBreakdown.map((m) => {
                const isSelected = selectedMonth === m.monthKey;
                return (
                  <div
                    key={m.monthKey}
                    onClick={() => handleMonthSelect(m.monthKey)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-brand-cyan/15 border-brand-cyan/50 text-white"
                        : "bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-white/10"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-bold text-white">{m.label}</span>
                      <span className="text-brand-cyan font-bold">{m.count} trabajos</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-gray-400">
                      <span>Total facturado:</span>
                      <span className="font-semibold text-green-400">{clp(m.revenue)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* ──────── TABLA / LISTADO DETALLADO DE SERVICIOS REALIZADOS ──────── */}
      <div className="bg-brand-surface border border-white/8 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 sm:p-5 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Detalle de Servicios Realizados
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Mostrando {data.items.length} {data.items.length === 1 ? "trabajo" : "trabajos"} para el período activo.
            </p>
          </div>
        </div>

        {data.items.length === 0 ? (
          <div className="text-center py-12 px-4">
            <svg className="w-12 h-12 text-gray-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm font-semibold text-gray-300">No se encontraron servicios realizados</p>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              Intenta cambiar los filtros de período, seleccionar otro mes o limpiar el buscador.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02] text-gray-400 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Fecha y Hora</th>
                  <th className="py-3 px-4">Vehículo / Patente</th>
                  <th className="py-3 px-4">Cliente</th>
                  <th className="py-3 px-4">Servicio(s) Realizado(s)</th>
                  <th className="py-3 px-4 text-right">Monto</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                  <th className="py-3 px-4 text-right">Ficha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {data.items.map((item) => (
                  <tr key={item.id} className="hover:bg-white/[0.03] transition-colors">
                    {/* Fecha y Hora */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-bold text-white text-[13px]">{item.dateStr}</div>
                      <div className="text-[11px] text-brand-cyan">{item.time} hrs</div>
                    </td>

                    {/* Vehículo / Patente */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-semibold text-white">
                        {item.vehicleMake} {item.vehicleModel}
                      </div>
                      {item.plate ? (
                        <span className="inline-block mt-1 px-1.5 py-0.5 rounded border border-white/20 bg-black/50 text-[10px] font-mono text-yellow-300 uppercase font-bold tracking-wider">
                          {formatPlate(item.plate)}
                        </span>
                      ) : (
                        <span className="text-[11px] text-gray-500 italic">Sin patente</span>
                      )}
                    </td>

                    {/* Cliente */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-medium text-white">{item.customerName}</div>
                      <div className="text-[11px] text-gray-400 flex items-center gap-1.5 mt-0.5">
                        <span>{item.customerPhone}</span>
                        {item.customerPhone && (
                          <a
                            href={`https://wa.me/${item.customerPhone.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-green-400 hover:text-green-300"
                            title="Abrir WhatsApp"
                          >
                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z" />
                            </svg>
                          </a>
                        )}
                      </div>
                    </td>

                    {/* Servicios */}
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="flex flex-wrap gap-1">
                        {item.services.map((srv, idx) => (
                          <span
                            key={idx}
                            className="inline-block px-2 py-0.5 rounded-md bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/20 text-[11px] font-medium leading-tight"
                          >
                            {srv}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Monto y Pago */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="font-bold text-white text-[13px]">{clp(item.totalPrice)}</div>
                      {item.balance === 0 ? (
                        <div className="text-[10px] text-green-400 font-semibold">Pagado 100%</div>
                      ) : (
                        <div className="text-[10px] text-amber-400 font-semibold">
                          Saldo: {clp(item.balance)}
                        </div>
                      )}
                    </td>

                    {/* Estado de Trabajo */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      {item.workStatus === "DONE" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-green-500/15 text-green-400 border border-green-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
                          Terminado
                        </span>
                      ) : item.workStatus === "IN_PROGRESS" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                          En proceso
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-gray-500/15 text-gray-400 border border-gray-500/30">
                          Pendiente
                        </span>
                      )}
                    </td>

                    {/* Enlace a Ficha */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      {item.clientId ? (
                        <Link
                          href={`/admin/clientes/${item.clientId}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-brand-cyan transition-colors"
                        >
                          Ficha →
                        </Link>
                      ) : (
                        <Link
                          href={`/admin/clientes/web-${item.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-gray-400 transition-colors"
                        >
                          Cita →
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
