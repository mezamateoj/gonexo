import { HTTPException } from "hono/http-exception";
import type { ContentfulStatusCode } from "hono/utils/http-status";

export type ErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "PAYLOAD_TOO_LARGE"
  | "UNSUPPORTED_MEDIA_TYPE"
  | "UPSTREAM_ERROR"
  | "INTERNAL_SERVER_ERROR";

export class AppError extends HTTPException {
  readonly code: ErrorCode;

  constructor(
    status: ContentfulStatusCode,
    code: ErrorCode,
    message: string,
  ) {
    super(status, { message });
    this.code = code;
  }
}

export function badRequest(message: string) {
  return new AppError(400, "BAD_REQUEST", message);
}

export function unauthorized(message = "Unauthorized") {
  return new AppError(401, "UNAUTHORIZED", message);
}

export function forbidden(message = "Forbidden") {
  return new AppError(403, "FORBIDDEN", message);
}

export function notFound(message = "Not found") {
  return new AppError(404, "NOT_FOUND", message);
}

export function conflict(message: string) {
  return new AppError(409, "CONFLICT", message);
}

export function payloadTooLarge(message: string) {
  return new AppError(413, "PAYLOAD_TOO_LARGE", message);
}

export function unsupportedMediaType(message: string) {
  return new AppError(415, "UNSUPPORTED_MEDIA_TYPE", message);
}

export function upstreamError(message: string) {
  return new AppError(502, "UPSTREAM_ERROR", message);
}
