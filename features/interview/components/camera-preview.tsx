"use client";

import { useState, useEffect, useRef } from "react";

interface CameraPreviewProps {
  stream: MediaStream | null;
}

export function CameraPreview({ stream }: CameraPreviewProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Position coordinates relative to viewport top-left
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number }>({
    startX: 0,
    startY: 0,
    initialX: 0,
    initialY: 0,
  });

  useEffect(() => {
    const video = videoRef.current;
    if (video && stream) {
      video.srcObject = stream;
      video.play().catch((err) => console.log("Video play error:", err));
    }
  }, [stream]);

  // Handle Drag Start
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    
    dragStartRef.current = {
      startX: clientX,
      startY: clientY,
      initialX: rect.left,
      initialY: rect.top,
    };
    setIsDragging(true);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (e: MouseEvent | TouchEvent) => {
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

      const deltaX = clientX - dragStartRef.current.startX;
      const deltaY = clientY - dragStartRef.current.startY;

      let newX = dragStartRef.current.initialX + deltaX;
      let newY = dragStartRef.current.initialY + deltaY;

      // Clamp inside viewport
      const padding = 8;
      const width = containerRef.current?.offsetWidth || 224;
      const height = containerRef.current?.offsetHeight || 126;

      newX = Math.max(padding, Math.min(window.innerWidth - width - padding, newX));
      newY = Math.max(padding, Math.min(window.innerHeight - height - padding, newY));

      setPosition({ x: newX, y: newY });
    };

    const handleEnd = () => {
      setIsDragging(false);
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleEnd);
    window.addEventListener("touchmove", handleMove);
    window.addEventListener("touchend", handleEnd);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleEnd);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("touchend", handleEnd);
    };
  }, [isDragging]);

  if (!stream) return null;

  const dynamicStyle: React.CSSProperties = position
    ? { left: `${position.x}px`, top: `${position.y}px`, bottom: "auto", right: "auto" }
    : {};

  return (
    <>
      {/* Minimized floating button */}
      {isMinimized && (
        <button
          onClick={() => setIsMinimized(false)}
          style={dynamicStyle}
          className={`fixed z-40 flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-foreground shadow-2xl hover:bg-secondary/80 transition-colors border border-border cursor-grab active:cursor-grabbing ${
            !position ? "bottom-24 right-6" : ""
          }`}
          title="Show Camera Preview (Drag to move)"
          onMouseDown={handleDragStart}
          onTouchStart={handleDragStart}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 7l-7 5 7 5V7z" />
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
          </svg>
        </button>
      )}

      {/* Expanded video window - always mounted in DOM to keep stream active */}
      <div
        ref={containerRef}
        style={dynamicStyle}
        className={`fixed z-40 overflow-hidden rounded-xl border border-border bg-background shadow-2xl transition-shadow duration-200 w-48 sm:w-56 aspect-video ${
          !position ? "bottom-24 right-6" : ""
        } ${isMinimized ? "hidden" : "block"} ${isDragging ? "ring-2 ring-primary select-none opacity-90" : ""}`}
      >
        {/* Drag handle & Title bar */}
        <div
          onMouseDown={handleDragStart}
          onTouchStart={handleDragStart}
          className="absolute top-0 w-full flex items-center justify-between bg-black/50 px-2.5 py-1.5 backdrop-blur-md z-10 opacity-90 hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing select-none"
        >
          <div className="flex items-center gap-1.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-white/80">
              <circle cx="9" cy="5" r="1.5" /><circle cx="9" cy="12" r="1.5" /><circle cx="9" cy="19" r="1.5" />
              <circle cx="15" cy="5" r="1.5" /><circle cx="15" cy="12" r="1.5" /><circle cx="15" cy="19" r="1.5" />
            </svg>
            <span className="text-[11px] font-medium text-white shadow-sm">You</span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsMinimized(true);
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            className="rounded p-1 text-white hover:bg-white/20 transition-colors cursor-pointer"
            title="Hide Camera"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="h-full w-full object-cover -scale-x-100 pointer-events-none"
        />
      </div>
    </>
  );
}
