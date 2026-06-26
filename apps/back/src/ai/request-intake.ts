import { createAnthropic } from "@ai-sdk/anthropic";
import { generateText, Output } from "ai";
import { z } from "zod";

const draftSchema = z.object({
  reply: z
    .string()
    .describe("The assistant's next conversational message to the user."),
  draft: z.object({
    originAddress: z.string().nullable().describe("Origin address if mentioned."),
    destAddress: z.string().nullable().describe("Destination address if mentioned."),
    scheduledAt: z
      .string()
      .nullable()
      .describe("ISO-8601 datetime string if a date/time was mentioned."),
    volumeCategory: z
      .enum(["small", "medium", "large", "full_move"])
      .nullable()
      .describe("Volume category inferred from what the user described."),
    itemDescription: z
      .string()
      .nullable()
      .describe("What the user wants to transport, in their own words."),
    photoUrls: z
      .array(z.string())
      .describe("R2 URLs of photos the user has uploaded so far."),
    isReady: z
      .boolean()
      .describe(
        "True when originAddress, destAddress, scheduledAt, and volumeCategory are all present.",
      ),
  }),
});

export type IntakeDraft = z.infer<typeof draftSchema>["draft"];
export type IntakeResult = z.infer<typeof draftSchema>;

export type IntakeMessage = {
  role: "user" | "assistant";
  text: string;
  photoUrls?: string[];
};

export async function runIntakeTurn(
  history: IntakeMessage[],
  apiKey: string,
): Promise<IntakeResult> {
  const anthropic = createAnthropic({ apiKey });

  const messages = history.map((msg) => {
    if (msg.role === "assistant" || !msg.photoUrls?.length) {
      return { role: msg.role, content: msg.text };
    }
    return {
      role: "user" as const,
      content: [
        ...msg.photoUrls.map((url) => ({
          type: "image" as const,
          image: new URL(url),
        })),
        { type: "text" as const, text: msg.text },
      ],
    };
  });

  const { output } = await generateText({
    model: anthropic("claude-haiku-4-5-20251001"),
    output: Output.object({ schema: draftSchema }),
    system: `Eres un asistente amigable de una plataforma de fletes en Chile llamada gonexo.
Tu tarea es ayudar al cliente a crear una solicitud de flete haciéndole preguntas cortas y naturales.
Necesitas obtener: origen, destino, fecha y hora aproximada, y qué quiere transportar.
Si el usuario sube fotos, analiza qué se ve para estimar el volumen.
Responde siempre en español chileno informal. Sé breve y directo.`,
    messages,
  });

  return output;
}
