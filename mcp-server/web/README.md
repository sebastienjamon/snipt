# Snipt React Widgets

This directory contains React-based UI widgets for the Snipt MCP server, following OpenAI's recommended architecture for custom ChatGPT UX components.

## Architecture

- **React + TypeScript** - Type-safe component development
- **Vite** - Fast build system
- **Tailwind CSS** - Utility-first styling
- **Custom Hooks** - Access `window.openai` API

## Directory Structure

```
web/
├── src/
│   ├── hooks/
│   │   ├── use-openai-global.ts   # Hook to access window.openai
│   │   └── use-widget-props.ts    # Hook to get tool output data
│   ├── snippet-list/
│   │   └── index.tsx               # Snippet list widget
│   ├── types.ts                    # TypeScript definitions
│   └── index.css                   # Global styles
├── assets/                          # Build output (served on port 4444)
├── package.json
├── vite.config.ts
├── build.mts                        # Build script
└── README.md
```

## Development Workflow

### 1. Install Dependencies

```bash
cd web
npm install
```

### 2. Build Widgets

```bash
npm run build
```

This builds all widgets in `src/**/index.tsx` and outputs them to `assets/`:
- `snippet-list.html` - Standalone HTML file
- `snippet-list.js` - Bundled JavaScript
- `snippet-list.css` - Compiled styles

### 3. Serve Assets Locally

```bash
npm run serve
```

This starts a static file server on http://localhost:4444 with CORS enabled.

### 4. Run MCP Server

In the parent directory:

```bash
cd ..
npm run dev:http
```

The MCP server will reference widgets from http://localhost:4444.

## How It Works

### Data Flow

1. **ChatGPT calls MCP tool** (e.g., `search_snippets`)
2. **MCP server returns structured data** in `structuredContent` field
3. **ChatGPT renders widget** by loading HTML from `openai/outputTemplate` URL
4. **Widget accesses data** via `window.openai.toolOutput.structuredContent`
5. **React renders UI** with the snippet data

### Widget Integration

The MCP server references widgets via `_meta` in tool definitions:

```typescript
{
  _meta: {
    "openai/outputTemplate": "http://localhost:4444/snippet-list.html",
    "openai/widgetAccessible": true
  }
}
```

### React Hooks

#### `useOpenAiGlobal(key)`

Reactively access `window.openai` properties:

```tsx
const theme = useOpenAiGlobal("theme"); // "light" | "dark"
const displayMode = useOpenAiGlobal("displayMode"); // "inline" | "pip" | "fullscreen"
```

#### `useWidgetProps<T>(defaultState?)`

Get structured data from tool output:

```tsx
const data = useWidgetProps<SnippetListOutput>({ snippets: [] });
const snippets = data?.snippets || [];
```

## Adding New Widgets

1. **Create component directory**: `src/my-widget/`
2. **Add `index.tsx`**: Export your React component
3. **Build**: `npm run build` - Automatically detects new widgets
4. **Reference in MCP server**: Update tool `_meta` to point to `http://localhost:4444/my-widget.html`

## Production Deployment

For production, you'll need to:

1. **Host assets on CDN** or static server with HTTPS
2. **Update `WIDGET_URL`** environment variable in MCP server
3. **Enable CORS** on your asset server

Example:

```bash
export WIDGET_URL=https://widgets.snipt.app
```

## Resources

- [OpenAI Apps SDK Examples](https://github.com/openai/openai-apps-sdk-examples)
- [Building Custom UX](https://developers.openai.com/apps-sdk/build/custom-ux)
- [MCP Documentation](https://modelcontextprotocol.io)
