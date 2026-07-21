"use client";

import { useRef, useCallback, useEffect } from "react";
import { useInterviewStore } from "@/features/interview/store/interview-store";
import { readSSEStream } from "@/lib/sse-utils";

interface UseChatStreamOptions {
  /** Called on each token (for TTS buffering) */
  onToken?: (token: string, isReasoning?: boolean) => void;
  /** Called when stream finishes successfully */
  onDone?: (fullText: string) => void;
  /** Called on error */
  onError?: (err: Error) => void;
}

/**
 * Centralized chat streaming hook.
 * Owns the AbortController and fetch lifecycle.
 * Lives at the parent level so mode switches never kill in-flight requests.
 *
 * Key design: if a request fails or is blocked, the state is ALWAYS
 * reset so the next request is never blocked.
 */
export function useChatStream(options: UseChatStreamOptions) {
  const abortControllerRef = useRef<AbortController | null>(null);
  const timeoutIdRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const isMountedRef = useRef(true);
  const streamingMsgIdRef = useRef<string | null>(null);
  const lastExecResultRef = useRef<Record<string, unknown> | null>(null);

  useEffect(() => {
    isMountedRef.current = true;

    // Listen for code execution results
    function handleExecResult(e: CustomEvent) {
      lastExecResultRef.current = e.detail;
    }
    window.addEventListener(
      "code-execution-result",
      handleExecResult as EventListener
    );

    return () => {
      isMountedRef.current = false;
      window.removeEventListener(
        "code-execution-result",
        handleExecResult as EventListener
      );

      // Cleanup on unmount
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      clearTimeout(timeoutIdRef.current);
    };
  }, []);

  /**
   * Force-reset the AI state so no request can ever permanently block input.
   * This is the critical error recovery mechanism.
   */
  const forceRecovery = useCallback(() => {
    const store = useInterviewStore.getState();
    store.setIsStreaming(false);
    streamingMsgIdRef.current = null;

    // If we're in voice mode, go to listening. Otherwise idle.
    if (store.mode === "voice") {
      store.setAIState("listening");
    } else {
      store.setAIState("idle");
    }
  }, []);

  /**
   * Send a message to the AI and stream the response.
   * Safe to call from either text or voice mode.
   */
  const sendMessage = useCallback(
    async (message: string) => {
      const store = useInterviewStore.getState();
      if (!store.interviewId || store.isStreaming) return;

      // Mark as streaming to prevent concurrent requests
      store.setIsStreaming(true);

      // Add user message to transcript
      store.addMessage("user", message);
      store.setAIState("thinking");

      let isTimeout = false;
      const controller = new AbortController();
      abortControllerRef.current = controller;

      const resetTimeout = () => {
        clearTimeout(timeoutIdRef.current);
        timeoutIdRef.current = setTimeout(async () => {
          isTimeout = true;
          controller.abort();

          if (!isMountedRef.current) return;

          try {
            await fetch(
              `/api/interviews/${store.interviewId}/log-error`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  errorType: "TIMEOUT",
                  message:
                    "AI response timed out after 10 minutes of inactivity",
                }),
              }
            );
          } catch (err) {
            console.error("Failed to log timeout to DB:", err);
          }
        }, 600000); // 10 minutes
      };

      resetTimeout();

      try {
        const response = await fetch(
          `/api/interviews/${store.interviewId}/chat`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: controller.signal,
            body: JSON.stringify({
              message,
              code: store.code,
              executionResult: lastExecResultRef.current,
              timeRemainingSeconds: store.timeRemainingSeconds,
              voiceId: store.selectedVoiceId,
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to get response (${response.status})`);
        }

        // Create a placeholder message for streaming
        const msgId = `msg-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 7)}`;
        streamingMsgIdRef.current = msgId;

        // Add empty assistant message that we'll update as tokens arrive
        useInterviewStore.setState((state) => ({
          messages: [
            ...state.messages,
            {
              id: msgId,
              role: "assistant" as const,
              content: "",
              timestamp: Date.now(),
            },
          ],
        }));

        store.setAIState("speaking");

        await readSSEStream(
          response,
          // onToken
          (token, isReasoning) => {
            resetTimeout();
            useInterviewStore.setState((state) => ({
              messages: state.messages.map((m) =>
                m.id === msgId
                  ? { ...m, content: m.content + token }
                  : m
              ),
            }));
            options.onToken?.(token, isReasoning);
          },
          // onDone
          (fullText) => {
            clearTimeout(timeoutIdRef.current);
            useInterviewStore.setState((state) => ({
              messages: state.messages.map((m) =>
                m.id === msgId ? { ...m, content: fullText } : m
              ),
            }));
            streamingMsgIdRef.current = null;
            lastExecResultRef.current = null;
            const store = useInterviewStore.getState();
            store.setIsStreaming(false);
            if (store.mode === "text") {
              store.setAIState("idle");
            }
            options.onDone?.(fullText);
          },
          // onError
          (err) => {
            clearTimeout(timeoutIdRef.current);
            
            // If the stream was aborted manually, do not show connection error message
            if (err instanceof DOMException && err.name === "AbortError") {
              forceRecovery();
              options.onError?.(err);
              return;
            }

            console.error("Stream error:", err);

            const errMsg = isTimeout
              ? "We encountered an error. Please try again."
              : "Sorry, I encountered a connection issue. Could you repeat that?";

            useInterviewStore.setState((state) => ({
              messages: state.messages.map((m) =>
                m.id === msgId
                  ? { ...m, content: errMsg }
                  : m
              ),
            }));

            // CRITICAL: Always recover state so next message isn't blocked
            forceRecovery();
            options.onError?.(err);
          }
        );
      } catch (err) {
        clearTimeout(timeoutIdRef.current);
        if (!isMountedRef.current) return;

        // Check if aborted in catch block
        if (err instanceof DOMException && err.name === "AbortError") {
          forceRecovery();
          options.onError?.(err);
          return;
        }

        const errMsg = isTimeout
          ? "We encountered an error. Please try again."
          : "Sorry, I encountered a connection issue. Could you repeat that?";

        useInterviewStore.getState().addMessage("assistant", errMsg);

        // CRITICAL: Always recover state so next message isn't blocked
        forceRecovery();
        options.onError?.(err instanceof Error ? err : new Error("Unknown error"));
      }
    },
    [options, forceRecovery]
  );

  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    clearTimeout(timeoutIdRef.current);
    forceRecovery();
  }, [forceRecovery]);

  return { sendMessage, stopGeneration, forceRecovery };
}
