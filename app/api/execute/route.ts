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

    // Track if JDoodle succeeded
    let jdoodleSuccess = false;
    let jdoodleResponseData = null;

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

      try {
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

        if (submitResponse.ok) {
          const result = await submitResponse.json();
          jdoodleSuccess = true;

          // Safely parse memory and cpuTime to numbers
          const memoryVal = result.memory ? parseInt(result.memory.toString(), 10) : 0;
          const timeVal = result.cpuTime ? parseFloat(result.cpuTime.toString()) : 0;
          
          const outputStr = (result.output || "").toString();

          // Detect runtime errors in the output text
          // JDoodle puts tracebacks/errors in "output", NOT in "error"
          const runtimeErrorPatterns = [
            /Traceback \(most recent call last\)/i,
            /^.*Error:.*$/m,
            /^.*Exception:.*$/m,
            /error: /i,
            /fatal error/i,
            /segmentation fault/i,
            /compilation error/i,
            /SyntaxError/,
            /TypeError/,
            /NameError/,
            /ValueError/,
            /IndexError/,
            /KeyError/,
            /AttributeError/,
            /ImportError/,
            /ZeroDivisionError/,
            /RuntimeError/,
            /IndentationError/,
            /FileNotFoundError/,
            /NullPointerException/,
            /ArrayIndexOutOfBoundsException/,
            /ClassNotFoundException/,
            /panic:/,
          ];

          const hasRuntimeError = runtimeErrorPatterns.some((pattern) =>
            pattern.test(outputStr)
          );

          // Also check JDoodle's explicit error field
          const hasExplicitError = !!result.error;
          const isError = hasRuntimeError || hasExplicitError;

          let stdout = "";
          let stderr: string | null = null;

          if (isError) {
            // The entire output is the error trace
            stderr = outputStr;
            stdout = "";
          } else {
            stdout = outputStr;
            stderr = result.error || null;
          }

          jdoodleResponseData = {
            result: {
              stdout,
              stderr,
              compileOutput: null,
              statusDescription: isError ? "Runtime Error" : "Accepted",
              statusId: result.statusCode,
              time: timeVal,
              memory: memoryVal,
            },
          };
        } else {
          const errorText = await submitResponse.text();
          console.error("JDoodle API Error (falling back to Judge0):", errorText);
        }
      } catch (err) {
        console.error("JDoodle Exception (falling back to Judge0):", err);
      }
    }

    // If JDoodle was successful, return its response
    if (jdoodleSuccess && jdoodleResponseData) {
      return NextResponse.json(jdoodleResponseData);
    }

    // --- Fallback to Judge0 if JDoodle failed or is not configured ---
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
