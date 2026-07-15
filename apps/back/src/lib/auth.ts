import { betterAuth } from "better-auth/minimal";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import * as schema from "../db/schema";
import { normalizePhone } from "./normalizers";
import type { Db } from "../db";

const configuredFrontendOrigin = process.env.FRONTEND_URL;
const trustedOrigins = configuredFrontendOrigin ? [configuredFrontendOrigin] : [];

export const createAuth = (db?: Db) =>
  betterAuth({
    database: drizzleAdapter(db ?? {}, { provider: "sqlite", schema }),
    baseURL: process.env.BETTER_AUTH_URL || "http://localhost:8787",
    secret: process.env.BETTER_AUTH_SECRET,
    trustedOrigins,
    emailAndPassword: {
      enabled: true,
    },
    session: {
      // Validate the session from a signed cookie instead of hitting D1 on
      // every navigation (_app beforeLoad calls getSession on each route change).
      cookieCache: { enabled: true, maxAge: 5 * 60 },
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
    databaseHooks: {
      user: {
        create: {
          before: async (data) => {
            if (typeof data.phone !== "string" || !data.phone.trim()) return;
            return { data: { phone: normalizePhone(data.phone) } };
          },
        },
        update: {
          before: async (data) => {
            if (typeof data.phone !== "string" || !data.phone.trim()) return;
            return { data: { phone: normalizePhone(data.phone) } };
          },
        },
      },
    },
  });

// Static instance the CLI imports.
export const auth = createAuth();
export default auth;
