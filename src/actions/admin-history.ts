"use server";

import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/staff-session";
import { bookingMoney } from "@/lib/booking-money";
import { bookingServiceNames, customServiceDetail, selectedVariantOf } from "@/lib/booking-services";
import { chileNow } from "@/lib/chile-time";

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

export type HistoryFilterParams = {
  periodPreset?: "this_month" | "last_month" | "last_3_months" | "last_6_months" | "this_year" | "all" | "custom";
  month?: string; // "YYYY-MM"
  startDate?: string; // "YYYY-MM-DD"
  endDate?: string; // "YYYY-MM-DD"
  serviceId?: string; // "all" o id de servicio
  statusFilter?: "REALIZED" | "ALL" | "IN_PROGRESS" | "PENDING";
  search?: string;
};

export type HistoryServiceItem = {
  id: string;
  date: string; // ISO
  dateStr: string; // "19/10/2026"
  monthKey: string; // "2026-10"
  time: string; // "10:00 - 14:00"
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  vehicleMake: string;
  vehicleModel: string;
  plate: string | null;
  services: string[];
  totalPrice: number;
  paidAmount: number;
  balance: number;
  paymentStatus: string;
  workStatus: string;
  status: string;
  clientId: string | null;
  intakeId: string | null;
};

export type ServiceBreakdownItem = {
  serviceId: string;
  serviceName: string;
  category: string;
  count: number;
  percentage: number;
  estimatedRevenue: number;
};

export type MonthlyBreakdownItem = {
  monthKey: string;
  label: string;
  count: number;
  revenue: number;
};

export type ServicesHistoryResult = {
  items: HistoryServiceItem[];
  kpis: {
    totalJobs: number;
    totalRevenue: number;
    avgTicket: number;
    uniqueVehicles: number;
  };
  servicesBreakdown: ServiceBreakdownItem[];
  monthlyBreakdown: MonthlyBreakdownItem[];
  activePeriodLabel: string;
};

function formatMonthLabel(yyyyMm: string): string {
  const [y, m] = yyyyMm.split("-").map(Number);
  if (!y || !m || m < 1 || m > 12) return yyyyMm;
  return `${MONTH_NAMES[m - 1]} ${y}`;
}

/**
 * Obtiene las opciones disponibles para los filtros (meses con registros y catálogo de servicios).
 */
