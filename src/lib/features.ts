// Interruptores de funcionalidades en pausa. Se leen tanto en el servidor
// como en el navegador, así que son constantes (no variables de entorno).

/**
 * Club LUBRIMAX (membresías y convenios). En STAND BY mientras se definen los
 * detalles: con `false` desaparece de la web pública (menú, footer, /club,
 * checkout, perfil) y NO se aplica ningún descuento de membresía, ni en la
 * vista ni en el cobro. El panel de administración (/admin/club) sigue
 * disponible para ir preparando membresías y convenios.
 *
 * Para reactivarlo: cambiar a `true`.
 */
export const CLUB_ENABLED = false;
