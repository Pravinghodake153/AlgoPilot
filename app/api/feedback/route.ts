import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET: Fetch all feedback (Admin only)
export async function GET(req: Request) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Verify Admin
    const user = await prisma.user.findUnique({
      where: { clerkId },
    });
    
    if (!user || user.email !== process.env.ADMIN_EMAIL) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const feedbacks = await prisma.feedback.findMany({
      include: {
        user: true,
      },
      orderBy: {
        createdAt: 'desc',
      }
    });

    return NextResponse.json(feedbacks);
  } catch (error) {
    console.error("[FEEDBACK_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// POST: Submit feedback
export async function POST(req: Request) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
    });

    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }

    const body = await req.json();
    const { rating, comment } = body;

    if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
      return new NextResponse("Invalid rating", { status: 400 });
    }

    if (!comment || typeof comment !== 'string') {
      return new NextResponse("Invalid comment", { status: 400 });
    }

    const feedback = await prisma.feedback.create({
      data: {
        userId: user.id,
        rating,
        comment,
      },
    });

    return NextResponse.json(feedback);
  } catch (error) {
    console.error("[FEEDBACK_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
