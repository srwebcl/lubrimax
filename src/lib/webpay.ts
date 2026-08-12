import { WebpayPlus, Options, IntegrationApiKeys, Environment, IntegrationCommerceCodes } from "transbank-sdk";

export function getWebpayTransaction() {
  const isProduction = process.env.NODE_ENV === "production" && process.env.WEBPAY_COMMERCE_CODE && process.env.WEBPAY_API_KEY;

  if (isProduction) {
    return new WebpayPlus.Transaction(
      new Options(
        process.env.WEBPAY_COMMERCE_CODE as string,
        process.env.WEBPAY_API_KEY as string,
        Environment.Production
      )
    );
  }

  // Fallback a modo de integración (pruebas) si no hay variables o estamos en local
  return new WebpayPlus.Transaction(
    new Options(
      IntegrationCommerceCodes.WEBPAY_PLUS,
      IntegrationApiKeys.WEBPAY,
      Environment.Integration
    )
  );
}
