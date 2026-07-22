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
    const {
      message,
      code,
      executionResult,
      timeRemainingSeconds,
      voiceId,
      tabSwitchCount: bodyTabSwitch,
      outOfFrameCount: bodyOutOfFrame,
      multiplePeopleCount: bodyMultiplePeople,
    } = body;

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

    // Authoritative backend data loading directly from database (not from frontend chat payload)
    const dbTabSwitch = (interview as any).tabSwitchCount ?? 0;
    const dbOutOfFrame = (interview as any).outOfFrameCount ?? 0;
    const dbMultiplePeople = (interview as any).multiplePeopleCount ?? 0;

    const dbHintCount = await prisma.eventLog.count({
      where: {
        interviewId: id,
        eventType: "HINT_REQUESTED",
      },
    });

    // Build system prompt using authoritative backend DB data
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
      tabSwitchCount: dbTabSwitch,
      outOfFrameCount: dbOutOfFrame,
      multiplePeopleCount: dbMultiplePeople,
      hintCount: dbHintCount,
    });

    // Build full user prompt combining message + editor code + execution result into a single payload
    let fullUserMessage = message;

    // Inject candidate's live code with line numbers so AI can reference line numbers accurately
    const liveCode = code || interview.code;
    if (liveCode && liveCode.trim().length > 0) {
      const numberedCode = liveCode
        .split("\n")
        .map((line: string, idx: number) => `${idx + 1}: ${line}`)
        .join("\n");
      fullUserMessage += `\n\n[CONTEXT — Candidate's current code in the editor (with line numbers)]:\n\`\`\`${interview.language}\n${numberedCode}\n\`\`\``;
    }

    // Inject code execution result context if candidate ran code
    if (executionResult) {
      const status = executionResult.statusDescription || "Completed";
      const stderr = executionResult.stderr || executionResult.compileOutput;
      const stdout = executionResult.stdout;
      
      const execSummary = stderr
        ? `[CONTEXT — Code execution completed with STATUS: "${status}"]: Error output:\n${stderr}`
        : stdout
          ? `[CONTEXT — Code execution SUCCESSFUL (Status: "${status}")]: Output:\n${stdout}\nExecution Time: ${executionResult.time || "<0.1"}s, Memory: ${executionResult.memory || 0} KB`
          : `[CONTEXT — Code execution completed with STATUS: "${status}" with no printed output]`;

      fullUserMessage += `\n\n${execSummary}`;
    }

    // Build conversation history ensuring valid role sequence
    const conversationHistory: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...interview.messages.map((m) => ({
        role: m.role as "assistant" | "user",
        content: m.content,
      })),
      { role: "user" as const, content: fullUserMessage },
    ];

    // Stream AI response and save to DB on completion
    try {
      const { stream } = await deepseekChatStream(conversationHistory, {
        temperature: 0.7,
        maxTokens: 2560,
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

            console.log(`[AI-Service] ✅ Response successfully saved to DB and pasted for interview ${id} (${result.content.length} chars)`);

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

      // 1. Save fallback message to DB to preserve chat context integrity
      try {
        await prisma.message.create({
          data: {
            interviewId: id,
            role: "assistant",
            content: fallback,
          },
        });
      } catch (dbErr) {
        console.error("Error saving fallback message to DB:", dbErr);
      }

      // 2. Stream fallback as valid text/event-stream SSE so frontend renders and speaks it smoothly
      const encoder = new TextEncoder();
      const fallbackStream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ token: fallback })}\n\n`)
          );
          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          controller.close();
        },
      });

      return new Response(fallbackStream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
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
