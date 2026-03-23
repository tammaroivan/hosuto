import React from "react";
import type { FileNode } from "@hosuto/shared";
import { FileCode, FileText, File, ChevronDown, ChevronRight, FilePlus } from "lucide-react";

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

const FileItem = ({
  file,
  isActive,
  isDirty,
  indented,
  onSelect,
  onRename,
}: {
  file: FileNode;
  isActive: boolean;
  isDirty: boolean;
  indented?: boolean;
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

      // Select name without extension
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
      onDoubleClick={(e) => {
        if (!onRename) {
          return;
        }

        e.stopPropagation();
        setEditValue(file.name);
        setEditing(true);
      }}
      className={`flex cursor-pointer items-center gap-2.5 rounded py-1.5 text-left text-sm transition-colors ${
        indented ? "pl-7 pr-2.5" : "px-2.5"
      } ${
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
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              commitRename();
            }
            if (e.key === "Escape") {
              setEditing(false);
            }
          }}
          className="min-w-0 flex-1 rounded bg-bg px-1 py-0.5 font-mono text-sm text-white outline-none ring-1 ring-accent-cyan"
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span className="min-w-0 truncate font-mono">{file.name}</span>
      )}
      {isDirty && !editing && (
        <span className="ml-auto h-1 w-1 shrink-0 rounded-full bg-accent-cyan" />
      )}
    </div>
  );
};

/**
 * Groups files as: compose file → its env files nested underneath.
 * Env files without a parent compose file go into an "Other" group.
 */
const buildGroups = (files: FileNode[], entrypoint: string) => {
  const allCompose = files.filter((f) => f.type === "compose");
  const envFiles = files.filter((f) => f.type === "env");
  const otherFiles = files.filter((f) => f.type === "other");

  // Referenced compose files: entrypoint or has includedBy
  const referencedCompose = allCompose.filter(
    (f) => f.path === entrypoint || f.includedBy !== null,
  );
  const unreferencedCompose = allCompose.filter(
    (f) => f.path !== entrypoint && f.includedBy === null,
  );

  const envByParent = new Map<string, FileNode[]>();
  const orphanEnvs: FileNode[] = [];

  for (const env of envFiles) {
    if (env.includedBy) {
      const group = envByParent.get(env.includedBy) ?? [];
      group.push(env);
      envByParent.set(env.includedBy, group);
    } else {
      orphanEnvs.push(env);
    }
  }

  const unreferenced = [...unreferencedCompose, ...orphanEnvs, ...otherFiles];

  return { referencedCompose, envByParent, unreferenced };
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
  const [collapsed, setCollapsed] = React.useState(false);
  const [unreferencedCollapsed, setUnreferencedCollapsed] = React.useState(true);

  if (files.length === 0) {
    return <p className="px-4 py-3 text-sm text-text-muted">No files found</p>;
  }

  const { referencedCompose, envByParent, unreferenced } = buildGroups(files, entrypoint);
  const CollapseIcon = collapsed ? ChevronRight : ChevronDown;
  const UnrefCollapseIcon = unreferencedCollapsed ? ChevronRight : ChevronDown;

  return (
    <div className="flex flex-col gap-4 py-4">
      <div className="flex flex-col gap-1">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="mb-0.5 flex items-center justify-between px-4 text-text-muted transition-colors hover:text-text-primary"
        >
          <span className="text-sm font-bold uppercase tracking-[0.2em]">Files</span>
          <CollapseIcon size={10} className={collapsed ? "opacity-40" : ""} />
        </button>
        {!collapsed && (
          <div className="flex flex-col gap-0.5 px-2">
            {referencedCompose.map((compose) => {
              const childEnvs = envByParent.get(compose.path) ?? [];
              return (
                <React.Fragment key={compose.relativePath}>
                  <div className="flex items-center">
                    <div className="min-w-0 flex-1">
                      <FileItem
                        file={compose}
                        isActive={compose.relativePath === selectedFile}
                        isDirty={dirtyFiles.has(compose.relativePath)}
                        onSelect={() => onSelect(compose.relativePath)}
                        onRename={onRename}
                      />
                    </div>
                    {onCreateEnv && (
                      <button
                        onClick={() => onCreateEnv(compose.relativePath)}
                        title="Create .env file"
                        className="mr-1 shrink-0 rounded p-1 text-text-muted opacity-0 transition-all hover:bg-surface-hover hover:text-accent-cyan group-hover:opacity-100 [div:hover>&]:opacity-100"
                      >
                        <FilePlus size={13} />
                      </button>
                    )}
                  </div>
                  {childEnvs.map((env) => (
                    <FileItem
                      key={env.relativePath}
                      file={env}
                      isActive={env.relativePath === selectedFile}
                      isDirty={dirtyFiles.has(env.relativePath)}
                      indented
                      onSelect={() => onSelect(env.relativePath)}
                      onRename={onRename}
                    />
                  ))}
                </React.Fragment>
              );
            })}
          </div>
        )}
      </div>

      {unreferenced.length > 0 && (
        <div className="flex flex-col gap-1">
          <button
            onClick={() => setUnreferencedCollapsed(!unreferencedCollapsed)}
            className="mb-0.5 flex items-center justify-between px-4 text-text-muted/50 transition-colors hover:text-text-muted"
          >
            <span className="text-sm font-bold uppercase tracking-[0.2em]">Unreferenced</span>
            <div className="flex items-center gap-2">
              <span className="text-sm tabular-nums">{unreferenced.length}</span>
              <UnrefCollapseIcon size={10} className={unreferencedCollapsed ? "opacity-40" : ""} />
            </div>
          </button>
          {!unreferencedCollapsed && (
            <div className="flex flex-col gap-0.5 px-2 opacity-60">
              {unreferenced.map((file) => (
                <FileItem
                  key={file.relativePath}
                  file={file}
                  isActive={file.relativePath === selectedFile}
                  isDirty={dirtyFiles.has(file.relativePath)}
                  onSelect={() => onSelect(file.relativePath)}
                  onRename={onRename}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
