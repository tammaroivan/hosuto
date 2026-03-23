import React from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import type { editor as MonacoEditor } from "monaco-editor";

interface FileEditorProps {
  content: string;
  language: string;
  onChange: (value: string) => void;
  onSave: () => void;
}

const EDITOR_OPTIONS: MonacoEditor.IStandaloneEditorConstructionOptions = {
  minimap: { enabled: false },
  fontSize: 13,
  fontFamily: "'JetBrains Mono', monospace",
  lineNumbers: "on",
  scrollBeyondLastLine: false,
  wordWrap: "on",
  tabSize: 2,
  renderLineHighlight: "line",
  padding: { top: 12 },
  overviewRulerBorder: false,
  scrollbar: {
    verticalScrollbarSize: 8,
    horizontalScrollbarSize: 8,
  },
};

const EDITOR_THEME: MonacoEditor.IStandaloneThemeData = {
  base: "vs-dark",
  inherit: true,
  rules: [],
  colors: {
    "editor.background": "#111113",
    "editor.lineHighlightBackground": "#16161a",
    "editorLineNumber.foreground": "#40404a",
    "editorLineNumber.activeForeground": "#a1a1aa",
    "editor.selectionBackground": "#2a2a3060",
    "editorCursor.foreground": "#06f6d4",
  },
};

export const FileEditor = ({ content, language, onChange, onSave }: FileEditorProps) => {
  const editorRef = React.useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);

  const handleMount: OnMount = React.useCallback(
    (editor, monaco) => {
      editorRef.current = editor;

      monaco.editor.defineTheme("hosuto", EDITOR_THEME);
      monaco.editor.setTheme("hosuto");

      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
        onSave();
      });

      editor.focus();
    },
    [onSave],
  );

  return (
    <Editor
      value={content}
      language={language}
      options={EDITOR_OPTIONS}
      onChange={(value) => onChange(value ?? "")}
      onMount={handleMount}
      loading={
        <div className="flex flex-1 items-center justify-center text-sm text-text-muted">
          Loading editor...
        </div>
      }
    />
  );
};
