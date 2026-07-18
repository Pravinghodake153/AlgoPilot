import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import {
  deepseekChat,
  buildInterviewerSystemPrompt,
} from "@/services/ai-service";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/interviews/[id]/start
 * Starts the interview — sets status to in_progress and generates
 * the AI interviewer's opening message.
 */
export async function POST(req: Request, context: RouteContext) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const interview = await prisma.interview.findUnique({
      where: { id, userId: user.id },
    });

    if (!interview) {
      return NextResponse.json(
        { error: "Interview not found" },
        { status: 404 }
      );
    }

    // Update interview status
    await prisma.interview.update({
      where: { id },
      data: {
        status: "in_progress",
        startedAt: new Date(),
      },
    });

    // Generate AI's opening message
    const systemPrompt = buildInterviewerSystemPrompt({
      problemTitle: interview.problemTitle,
      problemDescription: interview.problemDescription,
      language: interview.language,
      difficulty: interview.difficulty,
      duration: interview.duration,
    });

    let openingMessage: string;
    try {
      openingMessage = await deepseekChat(
        [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content:
              "The candidate has just joined the interview. Introduce yourself briefly and let them know you'll be discussing the problem. Keep it to 2-3 sentences.",
          },
        ],
        { temperature: 0.8, maxTokens: 256 }
      );
    } catch {
      // Fallback if DeepSeek is unavailable
      openingMessage = `Hi, I'm Alex, and I'll be conducting your technical interview today. We have ${interview.duration} minutes to work through this ${interview.difficulty} problem. Take a moment to read through it, and when you're ready, walk me through your initial thoughts on how you'd approach it.`;
    }

    // Save the opening message
    await prisma.message.create({
      data: {
        interviewId: id,
        role: "assistant",
        content: openingMessage,
      },
    });

    return NextResponse.json({ message: openingMessage });
  } catch (error) {
    console.error("Interview start error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
