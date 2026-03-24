import React from "react";
import type { FileNode } from "@hosuto/shared";
import {
  FileCode,
  FileText,
  File,
  ChevronDown,
  ChevronRight,
  FilePlus,
  Folder,
} from "lucide-react";

interface FileTreeProps {
  files: FileNode[];
  entrypoint: string;
  selectedFile: string | null;
  dirtyFiles: Set<string>;
  onSelect: (relativePath: string) => void;
  onCreateEnv?: (composePath: string) => void;
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
  label,
  isActive,
  isDirty,
  depth,
  onSelect,
  onRename,
}: {
  file: FileNode;
  label?: string;
  isActive: boolean;
  isDirty: boolean;
  depth: number;
  onSelect: () => void;
  onRename?: (oldPath: string, newName: string) => void;
}) => {
  const Icon = FILE_ICONS[file.type] || File;
  const [editing, setEditing] = React.useState(false);
  const [editValue, setEditValue] = React.useState(file.name);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();

      const dotIdx = editValue.lastIndexOf(".");
      inputRef.current.setSelectionRange(0, dotIdx > 0 ? dotIdx : editValue.length);
    }
  }, [editValue, editing]);

  const commitRename = () => {
    setEditing(false);
    const trimmed = editValue.trim();
    if (!trimmed || trimmed === file.name) {
      return;
    }

    const dir = file.relativePath.includes("/")
      ? file.relativePath.substring(0, file.relativePath.lastIndexOf("/")) + "/"
      : "";
    onRename?.(file.relativePath, `${dir}${trimmed}`);
  };

  return (
    <div
      onClick={onSelect}
      onDoubleClick={e => {
        if (!onRename) {
          return;
        }

        e.stopPropagation();
        setEditValue(file.name);
        setEditing(true);
      }}
      style={{ paddingLeft: `${depth * 16 + 10}px` }}
      className={`flex cursor-pointer items-center gap-2.5 rounded py-1.5 pr-2.5 text-left text-sm transition-colors ${
        isActive
          ? "bg-surface-hover text-white"
          : "text-text-muted hover:bg-surface-hover/50 hover:text-text-primary"
      }`}
    >
      <Icon size={14} className={`shrink-0 ${isActive ? "text-accent-cyan" : "opacity-40"}`} />
      {editing ? (
        <input
          ref={inputRef}
          value={editValue}
          onChange={e => setEditValue(e.target.value)}
          onBlur={commitRename}
          onKeyDown={e => {
            if (e.key === "Enter") {
              commitRename();
            }
            if (e.key === "Escape") {
              setEditing(false);
            }
          }}
          className="min-w-0 flex-1 rounded bg-bg px-1 py-0.5 font-mono text-sm text-white outline-none ring-1 ring-accent-cyan"
          onClick={e => e.stopPropagation()}
        />
      ) : (
        <span className="min-w-0 truncate font-mono">{label ?? file.name}</span>
      )}
      {isDirty && !editing && (
        <span className="ml-auto h-1 w-1 shrink-0 rounded-full bg-accent-cyan" />
      )}
    </div>
  );
};

const DirEntry = ({
  dir,
  depth,
  selectedFile,
  dirtyFiles,
  onSelect,
  onRename,
  onCreateEnv,
  entrypoint,
  allFiles,
}: {
  dir: DirNode;
  depth: number;
  selectedFile: string | null;
  dirtyFiles: Set<string>;
  onSelect: (relativePath: string) => void;
  onRename?: (oldPath: string, newPath: string) => void;
  onCreateEnv?: (composePath: string) => void;
  entrypoint: string;
  allFiles: FileNode[];
}) => {
  const [collapsed, setCollapsed] = React.useState(false);
  const Icon = collapsed ? ChevronRight : ChevronDown;

  const hasEnvFile = dir.files.some(file => file.type === "env");

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
              onRename={onRename}
              onCreateEnv={onCreateEnv}
              entrypoint={entrypoint}
              allFiles={allFiles}
            />
          ))}
          {dir.files.map(file => (
            <div key={file.relativePath} className="flex items-center">
              <div className="min-w-0 flex-1">
                <FileItem
                  file={file}
                  isActive={file.relativePath === selectedFile}
                  isDirty={dirtyFiles.has(file.relativePath)}
                  depth={depth + 1}
                  onSelect={() => onSelect(file.relativePath)}
                  onRename={onRename}
                />
              </div>
              {onCreateEnv && file.type === "compose" && !hasEnvFile && (
                <button
                  onClick={() => onCreateEnv(file.relativePath)}
                  title="Create .env file"
                  className="mr-1 shrink-0 rounded p-1 text-text-muted opacity-0 transition-all hover:bg-surface-hover hover:text-accent-cyan [div:hover>&]:opacity-100"
                >
                  <FilePlus size={13} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const FileTree = ({
  files,
  entrypoint,
  selectedFile,
  dirtyFiles,
  onSelect,
  onCreateEnv,
  onRename,
}: FileTreeProps) => {
  if (files.length === 0) {
    return <p className="px-4 py-3 text-sm text-text-muted">No files found</p>;
  }

  const tree = buildDirTree(files);
  const rootHasEnv = tree.files.some(file => file.type === "env");

  return (
    <div className="flex flex-col gap-0.5 py-4 px-2">
      {tree.files.map(file => (
        <div key={file.relativePath} className="flex items-center">
          <div className="min-w-0 flex-1">
            <FileItem
              file={file}
              isActive={file.relativePath === selectedFile}
              isDirty={dirtyFiles.has(file.relativePath)}
              depth={0}
              onSelect={() => onSelect(file.relativePath)}
              onRename={onRename}
            />
          </div>
          {onCreateEnv && file.type === "compose" && !rootHasEnv && (
            <button
              onClick={() => onCreateEnv(file.relativePath)}
              title="Create .env file"
              className="mr-1 shrink-0 rounded p-1 text-text-muted opacity-0 transition-all hover:bg-surface-hover hover:text-accent-cyan [div:hover>&]:opacity-100"
            >
              <FilePlus size={13} />
            </button>
          )}
        </div>
      ))}
      {[...tree.dirs.values()].map(dir => (
        <DirEntry
          key={dir.name}
          dir={dir}
          depth={0}
          selectedFile={selectedFile}
          dirtyFiles={dirtyFiles}
          onSelect={onSelect}
          onRename={onRename}
          onCreateEnv={onCreateEnv}
          entrypoint={entrypoint}
          allFiles={files}
        />
      ))}
    </div>
  );
};
