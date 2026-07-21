import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { buildInterviewerSystemPrompt, type ChatMessage } from "@/services/ai-service";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

/**
 * POST /api/interviews/[id]/chat-init
 * Validates user, saves the user message to the DB, and constructs the
 * conversation history. Returns the history so the frontend can stream
 * via an Edge function.
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
    const { message, code, executionResult, timeRemainingSeconds } = body;

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
      duration: interview.duration,
      timeRemainingSeconds: typeof timeRemainingSeconds === "number" ? timeRemainingSeconds : undefined,
    });

    const conversationHistory: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      // Include existing messages for context
      ...interview.messages.map((m) => ({
        role: m.role as "assistant" | "user",
        content: m.content,
      })),
      // Add the new user message
      { role: "user" as const, content: message },
    ];

    // Inject the candidate's live code from the editor
    const liveCode = code || interview.code;
    if (liveCode) {
      conversationHistory.push({
        role: "user",
        content: `[CONTEXT — Candidate's current code in the editor]:\n\`\`\`${interview.language}\n${liveCode}\n\`\`\``,
      });
    }

    // Inject execution result if the candidate just ran code
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

    return new Response(JSON.stringify({ conversationHistory }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Chat init error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
