import { Hono } from "hono";
import { WebhookSignatureValidator } from "mercadopago";
import { quoteAcceptedEmail, sendEmail } from "../lib/email";
import { badRequest, unauthorized } from "../lib/errors";
import type { AppEnv } from "../lib/types";
import { reconcileMercadoPagoPayment } from "../workflows/payments";

const payments = new Hono<AppEnv>();

payments.post("/mercado-pago/webhook", async (c) => {
  const paymentId = c.req.query("data.id");
  try {
    WebhookSignatureValidator.validate({
      xSignature: c.req.header("x-signature"),
      xRequestId: c.req.header("x-request-id"),
      dataId: paymentId,
      secret: c.env.MERCADO_PAGO_WEBHOOK_SECRET,
    });
  } catch {
    throw unauthorized("Invalid Mercado Pago webhook signature");
  }

  if (c.req.query("type") !== "payment") return c.json({ ok: true });
  if (!paymentId) throw badRequest("Payment id is required");

  const result = await reconcileMercadoPagoPayment(
    c.get("db"),
    c.env.MERCADO_PAGO_ACCESS_TOKEN,
    paymentId,
  );
  if (result.becameApproved) {
    c.executionCtx.waitUntil(
      sendEmail(c.env, result.driver.email, quoteAcceptedEmail({
        driverName: result.driver.name,
        origin: result.request.originAddress,
        dest: result.request.destAddress,
        agreedPrice: result.agreedPrice,
        jobId: result.jobId,
        frontendUrl: c.env.FRONTEND_URL,
      })),
    );
  }

  return c.json({ ok: true });
});

export default payments;
