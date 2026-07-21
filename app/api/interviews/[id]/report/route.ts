import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import {
  deepseekChat,
  buildReportSystemPrompt,
  type ChatMessage,
} from "@/services/ai-service";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const maxDuration = 60; // Extend Vercel timeout to 60 seconds

/**
 * POST /api/interviews/[id]/report
 * Generates an interview report using DeepSeek based on the transcript and code.
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
      include: {
        messages: { orderBy: { createdAt: "asc" } },
        report: true,
      },
    });

    if (!interview) {
      return NextResponse.json(
        { error: "Interview not found" },
        { status: 404 }
      );
    }

    // If report already exists, return it
    if (interview.report) {
      return NextResponse.json({ report: interview.report });
    }

    // Ensure interview is completed
    if (interview.status !== "completed") {
      // Mark as completed
      await prisma.interview.update({
        where: { id },
        data: { status: "completed", endedAt: new Date() },
      });
    }

    // Build the evaluation prompt
    const transcript = interview.messages
      .map(
        (m, i) =>
          `[Msg ${i}] ${m.role === "assistant" ? "Interviewer" : "Candidate"}: ${m.content}`
      )
      .join("\n");

    // Count hints used (tracked via special messages in transcript)
    const hintsUsed = interview.messages.filter(
      (m) => m.role === "user" && m.content.includes("[Hint requested")
    ).length;

    const evaluationMessages: ChatMessage[] = [
      { role: "system", content: buildReportSystemPrompt() },
      {
        role: "user",
        content: `Evaluate this coding interview:

PROBLEM: ${interview.problemTitle} (${interview.difficulty})
LANGUAGE: ${interview.language}
DURATION: ${interview.duration} minutes
HINTS USED: ${hintsUsed}${hintsUsed > 0 ? " (each hint should reduce the problem-solving score by ~5 points)" : ""}

TRANSCRIPT:
${transcript}

FINAL CODE:
\`\`\`${interview.language}
${interview.code}
\`\`\`

Generate the evaluation report as JSON.`,
      },
    ];

    let reportData;
    try {
      const aiResponse = await deepseekChat(evaluationMessages, {
        temperature: 0.3,
        maxTokens: 4096,
      });

      // Robust JSON extraction
      let jsonStr = aiResponse.trim();
      const match = jsonStr.match(/\{[\s\S]*\}/);
      if (match) {
        jsonStr = match[0];
      }
      reportData = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("AI Report generation failed. Falling back to default.", parseError);
      // Fallback report if AI fails
      reportData = {
        overallScore: 50,
        technicalScore: 50,
        communicationScore: 50,
        problemSolvingScore: 50,
        optimizationScore: 50,
        codeQualityScore: 50,
        strengths: ["Attempted the problem", "Engaged with interviewer"],
        weaknesses: ["Report generation encountered an issue"],
        suggestions: [
          "Try the interview again for a more accurate evaluation",
        ],
        summary:
          "The evaluation system encountered an issue generating a detailed report. Please try again.",
        timeComplexity: "Unknown",
        spaceComplexity: "Unknown",
        isSolved: false,
        estimatedLevel: "Unknown",
      };
    }

    // Save report to database
    const report = await prisma.report.create({
      data: {
        interviewId: id,
        overallScore: reportData.overallScore,
        technicalScore: reportData.technicalScore,
        communicationScore: reportData.communicationScore,
        problemSolvingScore: reportData.problemSolvingScore,
        optimizationScore: reportData.optimizationScore,
        codeQualityScore: reportData.codeQualityScore,
        strengths: reportData.strengths,
        weaknesses: reportData.weaknesses,
        suggestions: reportData.suggestions,
        summary: reportData.summary,
        nextSteps: reportData.nextSteps || [],
        transcriptAnnotations: reportData.transcriptAnnotations || [],
        timeComplexity: reportData.timeComplexity || "Unknown",
        spaceComplexity: reportData.spaceComplexity || "Unknown",
        isSolved: !!reportData.isSolved,
        estimatedLevel: reportData.estimatedLevel || "Unknown",
      },
    });

    return NextResponse.json({ report });
  } catch (error) {
    console.error("Report generation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
