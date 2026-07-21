import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { InterviewList } from "@/features/interview/components/interview-list";
import { StartInterviewButton } from "@/features/interview/components/start-interview-button";
import { ProgressChart } from "@/features/dashboard/components/progress-chart";

/**
 * Dashboard page — Welcome message, Start Interview CTA, Previous Interviews list.
 * Per UI/UX spec: "Simple. Welcome, Start Interview, Previous Interviews, Recent Reports. Nothing else."
 */
export default async function DashboardPage() {
  const { userId: clerkId } = await auth();

  if (!clerkId) redirect("/sign-in");

  // Fetch user's interviews from the database
  let interviews: Array<{
    id: string;
    language: string;
    difficulty: string;
    duration: number;
    status: string;
    problemTitle: string;
    startedAt: Date | null;
    endedAt: Date | null;
    createdAt: Date;
    report: { overallScore: number } | null;
  }> = [];

  try {
    const user = await prisma.user.findUnique({
      where: { clerkId: clerkId! },
      select: { id: true },
    });

    if (user) {
      interviews = await prisma.interview.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          language: true,
          difficulty: true,
          duration: true,
          status: true,
          problemTitle: true,
          startedAt: true,
          endedAt: true,
          createdAt: true,
          report: {
            select: { overallScore: true },
          },
        },
        take: 20,
      });
    }
  } catch {
    // Database not connected yet — show empty state gracefully
    console.log("Database not available — showing empty state");
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      {/* Welcome + CTA */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Practice coding interviews with an AI interviewer.
          </p>
        </div>
        <StartInterviewButton />
      </div>

      {/* Performance Trend */}
      <ProgressChart interviews={interviews as any} />

      {/* Previous Interviews */}
      <section>
        <h2 className="text-sm font-medium text-muted-foreground">
          Previous Interviews
        </h2>
        <div className="mt-4">
          <InterviewList interviews={interviews} />
        </div>
      </section>
    </div>
  );
}
