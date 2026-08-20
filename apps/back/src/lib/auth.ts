import { APIError } from "better-auth/api";
import { betterAuth } from "better-auth/minimal";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins/admin";
import * as schema from "../db/schema";
import { accountTypes } from "../domain/accounts";
import { normalizePhone } from "./normalizers";
import type { Db } from "../db";

const configuredFrontendOrigin = process.env.FRONTEND_URL;
const trustedOrigins = [
  "https://cargup.cl",
  ...(configuredFrontendOrigin ? [configuredFrontendOrigin] : []),
];

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
    // Admin status is the `user.role` column ("admin"); no id-based bootstrap.
    plugins: [admin()],
    user: {
      additionalFields: {
        accountType: {
          type: [...accountTypes],
          required: true,
          input: true,
        },
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
            if ("accountType" in data) {
              throw APIError.from("BAD_REQUEST", {
                code: "ACCOUNT_TYPE_IMMUTABLE",
                message: "Account type cannot be changed",
              });
            }
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
