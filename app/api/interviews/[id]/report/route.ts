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

export const dynamic = "force-dynamic";
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

    const reqUrl = new URL(req.url);
    const force = reqUrl.searchParams.get("force") === "true";

    // If report already exists and not forced, return it
    if (interview.report && !force) {
      return NextResponse.json({ report: interview.report });
    }

    // If force re-generating, delete existing report first
    if (interview.report && force) {
      await prisma.report.delete({
        where: { id: interview.report.id },
      });
    }

    // Ensure interview is completed
    if (interview.status !== "completed") {
      // Mark as completed
      await prisma.interview.update({
        where: { id },
        data: { status: "completed", endedAt: new Date() },
      });

      // Log the completion event
      await prisma.eventLog.create({
        data: {
          eventType: "INTERVIEW_COMPLETED",
          interviewId: id,
          userId: user.id,
          details: { reason: "Report generated" }
        }
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

    const finalCodeSnapshot = interview.code && interview.code.trim().length > 0
      ? interview.code.trim()
      : "[No candidate code submitted / Editor empty]";

    const evaluationMessages: ChatMessage[] = [
      { role: "system", content: buildReportSystemPrompt() },
      {
        role: "user",
        content: `Evaluate this coding interview:

PROBLEM: ${interview.problemTitle} (${interview.difficulty})
LANGUAGE: ${interview.language}
DURATION: ${interview.duration} minutes
HINTS USED: ${hintsUsed}${hintsUsed > 0 ? " (each hint should reduce the problem-solving score by ~5 points)" : ""}

INTERVIEW TRANSCRIPT:
${transcript}

--- FINAL CANDIDATE CODE SOLUTION SNAPSHOT ---
\`\`\`${interview.language}
${finalCodeSnapshot}
\`\`\`

Analyze the final code snapshot for algorithmic correctness, complexity, variable naming, and style.
Generate the evaluation report as raw JSON adhering strictly to the system prompt JSON schema.`,
      },
    ];

    /**
     * Helper to extract, parse, and validate the report JSON object.
     */
    function parseAndValidateReportJson(aiResponseText: string) {
      let jsonStr = aiResponseText.trim();
      
      // Strip markdown code block wrappers if present (e.g. ```json ... ```)
      jsonStr = jsonStr.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

      const match = jsonStr.match(/\{[\s\S]*\}/);
      if (match) {
        jsonStr = match[0];
      }

      const parsed = JSON.parse(jsonStr);

      const clamp = (num: any, fallback: number) => {
        const val = typeof num === "number" ? num : parseInt(String(num), 10);
        return isNaN(val) ? fallback : Math.max(0, Math.min(100, val));
      };

      return {
        overallScore: clamp(parsed.overallScore, 50),
        technicalScore: clamp(parsed.technicalScore, 50),
        communicationScore: clamp(parsed.communicationScore, 50),
        problemSolvingScore: clamp(parsed.problemSolvingScore, 50),
        optimizationScore: clamp(parsed.optimizationScore, 50),
        codeQualityScore: clamp(parsed.codeQualityScore, 50),
        strengths: Array.isArray(parsed.strengths) && parsed.strengths.length > 0
          ? parsed.strengths.map(String)
          : ["Engaged with technical interview"],
        weaknesses: Array.isArray(parsed.weaknesses)
          ? parsed.weaknesses.map(String)
          : [],
        suggestions: Array.isArray(parsed.suggestions)
          ? parsed.suggestions.map(String)
          : ["Practice standard problem-solving patterns"],
        summary: typeof parsed.summary === "string" && parsed.summary.trim().length > 0
          ? parsed.summary.trim()
          : "Completed the interview evaluation.",
        nextSteps: Array.isArray(parsed.nextSteps) ? parsed.nextSteps.map(String) : [],
        transcriptAnnotations: Array.isArray(parsed.transcriptAnnotations) ? parsed.transcriptAnnotations : [],
        timeComplexity: typeof parsed.timeComplexity === "string" ? parsed.timeComplexity : "Unknown",
        spaceComplexity: typeof parsed.spaceComplexity === "string" ? parsed.spaceComplexity : "Unknown",
        isSolved: Boolean(parsed.isSolved),
        estimatedLevel: typeof parsed.estimatedLevel === "string" && parsed.estimatedLevel !== "Unknown"
          ? parsed.estimatedLevel
          : "Very Basic",
      };
    }

    let reportData;
    let attemptError: any = null;

    // ── Attempt 1: Standard Generation ──────────────────────────────────────
    try {
      const aiResponse = await deepseekChat(evaluationMessages, {
        temperature: 0.1,
        maxTokens: 2000,
        useReportModel: true,
      });
      reportData = parseAndValidateReportJson(aiResponse);
    } catch (parseErr: any) {
      attemptError = parseErr;
      console.warn("Attempt 1: Report JSON validation failed. Retrying with strict JSON instruction...", parseErr?.message || parseErr);
    }

    // ── Attempt 2: Strict JSON Retry ─────────────────────────────────────────
    if (!reportData) {
      try {
        const retryMessages: ChatMessage[] = [
          ...evaluationMessages,
          {
            role: "user",
            content: "CRITICAL RETRY NOTICE: Your previous response was NOT valid JSON. Respond ONLY with valid, unadorned raw JSON matching the required schema. Do NOT include markdown text, explanatory text, or code block ticks.",
          },
        ];
        const retryAiResponse = await deepseekChat(retryMessages, {
          temperature: 0.0,
          maxTokens: 2000,
          useReportModel: true,
        });
        reportData = parseAndValidateReportJson(retryAiResponse);
        console.log("Attempt 2: Successfully recovered report data after retry!");
      } catch (retryErr: any) {
        attemptError = retryErr;
        console.error("Attempt 2: Report JSON retry also failed. Falling back to default report payload.", retryErr?.message || retryErr);
      }
    }

    // ── Attempt 3: Safe Fallback if both attempts fail ───────────────────────
    if (!reportData) {
      const exactError = attemptError?.message || String(attemptError);
      reportData = {
        overallScore: 50,
        technicalScore: 50,
        communicationScore: 50,
        problemSolvingScore: 50,
        optimizationScore: 50,
        codeQualityScore: 50,
        strengths: ["Attempted the problem", "Engaged with interviewer"],
        weaknesses: [`Report generation parsing error: ${exactError}`],
        suggestions: [
          "Check API Keys / AI Settings in Admin Dashboard",
          "Try regenerating the report using the refresh button below",
        ],
        summary: `The evaluation system encountered a temporary parsing issue: ${exactError}`,
        nextSteps: ["Retry report generation"],
        transcriptAnnotations: [],
        timeComplexity: "Unknown",
        spaceComplexity: "Unknown",
        isSolved: false,
        estimatedLevel: "Very Basic",
      };
    }

    const finalEstimatedLevel = reportData.estimatedLevel && reportData.estimatedLevel !== "Unknown" ? reportData.estimatedLevel : "Very Basic";

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
        estimatedLevel: finalEstimatedLevel,
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
