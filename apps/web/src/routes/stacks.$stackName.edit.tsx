import React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useStackFileTree } from "../hooks/useStackFiles";
import { useEditorBuffers } from "../hooks/useEditorBuffers";
import { useEditorActions } from "../hooks/useEditorActions";
import { Text } from "../components/ui/text";
import { Button } from "../components/ui/Button";
import { FileTree } from "../components/editor/FileTree";
import { EditorToolbar } from "../components/editor/EditorToolbar";
import { FileEditor } from "../components/editor/FileEditor";
import { ValidationPanel } from "../components/editor/ValidationPanel";

const FILE_TYPE_TO_LANGUAGE: Record<string, string> = {
  compose: "yaml",
  env: "ini",
  other: "plaintext",
};

const StackEditor = () => {
  const { stackName } = Route.useParams();
  const [sidebarWidth, setSidebarWidth] = React.useState(280);
  const resizing = React.useRef(false);
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
    return (
      <div className="flex-1 p-8">
        <Text color="secondary">Loading files...</Text>
      </div>
    );
  }

  if (fileTree.isError || !fileTree.data) {
    return (
      <div className="flex-1 p-8">
        <Text color="danger">Failed to load stack files.</Text>
      </div>
    );
  }

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col px-8 py-6">
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
              className="w-1 shrink-0 cursor-col-resize bg-transparent transition-colors hover:bg-primary/30 active:bg-primary/50"
              onMouseDown={event => {
                event.preventDefault();
                resizing.current = true;
                const startX = event.clientX;
                const startWidth = sidebarWidth;

                const onMouseMove = (moveEvent: MouseEvent) => {
                  if (!resizing.current) {
                    return;
                  }

                  const newWidth = Math.max(
                    160,
                    Math.min(480, startWidth + moveEvent.clientX - startX),
                  );
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
                      fileTree.data.files.find(file => file.relativePath === selectedFile)?.type ??
                        "other"
                    ] ?? "plaintext"
                  }
                  onChange={updateBuffer}
                  onSave={actions.handleSave}
                />
              ) : (
                <div className="flex flex-1 items-center justify-center">
                  <Text color="secondary">Select a file from the sidebar</Text>
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

      {actions.applyConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-border bg-surface-elevated p-6 shadow-2xl">
            <div className="mb-6">
              <Text as="h3" weight="bold" color="white" className="mb-2">
                Apply Configuration
              </Text>
              <Text as="p" color="secondary" className="leading-relaxed">
                This will run <code className="font-mono text-primary">docker compose up -d</code>{" "}
                for <strong className="text-white">{stackName}</strong> and restart updated
                services.
              </Text>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => actions.setApplyConfirm(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={actions.handleApply} disabled={actions.isApplying}>
                {actions.isApplying ? "Applying..." : "Confirm Apply"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export const Route = createFileRoute("/stacks/$stackName/edit")({
  component: StackEditor,
});
