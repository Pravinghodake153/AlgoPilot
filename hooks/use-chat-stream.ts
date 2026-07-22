"use client";

import { useRef, useCallback, useEffect, useState } from "react";
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
  
  const [isReconnecting, setIsReconnecting] = useState(false);
  const lastUserMessageRef = useRef<string>("");
  const isRetryingRef = useRef(false);

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
    setIsReconnecting(false);
    isRetryingRef.current = false;

    // If we're in voice mode, go to listening. Otherwise idle.
    if (store.mode === "voice") {
      store.setAIState("listening");
    } else {
      store.setAIState("idle");
    }
  }, []);

  /**
   * Send a message to the AI and stream the response.
   * Supports automatic reconnection and 2-second auto-retry on network drop.
   */
  const sendMessage = useCallback(
    async (message: string, isRetry = false) => {
      const store = useInterviewStore.getState();
      if (!store.interviewId || (store.isStreaming && !isRetry)) return;

      lastUserMessageRef.current = message;
      store.setIsStreaming(true);

      // Add user message to transcript only on initial attempt
      if (!isRetry) {
        store.addMessage("user", message);
      }
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

      const handleNetworkError = async (err: any, msgIdToUpdate?: string) => {
        clearTimeout(timeoutIdRef.current);
        if (!isMountedRef.current) return;

        // User aborted intentionally -> do not reconnect
        if (err instanceof DOMException && err.name === "AbortError") {
          forceRecovery();
          options.onError?.(err);
          return;
        }

        console.error("Stream error:", err);

        // 🔄 AUTO-RETRY ONCE AFTER 2-SECOND DELAY FOR NETWORK DROP
        if (!isRetry && !isRetryingRef.current) {
          isRetryingRef.current = true;
          setIsReconnecting(true);
          console.warn("Network drop detected. Retrying message in 2 seconds...");

          setTimeout(() => {
            if (isMountedRef.current) {
              sendMessage(lastUserMessageRef.current, true);
            }
          }, 2000);
          return;
        }

        // Retry also failed or exhausted
        setIsReconnecting(false);
        isRetryingRef.current = false;

        const errMsg = isTimeout
          ? "We encountered a timeout. Please try sending your message again."
          : "Sorry, I encountered a connection issue. Could you repeat that?";

        const targetMsgId = msgIdToUpdate || streamingMsgIdRef.current;

        useInterviewStore.setState((state) => {
          const hasTarget = targetMsgId && state.messages.some((m) => m.id === targetMsgId);
          if (hasTarget) {
            return {
              messages: state.messages.map((m) =>
                m.id === targetMsgId ? { ...m, content: errMsg } : m
              ),
            };
          }
          // Remove any stray empty assistant message at the end
          const cleaned = state.messages.filter(
            (m) => !(m.role === "assistant" && !m.content.trim())
          );
          return {
            messages: [...cleaned, { id: `msg-${Date.now()}`, role: "assistant", content: errMsg, timestamp: Date.now() }],
          };
        });

        forceRecovery();
        options.onError?.(err instanceof Error ? err : new Error("Unknown error"));
      };

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

        // Successfully connected! Clear reconnecting state
        setIsReconnecting(false);
        isRetryingRef.current = false;

        // Create a placeholder message for streaming
        const msgId = `msg-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 7)}`;
        streamingMsgIdRef.current = msgId;

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
            const currentMsg = useInterviewStore.getState().messages.find((m) => m.id === msgId);
            const nextContent = (currentMsg?.content ?? "") + token;
            useInterviewStore.getState().appendOrUpdateAssistantMessage(msgId, nextContent);
            options.onToken?.(token, isReasoning);
          },
          // onDone
          async (fullText) => {
            clearTimeout(timeoutIdRef.current);
            const currentMsg = useInterviewStore.getState().messages.find((m) => m.id === msgId);
            const textToUse = fullText || (currentMsg?.content ?? "");
            
            useInterviewStore.getState().appendOrUpdateAssistantMessage(msgId, textToUse);
            const didPasteSuccessfully = textToUse.trim().length > 0;

            if (didPasteSuccessfully) {
              console.log(`[Chat-Stream] ✅ Response successfully pasted in chat logs (${fullText.length} chars) [msgId: ${msgId}]`);
            } else {
              console.warn(`[Chat-Stream] ⚠️ WARNING: Response was NOT pasted into chat section! Attempting auto-recovery from DB... [msgId: ${msgId}]`);
              try {
                const interviewId = store.interviewId;
                if (interviewId) {
                  const dbRes = await fetch(`/api/interviews/${interviewId}`);
                  if (dbRes.ok) {
                    const dbData = await dbRes.json();
                    if (dbData.interview?.messages) {
                      useInterviewStore.setState({ messages: dbData.interview.messages });
                      console.log(`[Chat-Stream] 🔄 Successfully recovered and pasted chat logs from DB! (${dbData.interview.messages.length} messages)`);
                    }
                  }
                }
              } catch (recErr) {
                console.error("[Chat-Stream] Error recovering messages from DB:", recErr);
              }
            }

            streamingMsgIdRef.current = null;
            lastExecResultRef.current = null;
            setIsReconnecting(false);
            isRetryingRef.current = false;
            const currentStore = useInterviewStore.getState();
            currentStore.setIsStreaming(false);
            if (currentStore.mode === "text") {
              currentStore.setAIState("idle");
            }
            options.onDone?.(fullText);
          },
          // onError
          (err) => {
            handleNetworkError(err, msgId);
          }
        );
      } catch (err) {
        handleNetworkError(err);
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

  return { sendMessage, stopGeneration, forceRecovery, isReconnecting };
}
