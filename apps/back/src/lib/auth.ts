import { betterAuth } from "better-auth/minimal";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import * as schema from "../db/schema";
import type { Db } from "../db";

export const createAuth = (db?: Db) =>
  betterAuth({
    database: drizzleAdapter(db ?? {}, { provider: "sqlite", schema }),
    baseURL: process.env.BETTER_AUTH_URL || "http://localhost:5173",
    secret: process.env.BETTER_AUTH_SECRET,
    trustedOrigins: ["https://gonexo-front.mezamateoj.workers.dev"],
    emailAndPassword: {
      enabled: true,
    },
    user: {
      additionalFields: {
        phone: {
          type: "string",
          required: false,
          input: true,
        },
      },
    },
  });

// Static instance the CLI imports.
export const auth = createAuth();
export default auth;
