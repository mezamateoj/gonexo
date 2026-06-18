import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  // The backend lives on a different domain, so baseURL is required.
  // Local dev: wrangler dev serves the back on :8787.
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:8787",
  // Cross-origin: the browser must send/receive the session cookie.
  fetchOptions: {
    credentials: "include",
  },
});

export const { signIn, signUp, signOut, useSession, getSession } = authClient;
