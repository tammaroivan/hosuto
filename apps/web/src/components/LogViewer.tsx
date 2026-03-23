import React from "react";
import type { LogLine } from "../hooks/useContainerLogs";
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
    return <div className="p-4 font-mono text-xs text-text-muted">Loading logs...</div>;
  }

  if (lines.length === 0) {
    return <div className="p-4 font-mono text-xs text-text-muted">No logs available</div>;
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto font-mono text-xs leading-tight"
    >
      <table className="w-full border-collapse">
        <tbody>
          {lines.map((line, i) => (
            <tr key={i} className="group transition-colors hover:bg-surface/30">
              <td className="select-none whitespace-nowrap border-r border-surface-hover px-3 py-0 text-right align-top text-text-muted">
                {formatLogTimestamp(line.timestamp)}
              </td>
              <td
                className={`whitespace-pre-wrap px-4 py-0 ${line.stream === "stderr" ? "text-accent-rose" : "text-text-primary"}`}
              >
                {line.text}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
