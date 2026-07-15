import { tooManyRequests } from "./errors";

export async function enforceRateLimit(
  limiter: RateLimit,
  key: string,
  message: string,
) {
  const { success } = await limiter.limit({ key });
  if (!success) throw tooManyRequests(message);
}
