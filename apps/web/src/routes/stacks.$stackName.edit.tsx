import React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Box, FileTerminal } from "lucide-react";
import { useStacks } from "../hooks/useStacks";
import { useStackAction } from "../hooks/useStackAction";
import { useStackFileTree } from "../hooks/useStackFiles";
import { useEditorBuffers } from "../hooks/useEditorBuffers";
import { useEditorActions } from "../hooks/useEditorActions";
import { ActionButton } from "../components/ActionButton";
import { FileTree } from "../components/editor/FileTree";
import { EditorToolbar } from "../components/editor/EditorToolbar";
import { FileEditor } from "../components/editor/FileEditor";
import { ValidationPanel } from "../components/editor/ValidationPanel";
import { ContainerTable } from "../components/ContainerTable";

type Tab = "editor" | "containers";

const FILE_TYPE_TO_LANGUAGE: Record<string, string> = {
  compose: "yaml",
  env: "ini",
  other: "plaintext",
};

const StackEditor = () => {
  const { stackName } = Route.useParams();
  const [activeTab, setActiveTab] = React.useState<Tab>("editor");
  const [sidebarWidth, setSidebarWidth] = React.useState(280);
  const resizing = React.useRef(false);
  const stacks = useStacks();
  const stack = stacks.data?.find(stack => stack.name === stackName);
  const stackAction = useStackAction();
  const isStopped = stack?.status.state === "stopped";
  const fileTree = useStackFileTree(stackName);

  const {
    selectedFile,
    selectFile,
    currentContent,
    buffers,
    dirtyFiles,
    hasUnsavedChanges,
    updateBuffer,
    discardChanges,
    clearBuffer,
    clearAllBuffers,
  } = useEditorBuffers(fileTree.data?.files);

  const actions = useEditorActions(stackName, selectedFile, buffers, {
    clearBuffer,
    clearAllBuffers,
    selectFile,
  });

  if (fileTree.isLoading) {
    return <p className="text-text-muted">Loading files...</p>;
  }

  if (fileTree.isError || !fileTree.data) {
    return <p className="text-accent-rose">Failed to load stack files.</p>;
  }

  const stackState = stack?.status.state ?? "stopped";
  const statusLabel = stack
    ? `${stack.status.running}/${stack.status.expected} Running`
    : "Stopped";
  const statusColor =
    stackState === "running"
      ? "border-accent-green/30 bg-accent-green/5 text-accent-green"
      : stackState === "partial"
        ? "border-yellow-500/30 bg-yellow-500/5 text-yellow-500"
        : "border-border text-text-muted";
  const statusDot =
    stackState === "running"
      ? "bg-accent-green"
      : stackState === "partial"
        ? "bg-yellow-500"
        : "bg-text-muted";

  return (
    <div className="-m-6 flex h-[calc(100vh)] flex-col overflow-hidden">
      <header className="flex shrink-0 flex-col border-b border-border bg-surface/50 px-8 pb-0 pt-6">
        <div className="mb-4">
          <Link
            to="/"
            className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-[0.2em] text-text-muted transition-colors hover:text-text-primary"
          >
            <ArrowLeft size={12} />
            Stacks
          </Link>
        </div>

        <div className="mb-6 flex items-start justify-between">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-white">{stackName}</h1>
              {stack && (
                <div
                  className={`flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-sm font-bold uppercase tracking-wider ${statusColor}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${statusDot}`} />
                  {statusLabel}
                </div>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm text-text-muted">
              {stack && (
                <div className="flex items-center gap-1.5">
                  <Box size={13} />
                  <span className="font-medium">
                    <span className="text-white">{stack.containers.length}</span> Containers
                  </span>
                </div>
              )}
              <div className="flex items-center gap-1.5 font-mono">
                <FileTerminal size={13} />
                <span>{fileTree.data.entrypoint}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {stack &&
              (isStopped ? (
                <>
                  <ActionButton
                    label="Up"
                    className="text-accent-green"
                    disabled={stackAction.isPending}
                    onClick={() => stackAction.mutate({ name: stackName, action: "up" })}
                  />
                  {stack.hasBuildDirectives && (
                    <ActionButton
                      label="Build & Up"
                      disabled={stackAction.isPending}
                      onClick={() => stackAction.mutate({ name: stackName, action: "build-up" })}
                    />
                  )}
                </>
              ) : (
                <>
                  <ActionButton
                    label="Restart"
                    disabled={stackAction.isPending}
                    onClick={() => stackAction.mutate({ name: stackName, action: "restart" })}
                  />
                  <ActionButton
                    label="Pull"
                    disabled={stackAction.isPending}
                    onClick={() => stackAction.mutate({ name: stackName, action: "pull" })}
                  />
                  {stack.hasBuildDirectives && (
                    <ActionButton
                      label="Build"
                      disabled={stackAction.isPending}
                      onClick={() => stackAction.mutate({ name: stackName, action: "build-up" })}
                    />
                  )}
                  <ActionButton
                    label="Down"
                    className="text-accent-rose"
                    disabled={stackAction.isPending}
                    onClick={() => {
                      if (confirm(`Stop and remove all containers in "${stackName}"?`)) {
                        stackAction.mutate({ name: stackName, action: "down" });
                      }
                    }}
                  />
                </>
              ))}
          </div>
        </div>

        <nav className="flex gap-8">
          {(["editor", "containers"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm font-bold uppercase tracking-wider transition-colors ${
                activeTab === tab
                  ? "border-b-2 border-accent-cyan text-accent-cyan"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </header>

      {activeTab === "editor" ? (
        <div className="flex min-h-0 flex-1 flex-col p-8">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-bg">
            <EditorToolbar
              selectedFile={selectedFile}
              hasUnsavedChanges={hasUnsavedChanges}
              isSaving={actions.isSaving}
              isValidating={actions.isValidating}
              isApplying={actions.isApplying}
              validationResult={actions.validationResult}
              onSave={actions.handleSave}
              onValidate={actions.handleValidate}
              onApply={actions.handleApply}
              onDiscardChanges={discardChanges}
            />

            <div className="flex min-h-0 flex-1">
              <aside
                className="shrink-0 overflow-y-auto border-r border-border bg-surface/20"
                style={{ width: sidebarWidth }}
              >
                <FileTree
                  files={fileTree.data.files}
                  entrypoint={fileTree.data.entrypoint}
                  selectedFile={selectedFile}
                  dirtyFiles={dirtyFiles}
                  onSelect={selectFile}
                  onRename={actions.handleRename}
                />
              </aside>
              <div
                className="w-1 shrink-0 cursor-col-resize bg-transparent transition-colors hover:bg-accent-cyan/30 active:bg-accent-cyan/50"
                onMouseDown={e => {
                  e.preventDefault();
                  resizing.current = true;
                  const startX = e.clientX;
                  const startWidth = sidebarWidth;

                  const onMouseMove = (ev: MouseEvent) => {
                    if (!resizing.current) {
                      return;
                    }

                    const newWidth = Math.max(160, Math.min(480, startWidth + ev.clientX - startX));
                    setSidebarWidth(newWidth);
                  };

                  const onMouseUp = () => {
                    resizing.current = false;
                    document.removeEventListener("mousemove", onMouseMove);
                    document.removeEventListener("mouseup", onMouseUp);
                  };

                  document.addEventListener("mousemove", onMouseMove);
                  document.addEventListener("mouseup", onMouseUp);
                }}
              />

              <div className="flex min-w-0 flex-1 flex-col">
                {selectedFile ? (
                  <FileEditor
                    content={currentContent}
                    language={
                      FILE_TYPE_TO_LANGUAGE[
                        fileTree.data.files.find(file => file.relativePath === selectedFile)
                          ?.type ?? "other"
                      ] ?? "plaintext"
                    }
                    onChange={updateBuffer}
                    onSave={actions.handleSave}
                  />
                ) : (
                  <div className="flex flex-1 items-center justify-center text-sm text-text-muted">
                    Select a file from the sidebar
                  </div>
                )}
              </div>
            </div>

            <ValidationPanel
              result={actions.validationResult}
              isOpen={actions.validationOpen}
              onClose={() => actions.setValidationOpen(false)}
            />
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-8">
          <ContainerTable containers={stack?.containers ?? []} />
        </div>
      )}

      {actions.applyConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-6">
            <div className="mb-6">
              <h3 className="mb-2 text-sm font-bold text-white">Apply Configuration</h3>
              <p className="text-sm leading-relaxed text-text-muted">
                This will run{" "}
                <code className="font-mono text-accent-cyan">docker compose up -d</code> for{" "}
                <strong className="text-white">{stackName}</strong> and restart updated services.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => actions.setApplyConfirm(false)}
                className="rounded-md border border-border px-4 py-1.5 text-sm font-bold text-text-muted transition-colors hover:border-border-hover hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={actions.handleApply}
                disabled={actions.isApplying}
                className="rounded-md bg-accent-cyan px-4 py-1.5 text-sm font-bold text-bg transition-colors hover:bg-white disabled:opacity-50"
              >
                {actions.isApplying ? "Applying..." : "Confirm Apply"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const Route = createFileRoute("/stacks/$stackName/edit")({
  component: StackEditor,
});
