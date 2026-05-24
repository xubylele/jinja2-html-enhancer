import * as vscode from "vscode";
import { resolveTemplatePath } from "@xubylele/jinja2-enhanced-shared";

/**
 * Return the first existing absolute filesystem path for a tag's path string
 * (`{% extends %}` / `{% include %}` / `{% import %}` / `{% from %}`).
 *
 * Pure path navigation: delegates candidate generation to the shared
 * `resolveTemplatePath` and probes the filesystem. No variable scope — that
 * stays in Jinja2 Enhance Pro.
 */
export async function resolveToFilePath(
  rawPath: string,
  fromFsPath: string | null,
  roots: string[]
): Promise<string | undefined> {
  const candidates = resolveTemplatePath(rawPath, fromFsPath, roots);
  for (const candidate of candidates) {
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(candidate));
      return candidate;
    } catch {
      // try next
    }
  }
  return undefined;
}
