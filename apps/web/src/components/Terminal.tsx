import React from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";

interface TerminalProps {
  onData: (data: string) => void;
  onResize: (cols: number, rows: number) => void;
}

export const Terminal = React.forwardRef<{ write: (data: string) => void } | null, TerminalProps>(
  ({ onData, onResize }, ref) => {
    const containerRef = React.useRef<HTMLDivElement>(null);
    const termRef = React.useRef<XTerm | null>(null);
    const onDataRef = React.useRef(onData);
    const onResizeRef = React.useRef(onResize);

    React.useEffect(() => {
      onDataRef.current = onData;
      onResizeRef.current = onResize;
    });

    React.useImperativeHandle(ref, () => ({
      write: (data: string) => {
        termRef.current?.write(data);
      },
    }));

    React.useEffect(() => {
      if (!containerRef.current) {
        return;
      }

      const term = new XTerm({
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 13,
        theme: {
          background: "#0d0d0f",
          foreground: "#e4e4e7",
          cursor: "#06f6d4",
          selectionBackground: "#2a2a3060",
        },
        cursorBlink: true,
      });

      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      term.open(containerRef.current);
      fitAddon.fit();
      term.focus();
      termRef.current = term;

      term.onData(data => onDataRef.current(data));
      term.onResize(({ cols, rows }) => onResizeRef.current(cols, rows));

      const resizeObserver = new ResizeObserver(() => {
        fitAddon.fit();
      });
      resizeObserver.observe(containerRef.current);

      setTimeout(() => {
        fitAddon.fit();
        onResizeRef.current(term.cols, term.rows);
      }, 50);

      return () => {
        resizeObserver.disconnect();
        term.dispose();
        termRef.current = null;
      };
    }, []);

    return <div ref={containerRef} className="h-full w-full p-3" />;
  },
);
