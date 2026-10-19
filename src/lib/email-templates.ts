import { escapeHtml } from "./email";
import { OFFICIAL_SITE_URL, OFFICIAL_LOGO_URL } from "./site-url";

const clp = (n: number) => `$${n.toLocaleString("es-CL")}`;

/**
 * Plantilla base HTML responsive con estética Dark Luxury / Chrome.
 * Compatible con clientes de correo (Gmail, Apple Mail, Outlook).
 */
export function renderEmailBase({
  title,
  preheader,
  badgeText,
  badgeColor = "cyan",
  contentHtml,
}: {
  title: string;
  preheader?: string;
  badgeText?: string;
  badgeColor?: "cyan" | "green" | "amber";
  contentHtml: string;
}) {
  const baseUrl = OFFICIAL_SITE_URL;
  // Usamos el PNG alojado en Cloudflare R2 para máxima compatibilidad con clientes de correo sin depender de Vercel/localhost
  const logoUrl = OFFICIAL_LOGO_URL;

  const badgeStyles = {
    cyan: "background:rgba(0,229,255,0.12);border:1px solid #00e5ff;color:#38bdf8;",
    green: "background:rgba(16,185,129,0.15);border:1px solid #10b981;color:#34d399;",
    amber: "background:rgba(245,158,11,0.15);border:1px solid #f59e0b;color:#fbbf24;",
  };

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${escapeHtml(title)}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, Helvetica, sans-serif !important;}
  </style>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#080b11;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#f1f5f9;-webkit-font-smoothing:antialiased;-webkit-text-size-adjust:100%;">
  ${preheader ? `<div style="display:none;font-size:1px;color:#080b11;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${escapeHtml(preheader)}</div>` : ""}
  
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#080b11;table-layout:fixed;">
    <tr>
      <td align="center" style="padding:24px 12px 36px 12px;">
        <!-- Contenedor Principal (Max 580px) -->
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:580px;background-color:#0f172a;border:1px solid #1e293b;border-radius:16px;overflow:hidden;box-shadow:0 12px 40px rgba(0,0,0,0.6);">
          
          <!-- Encabezado con Logo y Branding -->
          <tr>
            <td align="center" style="padding:32px 24px 20px 24px;background:linear-gradient(180deg,#141f36 0%,#0f172a 100%);border-bottom:1px solid #1e293b;">
              <a href="${baseUrl}" target="_blank" style="text-decoration:none;display:inline-block;">
                <img src="${logoUrl}" alt="LUBRIMAX" width="220" style="display:block;margin:0 auto;width:220px;max-width:100%;height:auto;border:0;" />
              </a>
              <div style="font-size:10px;font-weight:700;letter-spacing:2.5px;color:#94a3b8;text-transform:uppercase;margin-top:10px;text-align:center;">
                Clínica de Estética Automotriz
              </div>
            </td>
          </tr>

          <!-- Línea de Acento Neón Cyan -->
          <tr>
            <td style="height:3px;background:linear-gradient(90deg, #0f172a 0%, #00e5ff 50%, #0f172a 100%);"></td>
          </tr>

          <!-- Cuerpo del Correo -->
          <tr>
            <td style="padding:32px 28px 24px 28px;">
              ${badgeText ? `
                <div style="text-align:center;margin-bottom:20px;">
                  <span style="display:inline-block;padding:6px 14px;border-radius:20px;font-size:12px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;${badgeStyles[badgeColor]}">
                    ${escapeHtml(badgeText)}
                  </span>
                </div>
              ` : ""}

              ${contentHtml}
            </td>
          </tr>

          <!-- Pie de Página -->
          <tr>
            <td style="padding:24px 28px;background-color:#090d16;border-top:1px solid #1e293b;text-align:center;">
              <p style="margin:0 0 6px 0;font-size:12px;color:#94a3b8;line-height:1.5;">
                <strong style="color:#e2e8f0;">LUBRIMAX · Clínica de Estética Automotriz</strong><br>
                📍 Av. Gabriela Mistral 3061, La Serena, Región de Coquimbo
              </p>
              <p style="margin:0 0 12px 0;font-size:12px;color:#64748b;">
                WhatsApp / Teléfono: <a href="https://wa.me/56984567183" style="color:#38bdf8;text-decoration:none;">+56 9 8456 7183</a> · Email: <a href="mailto:contacto@lubrimax.cl" style="color:#38bdf8;text-decoration:none;">contacto@lubrimax.cl</a>
              </p>
              <p style="margin:0;font-size:11px;color:#475569;">
                Visita nuestro sitio oficial en <a href="${baseUrl}" target="_blank" style="color:#38bdf8;text-decoration:none;">www.lubrimax.cl</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * 1. Correo de Confirmación de Reserva para el Cliente
 */
