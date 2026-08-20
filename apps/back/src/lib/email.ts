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
    return false;
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
      return false;
    }
    return true;
  } catch (err) {
    logger.warn("Email send errored: {error}", { error: err });
    return false;
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
  return `<div style="font-family:Montserrat,system-ui,-apple-system,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1e1e1e">
  <p style="font-weight:700;font-size:20px;color:#1e1e1e;margin:0 0 20px">Carg<span style="color:#e51920">Up</span></p>
  ${body}
  <p style="font-size:12px;color:#969e9b;margin-top:28px;border-top:1px solid #e9e7e3;padding-top:12px">
    Coordina todo por CargUp. Este correo es automático, no respondas aquí.
  </p>
</div>`;
}

function button(href: string, label: string) {
  return `<a href="${escapeHtml(href)}" style="display:inline-block;background:#e51920;color:#ffffff;font-weight:600;font-size:14px;padding:12px 24px;border-radius:8px;text-decoration:none;margin-top:16px">${escapeHtml(label)}</a>`;
}

function routeLine(origin: string, dest: string) {
  return `<p style="font-size:14px;color:#485450;margin:12px 0 0">${escapeHtml(origin)}<br/>→ ${escapeHtml(dest)}</p>`;
}

function formatDateTime(value: Date) {
  return value.toLocaleString("es-CL", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "America/Santiago",
  });
}

