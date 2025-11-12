import { build, type InlineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import fg from "fast-glob";
import path from "path";
import fs from "fs";

const entries = fg.sync("src/**/index.{tsx,jsx}");
const outDir = "assets";

const GLOBAL_CSS_LIST = [path.resolve("src/index.css")];

function wrapEntryPlugin(
  virtualId: string,
  entryFile: string,
  cssPaths: string[]
): Plugin {
  return {
    name: `virtual-entry-wrapper:${entryFile}`,
    resolveId(id) {
      if (id === virtualId) return id;
    },
    load(id) {
      if (id !== virtualId) {
        return null;
      }

      const cssImports = cssPaths
        .map((css) => `import ${JSON.stringify(css)};`)
        .join("\n");

      return `
    ${cssImports}
    export * from ${JSON.stringify(entryFile)};

    import * as __entry from ${JSON.stringify(entryFile)};
    export default (__entry.default ?? __entry.App);

    import ${JSON.stringify(entryFile)};
  `;
    },
  };
}

// Clean output directory
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

console.log("Building widgets...\n");

for (const file of entries) {
  const name = path.basename(path.dirname(file));
  console.log(`Building ${name}...`);

  const entryAbs = path.resolve(file);
  const globalCss = GLOBAL_CSS_LIST.filter((p) => fs.existsSync(p));
  const virtualId = `\0virtual-entry:${entryAbs}`;

  const createConfig = (): InlineConfig => ({
    plugins: [wrapEntryPlugin(virtualId, entryAbs, globalCss), react()],
    build: {
      outDir,
      emptyOutDir: false,
      rollupOptions: {
        input: virtualId,
        output: {
          entryFileNames: `${name}.js`,
          assetFileNames: (assetInfo) => {
            if (assetInfo.name?.endsWith(".css")) {
              return `${name}.css`;
            }
            return "[name].[ext]";
          },
          manualChunks: undefined,
        },
      },
    },
  });

  await build(createConfig());

  // Create standalone HTML file
  // Use absolute URLs for production, relative for local dev
  const baseUrl = process.env.WIDGET_URL || "";
  const cssPath = baseUrl ? `${baseUrl}/${name}.css` : `./${name}.css`;
  const jsPath = baseUrl ? `${baseUrl}/${name}.js` : `./${name}.js`;

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${name}</title>
  <link rel="stylesheet" href="${cssPath}">
</head>
<body>
  <div id="root"></div>
  <script type="module" src="${jsPath}"></script>
</body>
</html>`;

  fs.writeFileSync(path.join(outDir, `${name}.html`), htmlContent);
  console.log(`✓ Built ${name}.html\n`);
}

console.log("Build complete!");
