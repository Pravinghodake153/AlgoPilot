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

    // Get voiceId and interviewStyle from request body if available
    let voiceId: string | undefined = undefined;
    let interviewStyle: string = "Standard";
    try {
      const body = await req.json();
      voiceId = body.voiceId;
      if (body.interviewStyle) {
        interviewStyle = body.interviewStyle;
      }
    } catch {
      // Empty or invalid JSON body is fine (e.g. initial request doesn't send voiceId)
    }

    // Update interview status and style
    await prisma.interview.update({
      where: { id },
      data: {
        status: "in_progress",
        startedAt: new Date(),
        style: interviewStyle,
      },
    });

    // Log the start event
    await prisma.eventLog.create({
      data: {
        eventType: "INTERVIEW_STARTED",
        interviewId: id,
        userId: user.id,
        details: { style: interviewStyle, duration: interview.duration }
      }
    });

    const INDIAN_VOICE_NAME_MAP: Record<string, string> = {
      am_adam: "Aarav",
      am_michael: "Rohan",
      am_fenrir: "Vikram",
      am_puck: "Kabir",
      am_echo: "Aditya",
      af_heart: "Ananya",
      af_bella: "Diya",
      af_sarah: "Isha",
      af_nicole: "Kavya",
      af_sky: "Meera",
      if_sara: "Priya",
      minimax_male_presenter: "Dev",
      minimax_female_shaonv: "Riya",
      minimax_female_yujie: "Sanya",
      gemini_alloy: "Neer",
      gemini_echo: "Siddharth",
      gemini_onyx: "Varun",
      gemini_nova: "Tara",
      gemini_shimmer: "Neha",
    };

    const isFemale = voiceId && (voiceId.startsWith("af_") || voiceId.startsWith("if_") || voiceId.startsWith("bf_") || voiceId.includes("female") || voiceId === "gemini_nova" || voiceId === "gemini_shimmer");
    const mappedName = voiceId ? INDIAN_VOICE_NAME_MAP[voiceId] : undefined;
    const interviewerName = mappedName || (isFemale ? "Ananya" : "Aarav");

    // Generate AI's opening message
    const systemPrompt = buildInterviewerSystemPrompt({
      problemTitle: interview.problemTitle,
      problemDescription: interview.problemDescription,
      language: interview.language,
      difficulty: interview.difficulty,
      style: interviewStyle,
      duration: interview.duration,
      voiceId,
    });

    let openingMessage: string;
    try {
      openingMessage = await deepseekChat(
        [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content:
              `The candidate has just joined the interview. Introduce yourself as ${interviewerName} briefly and let them know you'll be discussing the problem. Keep it to 2-3 sentences.`,
          },
        ],
        { temperature: 0.8, maxTokens: 256 }
      );
      if (!openingMessage || !openingMessage.trim()) {
        throw new Error("Empty opening message from model");
      }
    } catch {
      // Fallback if AI provider is slow/unavailable
      openingMessage = `Hi, I'm ${interviewerName}, and I'll be conducting your technical interview today. We have ${interview.duration} minutes to work through this ${interview.difficulty} problem. Take a moment to read through it, and when you're ready, walk me through your initial thoughts on how you'd approach it.`;
    }

    // Check if an opening message already exists for this interview
    const existingStartMsg = await prisma.message.findFirst({
      where: { interviewId: id, role: "assistant" },
      orderBy: { createdAt: "asc" },
    });

    if (existingStartMsg) {
      await prisma.message.update({
        where: { id: existingStartMsg.id },
        data: { content: openingMessage },
      });
    } else {
      await prisma.message.create({
        data: {
          interviewId: id,
          role: "assistant",
          content: openingMessage,
        },
      });
    }

    return NextResponse.json({ message: openingMessage });
  } catch (error) {
    console.error("Interview start error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
