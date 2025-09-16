export type GenerateOptions = {
  model?: string;
  stream?: boolean;
  baseUrl?: string;
};

export type GenerateResponse = {
  text: string;
};

/**
 * Calls an Ollama-compatible endpoint to generate text.
 * Defaults: model "tinyllama", stream false, baseUrl http://localhost:11434
 */
export async function generateWithOllama(
  prompt: string,
  options: GenerateOptions = {}
): Promise<GenerateResponse> {
  const model = options.model ?? "tinyllama";
  const stream = options.stream ?? false;
  const baseUrl = options.baseUrl ?? "http://localhost:11434";

  const response = await fetch(`${baseUrl}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, prompt, stream }),
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(
      `Ollama request failed with ${response.status}: ${details || response.statusText}`
    );
  }

  const data = (await response.json()) as { response?: string };
  return { text: data?.response ?? "" };
}

/**
 * Creates a ReadableStream of plain text by consuming Ollama's NDJSON stream.
 * Each JSON line can contain a partial "response". We emit only that text.
 */
export async function streamWithOllama(
  prompt: string,
  options: Omit<GenerateOptions, "stream"> = {}
): Promise<ReadableStream<Uint8Array>> {
  const model = options.model ?? "tinyllama";
  const baseUrl = options.baseUrl ?? "http://localhost:11434";

  const response = await fetch(`${baseUrl}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, prompt, stream: true }),
  });

  if (!response.ok || !response.body) {
    const details = !response.ok
      ? await response.text().catch(() => "")
      : "Missing response body";
    throw new Error(
      `Ollama stream request failed with ${response.status}: ${details || response.statusText}`
    );
  }

  const reader = response.body.getReader();
  const textEncoder = new TextEncoder();
  const textDecoder = new TextDecoder();
  let buffer = "";

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { value, done } = await reader.read();
      if (done) {
        if (buffer.length > 0) {
          // Flush any remaining buffered line if parseable
          try {
            const obj = JSON.parse(buffer);
            if (typeof obj?.response === "string" && obj.response.length > 0) {
              controller.enqueue(textEncoder.encode(obj.response));
            }
          } catch {
            // ignore trailing partial json
          }
        }
        controller.close();
        return;
      }

      buffer += textDecoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? ""; // Keep last partial line in buffer

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const obj = JSON.parse(trimmed);
          if (typeof obj?.response === "string" && obj.response.length > 0) {
            controller.enqueue(textEncoder.encode(obj.response));
          }
          if (obj?.done === true) {
            controller.close();
            try { reader.cancel(); } catch {}
            return;
          }
        } catch {
          // ignore malformed line
        }
      }
    },
    cancel() {
      try { reader.cancel(); } catch {}
    },
  });
}


