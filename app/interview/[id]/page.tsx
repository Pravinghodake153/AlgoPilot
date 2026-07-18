import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { InterviewClient } from "@/features/interview/components/interview-client";

interface InterviewPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Interview page — Server Component that fetches interview data
 * and passes it to the client-side interview UI.
 */
export default async function InterviewPage({ params }: InterviewPageProps) {
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect("/sign-in");

  const { id } = await params;

  // Fetch interview data
  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: { id: true },
  });

  if (!user) redirect("/dashboard");

  const interview = await prisma.interview.findUnique({
    where: { id, userId: user.id },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!interview) redirect("/dashboard");

  // If already completed, redirect to report
  if (interview.status === "completed") {
    redirect(`/report/${interview.id}`);
  }

  return (
    <InterviewClient
      interview={{
        id: interview.id,
        language: interview.language,
        difficulty: interview.difficulty,
        duration: interview.duration,
        status: interview.status,
        problemTitle: interview.problemTitle,
        problemDescription: interview.problemDescription,
        code: interview.code,
      }}
      existingMessages={interview.messages.map((m) => ({
        id: m.id,
        role: m.role as "assistant" | "user" | "system",
        content: m.content,
        timestamp: m.createdAt.getTime(),
      }))}
    />
  );
}
