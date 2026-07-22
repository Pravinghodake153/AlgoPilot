import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export async function POST(req: Request, context: RouteContext) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await req.json();
    const { errorType, message } = body;

    if (!errorType || !message) {
      return NextResponse.json(
        { error: "errorType and message are required" },
        { status: 400 }
      );
    }

    // Verify user
    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify interview ownership
    const interview = await prisma.interview.findUnique({
      where: { id, userId: user.id },
      select: { id: true },
    });

    if (!interview) {
      return NextResponse.json({ error: "Interview not found" }, { status: 404 });
    }

    // Log the error in DB
    const log = await prisma.errorLog.create({
      data: {
        interviewId: id,
        errorType,
        message,
      },
    });

    return NextResponse.json({ success: true, log });
  } catch (error) {
    console.error("Error logging database event:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
