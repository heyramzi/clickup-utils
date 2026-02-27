# OpenAPI SDK Generator Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a re-runnable script that downloads ClickUp's official OpenAPI specs (v2 + v3) and generates a complete typed TypeScript SDK into `generated/`.

**Architecture:** A Node.js script pipeline: download specs → parse & group by tag → generate types → generate API client functions → generate barrel exports. Output goes to `generated/` for manual review/merge. Both specs are JSON (v3 is labeled .yaml but serves JSON).

**Tech Stack:** Node.js (zero npm deps — uses built-in `fetch`, `fs`, `path`). Run with `node scripts/generate-sdk/index.mjs`.

---

### Task 1: Create Generator Entry Point & Spec Downloader

**Files:**
- Create: `scripts/generate-sdk/index.mjs`
- Create: `scripts/generate-sdk/download-specs.mjs`

**Step 1: Create the spec downloader**

```javascript
// scripts/generate-sdk/download-specs.mjs
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const SPEC_URLS = {
  v2: "https://developer.clickup.com/openapi/clickup-api-v2-reference.json",
  v3: "https://developer.clickup.com/openapi/ClickUp_PUBLIC_API_V3.yaml",
};

const CACHE_DIR = join(import.meta.dirname, "../../.claude/specs");

export async function downloadSpecs() {
  mkdirSync(CACHE_DIR, { recursive: true });

  const [v2Res, v3Res] = await Promise.all([
    fetch(SPEC_URLS.v2),
    fetch(SPEC_URLS.v3),
  ]);

  if (!v2Res.ok) throw new Error(`Failed to download v2 spec: ${v2Res.status}`);
  if (!v3Res.ok) throw new Error(`Failed to download v3 spec: ${v3Res.status}`);

  const v2 = await v2Res.json();
  const v3 = await v3Res.json(); // Despite .yaml extension, ClickUp serves JSON

  writeFileSync(join(CACHE_DIR, "openapi-v2.json"), JSON.stringify(v2, null, 2));
  writeFileSync(join(CACHE_DIR, "openapi-v3.json"), JSON.stringify(v3, null, 2));

  console.log(`✓ Downloaded v2 spec (${Object.keys(v2.paths).length} paths)`);
  console.log(`✓ Downloaded v3 spec (${Object.keys(v3.paths).length} paths)`);

  return { v2, v3 };
}
```

**Step 2: Create the entry point**

```javascript
// scripts/generate-sdk/index.mjs
import { downloadSpecs } from "./download-specs.mjs";
import { parseSpecs } from "./parse-schemas.mjs";
import { generateTypes } from "./generate-types.mjs";
import { generateApiClient } from "./generate-api-client.mjs";
import { generateBarrelExports } from "./generate-barrel.mjs";

async function main() {
  console.log("=== ClickUp SDK Generator ===\n");

  // Step 1: Download specs
  console.log("1. Downloading OpenAPI specs...");
  const specs = await downloadSpecs();

  // Step 2: Parse & group
  console.log("\n2. Parsing schemas...");
  const groups = parseSpecs(specs);

  // Step 3: Generate types
  console.log("\n3. Generating types...");
  generateTypes(groups);

  // Step 4: Generate API client
  console.log("\n4. Generating API client...");
  generateApiClient(groups);

  // Step 5: Generate barrel exports
  console.log("\n5. Generating barrel exports...");
  generateBarrelExports(groups);

  console.log("\n=== Done! Output in generated/ ===");
}

main().catch((err) => {
  console.error("Generator failed:", err);
  process.exit(1);
});
```

**Step 3: Run to verify download works**

Run: `node scripts/generate-sdk/download-specs.mjs -e "import{downloadSpecs}from'./scripts/generate-sdk/download-specs.mjs';downloadSpecs()"`

Actually, just test by running the entry point (it will fail on missing modules but download should work).

**Step 4: Commit**

```bash
git add scripts/generate-sdk/index.mjs scripts/generate-sdk/download-specs.mjs
git commit -m "feat: add SDK generator entry point and spec downloader"
```

---

### Task 2: Parse & Normalize OpenAPI Specs

**Files:**
- Create: `scripts/generate-sdk/parse-schemas.mjs`

This module takes the raw v2+v3 specs and produces a normalized data structure grouped by API tag (e.g., "Tasks", "Comments", "Chat").

**Step 1: Write the parser**

The parser must:
- Group endpoints by their tag (first tag on each operation)
- Normalize path parameters, query parameters, request bodies, responses
- Resolve `$ref` references within each spec
- Merge v2 and v3 into a unified structure
- Convert tag names to kebab-case file names (e.g., "Time Tracking" → "time-tracking")

Key data structures:

```javascript
// Internal model after parsing
{
  groups: {
    "tasks": {
      tag: "Tasks",
      fileName: "tasks",
      endpoints: [
        {
          operationId: "GetTasks",
          method: "get",
          path: "/v2/list/{list_id}/task",
          apiVersion: "v2",
          summary: "Get Tasks",
          description: "...",
          parameters: [
            { name: "list_id", in: "path", required: true, schema: { type: "string" } },
            { name: "page", in: "query", required: false, schema: { type: "integer" } },
            ...
          ],
          requestBody: null | { schema: { ... }, required: boolean },
          responses: {
            "200": { schema: { ... } }
          }
        },
        ...
      ],
      schemas: { ... } // All referenced component schemas for this group
    },
    ...
  }
}
```

The `$ref` resolver must handle:
- `#/components/schemas/SomeName` → inline the schema
- Nested `$ref` within properties
- `allOf`, `oneOf`, `anyOf` compositions

