import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const formData = await req.formData();
    const file = formData.get("file") as Blob | null;

    if (!file) {
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 }
      );
    }

    const openRouterApiKey = process.env.OPENROUTER_API_KEY;
    const model = process.env.OPENROUTER_STT_MODEL || "deepgram/nova-3";

    if (!openRouterApiKey) {
      return NextResponse.json(
        { error: "OpenRouter API Key not configured" },
        { status: 500 }
      );
    }

    const sttFormData = new FormData();
    sttFormData.append("file", file, "audio.webm");
    sttFormData.append("model", model);
    // Optional: add language parameter if needed in the future

    const response = await fetch(
      "https://openrouter.ai/api/v1/audio/transcriptions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openRouterApiKey}`,
        },
        body: sttFormData,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenRouter STT error:", response.status, errorText);
      return NextResponse.json(
        { error: "Speech-to-text failed" },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    return NextResponse.json({
      text: data.text || "",
    });
  } catch (error) {
    console.error("Error in STT route:", error);
    return NextResponse.json(
      { error: "Failed to process audio" },
      { status: 500 }
    );
  }
}
