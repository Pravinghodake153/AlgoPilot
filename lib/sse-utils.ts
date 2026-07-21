/**
 * Read an SSE stream from the chat API and update the assistant message
 * incrementally as tokens arrive. Falls back to JSON response if the
 * response is not SSE (e.g. error fallback from server).
 */
export async function readSSEStream(
  response: Response,
  onToken: (token: string, isReasoning?: boolean) => void,
  onDone: (fullText: string) => void,
  onError: (err: Error) => void
) {
  const contentType = response.headers.get("Content-Type") || "";

  // If the server returned JSON (error fallback), handle it directly
  if (contentType.includes("application/json")) {
    const data = await response.json();
    if (data.response) {
      onDone(data.response);
    } else {
      onError(new Error(data.error || "Unknown error"));
    }
    return;
  }

  // SSE stream
  const reader = response.body?.getReader();
  if (!reader) {
    onError(new Error("No response body"));
    return;
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let accumulated = "";
  let isDone = false;

  try {
    while (!isDone) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        if (trimmed === "data: [DONE]") {
          isDone = true;
          break;
        }

        if (trimmed.startsWith("data: ")) {
          try {
            const parsed = JSON.parse(trimmed.slice(6));
            if (parsed.token !== undefined) {
              accumulated += parsed.token;
              onToken(parsed.token, parsed.isReasoning);
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }
    }

    // Stream ended (either [DONE] or TCP close)
    if (accumulated) {
      onDone(accumulated);
    } else {
      onDone(""); // Support empty responses just in case
    }
  } catch (err) {
    onError(err instanceof Error ? err : new Error("Stream read error"));
  }
}
