import React from "react";
import { createRoot } from "react-dom/client";
import { Copy, Code2, Tag, TrendingUp } from "lucide-react";
import { useWidgetProps } from "../hooks/use-widget-props";
import { useOpenAiGlobal } from "../hooks/use-openai-global";
import type { SnippetListOutput, Snippet } from "../types";

function App() {
  const data = useWidgetProps<SnippetListOutput>({ snippets: [] });
  const theme = useOpenAiGlobal("theme");
  const snippets = data?.snippets || [];

  const copyToClipboard = async (code: string, title: string) => {
    try {
      await navigator.clipboard.writeText(code);
      // Could show a toast here
      console.log(`Copied: ${title}`);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className={`w-full ${theme === "dark" ? "dark" : ""}`}>
      <div className="antialiased w-full text-gray-900 dark:text-gray-100 px-4 pb-3 border border-gray-200 dark:border-gray-700 rounded-2xl sm:rounded-3xl overflow-hidden bg-white dark:bg-gray-900">
        {/* Header */}
        <div className="flex flex-row items-center gap-4 border-b border-gray-100 dark:border-gray-800 py-4">
          <div
            className="sm:w-16 w-14 aspect-square rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center"
          >
            <Code2 className="w-8 h-8 text-white" strokeWidth={2} />
          </div>
          <div className="flex-1">
            <div className="text-base sm:text-xl font-semibold">
              Code Snippets
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {snippets.length} snippet{snippets.length !== 1 ? "s" : ""} found
            </div>
          </div>
        </div>

        {/* Snippet List */}
        <div className="min-w-full flex flex-col">
          {snippets.length === 0 ? (
            <div className="py-12 text-center text-gray-500 dark:text-gray-400">
              <Code2 className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No snippets found</p>
            </div>
          ) : (
            snippets.map((snippet, i) => (
              <div
                key={snippet.id}
                className="px-3 -mx-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div
                  style={{
                    borderBottom:
                      i === snippets.length - 1
                        ? "none"
                        : "1px solid",
                    borderBottomColor: theme === "dark" ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)",
                  }}
                  className="py-4"
                >
                  {/* Title and Language Badge */}
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm sm:text-base truncate">
                        {snippet.title}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                        {snippet.language}
                      </span>
                    </div>
                  </div>

                  {/* Description */}
                  {snippet.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                      {snippet.description}
                    </p>
                  )}

                  {/* Code Preview */}
                  <div className="relative group mb-3">
                    <pre className="bg-gray-900 dark:bg-black text-gray-100 rounded-lg p-3 text-xs font-mono overflow-x-auto max-h-32 overflow-y-auto">
                      <code>{snippet.code}</code>
                    </pre>
                    <button
                      onClick={() => copyToClipboard(snippet.code, snippet.title)}
                      className="absolute top-2 right-2 p-1.5 rounded-md bg-gray-800/80 hover:bg-gray-700 text-gray-300 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Copy code"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Tags and Metadata */}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {snippet.category && (
                      <span className="inline-flex items-center gap-1 text-gray-600 dark:text-gray-400">
                        <Tag className="w-3 h-3" />
                        {snippet.category}
                      </span>
                    )}
                    {snippet.usage_count !== undefined && snippet.usage_count > 0 && (
                      <span className="inline-flex items-center gap-1 text-gray-600 dark:text-gray-400">
                        <TrendingUp className="w-3 h-3" />
                        Used {snippet.usage_count}x
                      </span>
                    )}
                    {snippet.tags && snippet.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {snippet.tags.slice(0, 3).map((tag, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                          >
                            {tag}
                          </span>
                        ))}
                        {snippet.tags.length > 3 && (
                          <span className="px-2 py-0.5 text-gray-500 dark:text-gray-400">
                            +{snippet.tags.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// Mount the app
const root = document.getElementById("root");
if (root) {
  createRoot(root).render(<App />);
}
