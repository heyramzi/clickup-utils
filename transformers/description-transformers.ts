/**
 * ClickUp Task Description Transformers
 * 純粋 (Junsui - Purity)
 *
 * Pure functions for normalizing ClickUp task descriptions into clean markdown.
 *
 * WHY: ClickUp returns descriptions in three different shapes depending on the
 * task editor and request flags:
 *   - Rich-text tasks (new editor): `description` and `text_content` ship raw
 *     Quill Delta JSON; `markdown_description` ships clean markdown.
 *   - Legacy plain/markdown tasks: all three fields ship usable text.
 *   - `markdown_description` is only included when the request adds
 *     `?include_markdown_description=true`.
 *
 * This module canonicalizes the value so callers always write readable markdown
 * to their destination (Google Sheets, etc.) and never leak raw `{"ops":[...]}`.
 *
 * Zero dependencies, zero side effects, framework-agnostic.
 */

//===============================================
// TYPES
//===============================================

interface QuillOp {
  insert?: unknown;
  attributes?: {
    bold?: boolean;
    italic?: boolean;
    list?: "bullet" | "ordered" | "checked" | "unchecked";
  } & Record<string, unknown>;
}

interface QuillDelta {
  ops?: QuillOp[];
}

export interface DescriptionLike {
  description?: string | null;
  markdown_description?: string | null;
}

//===============================================
// PUBLIC API
//===============================================

/**
 * Detects raw Quill Delta JSON shape. Cheap structural check, no full parse.
 * Returns true for strings that start with `{` and reference `"ops"` early.
 */
export function isQuillDeltaJson(value: string): boolean {
  if (typeof value !== "string" || value.length < 2) return false;
  const trimmed = value.trimStart();
  if (!trimmed.startsWith("{")) return false;
  // WHY: scan only the first 64 chars so a stray "ops" later in a long
  // legitimate string can't trigger a false positive.
  return trimmed.slice(0, 64).includes('"ops"');
}

/**
 * Converts a Quill Delta JSON string to markdown.
 *
 * Supports: bold, italic, ordered list, unordered (bullet) list, checked /
 * unchecked checklist items. Unknown attributes pass through as plain text.
 *
 * Returns "" if the input is not parseable as Quill Delta.
 */
export function quillDeltaToMarkdown(json: string): string {
  const delta = parseQuillDelta(json);
  if (!delta) return "";

  // WHY: Quill encodes line-level attributes (lists, checkboxes) on a "\n"
  // insert that follows the line's text inserts. We accumulate text per line,
  // then commit it with the trailing newline's attributes.
  const lines: string[] = [];
  let current = "";
  let orderedCounter = 0;

  for (const op of delta.ops ?? []) {
    if (typeof op.insert !== "string") {
      current += "";
      continue;
    }

    const attrs = op.attributes;
    const segments = op.insert.split("\n");

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const isLineBreak = i < segments.length - 1;

      if (segment.length > 0) {
        current += applyInlineFormatting(segment, attrs);
      }

      if (isLineBreak) {
        const listType = attrs?.list;
        if (listType === "ordered") {
          orderedCounter += 1;
          lines.push(`${orderedCounter}. ${current}`);
        } else {
          orderedCounter = 0;
          if (listType === "bullet") lines.push(`- ${current}`);
          else if (listType === "checked") lines.push(`- [x] ${current}`);
          else if (listType === "unchecked") lines.push(`- [ ] ${current}`);
          else lines.push(current);
        }
        current = "";
      }
    }
  }

  if (current.length > 0) lines.push(current);

  return lines.join("\n");
}

/**
 * Canonical normalizer used by all callers. Always returns markdown.
 *
 * Order of preference:
 *   1. `markdown_description` (clean markdown, requires
 *      `include_markdown_description=true` on the API call).
 *   2. `quillDeltaToMarkdown(description)` when `description` is raw Quill JSON.
 *   3. `description ?? ""` (legacy plain/markdown tasks).
 */
export function normalizeTaskDescription(task: DescriptionLike | null | undefined): string {
  if (!task) return "";

  const md = task.markdown_description;
  if (typeof md === "string" && md.length > 0) return md;

  const description = task.description;
  if (typeof description !== "string" || description.length === 0) return "";

  if (isQuillDeltaJson(description)) return quillDeltaToMarkdown(description);

  return description;
}

//===============================================
// INTERNAL HELPERS
//===============================================

function parseQuillDelta(json: string): QuillDelta | null {
  try {
    const parsed: unknown = JSON.parse(json);
    if (!parsed || typeof parsed !== "object") return null;
    const ops = (parsed as { ops?: unknown }).ops;
    if (!Array.isArray(ops)) return null;
    return { ops: ops as QuillOp[] };
  } catch {
    return null;
  }
}

function applyInlineFormatting(text: string, attrs: QuillOp["attributes"]): string {
  let result = text;
  if (attrs?.italic) result = `*${result}*`;
  if (attrs?.bold) result = `**${result}**`;
  return result;
}
