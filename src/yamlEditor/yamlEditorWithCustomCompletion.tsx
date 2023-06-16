import React, { useEffect, useRef, useState } from "react";
import * as monaco from "monaco-editor";
import { Uri } from "monaco-editor";
import { setDiagnosticsOptions } from "monaco-yaml";

import { models } from "./models";

import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import yamlWorker from "./yaml.worker.js?worker";

self.MonacoEnvironment = {
  getWorker(_, label) {
    if (label === "yaml") {
      return new yamlWorker();
    }
    return new editorWorker();
  },
};

const YamlEditor: React.FC = () => {
  const [code, setCode] = useState<string>("");
  const editor = useRef<undefined | monaco.editor.IStandaloneCodeEditor>();
  let completionItemProvider: monaco.IDisposable;
  const divEl = useRef<HTMLDivElement>(null);

  const schemaURL =
    "https://raw.githubusercontent.com/deepset-ai/haystack-json-schema/main/json-schema/haystack-pipeline-main.schema.json";

  useEffect(() => {
    if (divEl.current) {
      const modelUri = Uri.parse("");

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

      completionItemProvider = monaco.languages.registerCompletionItemProvider(
        "yaml",
        {
          triggerCharacters: [" ", ":", "/", "-"],
          async provideCompletionItems(model, position) {
            // find out if we are following 'model_name_or_path' object.
            const textUntilPosition = model.getValueInRange({
              startLineNumber: position.lineNumber,
              startColumn: 1,
              endLineNumber: position.lineNumber,
              endColumn: position.column,
            });
            const match = textUntilPosition.match(
              /(model|model_name_or_path|embedding_model|query_embedding_model|passage_embedding_model|table_embedding_model)\s*:\s*.*/
            );
            if (!match) {
              return { suggestions: [] };
            }
            // const matchType = model.findPreviousMatch(
            //   "type",
            //   position,
            //   false,
            //   false,
            //   null,
            //   true
            // );
            // let nodeType = "";
            // if (matchType) {
            //   const { startLineNumber } = matchType.range;
            //   const lineContent = model.getLineContent(startLineNumber);
            //   nodeType = lineContent
            //     .split(":")[1]
            //     .split("#")[0]
            //     .replace(/\s/g, "");
            //   console.log(nodeType);
            // }
            const word = model.getWordUntilPosition(position);

            const range = {
              startLineNumber: position.lineNumber,
              endLineNumber: position.lineNumber,
              startColumn: word.startColumn,
              endColumn: word.endColumn,
            };

            // const line: string = model.getValueInRange({
            //   startLineNumber: position.lineNumber,
            //   endLineNumber: position.lineNumber,
            //   startColumn: 0,
            //   endColumn: word.endColumn,
            // });

            // const organizationName = line
            //   .replace(/\s/g, "")
            //   .split(":")[1]
            //   .split("/")[0];

            const customSuggestions = models.map((suggestedModel: any) => {
              const {
                id,
                pipeline_tag: pipelineTag,
                private: privateModel,
                provider,
              } = suggestedModel;
              const name = id.includes("/") ? id.split("/")[1] : id;
              return {
                label: name,
                kind: monaco.languages.CompletionItemKind.Value,
                documentation: `Provider: ${provider}
      ${pipelineTag || ""}`,
                insertText: name,
                detail: privateModel ? "private" : "public",
                range,
              };
            });
            return {
              suggestions: customSuggestions,
            };
          },
        }
      );

      editor.current = monaco.editor.create(divEl.current, {
        language: "yaml",
        theme: "vs",
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
      completionItemProvider.dispose();
      monaco.editor.getModels().forEach((model) => model.dispose());
      if (editor.current) editor.current.dispose();
    };
  }, []);

  return <div ref={divEl} style={{ height: "100%" }} />;
};

YamlEditor.displayName = "YamlEditor";

export default YamlEditor;
