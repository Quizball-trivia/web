import fs from "node:fs/promises";
import path from "node:path";
import openapiTS, { astToString } from "openapi-typescript";

const source =
  process.env.OPENAPI_URL ?? "http://localhost:8001/openapi.json";
const outputPath = path.resolve("src/types/api.generated.ts");

async function loadSchema() {
  if (source.startsWith("http://") || source.startsWith("https://")) {
    const response = await fetch(source);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch OpenAPI schema: ${response.status} ${response.statusText}`,
      );
    }
    return response.json();
  }

  const filePath = path.resolve(source);
  const content = await fs.readFile(filePath, "utf8");
  return JSON.parse(content);
}

const schema = await loadSchema();
const ast = await openapiTS(schema);
const generated = astToString(ast);
let existing = "";
try {
  existing = await fs.readFile(outputPath, "utf8");
} catch {
  console.error(`Missing generated file at ${outputPath}. Run api:sync:local.`);
  process.exit(1);
}

if (generated !== existing) {
  console.error("API types are out of date. Run api:sync:local.");
  process.exit(1);
}

console.log("API types are in sync.");
