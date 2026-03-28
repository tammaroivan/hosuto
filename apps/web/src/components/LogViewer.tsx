import React from "react";
import type { LogLine } from "@hosuto/shared";
import { formatLogTimestamp } from "../lib/format";

export const LogViewer = ({ lines, isLoading }: { lines: LogLine[]; isLoading: boolean }) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const autoScrollRef = React.useRef(true);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el || !autoScrollRef.current) {
      return;
    }

    el.scrollTop = el.scrollHeight;
  }, [lines.length]);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) {
      return;
    }

    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    autoScrollRef.current = distanceFromBottom < 50;
  };

  if (isLoading) {
    return <div className="p-4 font-mono text-xs text-text-secondary">Loading logs...</div>;
  }

  if (lines.length === 0) {
    return <div className="p-4 font-mono text-xs text-text-secondary">No logs available</div>;
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto font-mono text-xs leading-relaxed"
    >
      {lines.map((line, index) => (
        <div key={index} className="flex gap-3 py-1 transition-colors hover:bg-surface/30">
          <span className="shrink-0 select-none px-3 text-right text-text-secondary">
            {formatLogTimestamp(line.timestamp)}
          </span>
          <span
            className={`min-w-0 whitespace-pre-wrap ${line.stream === "stderr" ? "text-danger" : "text-text-primary"}`}
          >
            {line.text}
          </span>
        </div>
      ))}
    </div>
  );
};
