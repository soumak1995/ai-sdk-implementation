
import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";

const CompletionSchema = z.object({ prompt: z.string().min(1).max(4000) });


export async function POST(request: Request) {
  const raw = await request.json().catch(() => ({}));
  const parsed = CompletionSchema.safeParse(raw);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: "Invalid request", issues: parsed.error.issues }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
  const { prompt } = parsed.data;

  const openai = createOpenAI({
    baseURL: "http://localhost:11434/v1",
    apiKey: "ollama",
  });

  const { text } = await generateText({
    model: openai.chat("tinyllama"),
    prompt,
  });

  return Response.json({ text });
}


