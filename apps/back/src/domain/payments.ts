export const paymentStatuses = [
  "not_required",
  "pending",
  "approved",
  "refunded",
  "charged_back",
] as const;

export type PaymentStatus = (typeof paymentStatuses)[number];

export function paymentAllowsDriverAccess(status: PaymentStatus) {
  return status === "not_required" || status === "approved";
}
