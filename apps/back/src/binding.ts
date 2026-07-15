export type Bindings = {
  db: D1Database;
  BUCKET: R2Bucket;
  GEO_RATE_LIMITER: RateLimit;
  AI_RATE_LIMITER: RateLimit;
  ENVIRONMENT: "local" | "staging" | "production";
  ANTHROPIC_API_KEY: string;
  MAPBOX_TOKEN: string;
  BETTER_AUTH_URL: string;
  FRONTEND_URL: string;
  // Optional until a sending domain is set up — sendEmail skips when absent.
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
  SENTRY_DSN?: string;
};
