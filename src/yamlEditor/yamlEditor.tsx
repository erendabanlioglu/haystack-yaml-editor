import React, { useEffect, useRef, useState } from "react";
import * as monaco from "monaco-editor";
import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import yamlWorker from "./yaml.worker.js?worker";
import { setDiagnosticsOptions } from "monaco-yaml";

self.MonacoEnvironment = {
  getWorker(_, label) {
    if (label === "yaml") {
      return new yamlWorker();
    }
    return new editorWorker();
  },
};

export const MONACO_EDITOR_YAML_THEME: monaco.editor.IStandaloneThemeData = {
  base: "vs-dark",
  inherit: true,
  rules: [
    { token: "type", foreground: "#03af9d" },
    { token: "comment", foreground: "#4d4d4d" },
    { token: "string", foreground: "#ffffff" },
    { token: "number", foreground: "#f0ad4e" },
    { token: "keyword", foreground: "#f0ad4e" },
  ],
  colors: {
    "editor.foreground": "#ffffff",
    "editorLineNumber.foreground": "#4d4d4d",
    "editorLineNumber.activeForeground": "#ffffff",
    "minimap.background": "#2a2a2a",
  },
};

const YamlEditor = () => {
  const divEl = useRef<HTMLDivElement>(null);
  const editor = useRef<monaco.editor.IStandaloneCodeEditor | undefined>();
  const [code, setCode] = useState("");

  const schemaURL =
    "https://raw.githubusercontent.com/deepset-ai/haystack-json-schema/main/json-schema/haystack-pipeline-main.schema.json";

  useEffect(() => {
    if (divEl.current) {
      const modelUri = monaco.Uri.parse("a://b/foo.yaml");

      setDiagnosticsOptions({
        enableSchemaRequest: true,
        hover: true,
        completion: true,
        validate: true,
        format: true,
        schemas: [
          {
            uri: schemaURL,
            fileMatch: [String(modelUri)],
          },
        ],
      });

      monaco.editor.defineTheme("yamlEditorTheme", MONACO_EDITOR_YAML_THEME);

      editor.current = monaco.editor.create(divEl.current, {
        language: "yaml",
        theme: "yamlEditorTheme",
        automaticLayout: true,
        model: monaco.editor.createModel(code, "yaml", modelUri),
      });

      editor.current.onDidChangeModelContent(
        (event: monaco.editor.IModelContentChangedEvent) => {
          if (event.isFlush) return;
          if (editor.current) setCode(editor.current.getValue());
        }
      );
    }

    return () => {
      monaco.editor.getModels().forEach((model) => model.dispose());
      if (editor.current) editor.current.dispose();
    };
  }, []);

  return <div ref={divEl} style={{ height: "100%" }} />;
};

export default YamlEditor;
