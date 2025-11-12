import { useOpenAiGlobal } from "./use-openai-global";

export function useWidgetProps<T extends Record<string, unknown>>(
  defaultState?: T | (() => T)
): T {
  const toolOutput = useOpenAiGlobal("toolOutput") as any;

  // Debug logging
  console.log("[useWidgetProps] toolOutput:", toolOutput);
  console.log("[useWidgetProps] structuredContent:", toolOutput?.structuredContent);

  // Access structuredContent from toolOutput
  const props = toolOutput?.structuredContent as T;

  const fallback =
    typeof defaultState === "function"
      ? (defaultState as () => T | null)()
      : defaultState ?? null;

  console.log("[useWidgetProps] final props:", props ?? fallback);

  return props ?? fallback;
}
