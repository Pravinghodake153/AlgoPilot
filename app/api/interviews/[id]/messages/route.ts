import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

/**
 * POST /api/interviews/[id]/messages
 * Saves a message (usually from the AI) to the database.
 */
export async function POST(req: Request, context: RouteContext) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { id } = await context.params;
    const body = await req.json();
    const { role, content, thinking } = body;

    if (!role || !content || typeof content !== "string") {
      return new Response(JSON.stringify({ error: "Role and content are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Verify user and interview
    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: { id: true },
    });

    if (!user) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const interview = await prisma.interview.findUnique({
      where: { id, userId: user.id },
      select: { id: true },
    });

    if (!interview) {
      return new Response(JSON.stringify({ error: "Interview not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Save message to DB
    const message = await prisma.message.create({
      data: {
        interviewId: id,
        role: role,
        content: content,
        thinking: thinking || null,
      },
    });

    return new Response(JSON.stringify({ message }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Save message error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
