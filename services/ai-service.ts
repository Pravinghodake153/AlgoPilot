// ──────────────────────────────────────────────
// AlgoPilot — DeepSeek AI Service
// ──────────────────────────────────────────────
// Handles all communication with DeepSeek V4 Flash API.
// Provides interviewer persona, problem presentation,
// follow-up questions, and report generation.



export interface ChatMessage {
  role: "system" | "assistant" | "user";
  content: string;
}

/**
 * Send a chat completion request to DeepSeek (direct or via OpenRouter).
 */
export async function deepseekChat(
  messages: ChatMessage[],
  options?: {
    temperature?: number;
    maxTokens?: number;
  }
): Promise<string> {
  const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
  const OPENROUTER_URL = process.env.OPENROUTER_API_URL || "https://openrouter.ai/api/v1";
  const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "deepseek/deepseek-chat";

  const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY;
  const DEEPSEEK_URL = process.env.DEEPSEEK_API_URL || "https://api.deepseek.com/v1";
  const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || "deepseek-chat";

  if (!OPENROUTER_KEY && !DEEPSEEK_KEY) {
    throw new Error("No API key configured (neither DEEPSEEK_API_KEY nor OPENROUTER_API_KEY)");
  }

  // Helper to make the fetch request
  const makeRequest = async (url: string, key: string, model: string, isOpenRouter: boolean) => {
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
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
  };

  // 1. Try OpenRouter first (Primary)
  if (OPENROUTER_KEY) {
    try {
      return await makeRequest(OPENROUTER_URL, OPENROUTER_KEY, OPENROUTER_MODEL, true);
    } catch (err) {
      console.error("OpenRouter API failed. Falling back to DeepSeek...", err);
      if (!DEEPSEEK_KEY) {
        throw new Error("OpenRouter failed and no DeepSeek fallback key is configured.");
      }
    }
  }

  // 2. Fallback to Official DeepSeek API
  if (DEEPSEEK_KEY) {
    try {
      return await makeRequest(DEEPSEEK_URL, DEEPSEEK_KEY, DEEPSEEK_MODEL, false);
    } catch (err) {
      console.error("DeepSeek API failed.", err);
      throw err;
    }
  }

  throw new Error("API request failed.");
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
}): string {
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
5. When the candidate submits code, review it briefly and ask about tradeoffs.
6. Keep responses SHORT (2-4 sentences max). This is a conversation, not a lecture.
7. Be encouraging but honest. Point out issues tactfully.
8. Do NOT write code for the candidate.
9. Do NOT use markdown formatting, code blocks, or bullet points. Speak naturally.
10. Address the candidate directly ("you", "your code", etc.).

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
  "summary": "2-3 sentence overall summary of the candidate's performance"
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
- Code Quality: Clean code, naming, structure, readability`;
}
