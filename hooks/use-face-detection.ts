"use client";

import { useEffect, useRef, useCallback, useState } from "react";

interface UseFaceDetectionOptions {
  enabled: boolean;
  interviewId?: string;
  initialCount?: number;
  /** How often to check for a face (ms). Default: 1000ms */
  intervalMs?: number;
  /** How many consecutive "no face" checks before warning. Default: 1 */
  missThreshold?: number;
  mode?: "text" | "voice";
}

interface FaceDetectionState {
  isCameraReady: boolean;
  showWarning: boolean;
  warningMessage: string;
  outOfFrameCount: number; // Represents total accumulated seconds out of frame
  stream: MediaStream | null;
}

/**
 * Enterprise-grade face detection hook powered by TensorFlow.js & Google BlazeFace.
 * Features real-time duration tracking (seconds spent out of frame).
 */
export function useFaceDetection({
  enabled,
  interviewId,
  initialCount = 0,
  intervalMs = 1000,
  missThreshold = 1,
}: UseFaceDetectionOptions): FaceDetectionState & {
  dismissWarning: () => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  stopCamera: () => void;
} {
  const storageKey = interviewId ? `algopilot_out_of_frame_seconds_${interviewId}` : null;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const modelRef = useRef<any>(null);
  const consecutiveMissRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Duration Timer Refs
  const outOfFrameStartTimeRef = useRef<number | null>(null);
  const lastLoggedSecondRef = useRef<number>(0);
  const multiplePeopleCountRef = useRef<number>(0);

  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState("");

  // outOfFrameCount now represents TOTAL ACCUMULATED SECONDS out of frame
  const [outOfFrameCount, setOutOfFrameCount] = useState<number>(() => {
    if (typeof window !== "undefined" && storageKey) {
      const saved = localStorage.getItem(storageKey);
      if (saved !== null) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed)) return Math.max(parsed, initialCount);
      }
    }
    return initialCount;
  });

  const [stream, setStream] = useState<MediaStream | null>(null);

  const dismissWarning = useCallback(() => {
    setShowWarning(false);
    setWarningMessage("");
  }, []);

  const stopCamera = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setStream(null);
    setIsCameraReady(false);
    videoRef.current = null;
    outOfFrameStartTimeRef.current = null;
  }, []);

  // 1. Dynamically import and initialize TensorFlow.js & BlazeFace model
  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    async function loadBlazeFace() {
      try {
        const tf = await import("@tensorflow/tfjs");
        await tf.ready();
        const blazeface = await import("@tensorflow-models/blazeface");
        const model = await blazeface.load();
        if (!cancelled) {
          modelRef.current = model;
          setIsModelLoaded(true);
        }
      } catch (err) {
        console.error("Failed to load BlazeFace ML model:", err);
      }
    }

    loadBlazeFace();

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  // 2. Initialize camera stream
  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    async function startCamera() {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240, facingMode: "user" },
          audio: false,
        });

        if (cancelled) {
          mediaStream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = mediaStream;
        setStream(mediaStream);

        // Create offscreen video element for ML frame extraction
        const video = document.createElement("video");
        video.srcObject = mediaStream;
        video.setAttribute("playsinline", "true");
        video.muted = true;
        await video.play();
        videoRef.current = video;

        setIsCameraReady(true);
      } catch (err) {
        console.warn("Camera access denied or unavailable:", err);
      }
    }

    startCamera();

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [enabled, stopCamera]);

  // 3. Run ML Face Detection & Session Duration Loop
  useEffect(() => {
    if (!enabled || !isCameraReady || !isModelLoaded || !modelRef.current) return;

    async function checkForFace() {
      const video = videoRef.current;
      if (!video || video.readyState < 2) return;

      try {
        const predictions = await modelRef.current.estimateFaces(video, false);

        if (predictions && predictions.length === 1) {
          // Candidate present in frame!
          if (outOfFrameStartTimeRef.current !== null) {
            // Candidate just returned to frame! Calculate total duration of this incident.
            const sessionDurationSeconds = Math.max(1, Math.floor((Date.now() - outOfFrameStartTimeRef.current) / 1000));
            outOfFrameStartTimeRef.current = null;

            setOutOfFrameCount((prev) => {
              const newTotalSeconds = prev + sessionDurationSeconds;
              if (storageKey) {
                try {
                  localStorage.setItem(storageKey, newTotalSeconds.toString());
                } catch (e) {
                  console.error("Failed to save to localStorage:", e);
                }
              }

              if (interviewId) {
                // Single DB sync upon returning
                fetch(`/api/interviews/${interviewId}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ outOfFrameCount: newTotalSeconds }),
                }).catch((err) => console.error("Failed to sync DB:", err));

                // Single log event upon returning
                fetch(`/api/events`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    eventType: "CAMERA_OUT_OF_FRAME",
                    interviewId,
                    details: {
                      reason: "no-person detected please come in the frame",
                      durationSeconds: sessionDurationSeconds,
                      totalSecondsOutOfFrame: newTotalSeconds,
                    },
                  }),
                }).catch((err) => console.error("Failed to log event:", err));
              }

              return newTotalSeconds;
            });
          }

          consecutiveMissRef.current = 0;
          setShowWarning(false);
        } else if (predictions && predictions.length > 1) {
          // Multiple faces / people detected!
          consecutiveMissRef.current += 1;
          if (consecutiveMissRef.current >= missThreshold) {
            const warningReason = "Multiple persons detected in frame — only candidate allowed";
            setWarningMessage(warningReason);
            setShowWarning(true);
            consecutiveMissRef.current = 0;

            multiplePeopleCountRef.current += 1;
            const newCount = multiplePeopleCountRef.current;
            if (interviewId) {
              fetch(`/api/interviews/${interviewId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ multiplePeopleCount: newCount }),
              }).catch((err) => console.error("Failed to sync DB:", err));

              fetch(`/api/events`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  eventType: "MULTIPLE_PERSONS_DETECTED",
                  interviewId,
                  details: { reason: warningReason, facesFound: predictions.length },
                }),
              }).catch((err) => console.error("Failed to log event:", err));
            }
          }
        } else {
          // No face detected by ML model!
          if (outOfFrameStartTimeRef.current === null) {
            outOfFrameStartTimeRef.current = Date.now();
          }

          const currentSessionSeconds = Math.max(1, Math.floor((Date.now() - outOfFrameStartTimeRef.current) / 1000));
          const baseWarning = "no-person detected please come in the frame";
          
          // Update local UI banner only (NO DB / API CALLS HERE)
          setWarningMessage(`${baseWarning} (Out for ${currentSessionSeconds}s)`);
          setShowWarning(true);
        }
      } catch (err) {
        console.error("BlazeFace estimate error:", err);
      }
    }

    intervalRef.current = setInterval(checkForFace, intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, isCameraReady, isModelLoaded, intervalMs, missThreshold, interviewId, storageKey]);

  return { isCameraReady, showWarning, warningMessage, outOfFrameCount, stream, dismissWarning, videoRef, stopCamera };
}
