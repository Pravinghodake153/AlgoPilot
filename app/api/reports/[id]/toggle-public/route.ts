import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/reports/[id]/toggle-public
 * Toggles the isPublic status of a report.
 * Only the owner of the interview can toggle this.
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

    // Find the report and ensure the current user owns the associated interview
    const report = await prisma.report.findUnique({
      where: { id },
      include: { interview: true },
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    if (report.interview.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { isPublic } = body;

    const updatedReport = await prisma.report.update({
      where: { id },
      data: { isPublic },
    });

    return NextResponse.json({ isPublic: updatedReport.isPublic });
  } catch (error) {
    console.error("Error toggling public status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
