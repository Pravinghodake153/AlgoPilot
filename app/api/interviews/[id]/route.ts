import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/interviews/[id]
 * Returns a single interview with its messages.
 */
export async function GET(req: Request, context: RouteContext) {
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

    // Re-combine thinking and content for the frontend UI to render correctly
    const formattedMessages = interview.messages.map((m) => ({
      ...m,
      content: m.thinking ? `\n*Thinking...*\n${m.thinking}\n\n---\n\n${m.content}` : m.content,
    }));

    return NextResponse.json({ 
      interview: {
        ...interview,
        messages: formattedMessages
      }
    });
  } catch (error) {
    console.error("Interview fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/interviews/[id]
 * Updates interview state — save code, change status, etc.
 */
export async function PATCH(req: Request, context: RouteContext) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await req.json();
    const { code, action, status: newStatus } = body;

    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify ownership
    const interview = await prisma.interview.findUnique({
      where: { id, userId: user.id },
      select: { id: true, status: true },
    });

    if (!interview) {
      return NextResponse.json(
        { error: "Interview not found" },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (code !== undefined) {
      updateData.code = code;
    }

    if (action === "start") {
      updateData.status = "in_progress";
      updateData.startedAt = new Date();
    }

    if (action === "submit" || newStatus === "completed") {
      updateData.status = "completed";
      updateData.endedAt = new Date();
    }

    if (newStatus === "cancelled") {
      updateData.status = "cancelled";
      updateData.endedAt = new Date();
    }

    const updated = await prisma.interview.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ interview: updated });
  } catch (error) {
    console.error("Interview update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
