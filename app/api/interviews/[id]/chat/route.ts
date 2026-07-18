import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import {
  deepseekChat,
  buildInterviewerSystemPrompt,
  type ChatMessage,
} from "@/services/ai-service";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/interviews/[id]/chat
 * Sends user message to DeepSeek and returns AI response.
 * Also persists both messages to the database.
 */
export async function POST(req: Request, context: RouteContext) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await req.json();
    const { message } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Verify user and interview
    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
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
      return NextResponse.json(
        { error: "Interview not found" },
        { status: 404 }
      );
    }

    if (interview.status !== "in_progress") {
      return NextResponse.json(
        { error: "Interview is not active" },
        { status: 400 }
      );
    }

    // Save user message to DB
    await prisma.message.create({
      data: {
        interviewId: id,
        role: "user",
        content: message,
      },
    });

    // Build conversation history for DeepSeek
    const systemPrompt = buildInterviewerSystemPrompt({
      problemTitle: interview.problemTitle,
      problemDescription: interview.problemDescription,
      language: interview.language,
      difficulty: interview.difficulty,
      duration: interview.duration,
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

    // If this includes the current code, add it as context
    if (interview.code) {
      conversationHistory.push({
        role: "user",
        content: `[Current code in editor]:\n${interview.code}`,
      });
    }

    // Get AI response
    let aiResponse: string;
    try {
      aiResponse = await deepseekChat(conversationHistory, {
        temperature: 0.7,
        maxTokens: 512,
      });
    } catch (error) {
      console.error("DeepSeek error:", error);
      // Fallback response if API fails
      aiResponse =
        "I apologize, I'm having a brief technical issue. Could you repeat what you just said? Let's continue with the problem.";
    }

    // Save AI response to DB
    await prisma.message.create({
      data: {
        interviewId: id,
        role: "assistant",
        content: aiResponse,
      },
    });

    return NextResponse.json({ response: aiResponse });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
