// ──────────────────────────────────────────────
// AlgoPilot — DeepSeek AI Service
// ──────────────────────────────────────────────
// Handles all communication with DeepSeek V4 Flash API.
// Provides interviewer persona, problem presentation,
// follow-up questions, and report generation.
// Supports both streaming (SSE) and non-streaming modes.



export interface ChatMessage {
  role: "system" | "assistant" | "user";
  content: string;
}

// ─── Shared config helper ────────────────────

function getProviderConfig() {
  return {
    openrouter: {
      key: process.env.OPENROUTER_API_KEY || "",
      url: process.env.OPENROUTER_API_URL || "https://openrouter.ai/api/v1",
      model: process.env.OPENROUTER_MODEL || "deepseek/deepseek-chat",
      fallbackModel: process.env.OPENROUTER_FALLBACK_MODEL || "google/gemini-2.5-flash-lite",
    },
    deepseek: {
      key: process.env.DEEPSEEK_API_KEY || "",
      url: process.env.DEEPSEEK_API_URL || "https://api.deepseek.com/v1",
      model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
    },
  };
}

/**
 * Send a non-streaming chat completion request.
 * Used for report generation and other cases where full response is needed at once.
 */
export async function deepseekChat(
  messages: ChatMessage[],
  options?: {
    temperature?: number;
    maxTokens?: number;
  }
): Promise<string> {
  const config = getProviderConfig();

  if (!config.openrouter.key && !config.deepseek.key) {
    throw new Error("No API key configured (neither DEEPSEEK_API_KEY nor OPENROUTER_API_KEY)");
  }

  async function makeRequest(
    url: string,
    key: string,
    model: string,
    isOpenRouter: boolean,
    messages: ChatMessage[],
    options?: { temperature?: number; maxTokens?: number },
    timeoutMs: number = 30000
  ) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${url}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
          ...(isOpenRouter ? {
            "HTTP-Referer": "http://localhost:3000",
            "X-Title": "AlgoPilot",
          } : {}),
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: options?.temperature ?? 0.7,
          max_tokens: options?.maxTokens ?? 1024,
          stream: false,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || "";
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  }

  // 1. Try OpenRouter first (Primary)
  if (config.openrouter.key) {
    try {
      return await makeRequest(config.openrouter.url, config.openrouter.key, config.openrouter.model, true, messages, options, 25000);
    } catch (err) {
      console.error("OpenRouter DeepSeek failed. Falling back to configured OpenRouter fallback model...", err);
      try {
        return await makeRequest(config.openrouter.url, config.openrouter.key, config.openrouter.fallbackModel, true, messages, options, 30000);
      } catch (geminiErr) {
        console.error("OpenRouter Gemini failed. Falling back to Official DeepSeek API...", geminiErr);
        if (!config.deepseek.key) {
          throw new Error("OpenRouter failed and no DeepSeek fallback key is configured.");
        }
      }
    }
  }

  // 2. Fallback to Official DeepSeek API
  if (config.deepseek.key) {
    try {
      return await makeRequest(config.deepseek.url, config.deepseek.key, config.deepseek.model, false, messages, options, 30000);
    } catch (err) {
      console.error("DeepSeek API failed.", err);
      throw err;
    }
  }

  throw new Error("API request failed.");
}

/**
 * Send a streaming chat completion request.
 * Returns a ReadableStream that yields SSE-formatted text chunks.
 * Also returns a promise that resolves to the full accumulated text (for DB persistence).
 *
 * Focused on OpenRouter as the primary provider.
 */
