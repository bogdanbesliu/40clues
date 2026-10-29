import fs from "fs";
import path from "path";
import { DEPRECATED_GEMINI_MODELS } from "../src/config/ai";

/**
 * CI / Pre-commit script that scans codebase to ensure no deprecated Gemini models
 * are reintroduced in code or scripts.
 */
const EXTENSIONS_TO_CHECK = new Set([".ts", ".tsx", ".js", ".jsx", ".json", ".yml", ".yaml"]);
const IGNORED_DIRS = new Set(["node_modules", ".git", ".next"]);
const WHITELISTED_FILES = new Set([
  path.normalize("src/config/ai.ts"),
  path.normalize("scripts/check-models.ts"),
]);

let violations = 0;

function scanDirectory(dir: string) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.normalize(path.relative(process.cwd(), fullPath));

    if (entry.isDirectory()) {
      if (!IGNORED_DIRS.has(entry.name)) {
        scanDirectory(fullPath);
      }
      continue;
    }

    if (WHITELISTED_FILES.has(relPath)) {
      continue;
    }

    const ext = path.extname(entry.name).toLowerCase();
    if (!EXTENSIONS_TO_CHECK.has(ext)) {
      continue;
    }

    const content = fs.readFileSync(fullPath, "utf-8");
    const lines = content.split("\n");

    lines.forEach((line, idx) => {
      for (const deprecatedModel of DEPRECATED_GEMINI_MODELS) {
        if (line.includes(deprecatedModel)) {
          console.error(
            `❌ [DEPRECATED MODEL DETECTED] File: ${relPath}:${idx + 1}`
          );
          console.error(`   Found deprecated model: "${deprecatedModel}"`);
          console.error(`   Line: ${line.trim()}`);
          violations++;
        }
      }
    });
  }
}

console.log("🔍 Scanning codebase for deprecated Gemini model references...");
scanDirectory(process.cwd());

if (violations > 0) {
  console.error(
    `\n❌ Found ${violations} deprecated Gemini model violation(s)!`
  );
  console.error(
    "Please use modern models (e.g. gemini-3.8-flash) or import { resolveGeminiModel } from '@/config/ai'."
  );
  process.exit(1);
} else {
  console.log("✅ No deprecated Gemini models detected across the codebase.");
  process.exit(0);
}
