// Total, pagado y saldo de una reserva. Única fuente para el Tablero, la
// entrega con cobro y las estadísticas.
//
// Reservas anteriores a `totalPrice`/`BookingPayment` (marcha blanca) no
// tienen esos datos; se estiman así:
//  - web con abono (RESERVATION): total ≈ abono / RESERVATION_PERCENT
//  - web pago completo o ingreso local: total = amount
//  - pagado por Webpay sin fila en `payments`: se cuenta `amount`.

import { RESERVATION_PERCENT } from "./booking-constants";

export const PAYMENT_METHODS = {
  WEBPAY: "Webpay",
  CASH: "Efectivo",
  CARD: "Tarjeta",
  TRANSFER: "Transferencia",
} as const;

export type PaymentMethod = keyof typeof PAYMENT_METHODS;
export const LOCAL_PAYMENT_METHODS = ["CASH", "CARD", "TRANSFER"] as const;

type MoneyInput = {
  amount: number | null;
  totalPrice: number | null;
  paymentType: string | null;
  paymentStatus: string;
  payments: { amount: number; method: string }[];
};

export function bookingMoney(b: MoneyInput) {
  const paidWebpayLegacy =
    (b.paymentStatus === "PAID_RESERVATION" || b.paymentStatus === "PAID_FULL") &&
    b.paymentType !== null &&
    !b.payments.some((p) => p.method === "WEBPAY")
      ? b.amount ?? 0
      : 0;

  const paid = b.payments.reduce((sum, p) => sum + p.amount, 0) + paidWebpayLegacy;

  const total =
    b.totalPrice ??
    (b.paymentType === "RESERVATION" && b.amount ? Math.round(b.amount / RESERVATION_PERCENT) : b.amount ?? 0);

  // "Pago completo" marcado a mano por el admin (Agenda) sin registro de
  // pago: se respeta, así la reserva no sigue figurando "por pagar".
  if (b.paymentStatus === "PAID_FULL" && paid < total) {
    return { total, paid: total, balance: 0 };
  }

  return { total, paid, balance: Math.max(total - paid, 0) };
}

/** Estado de pago que corresponde según lo pagado. */
export function paymentStatusFor(total: number, paid: number) {
  if (paid <= 0) return "PENDING";
  return paid >= total ? "PAID_FULL" : "PAID_RESERVATION";
}
