import { WebpayPlus, Options, IntegrationApiKeys, Environment, IntegrationCommerceCodes } from "transbank-sdk";

// Producción "real" = deploy de producción en Vercel (o NODE_ENV=production
// fuera de Vercel). Los previews de Vercel también corren con
// NODE_ENV=production, pero ahí sí queremos el ambiente de integración.
function isProductionDeploy() {
  if (process.env.VERCEL_ENV) return process.env.VERCEL_ENV === "production";
  return process.env.NODE_ENV === "production";
}

/**
 * Transacción Webpay Plus. En producción exige credenciales reales: antes, si
 * faltaban WEBPAY_COMMERCE_CODE / WEBPAY_API_KEY caía en silencio al ambiente
 * de integración y las reservas quedaban "pagadas" con tarjetas de prueba.
 * Para probar a propósito en producción con integración, definir
 * WEBPAY_ALLOW_INTEGRATION=true.
 */
export function getWebpayTransaction() {
  const commerceCode = process.env.WEBPAY_COMMERCE_CODE;
  const apiKey = process.env.WEBPAY_API_KEY;

  if (commerceCode && apiKey && isProductionDeploy()) {
    return new WebpayPlus.Transaction(new Options(commerceCode, apiKey, Environment.Production));
  }

  if (isProductionDeploy() && process.env.WEBPAY_ALLOW_INTEGRATION !== "true") {
    throw new Error(
      "Webpay: faltan WEBPAY_COMMERCE_CODE / WEBPAY_API_KEY en producción. " +
        "Configúralas en Vercel (o WEBPAY_ALLOW_INTEGRATION=true para pruebas)."
    );
  }

  return new WebpayPlus.Transaction(
    new Options(IntegrationCommerceCodes.WEBPAY_PLUS, IntegrationApiKeys.WEBPAY, Environment.Integration)
  );
}
