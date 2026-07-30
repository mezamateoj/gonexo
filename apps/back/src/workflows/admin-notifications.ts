import { eq } from "drizzle-orm";
import { user } from "../db/schema";
import type { Db } from "../db";
import type { Bindings } from "../binding";
import { sendEmail, type EmailContent } from "../lib/email";
import { logger } from "../lib/logger";

export async function sendEmailToAdmins(
  db: Db,
  env: Bindings,
  content: EmailContent,
) {
  const admins = await db.query.user.findMany({
    where: eq(user.role, "admin"),
    columns: { email: true },
  });
  if (admins.length === 0) {
    logger.warn("Admin email skipped because no admin users exist");
    return 0;
  }

  const results = await Promise.all(
    admins.map((admin) => sendEmail(env, admin.email, content)),
  );
  return results.filter(Boolean).length;
}
