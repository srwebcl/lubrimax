import { Resend } from 'resend';

// Inicializa Resend solo si existe la API Key (para que no rompa en dev si no la hay)
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function sendEmail({ to, subject, react }: { to: string; subject: string; react: React.ReactElement }) {
  if (!resend) {
    console.warn("⚠️ [MOCK EMAIL] RESEND_API_KEY no configurada. Simulando envío a:", to, "| Asunto:", subject);
    return { success: true, mock: true };
  }

  try {
    const data = await resend.emails.send({
      from: 'Lubrimax <ventas@lubrimax.cl>', // Se debe verificar el dominio en Resend
      to: [to],
      subject: subject,
      react: react,
    });
    return { success: true, data };
  } catch (error) {
    console.error("Error enviando email:", error);
    return { success: false, error };
  }
}
