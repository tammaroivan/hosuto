import React from "react";
import { Check, X, Loader2, History, Folder } from "lucide-react";
import type { FileValidationResult, FileVersion } from "@hosuto/shared";

interface EditorToolbarProps {
  selectedFile: string | null;
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  isValidating: boolean;
  isApplying: boolean;
  validationResult: FileValidationResult | null;
  versions: FileVersion[];
  onSave: () => void;
  onValidate: () => void;
  onApply: () => void;
  onRevert: (filename: string) => void;
  onDiscardChanges: () => void;
}

const ToolbarButton = ({
  label,
  onClick,
  disabled,
  isPending,
  className = "",
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  isPending?: boolean;
  className?: string;
  children?: React.ReactNode;
}) => (
  <button
    onClick={onClick}
    disabled={disabled || isPending}
    className={`flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-bold transition-colors hover:border-border-hover hover:bg-border hover:text-white disabled:opacity-50 ${className}`}
  >
    {isPending && <Loader2 size={12} className="animate-spin" />}
    {children}
    {label}
  </button>
);

const formatVersionDate = (iso: string): string => {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

const Breadcrumb = ({ selectedFile }: { selectedFile: string | null }) => {
  if (!selectedFile) {
    return <span className="text-sm text-text-muted">Select a file to edit</span>;
  }

  const parts = selectedFile.split("/");
  return (
    <div className="flex items-center gap-2 font-mono text-sm text-text-muted">
      <Folder size={12} />
      {parts.map((part, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span className="opacity-40">/</span>}
          <span className={i === parts.length - 1 ? "font-bold text-text-primary" : ""}>
            {part}
          </span>
        </React.Fragment>
      ))}
    </div>
  );
};

export const EditorToolbar = ({
  selectedFile,
  hasUnsavedChanges,
  isSaving,
  isValidating,
  isApplying,
  validationResult,
  versions,
  onSave,
  onValidate,
  onApply,
  onRevert,
  onDiscardChanges,
}: EditorToolbarProps) => {
  const [historyOpen, setHistoryOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!historyOpen) {
      return;
    }

    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setHistoryOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [historyOpen]);

  return (
    <div className="flex shrink-0 items-center justify-between border-b border-border bg-surface px-4 py-2.5">
      <div className="flex items-center gap-3 overflow-hidden">
        <Breadcrumb selectedFile={selectedFile} />
        {hasUnsavedChanges && (
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-accent-cyan" />
            <span className="text-sm font-bold uppercase tracking-wider text-accent-cyan">
              Unsaved
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {hasUnsavedChanges && (
          <ToolbarButton label="Discard" onClick={onDiscardChanges} className="text-text-muted" />
        )}

        <div className="relative" ref={dropdownRef}>
          <ToolbarButton
            label="Revert"
            onClick={() => setHistoryOpen(!historyOpen)}
            disabled={!selectedFile || versions.length === 0}
            className="text-text-muted"
          >
            <History size={12} />
          </ToolbarButton>
          {historyOpen && versions.length > 0 && (
            <div className="absolute right-0 top-full z-50 mt-1 w-64 rounded-md border border-border bg-surface">
              <div className="px-3 py-2 text-sm font-bold uppercase tracking-[0.2em] text-text-muted">
                Previous versions
              </div>
              <div className="max-h-48 overflow-y-auto">
                {versions.map(version => (
                  <button
                    key={version.filename}
                    onClick={() => {
                      onRevert(version.filename);
                      setHistoryOpen(false);
                    }}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-text-primary transition-colors hover:bg-surface-hover"
                  >
                    <span>{formatVersionDate(version.timestamp)}</span>
                    <span className="font-mono text-text-muted">
                      {Math.ceil(version.size / 1024)}KB
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mx-1 h-4 w-px bg-border" />

        <ToolbarButton
          label="Save"
          onClick={onSave}
          disabled={!hasUnsavedChanges || !selectedFile}
          isPending={isSaving}
          className="text-text-muted"
        />

        <div className="flex items-center gap-1.5">
          <ToolbarButton
            label="Validate"
            onClick={onValidate}
            disabled={!selectedFile}
            isPending={isValidating}
            className="text-text-muted"
          />
          {validationResult &&
            !isValidating &&
            (validationResult.valid ? (
              <Check size={14} className="text-accent-green" />
            ) : (
              <X size={14} className="text-accent-rose" />
            ))}
        </div>

        <ToolbarButton
          label="Apply Changes"
          onClick={onApply}
          isPending={isApplying}
          className="border-accent-cyan text-accent-cyan hover:bg-accent-cyan/10"
        />
      </div>
    </div>
  );
};
