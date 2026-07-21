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

    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        interviews: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            problemTitle: true,
            difficulty: true,
            createdAt: true,
            status: true,
            report: {
              select: { overallScore: true, isSolved: true },
            },
          },
        },
        _count: {
          select: { interviews: true },
        },
      },
    });

    const settingsMap = settings.reduce((acc, s) => {
      acc[s.key] = s.value;
      return acc;
    }, {} as Record<string, string>);

    return NextResponse.json({ settings: settingsMap, feedbacks, users });
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
    const { provider, model, reportProvider, reportModel, geminiApiKey, zaiApiKey } = body;

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
    
    if (reportProvider) {
      await prisma.systemSetting.upsert({
        where: { key: "REPORT_AI_PROVIDER" },
        update: { value: reportProvider },
        create: { key: "REPORT_AI_PROVIDER", value: reportProvider },
      });
    }

    if (reportModel) {
      await prisma.systemSetting.upsert({
        where: { key: "REPORT_AI_MODEL" },
        update: { value: reportModel },
        create: { key: "REPORT_AI_MODEL", value: reportModel },
      });
    }

    if (geminiApiKey !== undefined) {
      await prisma.systemSetting.upsert({
        where: { key: "GEMINI_API_KEY" },
        update: { value: geminiApiKey },
        create: { key: "GEMINI_API_KEY", value: geminiApiKey },
      });
    }

    if (zaiApiKey !== undefined) {
      await prisma.systemSetting.upsert({
        where: { key: "ZAI_API_KEY" },
        update: { value: zaiApiKey },
        create: { key: "ZAI_API_KEY", value: zaiApiKey },
      });
    }

    if (body.openrouterApiKey !== undefined) {
      await prisma.systemSetting.upsert({
        where: { key: "OPENROUTER_API_KEY" },
        update: { value: body.openrouterApiKey },
        create: { key: "OPENROUTER_API_KEY", value: body.openrouterApiKey },
      });
    }

    if (body.deepseekApiKey !== undefined) {
      await prisma.systemSetting.upsert({
        where: { key: "DEEPSEEK_API_KEY" },
        update: { value: body.deepseekApiKey },
        create: { key: "DEEPSEEK_API_KEY", value: body.deepseekApiKey },
      });
    }

    if (body.showAiThinking !== undefined) {
      await prisma.systemSetting.upsert({
        where: { key: "SHOW_AI_THINKING" },
        update: { value: String(body.showAiThinking) },
        create: { key: "SHOW_AI_THINKING", value: String(body.showAiThinking) },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin POST Error:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  if (!(await authorizeAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");
    const interviewId = url.searchParams.get("interviewId");

    if (interviewId) {
      await prisma.interview.delete({
        where: { id: interviewId },
      });
      return NextResponse.json({ success: true });
    }

    if (userId) {
      await prisma.user.delete({
        where: { id: userId },
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "userId or interviewId parameter is required" }, { status: 400 });
  } catch (error) {
    console.error("Admin DELETE Error:", error);
    return NextResponse.json({ error: "Failed to perform deletion" }, { status: 500 });
  }
}
