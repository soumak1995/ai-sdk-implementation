"use client";

import { useCallback, useRef, useState } from "react";

export default function StreamPage() {
  const [prompt, setPrompt] = useState("why is the sky blue?");
  const [isLoading, setIsLoading] = useState(false);
  const [output, setOutput] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const startStream = useCallback(async () => {
    if (isLoading) return;
    setOutput("");
    setIsLoading(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        const text = await res.text().catch(() => res.statusText);
        throw new Error(text || "Stream request failed");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          setOutput((prev) => prev + decoder.decode(value));
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setOutput((prev) => prev + `\n[error] ${(err as Error).message}`);
      }
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  }, [prompt, isLoading]);

  const stopStream = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
  }, []);

  return (
    <div style={{ maxWidth: 720, margin: "40px auto", padding: 16 }}>
      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 12 }}>Streaming Demo</h1>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter prompt"
          style={{ flex: 1, padding: 8, border: "1px solid #ccc", borderRadius: 6 }}
        />
        <button
          onClick={startStream}
          disabled={isLoading}
          style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #ccc" }}
        >
          {isLoading ? "Streaming..." : "Start"}
        </button>
        <button
          onClick={stopStream}
          disabled={!isLoading}
          style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #ccc" }}
        >
          Stop
        </button>
      </div>
      <pre
        style={{
          whiteSpace: "pre-wrap",
          background: "#0b1020",
          color: "#e1e7ff",
          padding: 12,
          borderRadius: 8,
          minHeight: 160,
        }}
      >
        {output}
      </pre>
    </div>
  );
}


