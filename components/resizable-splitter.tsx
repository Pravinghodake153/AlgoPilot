"use client";

import { useCallback, useRef, useEffect, useState } from "react";

interface ResizableSplitterProps {
  splitPercent: number;
  onResize: (percent: number) => void;
  /** Direction of the split */
  direction: "horizontal" | "vertical";
  /** Minimum size in percent for first panel */
  minFirst?: number;
  /** Maximum size in percent for first panel */
  maxFirst?: number;
}

export function ResizableSplitter({
  splitPercent,
  onResize,
  direction,
  minFirst = 20,
  maxFirst = 80,
}: ResizableSplitterProps) {
  const splitterRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const [active, setActive] = useState(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    setActive(true);
  }, []);

  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (!isDragging.current || !splitterRef.current) return;

      const parent = splitterRef.current.parentElement;
      if (!parent) return;

      const rect = parent.getBoundingClientRect();
      let newPercent: number;

      if (direction === "horizontal") {
        newPercent = ((e.clientX - rect.left) / rect.width) * 100;
      } else {
        newPercent = ((e.clientY - rect.top) / rect.height) * 100;
      }

      newPercent = Math.max(minFirst, Math.min(maxFirst, newPercent));
      onResize(Math.round(newPercent));
    }

    function handleMouseUp() {
      if (isDragging.current) {
        isDragging.current = false;
        setActive(false);
      }
    }

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [direction, minFirst, maxFirst, onResize]);

  const isHorizontal = direction === "horizontal";

  return (
    <div
      ref={splitterRef}
      onMouseDown={handleMouseDown}
      className={`
        relative z-10 flex-shrink-0
        ${isHorizontal ? "w-1 cursor-col-resize" : "h-1 cursor-row-resize"}
        ${active ? "bg-blue-500/60" : "bg-border hover:bg-blue-500/40"}
        transition-colors
      `}
      role="separator"
      aria-orientation={isHorizontal ? "vertical" : "horizontal"}
      aria-valuenow={splitPercent}
      aria-valuemin={minFirst}
      aria-valuemax={maxFirst}
    >
      {/* Wider invisible hit area */}
      <div
        className={`absolute ${
          isHorizontal
            ? "inset-y-0 -left-1 -right-1"
            : "inset-x-0 -top-1 -bottom-1"
        }`}
      />
    </div>
  );
}
