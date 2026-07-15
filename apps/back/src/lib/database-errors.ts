import { conflict } from "./errors";

function isUniqueConstraintError(error: unknown) {
  if (!(error instanceof Error)) return false;

  const cause = error.cause instanceof Error ? ` ${error.cause.message}` : "";
  return /(?:SQLITE_CONSTRAINT_UNIQUE|UNIQUE constraint failed)/i.test(
    `${error.message}${cause}`,
  );
}

export function throwConflictOnUniqueConstraint(error: unknown, message: string): never {
  if (isUniqueConstraintError(error)) throw conflict(message);
  throw error;
}
