import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    let { text, voice } = await req.json();

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    // Server-side text sanitization
    text = text
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/\*(.*?)\*/g, "$1")
      .replace(/__(.*?)__/g, "$1")
      .replace(/_(.*?)_/g, "$1")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/^\s*#+\s+/gm, "")
      .replace(/^\s*[-*+]\s+/gm, "")
      .replace(/[*`_#]/g, "")
      .replace(/—/g, "... ")
      .replace(/\s+/g, " ")
      .trim();

    if (!text) {
      return NextResponse.json({ error: "Empty text after sanitization" }, { status: 400 });
    }

    const openRouterApiKey = process.env.OPENROUTER_API_KEY;
    if (!openRouterApiKey) {
      return NextResponse.json(
        { error: "OpenRouter API Key not configured" },
        { status: 500 }
      );
    }

    let targetModel = process.env.OPENROUTER_TTS_MODEL || "hexgrad/kokoro-82m";
    let targetVoice = voice || "af_heart";
    let fallbackVoice = "af_heart";

    // Smart Auto-Routing based on Voice ID Prefix
    if (voice) {
      if (voice.startsWith("minimax_")) {
        targetModel = "minimax/speech-01";
        if (voice === "minimax_male_presenter") targetVoice = "presenter_male";
        else if (voice === "minimax_female_shaonv") targetVoice = "female-shaonv";
        else if (voice === "minimax_female_yujie") targetVoice = "female-yujie";
        else targetVoice = "female-shaonv";
        fallbackVoice = voice.includes("female") ? "af_heart" : "am_adam";
      } else if (voice.startsWith("gemini_")) {
        // OpenRouter uses openai/tts-1 for standard audio voices (alloy, echo, onyx, nova, shimmer)
        targetModel = "openai/tts-1";
        targetVoice = voice.replace("gemini_", ""); // alloy, echo, onyx, nova, shimmer
        fallbackVoice = ["nova", "shimmer"].includes(targetVoice) ? "af_heart" : "am_adam";
      } else if (voice.startsWith("af_") || voice.startsWith("am_") || voice.startsWith("if_")) {
        targetModel = "hexgrad/kokoro-82m";
        targetVoice = voice;
        fallbackVoice = voice;
      }
    }

    // Check if Admin has configured an explicit TTS_MODEL override in DB
    try {
      const dbTtsModelSetting = await prisma.systemSetting.findUnique({
        where: { key: "TTS_MODEL" },
      });
      if (dbTtsModelSetting && dbTtsModelSetting.value && dbTtsModelSetting.value !== "auto") {
        targetModel = dbTtsModelSetting.value;
      }
    } catch {
      /* ignore DB lookup error */
    }

    // Format text input for SSML / prosody pacing if sending to premium models (MiniMax, OpenAI/Gemini)
    const isPremiumSsmlModel = targetModel.includes("minimax") || targetModel.includes("openai") || targetModel.includes("gemini");
    const formattedSsmlInput = isPremiumSsmlModel
      ? text.replace(/\.\.\./g, ' <break time="350ms"/> ').replace(/,\s*/g, ' <break time="150ms"/> ')
      : text;

    // Primary Attempt with Target Model
    let response = await fetch("https://openrouter.ai/api/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openRouterApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: targetModel,
        input: formattedSsmlInput,
        voice: targetVoice,
        response_format: "mp3",
      }),
    });

    // Fallback Attempt 1: If MiniMax/Gemini failed, try openai/tts-1 with alloy/nova
    if (!response.ok && targetModel !== "openai/tts-1" && targetModel !== "hexgrad/kokoro-82m") {
      console.warn(`Primary TTS model (${targetModel}) failed. Trying openai/tts-1 fallback...`);
      response = await fetch("https://openrouter.ai/api/v1/audio/speech", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openRouterApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "openai/tts-1",
          input: text,
          voice: ["nova", "shimmer"].includes(targetVoice) ? "nova" : "alloy",
          response_format: "mp3",
        }),
      });
    }

    // Fallback Attempt 2: If primary & secondary failed, fallback to solid Kokoro-82m
    if (!response.ok) {
      console.warn(`Primary & Secondary TTS failed. Falling back to Kokoro-82m (${fallbackVoice})...`);
      response = await fetch("https://openrouter.ai/api/v1/audio/speech", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openRouterApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "hexgrad/kokoro-82m",
          input: text,
          voice: fallbackVoice,
          response_format: "mp3",
        }),
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error("All OpenRouter TTS attempts failed:", response.status, errorText);
      return NextResponse.json(
        { error: "Text-to-speech failed" },
        { status: response.status }
      );
    }

    // Stream the audio blob back to the client directly
    return new NextResponse(response.body, {
      status: 200,
      headers: {
        "Content-Type": response.headers.get("content-type") || "audio/mpeg",
      },
    });
  } catch (error) {
    console.error("Error in TTS route:", error);
    return NextResponse.json(
      { error: "Failed to process text" },
      { status: 500 }
    );
  }
}
