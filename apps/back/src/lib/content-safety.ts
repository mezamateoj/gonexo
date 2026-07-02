// Detects contact info shared in free-text fields (notes, quote messages, bios)
// so coordination stays on-platform. Deliberately conservative: it flags obvious
// phones, emails, links, and social handles — not every number, so a house
// number, price, or year won't trip it.

const EMAIL = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i
const URL = /\b(?:https?:\/\/|www\.)\S+|\b[a-z0-9-]{2,}\.(?:cl|com|net|org|io|me)\b/i
const HANDLE = /(?:^|\s)@[a-z0-9._]{3,}/i
const SOCIAL = /\b(whats?app|wsp|telegram|instagram)\b/i
// 8+ digits (a Chilean mobile is 9), allowing spaces/dots/dashes/+ between them.
const PHONE = /(?:\+?56[\s.-]?)?9?(?:[\s.-]?\d){8,}/

export function containsContactInfo(text: string | null | undefined): boolean {
  if (!text) return false
  const t = text.normalize("NFKC")
  if (EMAIL.test(t) || URL.test(t) || HANDLE.test(t) || SOCIAL.test(t)) return true
  const digitCount = (t.match(/\d/g) ?? []).length
  return digitCount >= 8 && PHONE.test(t)
}

export const NO_CONTACT_MESSAGE =
  "No compartas teléfono, correo ni redes sociales. Coordina todo por la plataforma."

// Zod refine helper for optional free-text fields.
export const noContactInfo = {
  check: (v: string | null | undefined) => !containsContactInfo(v),
  message: NO_CONTACT_MESSAGE,
} as const
