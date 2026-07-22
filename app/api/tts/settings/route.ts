import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/tts/settings
 * Public endpoint that returns the active TTS_MODEL system setting.
 */
export async function GET() {
  try {
    const settings = await prisma.systemSetting.findMany({
      where: { key: { in: ["TTS_MODEL", "TTS_SPEED"] } },
    });
    const map = settings.reduce((acc, s) => {
      acc[s.key] = s.value;
      return acc;
    }, {} as Record<string, string>);

    return NextResponse.json({
      ttsModel: map["TTS_MODEL"] || "auto",
      ttsSpeed: parseFloat(map["TTS_SPEED"] || "1.0"),
    });
  } catch (error) {
    console.error("Failed to fetch TTS settings:", error);
    return NextResponse.json({ ttsModel: "auto", ttsSpeed: 1.0 });
  }
}
