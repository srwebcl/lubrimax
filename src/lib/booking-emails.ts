// Correos de "reserva nueva" (al dueño y al cliente). El estado de pago va
// en el ASUNTO y destacado en el cuerpo. Las reservas web ahora son sin
// cobro (se paga en el local); "PAGADA" queda para reservas pagadas por
// Webpay antes del cambio (las que aún confirme webpay/booking/commit).

import { escapeHtml, sendEmail } from "./email";
import { bookingServiceNames } from "./booking-services";

type NewBooking = {
  id: string;
  date: Date;
  startTime: string;
  endTime: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  vehicleMake: string;
  vehicleModel: string;
  services: { id?: string; name: string }[];
  selectedOptions?: unknown;
};

const clp = (n: number) => `$${n.toLocaleString("es-CL")}`;

export async function sendNewBookingEmails(
  booking: NewBooking,
  payment: { paid: true; amountPaid: number } | { paid: false; amountDue: number }
) {
  const [y, m, d] = booking.date.toISOString().substring(0, 10).split("-");
  const friendlyDate = `${d}/${m}/${y}`;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.lubrimax.cl";
  // Con la opción elegida (ej. "Detailing Exterior · Cerámico (2 años)").
  const services = escapeHtml(
    bookingServiceNames({ services: booking.services, selectedOptions: booking.selectedOptions ?? null }).join(" + ")
  );

  const tag = payment.paid ? `PAGADA ${clp(payment.amountPaid)}` : `POR COBRAR EN LOCAL ${clp(payment.amountDue)}`;
  const banner = payment.paid
    ? `<p style="background:#dcfce7;color:#166534;padding:10px 14px;border-radius:8px;font-weight:bold">✅ PAGADA ONLINE (Webpay): ${clp(payment.amountPaid)}. No cobrar al recibir.</p>`
    : `<p style="background:#fef3c7;color:#92400e;padding:10px 14px;border-radius:8px;font-weight:bold">Reserva sin pago online. Cobrar ${clp(payment.amountDue)} en el local.</p>`;

  const owner = await sendEmail({
    to: process.env.OWNER_EMAIL || "contacto@lubrimax.cl",
    subject: `NUEVA RESERVA · ${tag} · ${booking.customerName} · ${friendlyDate} ${booking.startTime}`,
    html: `<h1>Nueva reserva web</h1>
      ${banner}
      <p><strong>Cliente:</strong> ${escapeHtml(booking.customerName)} (${escapeHtml(booking.customerPhone)})</p>
      <p><strong>Vehículo:</strong> ${escapeHtml(booking.vehicleMake)} ${escapeHtml(booking.vehicleModel)}</p>
      <p><strong>Fecha y hora:</strong> ${friendlyDate} de ${booking.startTime} a ${booking.endTime}</p>
      <p><strong>Servicios:</strong> ${services}</p>
      <p><a href="${baseUrl}/admin">Ver en el panel</a></p>`,
  });
  if (!owner.success) console.error("No se pudo notificar al administrador:", owner.error);

  if (!booking.customerEmail) return;
  const customer = await sendEmail({
    to: booking.customerEmail,
    subject: payment.paid
      ? `Reserva confirmada y pagada - LUBRIMAX - ${friendlyDate}`
      : `Reserva confirmada - LUBRIMAX - ${friendlyDate}`,
    html: `<h1>¡Hola ${escapeHtml(booking.customerName)}!</h1>
      <p>Tu reserva para <strong>${services}</strong> quedó confirmada.</p>
      <p>Fecha: ${friendlyDate}<br/>Hora: ${booking.startTime} - ${booking.endTime}</p>
      <p>Vehículo: ${escapeHtml(booking.vehicleMake)} ${escapeHtml(booking.vehicleModel)}</p>
      ${
        payment.paid
          ? `<p><strong>Pagaste ${clp(payment.amountPaid)}</strong>. No tienes nada pendiente.</p>`
          : `<p><strong>Total a pagar en el local: ${clp(payment.amountDue)}</strong> (efectivo, tarjeta o transferencia).</p>`
      }
      <p>Te esperamos en Av. Gabriela Mistral 3061, La Serena.</p>`,
  });
  if (!customer.success) console.error("No se pudo enviar la confirmación al cliente", booking.id, customer.error);
}