export async function deepseekChatStream(
  messages: ChatMessage[],
  options?: {
    temperature?: number;
    maxTokens?: number;
    onComplete?: (result: { content: string; thinking: string | null }) => Promise<void>;
  }
): Promise<{ stream: ReadableStream<Uint8Array>; fullText: Promise<{ content: string; thinking: string | null }> }> {
  const config = getProviderConfig();

  if (!config.openrouter.key && !config.deepseek.key) {
    throw new Error("No API key configured");
  }

  const provider = config.openrouter.key
    ? { ...config.openrouter, isOpenRouter: true }
    : { ...config.deepseek, isOpenRouter: false };

  let response: Response;
  const controller = new AbortController();
  
  try {
    response = await fetch(`${provider.url}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${provider.key}`,
        ...(provider.isOpenRouter ? {
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "AlgoPilot",
        } : {}),
      },
      body: JSON.stringify({
        model: provider.model,
        messages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 1024, // increased max tokens for reasoning
        stream: true,
        include_reasoning: true, // Request reasoning from OpenRouter
      }),
      signal: controller.signal,
    });
    
    if (!response.ok) throw new Error(`Streaming API error (${response.status})`);
  } catch (err) {
    if (provider.isOpenRouter) {
      console.error("OpenRouter DeepSeek streaming failed. Falling back to configured fallback model...", err);
      try {
        response = await fetch(`${config.openrouter.url}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${config.openrouter.key}`,
            "HTTP-Referer": "http://localhost:3000",
            "X-Title": "AlgoPilot",
          },
          body: JSON.stringify({
            model: config.openrouter.fallbackModel,
            messages,
            temperature: options?.temperature ?? 0.7,
            max_tokens: options?.maxTokens ?? 1024,
            stream: true,
          }),
        });
        if (!response.ok) throw new Error(`Fallback streaming API error (${response.status})`);
      } catch (fallbackErr) {
        console.error("OpenRouter fallback streaming failed. Falling back to Official DeepSeek API...", fallbackErr);
        if (!config.deepseek.key) throw new Error("All streaming providers failed.");
        response = await fetch(`${config.deepseek.url}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${config.deepseek.key}`,
          },
          body: JSON.stringify({
            model: config.deepseek.model,
            messages,
            temperature: options?.temperature ?? 0.7,
            max_tokens: options?.maxTokens ?? 1024,
            stream: true,
          }),
        });
        if (!response.ok) throw new Error(`Official DeepSeek streaming API error (${response.status})`);
      }
    } else {
      throw err;
    }
  }

  if (!response.body) {
    throw new Error("No response body for streaming");
  }

  // We'll accumulate the full text for DB persistence
  let fullTextResolve: (value: { content: string; thinking: string | null }) => void;
  const fullText = new Promise<{ content: string; thinking: string | null }>((resolve) => {
    fullTextResolve = resolve;
  });

  const encoder = new TextEncoder();
  let accumulated = ""; // Keeps tags for frontend UI rendering
  let accumulatedContent = ""; // Only raw output
  let accumulatedReasoning = ""; // Only raw reasoning
  let buffer = "";

  const contentType = response.headers.get("Content-Type") || "";
  if (contentType.includes("application/json")) {
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || data.choices?.[0]?.delta?.content || "";
    const reasoning =
      data.choices?.[0]?.message?.reasoning ||
      data.choices?.[0]?.message?.reasoning_content ||
      data.choices?.[0]?.delta?.reasoning ||
      data.choices?.[0]?.delta?.reasoning_content ||
      "";

    if (content || reasoning) {
      accumulatedContent = content;
      accumulatedReasoning = reasoning;
      accumulated = reasoning ? `\n*Thinking...*\n${reasoning}\n\n---\n\n${content}` : content;
    } else if (data.error) {
      throw new Error(`OpenRouter returned JSON error: ${data.error.message || JSON.stringify(data.error)}`);
    }
    
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        if (options?.onComplete) {
          await options.onComplete({ content: accumulatedContent, thinking: accumulatedReasoning || null });
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token: accumulated })}\n\n`));
        controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
        controller.close();
        fullTextResolve({ content: accumulatedContent, thinking: accumulatedReasoning || null });
      }
    });
    return { stream, fullText };
  }

  const upstreamReader = response.body.getReader();
  const decoder = new TextDecoder();
  let isReasoning = false;
  let isCompleted = false;

  const handleFinish = async (controller: ReadableStreamDefaultController<Uint8Array>) => {
    if (isCompleted) return;
    isCompleted = true;
    
    try {
      await upstreamReader.cancel();
    } catch (e) {
      console.error("Error cancelling upstream reader on completion:", e);
    }

    const finalResult = { content: accumulatedContent, thinking: accumulatedReasoning || null };
    if (options?.onComplete) {
      try {
        await options.onComplete(finalResult);
      } catch (e) {
        console.error("Error in onComplete handler:", e);
      }
    }
    controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
    controller.close();
    fullTextResolve(finalResult);
  };

  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { done, value } = await upstreamReader.read();

        if (done) {
          await handleFinish(controller);
          return;
        }

        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE lines
        const lines = buffer.split("\n");
        // Keep the last potentially incomplete line in the buffer
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === "data: [DONE]") {
            if (trimmed === "data: [DONE]") {
              await handleFinish(controller);
              return;
            }
            continue;
          }

          if (trimmed.startsWith("data: ")) {
            const jsonStr = trimmed.slice(6);
            try {
              const parsed = JSON.parse(jsonStr);
              const delta = parsed.choices?.[0]?.delta?.content;
              const reasoning =
                parsed.choices?.[0]?.delta?.reasoning ||
                parsed.choices?.[0]?.delta?.reasoning_content ||
                parsed.choices?.[0]?.delta?.thought;
              const finishReason = parsed.choices?.[0]?.finish_reason;

              if (reasoning) {
                if (!isReasoning) {
                  isReasoning = true;
                  const startTag = "\n*Thinking...*\n";
                  accumulated += startTag;
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token: startTag, isReasoning: true })}\n\n`));
                }
                accumulated += reasoning;
                accumulatedReasoning += reasoning;
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token: reasoning, isReasoning: true })}\n\n`));
              } else if (delta) {
                if (isReasoning) {
                  isReasoning = false;
                  const endTag = "\n\n---\n\n";
                  accumulated += endTag;
                  // End tag is still technically part of reasoning formatting
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token: endTag, isReasoning: true })}\n\n`));
                }
                accumulated += delta;
                accumulatedContent += delta;
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ token: delta })}\n\n`)
                );
              }
              
              // If OpenRouter signals the response is complete, aggressively close
              // the stream. This prevents the connection from hanging open for seconds
              // if they delay sending the final [DONE] event.
              if (finishReason) {
                await handleFinish(controller);
                return;
              }
            } catch {
              // Skip malformed JSON lines
            }
          }
        }
      } catch (err) {
        controller.error(err);
        if (!isCompleted) {
          isCompleted = true;
          const finalResult = { content: accumulatedContent, thinking: accumulatedReasoning || null };
          if (options?.onComplete) {
            Promise.resolve(options.onComplete(finalResult)).catch(console.error);
          }
        }
        fullTextResolve({ content: accumulatedContent, thinking: accumulatedReasoning || null });
      }
    },
    cancel() {
      upstreamReader.cancel();
      if (!isCompleted) {
        isCompleted = true;
        const finalResult = { content: accumulatedContent, thinking: accumulatedReasoning || null };
        if (options?.onComplete) {
          Promise.resolve(options.onComplete(finalResult)).catch(console.error);
        }
      }
      fullTextResolve({ content: accumulatedContent, thinking: accumulatedReasoning || null });
    },
  });

  return { stream, fullText };
}

/**
 * Build the system prompt for the AI interviewer persona.
 */
export function buildInterviewerSystemPrompt(config: {
  problemTitle: string;
  problemDescription: string;
  language: string;
  difficulty: string;
  duration: number;
  timeRemainingSeconds?: number;
}): string {
  // Build time-awareness context
  let timeContext = "";
  if (typeof config.timeRemainingSeconds === "number") {
    const mins = Math.floor(config.timeRemainingSeconds / 60);
    const secs = config.timeRemainingSeconds % 60;
    timeContext = `\nTIME REMAINING: ${mins} minutes and ${secs} seconds left.`;

    if (config.timeRemainingSeconds <= 30) {
      timeContext += `
