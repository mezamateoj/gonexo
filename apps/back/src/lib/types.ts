import type { auth } from "./auth";
import type { Bindings } from "../binding";
import type { Db } from "../db";
import type { driverProfile } from "../db/schema";

export type AppEnv = {
  Bindings: Bindings;
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null;
    driverProfile: typeof driverProfile.$inferSelect | null;
    db: Db;
  };
};
