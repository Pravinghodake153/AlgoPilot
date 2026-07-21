import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { CODING_PROBLEMS } from "@/data/problems";

/**
 * POST /api/interviews
 * Creates a new interview session with a randomly-selected problem
 * matching the requested difficulty.
 */
export async function POST(req: Request) {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { language, difficulty, style = "standard", duration } = body;

    // Validate inputs
    const validLanguages = ["javascript", "typescript", "python", "java", "cpp", "go"];
    const validDifficulties = ["easy", "medium", "hard"];
    const validStyles = ["standard", "product", "startup", "service"];
    const validDurations = [10, 20, 30];

    if (!validLanguages.includes(language)) {
      return NextResponse.json({ error: "Invalid language" }, { status: 400 });
    }
    if (!validDifficulties.includes(difficulty)) {
      return NextResponse.json({ error: "Invalid difficulty" }, { status: 400 });
    }
    if (!validStyles.includes(style)) {
      return NextResponse.json({ error: "Invalid style" }, { status: 400 });
    }
    if (!validDurations.includes(duration)) {
      return NextResponse.json({ error: "Invalid duration" }, { status: 400 });
    }

    // Find the user in the database
    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found. Please wait for account sync." },
        { status: 404 }
      );
    }

    // Select a random problem matching the difficulty
    let matchingProblems = CODING_PROBLEMS.filter(
      (p) => p.difficulty === difficulty
    );

    if (matchingProblems.length === 0) {
      return NextResponse.json(
        { error: "No problems available for this difficulty" },
        { status: 404 }
      );
    }

    // Question bank hygiene: avoid repeating problems the user has already seen
    const pastInterviews = await prisma.interview.findMany({
      where: { userId: user.id },
      select: { problemTitle: true },
    });
    
    const pastTitles = new Set(pastInterviews.map((i) => i.problemTitle));
    const newProblems = matchingProblems.filter(p => !pastTitles.has(p.title));
    
    // If they've done all problems of this difficulty, fallback to repeating
    if (newProblems.length > 0) {
      matchingProblems = newProblems;
    }

    const problem =
      matchingProblems[Math.floor(Math.random() * matchingProblems.length)];

    // Get the starter code for the selected language
    // TypeScript falls back to JavaScript starter code if not available
    const lang = language as keyof typeof problem.starterCode;
    const starterCode =
      problem.starterCode[lang] ??
      (language === "typescript" ? problem.starterCode["javascript"] : "") ??
      "";

    // Build problem description with examples and constraints
    const descriptionParts = [
      problem.description,
      "",
      ...problem.examples.map(
        (ex, i) =>
          `Example ${i + 1}:\nInput: ${ex.input}\nOutput: ${ex.output}${ex.explanation ? `\nExplanation: ${ex.explanation}` : ""}`
      ),
      "",
      "Constraints:",
      ...problem.constraints.map((c) => `  - ${c}`),
    ];

    // Create the interview record
    const interview = await prisma.interview.create({
      data: {
        userId: user.id,
        language,
        difficulty,
        style,
        duration,
        status: "setup",
        problemTitle: problem.title,
        problemDescription: descriptionParts.join("\n"),
        code: starterCode,
      },
    });

    return NextResponse.json({ interview }, { status: 201 });
  } catch (error) {
    console.error("Interview creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/interviews
 * Returns the current user's interviews (most recent first).
 */
export async function GET() {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ interviews: [] });
    }

    const interviews = await prisma.interview.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        language: true,
        difficulty: true,
        duration: true,
        status: true,
        problemTitle: true,
        startedAt: true,
        endedAt: true,
        createdAt: true,
        report: {
          select: { overallScore: true },
        },
      },
      take: 20,
    });

    return NextResponse.json({ interviews });
  } catch (error) {
    console.error("Interview fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