TIME BEHAVIOR (FINAL 30 SECONDS):
- The interview is about to end. Say a brief, warm goodbye.
- Thank the candidate for their time and effort.
- Say something encouraging like "It was great working through this with you."
- Keep it to 1-2 sentences. Do NOT ask any more questions.`;
    } else if (config.timeRemainingSeconds <= 120) {
      timeContext += `
TIME BEHAVIOR (LAST 2 MINUTES):
- Begin wrapping up the interview naturally.
- Mention that time is almost up.
- Ask the candidate for any final thoughts on their solution.
- If they solved it, briefly summarize what went well.
- If they didn't solve it, be encouraging and acknowledge their effort.
- Do NOT introduce new complex topics or questions.`;
    } else if (config.timeRemainingSeconds <= 300) {
      timeContext += `
TIME BEHAVIOR (UNDER 5 MINUTES):
- Time is running low. Keep questions simple and focused.
- If the candidate is stuck, give them a stronger hint or help them move forward.
- Focus on what they have accomplished so far.
- Remind them gently about the remaining time if appropriate.`;
    }
  }

  return `You are a senior software engineer conducting a live coding interview. Your name is Alex.

ROLE:
- You are a professional, calm, and encouraging technical interviewer.
- Simulate a real coding interview experience — NOT a chatbot conversation.
- Speak naturally and conversationally, as if in a video call.

