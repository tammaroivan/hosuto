import React from "react";
import { Check, X, Loader2, Folder } from "lucide-react";
import type { FileValidationResult } from "@hosuto/shared";

interface EditorToolbarProps {
  selectedFile: string | null;
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  isValidating: boolean;
  isApplying: boolean;
  validationResult: FileValidationResult | null;
  onSave: () => void;
  onValidate: () => void;
  onApply: () => void;
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
  onSave,
  onValidate,
  onApply,
  onDiscardChanges,
}: EditorToolbarProps) => {
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
