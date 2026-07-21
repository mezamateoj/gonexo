import { z } from "zod";

export const verificationDocumentKinds = ["license", "papers"] as const;
export const driverDocumentKinds = [...verificationDocumentKinds, "vehicle_photo"] as const;

export const uploadKeySchema = z.string().min(1).max(100).refine(
  (key) => !key.includes("://"),
  "R2 object key required",
);

const documentSchema = z.object({
  key: uploadKeySchema,
  order: z.number().int().min(0).default(0),
});

export const verificationDocumentSchema = documentSchema.extend({
  kind: z.enum(verificationDocumentKinds),
});

export const verificationDocumentsSchema = z
  .array(verificationDocumentSchema)
  .max(4)
  .superRefine((documents, ctx) => {
    if (documents.filter((document) => document.kind === "license").length > 1) {
      ctx.addIssue({ code: "custom", message: "Upload only one driver license" });
    }
    if (documents.filter((document) => document.kind === "papers").length > 3) {
      ctx.addIssue({ code: "custom", message: "Upload up to three vehicle documents" });
    }
  });

export const vehiclePhotoSchema = documentSchema.extend({
  kind: z.literal("vehicle_photo"),
});

export type VerificationDocument = z.output<typeof verificationDocumentSchema>;
export type DriverDocument = VerificationDocument | z.output<typeof vehiclePhotoSchema>;

export function onlyVerificationDocuments(
  documents: readonly DriverDocument[],
): VerificationDocument[] {
  return documents.filter(
    (document): document is VerificationDocument => document.kind !== "vehicle_photo",
  );
}

export function sameVerificationDocuments(
  left: readonly VerificationDocument[],
  right: readonly VerificationDocument[],
) {
  if (left.length !== right.length) return false;

  const byOrder = (a: VerificationDocument, b: VerificationDocument) =>
    a.order - b.order || a.kind.localeCompare(b.kind) || a.key.localeCompare(b.key);
  const sortedLeft = [...left].sort(byOrder);
  const sortedRight = [...right].sort(byOrder);

  return sortedLeft.every((document, index) => (
    document.key === sortedRight[index]?.key
    && document.kind === sortedRight[index]?.kind
    && document.order === sortedRight[index]?.order
  ));
}
