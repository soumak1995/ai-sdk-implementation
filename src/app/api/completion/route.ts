import { parseJsonBody } from "@/lib/http";
import { generateWithOllama } from "@/lib/ollama";

type CompletionRequest = { prompt: string };

export async function POST(request: Request) {
  const parsed = await parseJsonBody<CompletionRequest>(
    request,
    (v: unknown): v is CompletionRequest =>
      typeof v === "object" &&
      v !== null &&
      "prompt" in v &&
      typeof (v as { prompt?: unknown }).prompt === "string"
  );

  const prompt = parsed.success ? parsed.data.prompt : "Hello, how are you?";

  try {
    const { text } = await generateWithOllama(prompt, { stream: false });
    return Response.json({ text });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "TinyLlama request error", details: String(error) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

// import { generateText } from "ai";
// import { openai } from "@ai-sdk/openai";
// export async function POST(){
//  const {text} = await generateText({
//     model: openai("gpt-4o-mini"),
//     prompt: "Hello, how are you?",
//     // messages: [
//     //     {
//     //         role: "user",
//     //         content: "Hello, how are you?",
//     //     }
//     // ]
//   })
//   return Response.json({text})