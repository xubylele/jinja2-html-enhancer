import * as vscode from "vscode";
import type { BackendIndex } from "../intelligence/backendIndex";
import { identifierAtOffset } from "@xubylele/jinja2-enhanced-shared";

export class BackendDefinitionProvider implements vscode.DefinitionProvider {
  constructor(private readonly index: BackendIndex) {}

  provideDefinition(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.Definition | undefined {
    const offset = document.offsetAt(position);
    const ident = identifierAtOffset(document.getText(), offset);
    if (!ident) {
      return undefined;
    }

    // For dotted access (e.g. `user.name`) jump on the root identifier.
    const root = rootIdentifier(document.getText(), ident.offset, ident.length);
    if (!root) {
      return undefined;
    }

    const locations = this.index.getLocationsFor(document.uri, root);
    if (locations.length === 0) {
      return undefined;
    }
    return locations.map((loc) => new vscode.Location(loc.uri, loc.range));
  }
}

function rootIdentifier(text: string, identOffset: number, identLen: number): string | undefined {
  // Walk backwards from identOffset to the start of the root segment,
  // crossing over `.` separators if any.
  let start = identOffset;
  while (start > 0) {
    const ch = text[start - 1];
    if (ch === "." || /[A-Za-z0-9_]/.test(ch)) {
      start--;
    } else {
      break;
    }
  }
  // Take the leading run of identifier chars from `start`.
  let i = start;
  while (i < text.length && /[A-Za-z0-9_]/.test(text[i])) {
    i++;
  }
  if (i === start) {
    return undefined;
  }
  if (!/[A-Za-z_]/.test(text[start])) {
    return undefined;
  }
  // Sanity: the original identifier must lie within or adjacent to the root chain.
  if (identOffset < start || identOffset > start + (identLen + 256)) {
    return undefined;
  }
  return text.slice(start, i);
}