export function newQuoteEmail(p: {
  clientName: string;
  origin: string;
  dest: string;
  price: number;
  requestId: string;
  frontendUrl: string;
}): EmailContent {
  return {
    subject: `Nueva oferta: ${clp(p.price)} por tu flete`,
    html: layout(`
      <h1 style="font-size:18px;margin:0">Hola ${escapeHtml(p.clientName)}, recibiste una oferta</h1>
      <p style="font-size:14px;color:#485450;margin:12px 0 0">
        Un transportista ofreció <strong>${clp(p.price)}</strong> por tu solicitud.
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

export function documentReviewReadyEmail(p: {
  driverName: string;
  driverProfileId: string;
  frontendUrl: string;
}): EmailContent {
  return {
    subject: `Documentos listos para revisar: ${p.driverName}`,
    html: layout(`
      <h1 style="font-size:18px;margin:0">Hay documentos de un transportista listos para revisar</h1>
      <p style="font-size:14px;color:#485450;margin:12px 0 0">
        El análisis automático terminó para <strong>${escapeHtml(p.driverName)}</strong>.
        Revisa los documentos originales y decide la verificación desde el panel.
      </p>
      ${button(`${p.frontendUrl}/admin/drivers/${p.driverProfileId}`, "Revisar documentos")}
    `),
  };
}

export function newRequestEmail(p: {
  driverName: string;
  origin: string;
  dest: string;
  scheduledAt: Date;
  requestId: string;
  frontendUrl: string;
}): EmailContent {
  const scheduledAt = formatDateTime(p.scheduledAt);

  return {
    subject: `Nuevo flete disponible: ${p.origin} → ${p.dest}`,
    html: layout(`
      <h1 style="font-size:18px;margin:0">Hola ${escapeHtml(p.driverName)}, hay un nuevo flete disponible</h1>
      ${routeLine(p.origin, p.dest)}
      <p style="font-size:14px;color:#485450;margin:12px 0 0">
        Programado para <strong>${escapeHtml(scheduledAt)}</strong>.
      </p>
      ${button(`${p.frontendUrl}/available/${p.requestId}`, "Ver solicitud")}
    `),
  };
}

type EmailContact = {
  name: string;
  email: string;
  phone: string | null;
};

function contactLine(contact: EmailContact) {
  const phone = contact.phone ? ` · ${escapeHtml(contact.phone)}` : "";
  return `<strong>${escapeHtml(contact.name)}</strong> · ${escapeHtml(contact.email)}${phone}`;
}

export function adminNoOfferRescueEmail(p: {
  client: EmailContact;
  drivers: EmailContact[];
  origin: string;
  dest: string;
  scheduledAt: Date;
  requestId: string;
}): EmailContent {
  const drivers = p.drivers.length > 0
    ? `<ul style="font-size:14px;color:#485450;padding-left:20px">${p.drivers
        .map((driver) => `<li style="margin:6px 0">${contactLine(driver)}</li>`)
        .join("")}</ul>`
    : `<p style="font-size:14px;color:#485450">No hay transportistas verificados y disponibles para contactar.</p>`;

  return {
    subject: `Rescate: solicitud sin ofertas (${p.origin} → ${p.dest})`,
    html: layout(`
      <h1 style="font-size:18px;margin:0">Una solicitud necesita intervención</h1>
      ${routeLine(p.origin, p.dest)}
      <p style="font-size:14px;color:#485450;margin:12px 0 0">
        Programada para <strong>${escapeHtml(formatDateTime(p.scheduledAt))}</strong>.
      </p>
      <p style="font-size:14px;color:#485450;margin:12px 0 0">
        Cliente: ${contactLine(p.client)}
      </p>
      <p style="font-size:14px;color:#121715;margin:18px 0 6px;font-weight:600">
        Transportistas disponibles para contactar
      </p>
      ${drivers}
      <p style="font-size:12px;color:#969e9b;margin-top:16px">Solicitud: ${escapeHtml(p.requestId)}</p>
    `),
  };
}

export function adminOffersExpiringEmail(p: {
  client: EmailContact;
  origin: string;
  dest: string;
  scheduledAt: Date;
  requestId: string;
  offers: {
    driver: EmailContact;
    price: number;
    expiresAt: Date;
  }[];
}): EmailContent {
  const offers = p.offers
    .map(({ driver, price, expiresAt }) => `
      <li style="margin:8px 0">
        ${contactLine(driver)} · <strong>${clp(price)}</strong><br/>
        Vence ${escapeHtml(formatDateTime(expiresAt))}
      </li>`)
    .join("");

  return {
    subject: `Ofertas próximas a vencer: ${p.origin} → ${p.dest}`,
    html: layout(`
      <h1 style="font-size:18px;margin:0">Hay ofertas que vencerán pronto</h1>
      ${routeLine(p.origin, p.dest)}
      <p style="font-size:14px;color:#485450;margin:12px 0 0">
        Flete programado para <strong>${escapeHtml(formatDateTime(p.scheduledAt))}</strong>.
      </p>
      <p style="font-size:14px;color:#485450;margin:12px 0 0">
        Contacta primero al cliente: ${contactLine(p.client)}
      </p>
      <ul style="font-size:14px;color:#485450;padding-left:20px">${offers}</ul>
      <p style="font-size:12px;color:#969e9b;margin-top:16px">Solicitud: ${escapeHtml(p.requestId)}</p>
    `),
  };
}

export function clientNoOfferRescueEmail(p: {
  clientName: string;
  origin: string;
  dest: string;
  requestId: string;
  frontendUrl: string;
}): EmailContent {
  return {
    subject: "Seguimos buscando un transportista para tu flete",
    html: layout(`
      <h1 style="font-size:18px;margin:0">Hola ${escapeHtml(p.clientName)}, seguimos buscando opciones</h1>
      <p style="font-size:14px;color:#485450;margin:12px 0 0">
        Tu solicitud todavía no tiene ofertas disponibles. El equipo de CargUp ya está revisándola personalmente.
      </p>
      ${routeLine(p.origin, p.dest)}
      ${button(`${p.frontendUrl}/requests/${p.requestId}`, "Ver solicitud")}
    `),
  };
}

export function clientOffersExpiringEmail(p: {
  clientName: string;
  origin: string;
  dest: string;
  requestId: string;
  frontendUrl: string;
}): EmailContent {
  return {
    subject: "Tus ofertas vencerán pronto",
    html: layout(`
      <h1 style="font-size:18px;margin:0">Hola ${escapeHtml(p.clientName)}, revisa tus ofertas</h1>
      <p style="font-size:14px;color:#485450;margin:12px 0 0">
        Una o más ofertas para tu flete vencerán dentro de las próximas 12 horas.
      </p>
      ${routeLine(p.origin, p.dest)}
      ${button(`${p.frontendUrl}/requests/${p.requestId}/offers`, "Comparar ofertas")}
    `),
  };
}

export function driverVerificationDecisionEmail(p: {
  driverName: string;
  decision: "verified" | "changes_requested";
  note?: string;
  frontendUrl: string;
}): EmailContent {
  if (p.decision === "verified") {
    return {
      subject: "Tu perfil de transportista fue verificado",
      html: layout(`
        <h1 style="font-size:18px;margin:0">Hola ${escapeHtml(p.driverName)}, tu perfil fue verificado</h1>
        <p style="font-size:14px;color:#485450;margin:12px 0 0">
          Revisamos tus documentos y tu perfil ya aparece como verificado en CargUp.
        </p>
        ${button(`${p.frontendUrl}/available`, "Ver fletes disponibles")}
      `),
    };
  }

  return {
    subject: "Necesitamos que corrijas tus documentos",
    html: layout(`
      <h1 style="font-size:18px;margin:0">Hola ${escapeHtml(p.driverName)}, necesitamos un cambio</h1>
      <p style="font-size:14px;color:#485450;margin:12px 0 0">
        Antes de verificar tu perfil, corrige lo siguiente:
      </p>
      <p style="font-size:14px;color:#121715;margin:12px 0 0;padding:12px;background:#f5f3ef;border-radius:8px">
        ${escapeHtml(p.note ?? "")}
      </p>
      ${button(`${p.frontendUrl}/profile`, "Corregir documentos")}
    `),
  };
}

export function jobCancelledEmail(p: {
  recipientName: string;
  cancelledBy: "client" | "driver";
  origin: string;
  dest: string;
  requestId: string;
  frontendUrl: string;
}): EmailContent {
  const cancelledByDriver = p.cancelledBy === "driver";

  return {
    subject: cancelledByDriver
      ? "El transportista canceló el flete"
      : "El cliente canceló el flete",
    html: layout(`
      <h1 style="font-size:18px;margin:0">Hola ${escapeHtml(p.recipientName)}, el flete fue cancelado</h1>
      <p style="font-size:14px;color:#485450;margin:12px 0 0">
        ${cancelledByDriver
          ? "El transportista canceló el trabajo. La solicitud volvió a estar disponible para recibir otras ofertas."
          : "El cliente canceló el trabajo programado."}
      </p>
      ${routeLine(p.origin, p.dest)}
      ${cancelledByDriver
        ? button(`${p.frontendUrl}/requests/${p.requestId}`, "Ver solicitud")
        : button(`${p.frontendUrl}/jobs`, "Ver mis fletes")}
    `),
  };
}