INTERVIEW CONTEXT:
- Problem: "${config.problemTitle}"
- Difficulty: ${config.difficulty}
- Language: ${config.language}
- Duration: ${config.duration} minutes
${timeContext}

PROBLEM DETAILS:
${config.problemDescription}

BEHAVIOR RULES:
1. Start by briefly introducing yourself and the problem. Do NOT repeat the full problem text — the candidate can see it.
2. Ask the candidate to explain their approach before coding.
3. If the candidate is stuck, give small hints — never give the solution.
4. Ask follow-up questions about:
   - Time/space complexity
   - Edge cases
   - Alternative approaches
   - Code optimizations
5. When the candidate runs code and you see the execution result, acknowledge it. If it failed, help them debug. If it passed, ask about edge cases or optimization.
6. Keep responses SHORT (2-4 sentences max). This is a conversation, not a lecture.
7. Be encouraging but honest. Point out issues tactfully.
8. Do NOT write code for the candidate.
9. Do NOT use markdown formatting, code blocks, or bullet points. Speak naturally.
10. Address the candidate directly ("you", "your code", etc.).
11. You can see the candidate's code in the editor and their execution results. Reference specific lines or variables when giving feedback.

TONE: Professional, calm, encouraging. Like a real interviewer at a top tech company.`;
}

/**
 * Build the system prompt for generating the interview report.
 */
export function buildReportSystemPrompt(): string {
  return `You are an interview evaluation system. Analyze the interview transcript and code submission to generate a structured performance report.

OUTPUT FORMAT (respond ONLY with valid JSON, no markdown):
{
  "overallScore": <0-100>,
  "technicalScore": <0-100>,
  "communicationScore": <0-100>,
  "problemSolvingScore": <0-100>,
  "optimizationScore": <0-100>,
  "codeQualityScore": <0-100>,
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "weaknesses": ["weakness 1", "weakness 2"],
  "suggestions": ["suggestion 1", "suggestion 2", "suggestion 3"],
  "summary": "2-3 sentence overall summary of the candidate's performance",
  "nextSteps": ["Actionable recommendation 1", "Actionable recommendation 2 (e.g. Leetcode problems)"],
  "transcriptAnnotations": [
    {
      "messageIndex": 2,
      "tag": "Missed Edge Case",
      "rationale": "The candidate didn't consider empty inputs here."
    }
  ]
}

SCORING GUIDELINES:
- 90-100: Exceptional — Would pass at top tech companies
- 80-89: Strong — Above average performance
- 70-79: Good — Meets expectations with minor gaps
- 60-69: Average — Some significant gaps
- 50-59: Below Average — Needs improvement
- Below 50: Weak — Major gaps in multiple areas

EVALUATE:
- Technical: Algorithm choice, data structures, correctness
- Communication: Clarity, explaining thought process, asking questions
- Problem Solving: Breaking down problems, handling edge cases
- Optimization: Time/space complexity awareness, improvements
- Code Quality: Clean code, naming, structure, readability

ANNOTATIONS:
- The transcript contains messages prefixed with "[Msg X]".
- Create up to 5 transcriptAnnotations linking back to specific message indices where the candidate did something exceptionally well or poorly.
- Use tags like "Good Communication", "Red Flag", "Optimal Solution", "Missed Edge Case".`;
}
