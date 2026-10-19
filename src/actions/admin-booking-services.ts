"use server";

import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/staff-session";
import { can } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { bookingMoney, paymentStatusFor } from "@/lib/booking-money";
import {
  servicePriceFor,
  vehicleTypeFromMake,
  VEHICLE_TYPES,
  type VehicleType,
  readServiceVariants,
} from "@/lib/booking-constants";
import {
  readLocalOptions,
  customServiceDetail,
  selectedVariantOf,
  discountAmount,
  readDiscount,
} from "@/lib/booking-services";

export type UpdateBookingServicesInput = {
  bookingId: string;
  serviceIds: string[];
  variants?: Record<string, string>; // { [serviceId]: variantName }
  manualPrices?: Record<string, number>; // { [serviceId]: manualPrice }
  customService?: { detail: string; price: number } | null;
  discount?: { type: "PERCENT" | "AMOUNT"; value: number } | null;
  overrideTotal?: number;
};

/**
 * Obtiene los detalles de una reserva para poder editar sus servicios,
 * junto con el catálogo completo de servicios disponibles.
 */
export async function getBookingServicesDetails(bookingId: string) {
  const session = await requireStaff();

  const [booking, allServices] = await Promise.all([
    prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        services: {
          select: {
            id: true,
            name: true,
            priceAuto: true,
            priceSuv2: true,
            priceSuv3: true,
            variants: true,
            category: true,
          },
        },
        payments: { select: { amount: true, method: true } },
        intakes: {
          select: {
            id: true,
            vehicle: { select: { plate: true, vehicleType: true } },
          },
          take: 1,
        },
      },
    }),
    prisma.service.findMany({
      select: {
        id: true,
        name: true,
        priceAuto: true,
        priceSuv2: true,
        priceSuv3: true,
        variants: true,
        category: true,
        serviceCategory: { select: { name: true } },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!booking) {
    return { success: false as const, error: "Reserva no encontrada." };
  }

  const vehicleType: VehicleType =
    (booking.intakes[0]?.vehicle?.vehicleType as VehicleType) ||
    vehicleTypeFromMake(booking.vehicleMake) ||
    VEHICLE_TYPES[0];

  const money = bookingMoney(booking);
  const opts = readLocalOptions(booking.selectedOptions);

  const selectedVariants: Record<string, string> = {};
  for (const s of booking.services) {
    const v = selectedVariantOf(booking.selectedOptions, s.id);
    if (v) selectedVariants[s.id] = v;
  }

  return {
    success: true as const,
    booking: {
      id: booking.id,
      customerName: booking.customerName,
      customerPhone: booking.customerPhone,
      vehicleMake: booking.vehicleMake,
      vehicleModel: booking.vehicleModel,
      plate: booking.intakes[0]?.vehicle?.plate || null,
      vehicleType,
      currentServiceIds: booking.services.map((s) => s.id),
      selectedVariants,
      manualPrices: opts.manualPrices || {},
      customService: opts.customService
        ? { detail: opts.customService.detail || "", price: opts.customService.price || 0 }
        : null,
      discount: readDiscount(booking.selectedOptions),
      totalPrice: money.total,
      paid: money.paid,
      balance: money.balance,
      paymentType: booking.paymentType,
    },
    catalog: allServices.map((s) => ({
      id: s.id,
      name: s.name,
      category: s.serviceCategory?.name || s.category || "General",
      variants: readServiceVariants(s.variants),
      priceAuto: s.priceAuto,
      priceSuv2: s.priceSuv2,
      priceSuv3: s.priceSuv3,
    })),
  };
}

/**
 * Actualiza los servicios de una reserva (agregar nuevos, quitar o ajustar opciones).
 * Recalcula el precio total y actualiza el saldo por cobrar.
 */
export async function updateBookingServices(input: UpdateBookingServicesInput) {
  try {
    const session = await requireStaff();
    const canEdit = session.role === "ADMIN" || can(session, "pricing") || can(session, "intake");
    if (!canEdit) {
      return { success: false as const, error: "No tienes permiso para modificar servicios de una reserva." };
    }

    const { bookingId, serviceIds, variants = {}, manualPrices = {}, customService, discount, overrideTotal } = input;

    const result = await prisma.$transaction(async (tx) => {
      const current = await tx.booking.findUnique({
        where: { id: bookingId },
        include: {
          services: { select: { id: true, name: true, priceAuto: true, priceSuv2: true, priceSuv3: true, variants: true } },
          payments: { select: { amount: true, method: true } },
          intakes: { select: { vehicle: { select: { vehicleType: true } } }, take: 1 },
        },
      });

      if (!current) {
        throw new Error("Reserva no encontrada.");
      }

      const vehicleType: VehicleType =
        (current.intakes[0]?.vehicle?.vehicleType as VehicleType) ||
        vehicleTypeFromMake(current.vehicleMake) ||
        VEHICLE_TYPES[0];

      // Cargar todos los servicios que tendrá la reserva
      const dbServices = await tx.service.findMany({
        where: { id: { in: serviceIds } },
        select: { id: true, name: true, priceAuto: true, priceSuv2: true, priceSuv3: true, variants: true },
      });

      // Calcular precio de catálogo para cada servicio con su variante elegida
      let catalogSubtotal = 0;
      for (const s of dbServices) {
        const variantName = variants[s.id] || selectedVariantOf(current.selectedOptions, s.id);
        const price = servicePriceFor(s, vehicleType, variantName);
        if (price > 0) {
          catalogSubtotal += price;
        } else if (manualPrices[s.id]) {
          catalogSubtotal += manualPrices[s.id];
        }
      }

      // Sumar servicio personalizado si viene
      const customPrice = customService?.detail?.trim() ? customService.price || 0 : 0;
      const subtotalWithCustom = catalogSubtotal + customPrice;

      // Aplicar descuento si corresponde
      const discAmount = discount ? discountAmount(discount, subtotalWithCustom) : 0;
      const calculatedTotal = Math.max(subtotalWithCustom - discAmount, 0);

      // Usar overrideTotal si el usuario especificó un monto total manual, o el calculado
      const newTotal = typeof overrideTotal === "number" && overrideTotal >= 0 ? overrideTotal : calculatedTotal;

      const money = bookingMoney({ ...current, totalPrice: newTotal });
      if (money.paid > newTotal) {
        throw new Error(
          `El nuevo total ($${newTotal.toLocaleString("es-CL")}) no puede ser menor a lo que el cliente ya pagó ($${money.paid.toLocaleString("es-CL")}).`
        );
      }

      // Combinar selectedOptions
      const prevOpts = readLocalOptions(current.selectedOptions);
      const updatedOptions: Record<string, any> = {
        ...prevOpts,
        ...variants,
      };

      if (Object.keys(manualPrices).length > 0) {
        updatedOptions.manualPrices = { ...(prevOpts.manualPrices || {}), ...manualPrices };
      }

      if (customService && customService.detail?.trim()) {
        updatedOptions.customService = {
          detail: customService.detail.trim(),
          price: customService.price || 0,
        };
      } else if (customService === null) {
        delete updatedOptions.customService;
      }

      if (discount) {
        updatedOptions.discount = discount;
      } else if (discount === null) {
        delete updatedOptions.discount;
      }

      // Actualizar reserva en la base de datos
      await tx.booking.update({
        where: { id: bookingId },
        data: {
          services: {
            set: serviceIds.map((id) => ({ id })),
          },
          selectedOptions: updatedOptions,
          totalPrice: newTotal,
          paymentStatus: paymentStatusFor(newTotal, money.paid),
        },
      });

      // Bitácora de actividad
      const addedNames = dbServices
        .filter((s) => !current.services.some((cs) => cs.id === s.id))
        .map((s) => s.name);
      const removedNames = current.services
        .filter((cs) => !dbServices.some((s) => s.id === cs.id))
        .map((cs) => cs.name);

      const logParts: string[] = [];
      if (addedNames.length > 0) logParts.push(`+ Agregados: ${addedNames.join(", ")}`);
      if (removedNames.length > 0) logParts.push(`- Quitados: ${removedNames.join(", ")}`);
      logParts.push(`Nuevo total: $${newTotal.toLocaleString("es-CL")}`);

      await tx.bookingActivityLog.create({
        data: {
          bookingId,
          staffUserId: session.userId,
          staffName: session.name,
          action: "SERVICES_UPDATED",
          detail: logParts.join(" | "),
        },
      });

      return {
        success: true as const,
        newTotal,
        paid: money.paid,
        balance: Math.max(newTotal - money.paid, 0),
      };
    });

    revalidatePath("/admin", "layout");
    return result;
  } catch (error: any) {
    console.error("Error updating booking services:", error);
    return { success: false as const, error: error.message || "Error al actualizar los servicios." };
  }
}
