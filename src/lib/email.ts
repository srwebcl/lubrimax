import { Resend } from 'resend';

// Inicializa Resend solo si existe la API Key (para que no rompa en dev si no la hay)
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  if (!resend) {
    console.warn("⚠️ [MOCK EMAIL] RESEND_API_KEY no configurada. Simulando envío a:", to, "| Asunto:", subject);
    return { success: true, mock: true };
  }

  try {
    const data = await resend.emails.send({
      from: 'Lubrimax <contacto@lubrimax.cl>',
      to: [to],
      subject: subject,
      html,
    });
    if (data.error) {
      // El SDK de Resend NO tira excepción en errores de la API (dominio no
      // verificado, destinatario inválido, etc.) — vienen en data.error. Si
      // no revisamos esto explícitamente, el envío "falla" en silencio: la
      // función igual retorna sin lanzar y el llamador nunca se entera.
      console.error("Resend devolvió error:", data.error);
      return { success: false, error: data.error };
    }
    return { success: true, data: data.data };
  } catch (error) {
    console.error("Error enviando email:", error);
    return { success: false, error };
  }
}
