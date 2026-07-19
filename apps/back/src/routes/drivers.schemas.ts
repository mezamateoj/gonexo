import { z } from "zod";
import {
  uploadKeySchema,
  vehiclePhotoSchema,
  verificationDocumentsSchema,
} from "../domain/driver-documents";

export const upsertDriverSchema = z.object({
  phone: z.string().min(8),
  vehicleType: z.enum(["van", "pickup", "truck_small", "truck_large"]),
  vehiclePlate: z.string().min(4).max(10).toUpperCase(),
  vehicleYear: z.number().int().min(1990).max(2030).optional(),
  bio: z.string().max(500).optional(),
  documents: verificationDocumentsSchema.optional(),
  vehicleDescription: z.string().max(500).optional(),
  vehicleCapacity: z.string().max(200).optional(),
});

export const replaceDocumentsSchema = z.object({
  documents: verificationDocumentsSchema,
});

export const replacePhotosSchema = z.object({
  photos: z.array(vehiclePhotoSchema).max(8),
});

export const enrichSchema = z.object({
  photoKeys: z.array(uploadKeySchema).min(1).max(4),
  papersKey: uploadKeySchema.optional(),
});
