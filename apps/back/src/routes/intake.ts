import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import {
  createAgentUIStreamResponse,
  safeValidateUIMessages,
  type InferAgentUIMessage,
} from "ai";
import { z } from "zod";
import {
  createRequestIntakeAgent,
  intakeDraftSchema,
} from "../ai/request-intake";
import { uploadKeySchema } from "../domain/driver-documents";
import { badRequest } from "../lib/errors";
import { enforceRateLimit } from "../lib/rate-limit";
import type { AppEnv } from "../lib/types";
import { requireOwnedUpload } from "../lib/uploads";
import { requireClient } from "../middleware/auth";

const intakeChatSchema = z.object({
  messages: z.array(z.object({
    id: z.string(),
    role: z.enum(["user", "assistant"]),
    parts: z.array(z.unknown()),
  }).passthrough()).min(1).max(40),
  draft: intakeDraftSchema,
  mapboxSessionToken: z.string().min(1).max(100),
  photoKeys: z.array(uploadKeySchema).max(4).default([]),
});

const intake = new Hono<AppEnv>();

intake.post(
  "/chat",
  requireClient,
  zValidator("json", intakeChatSchema),
  async (c) => {
    const user = c.get("user")!;
    const { messages, draft, mapboxSessionToken, photoKeys } = c.req.valid("json");

    await enforceRateLimit(
      c.env.AI_RATE_LIMITER,
      `${user.id}:request-intake`,
      "Too many intake requests",
    );
    await Promise.all(
      photoKeys.map((key) => requireOwnedUpload(c.env.BUCKET, key, user.id)),
    );

    const agent = createRequestIntakeAgent({
      apiKey: c.env.ANTHROPIC_API_KEY,
      bucket: c.env.BUCKET,
      mapboxToken: c.env.MAPBOX_TOKEN,
      mapboxSessionToken,
      photoKeys,
      userId: user.id,
      draft,
    });
    const validated = await safeValidateUIMessages<InferAgentUIMessage<typeof agent>>({
      messages,
      tools: agent.tools,
    });
    if (!validated.success) throw badRequest("Invalid chat messages");
    if (validated.data.some((message) => message.parts.some((part) => (
      part.type !== "text"
      && part.type !== "step-start"
      && !part.type.startsWith("tool-")
    )))) {
      throw badRequest("Unsupported chat message part");
    }
    if (validated.data.some((message) => message.parts.some((part) => (
      part.type === "text" && part.text.length > 4_000
    )))) {
      throw badRequest("Chat message is too long");
    }

    return createAgentUIStreamResponse({
      agent,
      uiMessages: validated.data,
      abortSignal: c.req.raw.signal,
    });
  },
);

export type IntakeType = typeof intake;
export default intake;
