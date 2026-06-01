import * as vscode from "vscode";
import * as fs from "fs";
import { TemplateGraphIndex, TemplateNode } from "../resolver/templateGraphIndex";
import { TemplateRootsProvider } from "../resolver/templateRoots";
import { resolveToNode, getInheritedScope } from "../resolver/inheritedScope";
import {
  extractBlockDefinitions,
  extractMacroCalls,
  calculateNestingDepth,
  isVariableUsed,
} from "@xubylele/jinja2-enhanced-shared";
import I18n from "../translations";

export const DIAGNOSTIC_COLLECTION_LINT = "jinja2-lint";
export const JHE1200 = "JHE1200";
export const JHE1201 = "JHE1201";
export const JHE1202 = "JHE1202";
export const JHE1203 = "JHE1203";
export const JHE1204 = "JHE1204";

const DEFAULT_NESTING_THRESHOLD = 5;

export class LintEngine implements vscode.Disposable {
  private readonly collection: vscode.DiagnosticCollection;
  private readonly disposables: vscode.Disposable[] = [];

  constructor(
    private readonly index: TemplateGraphIndex,
    private readonly roots: TemplateRootsProvider
  ) {
    this.collection = vscode.languages.createDiagnosticCollection(DIAGNOSTIC_COLLECTION_LINT);
    this.disposables.push(
      this.collection,
      this.index.onDidUpdate(() => {
        void this.refreshAll();
      }),
      this.roots.onDidChange(() => {
        void this.refreshAll();
      })
    );
  }

  async refreshAll(): Promise<void> {
    const nodes = Array.from(this.index.allNodes());
    for (const node of nodes) {
      this.collection.set(node.uri, await this.lintNode(node));
    }
  }

  private async lintNode(node: TemplateNode): Promise<vscode.Diagnostic[]> {
    const out: vscode.Diagnostic[] = [];
    let text: string;
    try {
      const bytes = await vscode.workspace.fs.readFile(node.uri);
      text = Buffer.from(bytes).toString("utf8");
    } catch {
      return out;
    }

    out.push(...this.checkUnusedSet(node, text));
    out.push(...this.checkBlockScopeVars(node, text));
    out.push(...this.checkNestingDepth(text));
    out.push(...(await this.checkMacroArity(node, text)));
    out.push(...this.checkUnusedBlocks(node, text));

    return out;
  }

  private checkUnusedSet(node: TemplateNode, text: string): vscode.Diagnostic[] {
    const out: vscode.Diagnostic[] = [];
    for (const [name, locations] of node.localVars.entries()) {
      const setLocations = locations.filter((l) => l.kind === "set");
      if (setLocations.length === 0) continue;
      if (!isVariableUsed(text, name)) {
        for (const loc of setLocations) {
          out.push(
            this.makeDiag(
              loc.range,
              JHE1200,
              I18n.__("lint.unusedSet", { name }),
              vscode.DiagnosticSeverity.Warning
            )
          );
        }
      }
    }
    return out;
  }

  private checkBlockScopeVars(node: TemplateNode, text: string): vscode.Diagnostic[] {
    const out: vscode.Diagnostic[] = [];
    const blocks = extractBlockDefinitions(text);

    for (const blk of blocks) {
      if (blk.endblockOffset < 0) continue;

      for (const [name, locations] of node.localVars.entries()) {
        const setInside = locations.some((l) => {
          if (l.kind !== "set") return false;
          const offset = this.positionToOffset(text, l.range.start);
          return offset >= blk.blockOffset && offset <= blk.endblockOffset;
        });

        if (!setInside) continue;

        const outsideText =
          text.slice(0, blk.blockOffset) + text.slice(blk.endblockOffset + blk.endblockLength);
        if (isVariableUsed(outsideText, name)) {
          for (const loc of locations) {
            if (loc.kind !== "set") continue;
            out.push(
              this.makeDiag(
                loc.range,
                JHE1201,
                I18n.__("lint.blockScopeVar", { name, block: blk.name }),
                vscode.DiagnosticSeverity.Warning
              )
            );
          }
        }
      }
    }
    return out;
  }

  private checkNestingDepth(text: string): vscode.Diagnostic[] {
    const depth = calculateNestingDepth(text);
    const config = vscode.workspace.getConfiguration("jinja2-html-enhancer");
    const threshold = config.get<number>("nestingDepthThreshold", DEFAULT_NESTING_THRESHOLD);
    if (depth <= threshold) return [];
    return [
      this.makeDiag(
        new vscode.Range(0, 0, 0, 0),
        JHE1202,
        I18n.__("lint.nestingDepth", { depth: String(depth), threshold: String(threshold) }),
        vscode.DiagnosticSeverity.Warning
      ),
    ];
  }

