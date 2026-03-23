import { X, Check, AlertTriangle } from "lucide-react";
import type { FileValidationResult } from "@hosuto/shared";

interface ValidationPanelProps {
  result: FileValidationResult | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ValidationPanel = ({ result, isOpen, onClose }: ValidationPanelProps) => {
  if (!isOpen || !result) {
    return null;
  }

  return (
    <div className="shrink-0 border-t border-border bg-surface">
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2">
          {result.valid ? (
            <>
              <Check size={14} className="text-accent-green" />
              <span className="text-sm font-bold text-accent-green">Configuration valid</span>
            </>
          ) : (
            <>
              <AlertTriangle size={14} className="text-accent-rose" />
              <span className="text-sm font-bold text-accent-rose">Validation failed</span>
            </>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-text-muted transition-colors hover:text-text-primary"
        >
          <X size={14} />
        </button>
      </div>
      <div className="max-h-48 overflow-auto px-4 pb-3">
        <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-text-muted">
          {result.valid ? result.output : result.errors}
        </pre>
      </div>
    </div>
  );
};