export function buildBookingConfirmedCustomerHtml({
  customerName,
  friendlyDate,
  startTime,
  endTime,
  vehicleMake,
  vehicleModel,
  services,
  payment,
}: {
  customerName: string;
  friendlyDate: string;
  startTime: string;
  endTime: string;
  vehicleMake: string;
  vehicleModel: string;
  services: string;
  payment: { paid: true; amountPaid: number } | { paid: false; amountDue: number };
}) {
  const paymentBlock = payment.paid
    ? `
      <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin:20px 0;background-color:rgba(16,185,129,0.1);border:1px solid #059669;border-radius:12px;">
        <tr>
          <td style="padding:14px 18px;">
            <div style="font-size:13px;font-weight:700;color:#34d399;margin-bottom:4px;">
              ✅ PAGO ONLINE CONFIRMADO (Webpay)
            </div>
            <div style="font-size:14px;color:#f1f5f9;line-height:1.4;">
              Monto pagado: <strong style="color:#34d399;font-size:16px;">${clp(payment.amountPaid)}</strong>.<br>
              <span style="font-size:12px;color:#94a3b8;">Tu reserva está 100% pagada. No tienes nada pendiente de cobro al recibir tu vehículo.</span>
            </div>
          </td>
        </tr>
      </table>
    `
    : `
      <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin:20px 0;background-color:rgba(245,158,11,0.1);border:1px solid #d97706;border-radius:12px;">
        <tr>
          <td style="padding:14px 18px;">
            <div style="font-size:13px;font-weight:700;color:#fbbf24;margin-bottom:4px;">
              💳 TOTAL A PAGAR EN RECEPCIÓN
            </div>
            <div style="font-size:14px;color:#f1f5f9;line-height:1.4;">
              Monto a pagar: <strong style="color:#fbbf24;font-size:16px;">${clp(payment.amountDue)}</strong>.<br>
              <span style="font-size:12px;color:#94a3b8;">El pago se efectúa al ingresar en nuestro local (efectivo, tarjetas bancarias de débito/crédito o transferencia).</span>
            </div>
          </td>
        </tr>
      </table>
    `;

  const body = `
    <!-- Saludo de Introducción -->
    <h2 style="margin:0 0 12px 0;font-size:20px;font-weight:700;color:#ffffff;line-height:1.3;">
      ¡Hola, ${escapeHtml(customerName)}!
    </h2>
    <p style="margin:0 0 18px 0;font-size:14px;color:#cbd5e1;line-height:1.6;">
      Agradecemos enormemente tu preferencia y confianza en <strong style="color:#38bdf8;">LUBRIMAX</strong>. Nos complace confirmarte que tu cita ha sido reservada y agendada exitosamente en nuestra clínica de estética automotriz.
    </p>

    <!-- Tarjeta con Detalles de la Cita -->
    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin:16px 0;background-color:#141c2e;border:1px solid #27354f;border-radius:12px;">
      <tr>
        <td style="padding:18px 20px;">
          <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
            <tr>
              <td style="padding:6px 0;font-size:13px;color:#94a3b8;width:110px;vertical-align:top;">Fecha:</td>
              <td style="padding:6px 0;font-size:14px;color:#ffffff;font-weight:600;">${escapeHtml(friendlyDate)}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;font-size:13px;color:#94a3b8;vertical-align:top;">Horario:</td>
              <td style="padding:6px 0;font-size:14px;color:#38bdf8;font-weight:600;">${escapeHtml(startTime)} - ${escapeHtml(endTime)} hrs</td>
            </tr>
            <tr>
              <td style="padding:6px 0;font-size:13px;color:#94a3b8;vertical-align:top;">Vehículo:</td>
              <td style="padding:6px 0;font-size:14px;color:#ffffff;font-weight:600;">${escapeHtml(vehicleMake)} ${escapeHtml(vehicleModel)}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;font-size:13px;color:#94a3b8;vertical-align:top;">Servicio(s):</td>
              <td style="padding:6px 0;font-size:14px;color:#f1f5f9;font-weight:600;line-height:1.4;">${services}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Estado del Pago -->
    ${paymentBlock}

    <!-- Ubicación y Recomendaciones -->
    <div style="margin:20px 0;padding:14px 18px;background-color:#111928;border-left:3px solid #00e5ff;border-radius:0 8px 8px 0;">
      <div style="font-size:13px;font-weight:700;color:#ffffff;margin-bottom:4px;">
        📍 Indicaciones para el día de tu cita:
      </div>
      <p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.5;">
        Te esperamos en <strong>Av. Gabriela Mistral 3061, La Serena</strong>.<br>
        Te sugerimos llegar entre <strong>5 a 10 minutos antes</strong> de la hora fijada para realizar la recepción de tu auto y revisar juntos cada requerimiento.
      </p>
    </div>

    <!-- Cierre con Agradecimiento -->
    <div style="margin-top:28px;padding-top:20px;border-top:1px solid #1e293b;">
      <p style="margin:0 0 10px 0;font-size:14px;color:#cbd5e1;line-height:1.6;">
        Muchas gracias por elegirnos y por permitirnos cuidar tu vehículo con la máxima dedicación y profesionalismo. Estamos listos para entregarte un resultado de excelencia.
      </p>
      <p style="margin:16px 0 2px 0;font-size:15px;font-weight:700;color:#38bdf8;">
        ¡Te esperamos!
      </p>
      <p style="margin:0;font-size:14px;font-weight:700;color:#ffffff;">
        Equipo de Lubrimax
      </p>
      <div style="font-size:12px;color:#64748b;margin-top:2px;">
        Clínica de Estética Automotriz
      </div>
    </div>
  `;

  return renderEmailBase({
    title: payment.paid ? "Reserva Confirmada y Pagada · LUBRIMAX" : "Reserva Confirmada · LUBRIMAX",
    preheader: `Tu cita para ${services} quedó confirmada el ${friendlyDate} a las ${startTime} hrs.`,
    badgeText: payment.paid ? "Reserva Confirmada y Pagada" : "Reserva Confirmada",
    badgeColor: payment.paid ? "green" : "cyan",
    contentHtml: body,
  });
}

