import { createAnthropic } from "@ai-sdk/anthropic";
import { generateText, Output } from "ai";
import { z } from "zod";

const enrichmentSchema = z.object({
  vehicleDescription: z
    .string()
    .describe(
      "Short, client-facing description of the vehicle (make, model, colour, condition). 1–2 sentences.",
    ),
  vehicleCapacity: z
    .string()
    .describe(
      "Estimated cargo capacity in plain Spanish (e.g. 'Hasta 1.5 toneladas / 10 m³').",
    ),
  attributes: z
    .array(z.string())
    .describe(
      "Up to 5 short attribute chips (e.g. 'Rampa trasera', 'Refrigerado', 'Con ayudante').",
    ),
});

export type VehicleEnrichmentResult = z.infer<typeof enrichmentSchema>;

export async function enrichVehicle(
  photoUrls: string[],
  papersUrl: string | null,
  apiKey: string,
): Promise<VehicleEnrichmentResult> {
  const anthropic = createAnthropic({ apiKey });

  const imageContent = [...photoUrls, ...(papersUrl ? [papersUrl] : [])].map(
    (url) => ({
      type: "image" as const,
      image: new URL(url),
    }),
  );

  const { output } = await generateText({
    model: anthropic("claude-sonnet-4-6"),
    output: Output.object({ schema: enrichmentSchema }),
    messages: [
      {
        role: "user",
        content: [
          ...imageContent,
          {
            type: "text",
            text: `Eres un asistente que analiza fotos de vehículos de carga para una plataforma de fletes en Chile.
Basándote en las imágenes, genera:
1. Una descripción breve y honesta del vehículo para los clientes.
2. La capacidad estimada de carga.
3. Hasta 5 atributos clave como chips cortos.
Responde siempre en español.`,
          },
        ],
      },
    ],
  });

  return output;
}
