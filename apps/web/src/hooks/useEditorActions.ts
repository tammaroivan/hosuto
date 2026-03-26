import React from "react";
import toast from "react-hot-toast";
import type { FileValidationResult } from "@hosuto/shared";
import { useSaveFile, useValidateStack, useApplyStack, useRenameFile } from "./useFileMutations";

export const useEditorActions = (
  stackName: string,
  selectedFile: string | null,
  buffers: Map<string, string>,
  callbacks: {
    clearBuffer: (path: string) => void;
    clearAllBuffers: () => void;
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
      toast.success("Saved");
    } catch (err) {
      toast.error(`Save failed: ${(err as Error).message}`);
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
      toast.error("Validation request failed");
    }
  }, [stackName, buffers, validateStack]);

  const handleApply = React.useCallback(async () => {
    if (applyConfirm) {
      try {
        await applyStack.mutateAsync({ stackName });
        toast.success("Applied successfully");
      } catch (err) {
        toast.error(`Apply failed: ${(err as Error).message}`);
      }

      setApplyConfirm(false);
      return;
    }

    try {
      await saveAllDirty();
    } catch (err) {
      toast.error(`Save failed: ${(err as Error).message}`);
      return;
    }

    try {
      const result = await validateStack.mutateAsync({ stackName });
      setValidationResult(result);

      if (!result.valid) {
        setValidationOpen(true);
        toast.error("Validation failed — fix errors before applying");
        return;
      }
    } catch {
      toast.error("Validation request failed");
      return;
    }

    setApplyConfirm(true);
  }, [stackName, saveAllDirty, validateStack, applyStack, applyConfirm]);

  const handleRename = React.useCallback(
    async (oldPath: string, newPath: string) => {
      try {
        await renameFileMutation.mutateAsync({ stackName, oldPath, newPath });
        callbacks.selectFile(newPath);
        toast.success(`Renamed to ${newPath}`);
      } catch (err) {
        toast.error(`Rename failed: ${(err as Error).message}`);
      }
    },
    [stackName, renameFileMutation, callbacks],
  );

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
    handleRename,
    validationResult,
    validationOpen,
    setValidationOpen,
    applyConfirm,
    setApplyConfirm,
    isSaving: saveFile.isPending,
    isValidating: validateStack.isPending,
    isApplying: applyStack.isPending,
  };
};
