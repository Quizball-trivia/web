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
const output = astToString(ast);

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, output);

console.log(`Generated ${outputPath} from ${source}`);
