import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { LANGUAGE_CONFIG, type ProgrammingLanguage } from "@/types";

/**
 * POST /api/execute
 * Executes code via JDoodle (Primary) or Judge0 API (Fallback).
 * Accepts: { sourceCode, language, stdin? }
 * Returns: { result: { stdout, stderr, compileOutput, statusDescription, time, memory } }
 */
export async function POST(req: Request) {
  // JDoodle Config
  const JDOODLE_CLIENT_ID = process.env.JDOODLE_CLIENT_ID || "";
  const JDOODLE_CLIENT_SECRET = process.env.JDOODLE_CLIENT_SECRET || "";

  // Judge0 Config
  const JUDGE0_API_URL =
    process.env.JUDGE0_API_URL || "https://judge0-ce.p.rapidapi.com";
  const JUDGE0_API_KEY = process.env.JUDGE0_API_KEY || "";

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

    // JDoodle Execution Flow
    if (JDOODLE_CLIENT_ID && JDOODLE_CLIENT_SECRET) {
      // Map frontend language to JDoodle language code
      const jdoodleLangMap: Record<string, string> = {
        cpp: "cpp17",
        java: "java",
        python: "python3",
        javascript: "nodejs",
        typescript: "typescript",
        go: "go",
      };
      
      const jdoodleLang = jdoodleLangMap[language] || language;

      const submitResponse = await fetch("https://api.jdoodle.com/v1/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clientId: JDOODLE_CLIENT_ID,
          clientSecret: JDOODLE_CLIENT_SECRET,
          script: sourceCode,
          language: jdoodleLang,
          versionIndex: "0",
          stdin: stdin || "",
        }),
      });

      if (!submitResponse.ok) {
        const errorText = await submitResponse.text();
        console.error("JDoodle API Error:", errorText);
        return NextResponse.json(
          { error: "JDoodle execution service unavailable" },
          { status: 502 }
        );
      }

      const result = await submitResponse.json();
      
      // Map JDoodle response format to our expected format
      return NextResponse.json({
        result: {
          stdout: result.output || "",
          stderr: null, // JDoodle mixes stderr into output
          compileOutput: null, 
          statusDescription: result.statusCode === 200 ? "Success" : "Error",
          statusId: result.statusCode,
          time: result.cpuTime || "0",
          memory: result.memory || "0",
        },
      });
    }

    // --- Fallback to Judge0 if JDoodle is not configured ---
    const config = LANGUAGE_CONFIG[language as ProgrammingLanguage];
    if (!config) {
      return NextResponse.json(
        { error: "Unsupported language" },
        { status: 400 }
      );
    }

    if (!JUDGE0_API_KEY) {
      return NextResponse.json({
        result: {
          stdout: "Execution engine credentials not configured. Please add JDoodle or Judge0 API keys to .env.local",
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