  private async checkMacroArity(node: TemplateNode, text: string): Promise<vscode.Diagnostic[]> {
    const out: vscode.Diagnostic[] = [];
    const calls = extractMacroCalls(text);
    if (calls.length === 0) return out;

    const inherited = await getInheritedScope(node.uri, {
      index: this.index,
      roots: this.roots,
    });

    for (const call of calls) {
      const macroName = call.name;
      let definition: { params: Array<{ name: string; hasDefault: boolean }> } | undefined;

      const localMacro = node.macros.get(macroName);
      if (localMacro) {
        definition = localMacro.definition;
      } else {
        const sym = inherited.find(
          (s) => (s.kind === "macro" || s.kind === "imported-macro") && s.name === macroName
        );
        if (sym) {
          const targetNode = this.index.getNode(sym.originUri);
          definition = targetNode?.macros.get(macroName)?.definition;
        }
      }

      if (!definition) continue;

      const requiredCount = definition.params.filter((p) => !p.hasDefault).length;
      const totalCount = definition.params.length;
      const givenCount = call.args.length;

      if (givenCount < requiredCount || givenCount > totalCount) {
        const range = this.offsetToRange(text, call.nameOffset, call.nameLength);
        const expected =
          requiredCount === totalCount ? String(totalCount) : `${requiredCount}-${totalCount}`;
        out.push(
          this.makeDiag(
            range,
            JHE1203,
            I18n.__("lint.macroArity", { name: macroName, expected, given: String(givenCount) }),
            vscode.DiagnosticSeverity.Warning
          )
        );
      }
    }
    return out;
  }

  private checkUnusedBlocks(node: TemplateNode, text: string): vscode.Diagnostic[] {
    const out: vscode.Diagnostic[] = [];
    if (node.relations.extends) return out;

    const blocks = extractBlockDefinitions(text);
    for (const blk of blocks) {
      if (blk.endblockOffset < 0) continue;
      if (!this.isBlockOverridden(node, blk.name)) {
        const range = this.offsetToRange(text, blk.nameOffset, blk.nameLength);
        out.push(
          this.makeDiag(
            range,
            JHE1204,
            I18n.__("lint.unusedBlock", { name: blk.name }),
            vscode.DiagnosticSeverity.Information
          )
        );
      }
    }
    return out;
  }

  private isBlockOverridden(parentNode: TemplateNode, blockName: string): boolean {
    const roots = this.getRootsCached();
    for (const other of this.index.allNodes()) {
      if (other.uri.toString() === parentNode.uri.toString()) continue;
      if (!other.relations.extends) continue;

      const parent = resolveToNode(other.relations.extends.path, other, this.index, roots);
      if (!parent || parent.uri.toString() !== parentNode.uri.toString()) continue;

      const childText = this.readTextSync(other.uri);
      if (childText) {
        const childBlocks = extractBlockDefinitions(childText);
        if (childBlocks.some((cb) => cb.name === blockName)) {
          return true;
        }
      }
    }
    return false;
  }

  private positionToOffset(text: string, pos: vscode.Position): number {
    const lines = text.split("\n");
    let offset = 0;
    for (let i = 0; i < pos.line; i++) {
      offset += (lines[i]?.length ?? 0) + 1;
    }
    offset += pos.character;
    return offset;
  }

  private offsetToRange(text: string, offset: number, length: number): vscode.Range {
    const lines = text.slice(0, offset).split("\n");
    const line = lines.length - 1;
    const character = lines[line]?.length ?? 0;
    return new vscode.Range(line, character, line, character + length);
  }

  private getRootsCached(): string[] {
    return [];
  }

  private readTextSync(uri: vscode.Uri): string | undefined {
    try {
      return fs.readFileSync(uri.fsPath, "utf8");
    } catch {
      return undefined;
    }
  }

  private makeDiag(
    range: vscode.Range,
    code: string,
    message: string,
    severity: vscode.DiagnosticSeverity
  ): vscode.Diagnostic {
    const d = new vscode.Diagnostic(range, message, severity);
    d.code = code;
    d.source = "jinja2";
    return d;
  }

  dispose(): void {
    for (const d of this.disposables) {
      try {
        d.dispose();
      } catch {
        /* ignore */
      }
    }
    this.disposables.length = 0;
  }
}
