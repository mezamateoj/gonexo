import { logger } from "./logger";
import type { Bindings } from "../binding";

// Until a sending domain is verified in Resend, the shared onboarding sender
// works for dev/testing. Override with EMAIL_FROM once the domain exists.
const DEFAULT_FROM = "onboarding@resend.dev";

export type EmailContent = { subject: string; html: string };

// Fire-and-forget: callers run this inside waitUntil, so a failed or skipped
// email must never throw into the request path — log and move on.
export async function sendEmail(
  env: Bindings,
  to: string,
  content: EmailContent,
) {
  if (!env.RESEND_API_KEY) {
    logger.debug("Email skipped (RESEND_API_KEY not set): {subject} -> {to}", {
      subject: content.subject,
      to,
    });
    return;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM ?? DEFAULT_FROM,
        to,
        subject: content.subject,
        html: content.html,
      }),
    });
    if (!res.ok) {
      logger.warn("Email send failed ({status}): {body}", {
        status: res.status,
        body: await res.text(),
      });
    }
  } catch (err) {
    logger.warn("Email send errored: {error}", { error: err });
  }
}

const clp = (n: number) => `$${n.toLocaleString("es-CL")}`;

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function layout(body: string) {
  return `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#121715">
  <p style="font-weight:700;font-size:20px;color:#0c8c5e;margin:0 0 20px">gonexo</p>
  ${body}
  <p style="font-size:12px;color:#969e9b;margin-top:28px;border-top:1px solid #e9e7e3;padding-top:12px">
    Coordina todo por la plataforma gonexo. Este correo es automático, no respondas aquí.
  </p>
</div>`;
}

function button(href: string, label: string) {
  return `<a href="${escapeHtml(href)}" style="display:inline-block;background:#0c8c5e;color:#ffffff;font-weight:600;font-size:14px;padding:12px 24px;border-radius:8px;text-decoration:none;margin-top:16px">${escapeHtml(label)}</a>`;
}

function routeLine(origin: string, dest: string) {
  return `<p style="font-size:14px;color:#485450;margin:12px 0 0">${escapeHtml(origin)}<br/>→ ${escapeHtml(dest)}</p>`;
}

export function newQuoteEmail(p: {
  clientName: string;
  origin: string;
  dest: string;
  priceMin: number;
  priceMax: number;
  requestId: string;
  frontendUrl: string;
}): EmailContent {
  return {
    subject: `Nueva oferta: ${clp(p.priceMin)}–${clp(p.priceMax)} por tu flete`,
    html: layout(`
      <h1 style="font-size:18px;margin:0">Hola ${escapeHtml(p.clientName)}, recibiste una oferta</h1>
      <p style="font-size:14px;color:#485450;margin:12px 0 0">
        Un transportista ofreció <strong>${clp(p.priceMin)}–${clp(p.priceMax)}</strong> por tu solicitud.
      </p>
      ${routeLine(p.origin, p.dest)}
      ${button(`${p.frontendUrl}/requests/${p.requestId}`, "Ver oferta")}
    `),
  };
}

export function quoteAcceptedEmail(p: {
  driverName: string;
  origin: string;
  dest: string;
  agreedPrice: number;
  jobId: string;
  frontendUrl: string;
}): EmailContent {
  return {
    subject: `¡Aceptaron tu oferta! Flete por ${clp(p.agreedPrice)}`,
    html: layout(`
      <h1 style="font-size:18px;margin:0">¡Felicitaciones ${escapeHtml(p.driverName)}!</h1>
      <p style="font-size:14px;color:#485450;margin:12px 0 0">
        El cliente aceptó tu oferta por <strong>${clp(p.agreedPrice)}</strong>.
        Revisa los detalles y coordina el flete desde la plataforma.
      </p>
      ${routeLine(p.origin, p.dest)}
      ${button(`${p.frontendUrl}/jobs/${p.jobId}`, "Ver trabajo")}
    `),
  };
}

export function confirmReminderEmail(p: {
  clientName: string;
  origin: string;
  dest: string;
  jobId: string;
  frontendUrl: string;
}): EmailContent {
  return {
    subject: "Tu flete fue entregado — confirma la recepción",
    html: layout(`
      <h1 style="font-size:18px;margin:0">Hola ${escapeHtml(p.clientName)}, tu flete fue marcado como entregado</h1>
      <p style="font-size:14px;color:#485450;margin:12px 0 0">
        Confirma que recibiste todo bien. Si no confirmas, se confirmará
        automáticamente en <strong>24 horas</strong>.
      </p>
      ${routeLine(p.origin, p.dest)}
      ${button(`${p.frontendUrl}/jobs/${p.jobId}`, "Confirmar recepción")}
    `),
  };
}
