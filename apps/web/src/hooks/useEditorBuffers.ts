import React from "react";
import type { FileNode } from "@hosuto/shared";

/**
 * Hook for managing editor file buffers and selection state.
 * Tracks unsaved changes to files and provides utilities for buffer management.
 */
export const useEditorBuffers = (files: FileNode[] | undefined) => {
  const [selectedFile, setSelectedFile] = React.useState<string | null>(null);
  const [buffers, setBuffers] = React.useState<Map<string, string>>(new Map());

  const resolvedSelectedFile = React.useMemo(() => {
    if (selectedFile) {
      return selectedFile;
    }
    if (files && files.length > 0) {
      return files[0].relativePath;
    }

    return null;
  }, [selectedFile, files]);

  React.useEffect(() => {
    if (buffers.size === 0) {
      return;
    }

    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", handler);

    return () => window.removeEventListener("beforeunload", handler);
  }, [buffers.size]);

  const currentContent = React.useMemo(() => {
    if (!resolvedSelectedFile) {
      return "";
    }

    if (buffers.has(resolvedSelectedFile)) {
      return buffers.get(resolvedSelectedFile)!;
    }

    const file = files?.find(file => file.relativePath === resolvedSelectedFile);

    return file?.content ?? "";
  }, [resolvedSelectedFile, buffers, files]);

  const dirtyFiles = React.useMemo(() => new Set(buffers.keys()), [buffers]);
  const hasUnsavedChanges = resolvedSelectedFile ? buffers.has(resolvedSelectedFile) : false;

  const selectFile = React.useCallback((relativePath: string) => {
    setSelectedFile(relativePath);
  }, []);

  const updateBuffer = React.useCallback(
    (value: string) => {
      if (!resolvedSelectedFile) {
        return;
      }

      const serverContent =
        files?.find(file => file.relativePath === resolvedSelectedFile)?.content ?? "";

      setBuffers(prev => {
        const next = new Map(prev);
        if (value === serverContent) {
          next.delete(resolvedSelectedFile);
        } else {
          next.set(resolvedSelectedFile, value);
        }

        return next;
      });
    },
    [resolvedSelectedFile, files],
  );

  const discardChanges = React.useCallback(() => {
    if (!resolvedSelectedFile) {
      return;
    }

    setBuffers(prev => {
      const next = new Map(prev);
      next.delete(resolvedSelectedFile);
      return next;
    });
  }, [resolvedSelectedFile]);

  const loadContentIntoBuffer = React.useCallback(
    (content: string) => {
      if (!resolvedSelectedFile) {
        return;
      }

      setBuffers(prev => {
        const next = new Map(prev);
        next.set(resolvedSelectedFile, content);
        return next;
      });
    },
    [resolvedSelectedFile],
  );

  const clearBuffer = React.useCallback((relativePath: string) => {
    setBuffers(prev => {
      const next = new Map(prev);
      next.delete(relativePath);

      return next;
    });
  }, []);

  const clearAllBuffers = React.useCallback(() => {
    setBuffers(new Map());
  }, []);

  return {
    selectedFile: resolvedSelectedFile,
    selectFile,
    currentContent,
    buffers,
    dirtyFiles,
    hasUnsavedChanges,
    updateBuffer,
    discardChanges,
    loadContentIntoBuffer,
    clearBuffer,
    clearAllBuffers,
  };
};
