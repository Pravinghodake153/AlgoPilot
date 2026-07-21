import { auth, clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "ghodakepravin154@gmail.com";

/**
 * Ensures the user is authorized as an Admin based on their email.
 */
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

export async function GET() {
  if (!(await authorizeAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const settings = await prisma.systemSetting.findMany();
    const feedbacks = await prisma.feedback.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: { name: true, email: true },
        },
      },
    });

    const settingsMap = settings.reduce((acc, s) => {
      acc[s.key] = s.value;
      return acc;
    }, {} as Record<string, string>);

    return NextResponse.json({ settings: settingsMap, feedbacks });
  } catch (error) {
    console.error("Admin GET Error:", error);
    return NextResponse.json({ error: "Failed to fetch admin data" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!(await authorizeAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { provider, model } = body;

    if (provider) {
      await prisma.systemSetting.upsert({
        where: { key: "DEFAULT_AI_PROVIDER" },
        update: { value: provider },
        create: { key: "DEFAULT_AI_PROVIDER", value: provider },
      });
    }

    if (model) {
      await prisma.systemSetting.upsert({
        where: { key: "DEFAULT_AI_MODEL" },
        update: { value: model },
        create: { key: "DEFAULT_AI_MODEL", value: model },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin POST Error:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
