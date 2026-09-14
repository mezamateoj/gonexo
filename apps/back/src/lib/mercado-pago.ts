import {
  MercadoPagoConfig,
  MerchantOrder,
  Payment,
  Preference,
} from "mercadopago";

export function createMercadoPagoClients(accessToken: string) {
  const config = new MercadoPagoConfig({ accessToken });

  return {
    merchantOrder: new MerchantOrder(config),
    payment: new Payment(config),
    preference: new Preference(config),
  };
}
