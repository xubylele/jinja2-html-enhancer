import * as vscode from "vscode";
import { identifierAtOffset } from "@xubylele/jinja2-enhanced-shared";
import {
  TypeHint,
  typeToString,
  formatTypeForHover,
  TypeHintExtractor,
  inferTypeFromUsage,
  mergeTypeHints,
} from "../intelligence/typeHints";
import { BackendIndex } from "../intelligence/backendIndex";
import { TemplateGraphIndex } from "../resolver/templateGraphIndex";
import { TemplateRootsProvider } from "../resolver/templateRoots";
import { getInheritedScope } from "../resolver/inheritedScope";
import I18n from "../translations";

export class TypeHintHover implements vscode.HoverProvider {
  private readonly extractor = new TypeHintExtractor();

  constructor(
    private readonly backendIndex: BackendIndex,
    private readonly templateGraph: TemplateGraphIndex,
    private readonly roots: TemplateRootsProvider
  ) {}

  async provideHover(
    document: vscode.TextDocument,
    position: vscode.Position
  ): Promise<vscode.Hover | undefined> {
    const text = document.getText();
    const offset = document.offsetAt(position);
    const ident = identifierAtOffset(text, offset);
    if (!ident) {
      return undefined;
    }

    const root = this.getRootIdentifier(text, ident.offset);
    if (!root) {
      return undefined;
    }

    const hints: TypeHint[] = [];

    const backendHints = await this.getBackendTypeHints(document.uri, root);
    hints.push(...backendHints);

    const inheritedHints = await this.getInheritedTypeHints(document.uri, root);
    hints.push(...inheritedHints);

    const usageHint = inferTypeFromUsage(text, root);
    if (usageHint) {
      hints.push(usageHint);
    }

    if (hints.length === 0) {
      return undefined;
    }

    const mergedHint = mergeTypeHints(hints);
    const md = new vscode.MarkdownString(undefined, true);
    md.isTrusted = true;
    md.appendMarkdown(formatTypeForHover(mergedHint) + "\n\n");

    if (mergedHint.type.kind === "object" && mergedHint.type.fields.size > 0) {
      md.appendMarkdown(`**${I18n.__("hover.typeHint.fields")}**\n`);
      for (const [field, fieldType] of mergedHint.type.fields.entries()) {
        md.appendMarkdown(`- \`${field}\`: \`${typeToString(fieldType)}\`\n`);
      }
    }

    return new vscode.Hover(md);
  }

  private getRootIdentifier(text: string, identOffset: number): string | undefined {
    let start = identOffset;
    while (start > 0 && /[A-Za-z0-9_.]/.test(text[start - 1])) {
      start--;
    }
    let i = start;
    while (i < text.length && /[A-Za-z0-9_]/.test(text[i])) {
      i++;
    }
    if (i === start || !/[A-Za-z_]/.test(text[start])) {
      return undefined;
    }
    return text.slice(start, i);
  }

  private async getBackendTypeHints(templateUri: vscode.Uri, varName: string): Promise<TypeHint[]> {
    const hints: TypeHint[] = [];
    const locations = this.backendIndex.getLocationsFor(templateUri, varName);

    for (const loc of locations) {
      const lang = this.detectLang(loc.uri);
      if (!lang) continue;

      try {
        const buffer = await vscode.workspace.fs.readFile(loc.uri);
        const text = Buffer.from(buffer).toString("utf8");
        const hint = this.extractor.extractFromBackendCode(text, varName, lang);
        if (hint) {
          hints.push(hint);
        }
      } catch {
        // ignore file read errors
      }
    }

    return hints;
  }

  private async getInheritedTypeHints(
    templateUri: vscode.Uri,
    varName: string
  ): Promise<TypeHint[]> {
    const hints: TypeHint[] = [];
    const inherited = await getInheritedScope(templateUri, {
      index: this.templateGraph,
      roots: this.roots,
    });

    for (const sym of inherited.filter((s) => s.name === varName)) {
      if (sym.kind === "set") {
        hints.push({ type: { kind: "unknown" }, source: "inferred", confidence: "low" });
      }
    }

    return hints;
  }

  private detectLang(uri: vscode.Uri): "py" | "js" | undefined {
    const path = uri.path.toLowerCase();
    if (path.endsWith(".py")) return "py";
    if (path.endsWith(".js") || path.endsWith(".ts")) return "js";
    return undefined;
  }
}
