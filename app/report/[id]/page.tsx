import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ReportClient } from "@/features/report/components/report-client";

interface ReportPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Report page — Server Component that fetches report data.
 * If report doesn't exist yet, triggers generation.
 */
export default async function ReportPage({ params }: ReportPageProps) {
  const { userId: clerkId } = await auth();
  const { id } = await params;

  let user = null;
  if (clerkId) {
    user = await prisma.user.findUnique({
      where: { clerkId },
      select: { id: true },
    });
  }

  const interview = await prisma.interview.findUnique({
    where: { id },
    include: {
      report: true,
      messages: {
        orderBy: { createdAt: "asc" },
        select: { role: true, content: true, createdAt: true },
      },
    },
  });

  if (!interview) {
    redirect("/");
  }

  const isOwner = user?.id === interview.userId;
  const isPublic = interview.report?.isPublic ?? false;

  if (!isOwner && !isPublic) {
    // If not owner and not public, deny access
    redirect("/");
  }

  return (
    <ReportClient
      isOwner={isOwner}
      isPublic={isPublic}
      interview={{
        id: interview.id,
        problemTitle: interview.problemTitle,
        difficulty: interview.difficulty,
        language: interview.language,
        duration: interview.duration,
        code: interview.code,
        createdAt: interview.createdAt.toISOString(),
      }}
      report={
        interview.report
          ? {
              overallScore: interview.report.overallScore,
              technicalScore: interview.report.technicalScore,
              communicationScore: interview.report.communicationScore,
              problemSolvingScore: interview.report.problemSolvingScore,
              optimizationScore: interview.report.optimizationScore,
              codeQualityScore: interview.report.codeQualityScore,
              strengths: interview.report.strengths as string[],
              weaknesses: interview.report.weaknesses as string[],
              suggestions: interview.report.suggestions as string[],
              summary: interview.report.summary,
              nextSteps: (interview.report.nextSteps as string[]) || [],
              transcriptAnnotations: (interview.report.transcriptAnnotations as any[]) || [],
              timeComplexity: interview.report.timeComplexity || undefined,
              spaceComplexity: interview.report.spaceComplexity || undefined,
              isSolved: interview.report.isSolved,
              estimatedLevel: interview.report.estimatedLevel || undefined,
            }
          : null
      }
      messages={interview.messages.map((m) => ({
        ...m,
        content: (m as any).thinking ? `\n*Thinking...*\n${(m as any).thinking}\n\n---\n\n${m.content}` : m.content,
      }))}
      messageCount={interview.messages.length}
    />
  );
}
