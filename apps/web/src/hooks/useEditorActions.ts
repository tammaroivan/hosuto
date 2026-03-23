import React from "react";
import type { FileValidationResult } from "@hosuto/shared";
import { api } from "../lib/api";
import { useSaveFile, useValidateStack, useApplyStack, useRenameFile } from "./useFileMutations";

interface StatusMessage {
  text: string;
  type: "success" | "error";
}

/**
 * Hook for managing editor actions including save, validate, and apply operations.
 */
export const useEditorActions = (
  stackName: string,
  selectedFile: string | null,
  buffers: Map<string, string>,
  callbacks: {
    clearBuffer: (path: string) => void;
    clearAllBuffers: () => void;
    loadContentIntoBuffer: (content: string) => void;
    selectFile: (path: string) => void;
  },
) => {
  const saveFile = useSaveFile();
  const validateStack = useValidateStack();
  const applyStack = useApplyStack();
  const renameFileMutation = useRenameFile();

  const [validationResult, setValidationResult] = React.useState<FileValidationResult | null>(null);
  const [validationOpen, setValidationOpen] = React.useState(false);
  const [applyConfirm, setApplyConfirm] = React.useState(false);
  const [statusMessage, setStatusMessage] = React.useState<StatusMessage | null>(null);

  React.useEffect(() => {
    if (!statusMessage) {
      return;
    }

    const timer = setTimeout(() => setStatusMessage(null), 3000);
    return () => clearTimeout(timer);
  }, [statusMessage]);

  React.useEffect(() => {
    if (!applyConfirm) {
      return;
    }

    const timer = setTimeout(() => setApplyConfirm(false), 4000);
    return () => clearTimeout(timer);
  }, [applyConfirm]);

  const handleSave = React.useCallback(async () => {
    if (!selectedFile || !buffers.has(selectedFile)) {
      return;
    }

    try {
      await saveFile.mutateAsync({
        stackName,
        relativePath: selectedFile,
        content: buffers.get(selectedFile)!,
      });
      callbacks.clearBuffer(selectedFile);
      setStatusMessage({ text: "Saved", type: "success" });
    } catch (err) {
      setStatusMessage({ text: `Save failed: ${(err as Error).message}`, type: "error" });
    }
  }, [selectedFile, buffers, stackName, saveFile, callbacks]);

  const saveAllDirty = React.useCallback(async () => {
    if (buffers.size === 0) {
      return;
    }

    await Promise.all(
      [...buffers].map(([path, content]) =>
        saveFile.mutateAsync({ stackName, relativePath: path, content }),
      ),
    );
    callbacks.clearAllBuffers();
  }, [buffers, stackName, saveFile, callbacks]);

  const handleValidate = React.useCallback(async () => {
    try {
      const files = buffers.size > 0 ? Object.fromEntries(buffers) : undefined;
      const result = await validateStack.mutateAsync({ stackName, files });
      setValidationResult(result);
      setValidationOpen(true);
    } catch {
      setStatusMessage({ text: "Validation request failed", type: "error" });
    }
  }, [stackName, buffers, validateStack]);

  const handleApply = React.useCallback(async () => {
    // Second click (confirm) — skip save/validate, just apply
    if (applyConfirm) {
      try {
        await applyStack.mutateAsync({ stackName });
        setStatusMessage({ text: "Applied successfully", type: "success" });
      } catch (err) {
        setStatusMessage({ text: `Apply failed: ${(err as Error).message}`, type: "error" });
      }

      setApplyConfirm(false);
      return;
    }

    try {
      await saveAllDirty();
    } catch (err) {
      setStatusMessage({
        text: `Save failed before apply: ${(err as Error).message}`,
        type: "error",
      });
      return;
    }

    try {
      const result = await validateStack.mutateAsync({ stackName });
      setValidationResult(result);

      if (!result.valid) {
        setValidationOpen(true);
        setStatusMessage({ text: "Validation failed — fix errors before applying", type: "error" });
        return;
      }
    } catch {
      setStatusMessage({ text: "Validation request failed", type: "error" });
      return;
    }

    setApplyConfirm(true);
  }, [stackName, saveAllDirty, validateStack, applyStack, applyConfirm]);

  const handleRevert = React.useCallback(
    async (filename: string) => {
      try {
        const res = await api.files[":stackName"]["history-content"][":filename"].$get({
          param: { stackName, filename },
        });

        if (!res.ok) {
          setStatusMessage({ text: "Failed to load version", type: "error" });
          return;
        }

        const data = await res.json();
        callbacks.loadContentIntoBuffer(data.content);
        setStatusMessage({
          text: "Previous version loaded — review and Save to keep",
          type: "success",
        });
      } catch {
        setStatusMessage({ text: "Failed to load version", type: "error" });
      }
    },
    [stackName, callbacks],
  );

  const handleCreateEnv = React.useCallback(
    async (composeRelativePath: string) => {
      // docker-compose.gaming.yml → .env.gaming
      // docker-compose.yml → .env
      // terminus/compose.yml → terminus/.env
      const fileName = composeRelativePath.split("/").pop() ?? "";
      const dir = composeRelativePath.includes("/")
        ? composeRelativePath.substring(0, composeRelativePath.lastIndexOf("/")) + "/"
        : "";

      let envName = ".env";
      const match = fileName.match(/^docker-compose\.(.+)\.ya?ml$/);
      if (match) {
        envName = `.env.${match[1]}`;
      }

      const envPath = `${dir}${envName}`;
      const content = `# ${envName} — environment variables\n`;

      try {
        await saveFile.mutateAsync({
          stackName,
          relativePath: envPath,
          content,
        });
        callbacks.loadContentIntoBuffer(content);
        callbacks.selectFile(envPath);
        setStatusMessage({
          text: `Created ${envPath} — add env_file: ${envName} to your compose file`,
          type: "success",
        });
      } catch (err) {
        setStatusMessage({
          text: `Failed to create ${envName}: ${(err as Error).message}`,
          type: "error",
        });
      }
    },
    [stackName, saveFile, callbacks],
  );

  const handleRename = React.useCallback(
    async (oldPath: string, newPath: string) => {
      try {
        const result = await renameFileMutation.mutateAsync({
          stackName,
          oldPath,
          newPath,
        });

        callbacks.selectFile(newPath);

        const count = result.affectedFiles.length;
        setStatusMessage({
          text:
            count > 0
              ? `Renamed to ${newPath} — update references in ${result.affectedFiles.join(", ")}`
              : `Renamed to ${newPath}`,
          type: "success",
        });
      } catch (err) {
        setStatusMessage({
          text: `Rename failed: ${(err as Error).message}`,
          type: "error",
        });
      }
    },
    [stackName, renameFileMutation, callbacks],
  );

  // Keyboard shortcut: Ctrl/Cmd+S
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", handler);

    return () => window.removeEventListener("keydown", handler);
  }, [handleSave]);

  return {
    handleSave,
    handleValidate,
    handleApply,
    handleRevert,
    handleCreateEnv,
    handleRename,
    validationResult,
    validationOpen,
    setValidationOpen,
    applyConfirm,
    setApplyConfirm,
    statusMessage,
    isSaving: saveFile.isPending,
    isValidating: validateStack.isPending,
    isApplying: applyStack.isPending,
  };
};
