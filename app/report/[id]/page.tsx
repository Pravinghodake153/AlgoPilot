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
  if (!clerkId) redirect("/sign-in");

  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: { id: true },
  });

  if (!user) redirect("/dashboard");

  const interview = await prisma.interview.findUnique({
    where: { id, userId: user.id },
    include: {
      report: true,
      messages: {
        orderBy: { createdAt: "asc" },
        select: { role: true, content: true, createdAt: true },
      },
    },
  });

  if (!interview) redirect("/dashboard");

  return (
    <ReportClient
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
            }
          : null
      }
      messageCount={interview.messages.length}
    />
  );
}
