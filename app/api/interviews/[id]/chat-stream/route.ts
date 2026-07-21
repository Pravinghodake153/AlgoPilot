import { auth } from "@clerk/nextjs/server";
import { deepseekChatStream } from "@/services/ai-service";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const runtime = "edge"; // Edge runtime bypasses the 60s Vercel limit!
export const dynamic = "force-dynamic";

/**
 * POST /api/interviews/[id]/chat-stream
 * Expects the conversation history in the request body.
 * Runs on Vercel's Edge runtime and connects to OpenRouter, returning the SSE stream.
 * Does NOT interact with Prisma (since Edge doesn't support our Prisma setup).
 */
export async function POST(req: Request, context: RouteContext) {
  try { console.log("CHAT-STREAM ACCESSED");
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { conversationHistory } = body;

    if (!conversationHistory || !Array.isArray(conversationHistory)) {
      return new Response(JSON.stringify({ error: "conversationHistory is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Stream AI response
    try { console.log("CHAT-STREAM ACCESSED");
      const { stream } = await deepseekChatStream(conversationHistory, {
        temperature: 0.7,
        maxTokens: 1024,
      });
      
      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    } catch (error) {
      console.error("Streaming error in Edge route:", error);
      const fallback = "I apologize, I'm having a brief technical issue. Could you repeat what you just said? Let's continue with the problem.";
      return new Response(JSON.stringify({ response: fallback }), {
        status: 500, // Returning 500 so frontend can know to render fallback
        headers: { "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    console.error("Chat edge error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
