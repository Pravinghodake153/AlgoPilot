import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { LANGUAGE_CONFIG, type ProgrammingLanguage } from "@/types";

const JUDGE0_API_URL =
  process.env.JUDGE0_API_URL || "https://judge0-ce.p.rapidapi.com";
const JUDGE0_API_KEY = process.env.JUDGE0_API_KEY || "";

/**
 * POST /api/execute
 * Executes code via Judge0 API (RapidAPI free tier).
 * Accepts: { sourceCode, language, stdin? }
 * Returns: { result: { stdout, stderr, compileOutput, statusDescription, time, memory } }
 */
export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { sourceCode, language, stdin } = body;

    if (!sourceCode || !language) {
      return NextResponse.json(
        { error: "sourceCode and language are required" },
        { status: 400 }
      );
    }

    // Get Judge0 language ID
    const config = LANGUAGE_CONFIG[language as ProgrammingLanguage];
    if (!config) {
      return NextResponse.json(
        { error: "Unsupported language" },
        { status: 400 }
      );
    }

    if (!JUDGE0_API_KEY) {
      // Fallback: return mock result when API key not configured
      return NextResponse.json({
        result: {
          stdout: "Judge0 API key not configured. Add JUDGE0_API_KEY to .env.local",
          stderr: null,
          compileOutput: null,
          statusDescription: "Info",
          statusId: 0,
          time: null,
          memory: null,
        },
      });
    }

    // Submit code to Judge0
    const submitResponse = await fetch(`${JUDGE0_API_URL}/submissions?wait=true`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-RapidAPI-Key": JUDGE0_API_KEY,
        "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
      },
      body: JSON.stringify({
        source_code: sourceCode,
        language_id: config.id,
        stdin: stdin || "",
        // Limits for safety
        cpu_time_limit: 5,
        wall_time_limit: 10,
        memory_limit: 128000,
      }),
    });

    if (!submitResponse.ok) {
      const errorText = await submitResponse.text();
      console.error("Judge0 submission error:", errorText);
      return NextResponse.json(
        { error: "Code execution service unavailable" },
        { status: 502 }
      );
    }

    const result = await submitResponse.json();

    // Decode Base64 outputs if present
    const decode = (str: string | null) =>
      str ? Buffer.from(str, "base64").toString("utf-8") : null;

    return NextResponse.json({
      result: {
        stdout: decode(result.stdout),
        stderr: decode(result.stderr),
        compileOutput: decode(result.compile_output),
        statusDescription: result.status?.description || "Unknown",
        statusId: result.status?.id || 0,
        time: result.time,
        memory: result.memory,
      },
    });
  } catch (error) {
    console.error("Execution error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
