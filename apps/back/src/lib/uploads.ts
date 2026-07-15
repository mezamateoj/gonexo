import { forbidden, notFound } from "./errors";

export async function requireOwnedUpload(
  bucket: R2Bucket,
  key: string,
  userId: string,
) {
  const object = await bucket.head(key);
  if (!object) throw notFound("Upload not found");
  if (object.customMetadata?.userId !== userId) {
    throw forbidden("Upload does not belong to you");
  }
}

export async function getOwnedUpload(
  bucket: R2Bucket,
  key: string,
  userId: string,
) {
  const object = await bucket.get(key);
  if (!object) throw notFound("Upload not found");
  if (object.customMetadata?.userId !== userId) {
    throw forbidden("Upload does not belong to you");
  }
  return object;
}
