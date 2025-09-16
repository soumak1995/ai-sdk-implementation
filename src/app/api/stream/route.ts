import { parseJsonBody } from "@/lib/http";
import { streamWithOllama } from "@/lib/ollama";

type StreamRequest = { prompt: string };

export async function POST(request: Request) {
  const parsed = await parseJsonBody<StreamRequest>(
    request,
    (v: unknown): v is StreamRequest =>
      typeof v === "object" &&
      v !== null &&
      "prompt" in v &&
      typeof (v as { prompt?: unknown }).prompt === "string"
  );

  const prompt = parsed.success ? parsed.data.prompt : "Hello, how are you?";

  try {
    const stream = await streamWithOllama(prompt);
    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "TinyLlama stream error", details: String(error) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}


