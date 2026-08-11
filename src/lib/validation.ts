// Esquemas zod para los inputs públicos más sensibles (auth, pagos,
// reseñas). No reemplazan las validaciones de negocio que ya hacen los
// actions (disponibilidad de horario, stock, etc.) — solo aseguran que la
// forma y el tipo de los datos sean los esperados antes de tocar la BD.

import { z } from "zod";
import { VEHICLE_TYPES } from "./booking-constants";

export const loginCustomerSchema = z.object({
  email: z.email("Correo inválido."),
  password: z.string().min(1, "Ingresa tu contraseña."),
});

export const registerCustomerSchema = z.object({
  name: z.string().trim().min(2, "Nombre muy corto.").max(200),
  email: z.email("Correo inválido."),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres."),
});

export const reviewSchema = z.object({
  productId: z.string().min(1),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(2000).optional(),
});

export const couponCodeSchema = z.string().trim().min(1).max(50);

// Formato laxo: solo valida forma (dígitos + guion + dígito verificador),
// no el dígito verificador en sí — evita rechazar RUTs válidos por un
// checksum mal implementado.
export const rutSchema = z
  .string()
  .trim()
  .regex(/^\d{1,2}\.?\d{3}\.?\d{3}-?[\dkK]$/, "RUT inválido.");

export const bookingPaymentSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida."),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora inválida."),
  serviceId: z.string().min(1),
  vehicleType: z.enum(VEHICLE_TYPES, { error: "Tipo de vehículo inválido." }),
  plate: z.string().trim().min(1, "Falta la patente.").max(20),
  customerName: z.string().trim().min(2, "Falta el nombre.").max(200),
  customerPhone: z.string().trim().min(5, "Teléfono inválido.").max(30),
  customerEmail: z.union([z.email(), z.literal("")]).optional(),
  paymentType: z.enum(["RESERVATION", "FULL"], { error: "Tipo de pago inválido." }),
});

export const storeCheckoutSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().min(1),
        quantity: z.coerce.number().int().positive(),
      })
    )
    .min(1, "Carrito vacío."),
  customerName: z.string().trim().max(200).optional(),
  customerEmail: z.union([z.email(), z.literal("")]).optional(),
  shippingType: z.enum(["PICKUP", "DELIVERY"]).optional(),
  address: z.string().trim().max(500).optional(),
  city: z.string().trim().max(200).optional(),
  couponCode: z.string().trim().max(50).optional(),
});

/** Junta los mensajes de error de zod en un solo string legible. */
export function flattenZodError(error: z.ZodError) {
  return error.issues.map((i) => i.message).join(" ");
}
