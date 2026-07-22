import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "ghodakepravin154@gmail.com";

async function authorizeAdmin() {
  const { userId } = await auth();
  if (!userId) return false;

  try {
    const clerk = await clerkClient();
    const user = await clerk.users.getUser(userId);
    const email = user.emailAddresses[0]?.emailAddress;
    return email === ADMIN_EMAIL;
  } catch (error) {
    console.error("Failed to authorize admin:", error);
    return false;
  }
}

export async function GET(req: Request) {
  try {
    if (!(await authorizeAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const eventType = searchParams.get("eventType") || undefined;
    
    const skip = (page - 1) * limit;

    const where = eventType ? { eventType } : {};

    const [events, total] = await Promise.all([
      prisma.eventLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.eventLog.count({ where }),
    ]);

    return NextResponse.json({
      events,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[ADMIN_EVENTS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