/**
 * 2. Correo de Notificación "Auto Está Listo" para el Cliente
 */
export function buildVehicleReadyCustomerHtml({
  customerName,
  vehicleMake,
  vehicleModel,
  plate,
  services,
  balance,
}: {
  customerName: string;
  vehicleMake: string;
  vehicleModel: string;
  plate?: string | null;
  services?: string;
  balance?: number;
}) {
  const vehicleText = plate
    ? `${escapeHtml(vehicleMake)} ${escapeHtml(vehicleModel)} (Patente: ${escapeHtml(plate)})`
    : `${escapeHtml(vehicleMake)} ${escapeHtml(vehicleModel)}`;

  const balanceBlock = typeof balance === "number" && balance > 0
    ? `
      <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin:18px 0;background-color:rgba(245,158,11,0.1);border:1px solid #d97706;border-radius:12px;">
        <tr>
          <td style="padding:14px 18px;">
            <div style="font-size:13px;font-weight:700;color:#fbbf24;margin-bottom:4px;">
              💳 Saldo pendiente por pagar al retirar
            </div>
            <div style="font-size:14px;color:#f1f5f9;line-height:1.4;">
              Saldo: <strong style="color:#fbbf24;font-size:16px;">${clp(balance)}</strong>.<br>
              <span style="font-size:12px;color:#94a3b8;">Puedes cancelarlo al retirar tu vehículo en recepción (efectivo, tarjeta o transferencia).</span>
            </div>
          </td>
        </tr>
      </table>
    `
    : `
      <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin:18px 0;background-color:rgba(16,185,129,0.1);border:1px solid #059669;border-radius:12px;">
        <tr>
          <td style="padding:14px 18px;">
            <div style="font-size:13px;font-weight:700;color:#34d399;margin-bottom:2px;">
              ✅ Servicio 100% Pagado
            </div>
            <div style="font-size:13px;color:#cbd5e1;">
              No tienes ningún saldo pendiente. Solo debes acercarte a recepción a retirar tus llaves y disfrutar de tu vehículo.
            </div>
          </td>
        </tr>
      </table>
    `;

  const body = `
    <!-- Saludo de Introducción -->
    <h2 style="margin:0 0 12px 0;font-size:20px;font-weight:700;color:#ffffff;line-height:1.3;">
      ¡Hola, ${escapeHtml(customerName)}!
    </h2>
    <p style="margin:0 0 18px 0;font-size:14px;color:#cbd5e1;line-height:1.6;">
      ¡Tenemos excelentes noticias! Te informamos que los trabajos y tratamientos estéticos en tu vehículo <strong style="color:#ffffff;">${vehicleText}</strong> han sido <strong style="color:#34d399;">terminados exitosamente</strong> y han superado satisfactoriamente nuestro riguroso control de calidad.
    </p>

    <!-- Tarjeta con Detalles del Trabajo -->
    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin:16px 0;background-color:#141c2e;border:1px solid #27354f;border-radius:12px;">
      <tr>
        <td style="padding:18px 20px;">
          <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
            <tr>
              <td style="padding:6px 0;font-size:13px;color:#94a3b8;width:120px;vertical-align:top;">Vehículo:</td>
              <td style="padding:6px 0;font-size:14px;color:#ffffff;font-weight:600;">${vehicleText}</td>
            </tr>
            ${services ? `
            <tr>
              <td style="padding:6px 0;font-size:13px;color:#94a3b8;vertical-align:top;">Servicio(s):</td>
              <td style="padding:6px 0;font-size:14px;color:#38bdf8;font-weight:600;line-height:1.4;">${services}</td>
            </tr>
            ` : ""}
            <tr>
              <td style="padding:6px 0;font-size:13px;color:#94a3b8;vertical-align:top;">Lugar de Retiro:</td>
              <td style="padding:6px 0;font-size:14px;color:#ffffff;font-weight:600;">Av. Gabriela Mistral 3061, La Serena</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    ${balanceBlock}

    <!-- Indicación de Retiro -->
    <div style="margin:20px 0;padding:14px 18px;background-color:#111928;border-left:3px solid #10b981;border-radius:0 8px 8px 0;">
      <div style="font-size:13px;font-weight:700;color:#ffffff;margin-bottom:4px;">
        🚗 Ya puedes pasar a retirar tu auto
      </div>
      <p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.5;">
        Nuestras instalaciones están listas para la entrega de tu vehículo. Al llegar, nuestro equipo te acompañará para revisar juntos los resultados finales de tu servicio.
      </p>
    </div>

    <!-- Cierre con Agradecimiento -->
    <div style="margin-top:28px;padding-top:20px;border-top:1px solid #1e293b;">
      <p style="margin:0 0 10px 0;font-size:14px;color:#cbd5e1;line-height:1.6;">
        Queremos agradecerte sinceramente por confiar el cuidado de tu vehículo en nuestras manos. Ha sido un gran placer atenderte y dejar tu auto impecable y protegido.
      </p>
      <p style="margin:16px 0 2px 0;font-size:15px;font-weight:700;color:#38bdf8;">
        ¡Te esperamos!
      </p>
      <p style="margin:0;font-size:14px;font-weight:700;color:#ffffff;">
        Equipo de Lubrimax
      </p>
      <div style="font-size:12px;color:#64748b;margin-top:2px;">
        Clínica de Estética Automotriz
      </div>
    </div>
  `;

  return renderEmailBase({
    title: "¡Tu vehículo está listo! · LUBRIMAX",
    preheader: `Tu vehículo ${escapeHtml(vehicleMake)} ${escapeHtml(vehicleModel)} ya está terminado y listo para retirar.`,
    badgeText: "Vehículo Listo para Retiro",
    badgeColor: "green",
    contentHtml: body,
  });
}
