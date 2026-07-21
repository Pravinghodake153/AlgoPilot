import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import {
  deepseekChatStream,
  buildInterviewerSystemPrompt,
  type ChatMessage,
} from "@/services/ai-service";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";
// No timeout limit on Render — standard Node.js runtime is fine
export const maxDuration = 300; // 5 minutes max (for safety)

/**
 * POST /api/interviews/[id]/chat
 * Unified chat route: validates user, saves user message, streams AI response,
 * and saves AI response to DB on completion.
 * Works on any hosting platform (Render, Railway, etc.) without Edge runtime.
 */
export async function POST(req: Request, context: RouteContext) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { id } = await context.params;
    const body = await req.json();
    const { message, code, executionResult, timeRemainingSeconds, voiceId } = body;

    if (!message || typeof message !== "string") {
      return new Response(JSON.stringify({ error: "Message is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Verify user and interview
    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: { id: true },
    });

    if (!user) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const interview = await prisma.interview.findUnique({
      where: { id, userId: user.id },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          select: { role: true, content: true },
        },
      },
    });

    if (!interview) {
      return new Response(JSON.stringify({ error: "Interview not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (interview.status !== "in_progress") {
      return new Response(JSON.stringify({ error: "Interview is not active" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Save user message to DB
    await prisma.message.create({
      data: {
        interviewId: id,
        role: "user",
        content: message,
      },
    });

    // Build conversation history
    const systemPrompt = buildInterviewerSystemPrompt({
      problemTitle: interview.problemTitle,
      problemDescription: interview.problemDescription,
      language: interview.language,
      difficulty: interview.difficulty,
      style: (interview as any).style,
      duration: interview.duration,
      timeRemainingSeconds:
        typeof timeRemainingSeconds === "number"
          ? timeRemainingSeconds
          : undefined,
      voiceId,
    });

    const conversationHistory: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...interview.messages.map((m) => ({
        role: m.role as "assistant" | "user",
        content: m.content,
      })),
      { role: "user" as const, content: message },
    ];

    // Inject candidate's live code
    const liveCode = code || interview.code;
    if (liveCode) {
      conversationHistory.push({
        role: "user",
        content: `[CONTEXT — Candidate's current code in the editor]:\n\`\`\`${interview.language}\n${liveCode}\n\`\`\``,
      });
    }

    // Inject execution result
    if (executionResult) {
      const execSummary = executionResult.stderr
        ? `[CONTEXT — Code execution FAILED with error]:\n${executionResult.stderr}`
        : executionResult.stdout
          ? `[CONTEXT — Code executed successfully. Output]:\n${executionResult.stdout}\nTime: ${executionResult.time}s, Memory: ${executionResult.memory} KB`
          : `[CONTEXT — Code executed successfully with no output]`;
      conversationHistory.push({
        role: "user",
        content: execSummary,
      });
    }

    // Stream AI response and save to DB on completion
    try {
      const { stream } = await deepseekChatStream(conversationHistory, {
        temperature: 0.7,
        maxTokens: 1024,
        onComplete: async (result) => {
          try {
            await prisma.message.create({
              data: {
                interviewId: id,
                role: "assistant",
                content: result.content,
                thinking: result.thinking,
              },
            });

            // Save candidate's latest code snapshot
            if (liveCode) {
              await prisma.interview.update({
                where: { id },
                data: { code: liveCode },
              });
            }
          } catch (e) {
            console.error("Error saving AI message to DB:", e);
          }
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    } catch (error) {
      console.error("Streaming error:", error);
      const fallback =
        "I apologize, I'm having a brief technical issue. Could you repeat what you just said? Let's continue with the problem.";
      return new Response(JSON.stringify({ response: fallback }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    console.error("Chat error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