**Step 2: Commit**

```bash
git add scripts/generate-sdk/parse-schemas.mjs
git commit -m "feat: add OpenAPI spec parser with ref resolution and tag grouping"
```

---

### Task 3: Generate TypeScript Types

**Files:**
- Create: `scripts/generate-sdk/generate-types.mjs`

This module converts parsed schemas to TypeScript interfaces and type aliases.

**Step 1: Write the type generator**

Rules:
- Each tag group → one `generated/types/{tag}.ts` file
- OpenAPI `object` with `properties` → TypeScript `interface`
- OpenAPI `string`/`number`/`boolean`/`integer` → TypeScript primitives
- OpenAPI `array` → TypeScript `Array<T>`
- OpenAPI `enum` → TypeScript union type
- `oneOf`/`anyOf` → TypeScript union type
- `allOf` → TypeScript intersection / merged interface
- Nullable fields → `T | null`
- Optional fields (not in `required` array) → `field?: T`
- Name interfaces with PascalCase based on operation + context (e.g., `GetTasksResponse`, `CreateTaskRequest`)

Naming conventions:
- Response types: `{OperationId}Response` (e.g., `GetTasksResponse`)
- Request body types: `{OperationId}Request` (e.g., `CreateTaskRequest`)
- Query parameter types: `{OperationId}Params` (e.g., `GetTasksParams`)
- Path parameter types: inlined into function signatures (not separate types)
- Inline object schemas: `{ParentName}{PropertyName}` (e.g., `TaskStatus`, `TaskCreator`)

Each file should:
- Have a header comment with generation timestamp
- Export all types
- Use `export interface` for objects, `export type` for unions/aliases

**Step 2: Commit**

```bash
git add scripts/generate-sdk/generate-types.mjs
git commit -m "feat: add TypeScript type generator from OpenAPI schemas"
```

---

### Task 4: Generate API Client Functions

**Files:**
- Create: `scripts/generate-sdk/generate-api-client.mjs`

This module generates typed fetch functions matching the existing `hierarchy-api.ts` pattern.

**Step 1: Write the API client generator**

Each endpoint becomes a function:
- Function name: `camelCase(operationId)` (e.g., `getTasks`, `createTask`)
- First param always `token: string`
- Path params become individual function parameters
- Query params become an optional `params?: {OperationId}Params` object
- Request body becomes a `data: {OperationId}Request` parameter
- Return type is `Promise<{OperationId}Response>`

Pattern (matching existing `hierarchy-api.ts` style):

```typescript
const API_V2_BASE = "https://api.clickup.com/api/v2";
const API_V3_BASE = "https://api.clickup.com/api/v3";

async function request<T>(
  baseUrl: string,
  endpoint: string,
  token: string,
  options?: { method?: string; body?: unknown; params?: Record<string, unknown> },
): Promise<T> {
  const url = new URL(`${baseUrl}${endpoint}`);
  if (options?.params) {
    for (const [key, value] of Object.entries(options.params)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
  }
  const response = await fetch(url.toString(), {
    method: options?.method ?? "GET",
    headers: {
      Authorization: token.startsWith("Bearer ") ? token : `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    ...(options?.body ? { body: JSON.stringify(options.body) } : {}),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ClickUp API error (${response.status}): ${errorText}`);
  }
  return response.json();
}
```

Each tag group → one `generated/api/{tag}.api.ts` file.

File upload endpoints (attachments) should use `FormData` instead of JSON.

**Step 2: Commit**

```bash
git add scripts/generate-sdk/generate-api-client.mjs
git commit -m "feat: add API client function generator"
```

---

### Task 5: Generate Barrel Exports

**Files:**
- Create: `scripts/generate-sdk/generate-barrel.mjs`

**Step 1: Write the barrel generator**

Creates three index files:
- `generated/types/index.ts` — re-exports all type files
- `generated/api/index.ts` — re-exports all api files
- `generated/index.ts` — re-exports types and api barrels

**Step 2: Commit**

```bash
git add scripts/generate-sdk/generate-barrel.mjs
git commit -m "feat: add barrel export generator"
```

---

### Task 6: Run Full Generator & Validate Output

**Step 1: Run the generator**

Run: `node scripts/generate-sdk/index.mjs`

**Step 2: Verify output**

- Check `generated/types/` has one file per API tag (~25 files)
- Check `generated/api/` has one file per API tag (~25 files)
- Spot-check types against existing hand-written types for accuracy
- Check that all 102 endpoints have corresponding functions

**Step 3: Add generated/ to .gitignore (optional)**

The user may want to commit generated code or not. Add a note in the generated files that they are auto-generated.

**Step 4: Commit**

```bash
git add scripts/generate-sdk/ generated/ .gitignore
git commit -m "feat: complete SDK generator with full v2+v3 type and API client generation"
```

---

### Task 7: Final Validation & Cleanup

**Step 1: Compare generated types against existing hand-written types**

Spot-check key types:
- `generated/types/tasks.ts` vs `types/clickup-task-types.ts`
- `generated/types/comments.ts` vs `types/clickup-comment-types.ts`
- `generated/api/tasks.api.ts` vs `api/hierarchy-api.ts` (for the hierarchy endpoints)

**Step 2: Type-check the generated code**

Run: `npx tsc --noEmit --strict generated/index.ts` (or equivalent)

**Step 3: Document usage**

Add a brief section to README or a comment in the generator about how to re-run it.

**Step 4: Final commit**

```bash
git add .
git commit -m "docs: add generator documentation and validation"
```
