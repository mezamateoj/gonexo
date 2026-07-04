export type Bindings = {
  db: D1Database;
  BUCKET: R2Bucket;
  ANTHROPIC_API_KEY: string;
  MAPBOX_TOKEN: string;
  FRONTEND_URL: string;
  // Optional until a sending domain is set up — sendEmail skips when absent.
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
};
