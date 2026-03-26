import React from "react";
import type { FileNode } from "@hosuto/shared";
import { FileCode, FileText, File, ChevronDown, ChevronRight, Folder } from "lucide-react";

interface FileTreeProps {
  files: FileNode[];
  entrypoint: string;
  selectedFile: string | null;
  dirtyFiles: Set<string>;
  onSelect: (relativePath: string) => void;
  onRename?: (oldPath: string, newPath: string) => void;
}

const FILE_ICONS: Record<string, typeof FileCode> = {
  compose: FileCode,
  env: FileText,
  other: File,
};

interface DirNode {
  name: string;
  files: FileNode[];
  dirs: Map<string, DirNode>;
}

/**
 * Builds a directory tree from a flat list of files using their relativePath.
 */
const buildDirTree = (files: FileNode[]): DirNode => {
  const root: DirNode = { name: "", files: [], dirs: new Map() };

  for (const file of files) {
    const parts = file.relativePath.split("/");
    let current = root;

    for (let i = 0; i < parts.length - 1; i++) {
      const dirName = parts[i];
      if (!current.dirs.has(dirName)) {
        current.dirs.set(dirName, { name: dirName, files: [], dirs: new Map() });
      }

      current = current.dirs.get(dirName)!;
    }

    current.files.push(file);
  }

  return root;
};

const FileItem = ({
  file,
  isActive,
  isDirty,
  depth,
  onSelect,
}: {
  file: FileNode;
  isActive: boolean;
  isDirty: boolean;
  depth: number;
  onSelect: () => void;
}) => {
  const Icon = FILE_ICONS[file.type] || File;

  return (
    <div
      onClick={onSelect}
      style={{ paddingLeft: `${depth * 16 + 10}px` }}
      className={`flex cursor-pointer items-center gap-2.5 rounded py-1.5 pr-2.5 text-left text-sm transition-colors ${
        isActive
          ? "bg-surface-hover text-white"
          : "text-text-muted hover:bg-surface-hover/50 hover:text-text-primary"
      }`}
    >
      <Icon size={14} className={`shrink-0 ${isActive ? "text-accent-cyan" : "opacity-40"}`} />
      <span className="min-w-0 truncate font-mono">{file.name}</span>
      {isDirty && <span className="ml-auto h-1 w-1 shrink-0 rounded-full bg-accent-cyan" />}
    </div>
  );
};

const DirEntry = ({
  dir,
  depth,
  selectedFile,
  dirtyFiles,
  onSelect,
}: {
  dir: DirNode;
  depth: number;
  selectedFile: string | null;
  dirtyFiles: Set<string>;
  onSelect: (relativePath: string) => void;
}) => {
  const [collapsed, setCollapsed] = React.useState(false);
  const Icon = collapsed ? ChevronRight : ChevronDown;

  return (
    <div>
      <button
        onClick={() => setCollapsed(!collapsed)}
        style={{ paddingLeft: `${depth * 16 + 10}px` }}
        className="flex w-full items-center gap-2.5 rounded py-1.5 pr-2.5 text-left text-sm text-text-muted transition-colors hover:bg-surface-hover/50 hover:text-text-primary"
      >
        <Folder size={14} className="shrink-0 opacity-40" />
        <span className="min-w-0 truncate font-mono font-medium">{dir.name}</span>
        <Icon size={10} className="ml-auto shrink-0 opacity-40" />
      </button>
      {!collapsed && (
        <div className="flex flex-col gap-0.5">
          {[...dir.dirs.values()].map(subdir => (
            <DirEntry
              key={subdir.name}
              dir={subdir}
              depth={depth + 1}
              selectedFile={selectedFile}
              dirtyFiles={dirtyFiles}
              onSelect={onSelect}
            />
          ))}
          {dir.files.map(file => (
            <FileItem
              key={file.relativePath}
              file={file}
              isActive={file.relativePath === selectedFile}
              isDirty={dirtyFiles.has(file.relativePath)}
              depth={depth + 1}
              onSelect={() => onSelect(file.relativePath)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const FileTree = ({
  files,
  selectedFile,
  dirtyFiles,
  onSelect,
}: FileTreeProps) => {
  if (files.length === 0) {
    return <p className="px-4 py-3 text-sm text-text-muted">No files found</p>;
  }

  const tree = buildDirTree(files);

  return (
    <div className="flex flex-col gap-0.5 px-2 py-4">
      {tree.files.map(file => (
        <FileItem
          key={file.relativePath}
          file={file}
          isActive={file.relativePath === selectedFile}
          isDirty={dirtyFiles.has(file.relativePath)}
          depth={0}
          onSelect={() => onSelect(file.relativePath)}
        />
      ))}
      {[...tree.dirs.values()].map(dir => (
        <DirEntry
          key={dir.name}
          dir={dir}
          depth={0}
          selectedFile={selectedFile}
          dirtyFiles={dirtyFiles}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
};
