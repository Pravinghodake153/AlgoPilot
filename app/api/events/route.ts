import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { userId: clerkId } = await auth();
    
    let userId = null;
    if (clerkId) {
      const user = await prisma.user.findUnique({
        where: { clerkId },
        select: { id: true },
      });
      if (user) userId = user.id;
    }

    const body = await req.json();
    const { eventType, interviewId, details } = body;

    if (!eventType) {
      return NextResponse.json({ error: "Missing eventType" }, { status: 400 });
    }

    const log = await prisma.eventLog.create({
      data: {
        eventType,
        interviewId: interviewId || null,
        userId: userId,
        details: details || {},
      },
    });

    return NextResponse.json(log);
  } catch (error: any) {
    console.error("Failed to create event log:", error);
    return NextResponse.json({ error: "Failed to create event log" }, { status: 500 });
  }
}
