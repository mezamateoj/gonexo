import { createAuthClient } from "better-auth/react";
import { adminClient, inferAdditionalFields } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  // The backend lives on a different domain, so baseURL is required.
  // Local dev: wrangler dev serves the back on :8787.
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:8787",
  // Cross-origin: the browser must send/receive the session cookie.
  fetchOptions: {
    credentials: "include",
  },
  plugins: [
    inferAdditionalFields({
      user: {
        accountType: {
          type: ["client", "driver"],
          required: true,
          input: true,
        },
        phone: {
          type: "string",
          required: false,
          input: true,
        },
      },
    }),
    // Types `session.user.role` and exposes authClient.admin.* (listUsers, …).
    adminClient(),
  ],
});

export const { signIn, signUp, signOut, useSession, getSession } = authClient;