export async function getServicesHistoryFilterOptions() {
  await requireStaff();

  const [dateRecords, services] = await Promise.all([
    prisma.booking.findMany({
      select: { date: true },
      orderBy: { date: "desc" },
      take: 2000,
    }),
    prisma.service.findMany({
      select: {
        id: true,
        name: true,
        category: true,
        serviceCategory: { select: { name: true } },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  const distinctMonthsSet = new Set<string>();
  const currentMonthKey = chileNow().date.slice(0, 7);
  distinctMonthsSet.add(currentMonthKey);

  for (const record of dateRecords) {
    const key = record.date.toISOString().slice(0, 7);
    distinctMonthsSet.add(key);
  }

  const months = [...distinctMonthsSet]
    .sort((a, b) => b.localeCompare(a))
    .map((key) => ({
      key,
      label: formatMonthLabel(key),
    }));

  const serviceOptions = services.map((s) => ({
    id: s.id,
    name: s.name,
    category: s.serviceCategory?.name || s.category || "General",
  }));

  return { months, services: serviceOptions };
}

/**
 * Consulta el historial de servicios realizados con filtros por período, mes, servicio y estado.
 */
export async function getServicesHistory(params: HistoryFilterParams = {}): Promise<ServicesHistoryResult> {
  await requireStaff();

  const currentChile = chileNow();
  const currentMonthKey = currentChile.date.slice(0, 7);

  const preset = params.periodPreset || (params.month ? "custom" : "this_month");
  let startDate: Date | undefined;
  let endDate: Date | undefined;
  let activePeriodLabel = "Mes Actual";

  if (params.month) {
    const [y, m] = params.month.split("-").map(Number);
    startDate = new Date(Date.UTC(y, m - 1, 1));
    const nextMonth = m === 12 ? new Date(Date.UTC(y + 1, 0, 1)) : new Date(Date.UTC(y, m, 1));
    endDate = new Date(nextMonth.getTime() - 1);
    activePeriodLabel = formatMonthLabel(params.month);
  } else if (preset === "this_month") {
    const [y, m] = currentMonthKey.split("-").map(Number);
    startDate = new Date(Date.UTC(y, m - 1, 1));
    const nextMonth = m === 12 ? new Date(Date.UTC(y + 1, 0, 1)) : new Date(Date.UTC(y, m, 1));
    endDate = new Date(nextMonth.getTime() - 1);
    activePeriodLabel = `${formatMonthLabel(currentMonthKey)} (Este mes)`;
  } else if (preset === "last_month") {
    const [cy, cm] = currentMonthKey.split("-").map(Number);
    const lastYear = cm === 1 ? cy - 1 : cy;
    const lastMonth = cm === 1 ? 12 : cm - 1;
    startDate = new Date(Date.UTC(lastYear, lastMonth - 1, 1));
    const thisMonthStart = new Date(Date.UTC(cy, cm - 1, 1));
    endDate = new Date(thisMonthStart.getTime() - 1);
    const lKey = `${lastYear}-${String(lastMonth).padStart(2, "0")}`;
    activePeriodLabel = `${formatMonthLabel(lKey)} (Mes anterior)`;
  } else if (preset === "last_3_months") {
    const [cy, cm] = currentMonthKey.split("-").map(Number);
    const startM = new Date(Date.UTC(cy, cm - 3, 1));
    startDate = startM;
    const nextMonth = cm === 12 ? new Date(Date.UTC(cy + 1, 0, 1)) : new Date(Date.UTC(cy, cm, 1));
    endDate = new Date(nextMonth.getTime() - 1);
    activePeriodLabel = "Últimos 3 meses";
  } else if (preset === "last_6_months") {
    const [cy, cm] = currentMonthKey.split("-").map(Number);
    const startM = new Date(Date.UTC(cy, cm - 6, 1));
    startDate = startM;
    const nextMonth = cm === 12 ? new Date(Date.UTC(cy + 1, 0, 1)) : new Date(Date.UTC(cy, cm, 1));
    endDate = new Date(nextMonth.getTime() - 1);
    activePeriodLabel = "Últimos 6 meses";
  } else if (preset === "this_year") {
    const cy = parseInt(currentMonthKey.slice(0, 4), 10);
    startDate = new Date(Date.UTC(cy, 0, 1));
    endDate = new Date(Date.UTC(cy, 11, 31, 23, 59, 59));
    activePeriodLabel = `Año ${cy}`;
  } else if (preset === "all") {
    activePeriodLabel = "Todo el historial registrado";
  } else if (preset === "custom" && (params.startDate || params.endDate)) {
    if (params.startDate) startDate = new Date(`${params.startDate}T00:00:00.000Z`);
    if (params.endDate) endDate = new Date(`${params.endDate}T23:59:59.999Z`);
    activePeriodLabel = `Rango personalizado: ${params.startDate || "Inicio"} a ${params.endDate || "Hoy"}`;
  }

  // Filtro de estado
  const statusFilter = params.statusFilter || "REALIZED";
  const whereClause: any = {};

  if (startDate || endDate) {
    whereClause.date = {};
    if (startDate) whereClause.date.gte = startDate;
    if (endDate) whereClause.date.lte = endDate;
  }

  if (statusFilter === "REALIZED") {
    // Servicios realizados: terminados en taller (workStatus DONE) o entregados
    whereClause.OR = [
      { workStatus: "DONE" },
      { intakes: { some: { status: "DELIVERED" } } },
    ];
  } else if (statusFilter === "IN_PROGRESS") {
    whereClause.workStatus = "IN_PROGRESS";
  } else if (statusFilter === "PENDING") {
    whereClause.workStatus = "PENDING";
  }

  // Excluir reservas de pago abandonado
  whereClause.NOT = {
    status: "PENDING",
    paymentStatus: "PENDING",
    createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
  };

  // Consultar bookings
  const bookings = await prisma.booking.findMany({
    where: whereClause,
    orderBy: [{ date: "desc" }, { startTime: "desc" }],
    include: {
      services: {
        select: {
          id: true,
          name: true,
          category: true,
          serviceCategory: { select: { name: true } },
          priceAuto: true,
        },
      },
      payments: { select: { amount: true, method: true } },
      intakes: {
        select: {
          id: true,
          status: true,
          vehicle: { select: { plate: true, make: true, model: true } },
        },
        take: 1,
      },
    },
    take: 1500,
  });

  // Filtrado en memoria para búsquedas complejas y filtro por servicio específico
  const serviceIdFilter = params.serviceId && params.serviceId !== "all" ? params.serviceId : null;
  const searchLower = (params.search || "").trim().toLowerCase();

  const items: HistoryServiceItem[] = [];
  const serviceCountMap = new Map<string, { name: string; category: string; count: number; revenue: number }>();
  const monthlyCountMap = new Map<string, { count: number; revenue: number }>();
  const uniqueVehiclesSet = new Set<string>();

  let totalRevenueSum = 0;

  for (const b of bookings) {
    const intake = b.intakes[0];
    const plate = intake?.vehicle?.plate || null;

    // Filtro por servicio si está activo
    if (serviceIdFilter) {
      const hasService = b.services.some((s) => s.id === serviceIdFilter);
      const isCustomMatch = serviceIdFilter === "custom" && !!customServiceDetail(b.selectedOptions);
      if (!hasService && !isCustomMatch) continue;
    }

    // Filtro por búsqueda de texto
    if (searchLower) {
      const matchCustomer = b.customerName.toLowerCase().includes(searchLower);
      const matchPhone = b.customerPhone.toLowerCase().includes(searchLower);
      const matchEmail = (b.customerEmail || "").toLowerCase().includes(searchLower);
      const matchVehicle = `${b.vehicleMake} ${b.vehicleModel}`.toLowerCase().includes(searchLower);
      const matchPlate = (plate || "").toLowerCase().includes(searchLower);
      const matchServices = b.services.some((s) => s.name.toLowerCase().includes(searchLower));

      if (!matchCustomer && !matchPhone && !matchEmail && !matchVehicle && !matchPlate && !matchServices) {
        continue;
      }
    }

    const money = bookingMoney(b);
    const dateIso = b.date.toISOString();
    const monthKey = dateIso.slice(0, 7);
    const [y, m, d] = dateIso.substring(0, 10).split("-");
    const friendlyDate = `${d}/${m}/${y}`;

    // Nombres detallados de servicios con variantes
    const formattedServices = b.services.map((s) => {
      const variant = selectedVariantOf(b.selectedOptions, s.id);
      return variant ? `${s.name} · ${variant}` : s.name;
    });
    const custom = customServiceDetail(b.selectedOptions);
    if (custom) formattedServices.push(`[Personalizado] ${custom}`);

    // Acumular estadísticas
    totalRevenueSum += money.total;

    const vehicleKey = plate || `${b.vehicleMake}-${b.vehicleModel}-${b.customerName}`.toUpperCase();
    uniqueVehiclesSet.add(vehicleKey);

    // Desglose mensual
    const monthData = monthlyCountMap.get(monthKey) || { count: 0, revenue: 0 };
    monthData.count++;
    monthData.revenue += money.total;
    monthlyCountMap.set(monthKey, monthData);

    // Desglose por servicio
    if (b.services.length > 0) {
      const splitRevenue = Math.round(money.total / b.services.length);
      for (const s of b.services) {
        const sData = serviceCountMap.get(s.id) || {
          name: s.name,
          category: s.serviceCategory?.name || s.category || "General",
          count: 0,
          revenue: 0,
        };
        sData.count++;
        sData.revenue += splitRevenue;
        serviceCountMap.set(s.id, sData);
      }
    } else if (custom) {
      const sData = serviceCountMap.get("custom") || {
        name: "Servicio Personalizado",
        category: "Taller",
        count: 0,
        revenue: 0,
      };
      sData.count++;
      sData.revenue += money.total;
      serviceCountMap.set("custom", sData);
    }

    items.push({
      id: b.id,
      date: dateIso,
      dateStr: friendlyDate,
      monthKey,
      time: `${b.startTime} - ${b.endTime}`,
      customerName: b.customerName,
      customerPhone: b.customerPhone,
      customerEmail: b.customerEmail,
      vehicleMake: b.vehicleMake,
      vehicleModel: b.vehicleModel,
      plate,
      services: formattedServices,
      totalPrice: money.total,
      paidAmount: money.paid,
      balance: money.balance,
      paymentStatus: b.paymentStatus,
      workStatus: b.workStatus,
      status: b.status,
      clientId: b.clientId,
      intakeId: intake?.id || null,
    });
  }

  // Construir breakdown por servicio ordenado de mayor a menor
  const totalServiceOccurrences = [...serviceCountMap.values()].reduce((acc, curr) => acc + curr.count, 0) || 1;
  const servicesBreakdown: ServiceBreakdownItem[] = [...serviceCountMap.entries()]
    .map(([serviceId, data]) => ({
      serviceId,
      serviceName: data.name,
      category: data.category,
      count: data.count,
      percentage: Math.round((data.count / totalServiceOccurrences) * 100),
      estimatedRevenue: data.revenue,
    }))
    .sort((a, b) => b.count - a.count);

  // Construir breakdown mensual ordenado cronológicamente
  const monthlyBreakdown: MonthlyBreakdownItem[] = [...monthlyCountMap.entries()]
    .map(([monthKey, data]) => ({
      monthKey,
      label: formatMonthLabel(monthKey),
      count: data.count,
      revenue: data.revenue,
    }))
    .sort((a, b) => b.monthKey.localeCompare(a.monthKey));

  const totalJobs = items.length;
  const avgTicket = totalJobs > 0 ? Math.round(totalRevenueSum / totalJobs) : 0;

  return {
    items,
    kpis: {
      totalJobs,
      totalRevenue: totalRevenueSum,
      avgTicket,
      uniqueVehicles: uniqueVehiclesSet.size,
    },
    servicesBreakdown,
    monthlyBreakdown,
    activePeriodLabel,
  };
}
