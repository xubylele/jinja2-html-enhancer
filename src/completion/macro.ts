import * as vscode from "vscode";
import {
	computeActiveParameter,
	extractMacroDefinitions,
	formatMacroSignatureLabel,
	formatMacroSnippet,
	isInPrintContext,
	parseMacroCallContext,
	type MacroDefinition,
} from "@xubylele/jinja2-enhanced-shared";
import { getInheritedScope, resolveToNode } from "../resolver/inheritedScope";
import { TemplateGraphIndex } from "../resolver/templateGraphIndex";
import { TemplateRootsProvider } from "../resolver/templateRoots";
import I18n from "../translations";

interface CrossFileMacroInfo {
	name: string;
	params: MacroDefinition["params"];
	originUri: vscode.Uri;
	kind: "inherited" | "imported-macro" | "imported-namespace";
	namespace?: string;
}

export class MacroCompletionProvider implements vscode.CompletionItemProvider {
	constructor(
		private readonly graph?: TemplateGraphIndex,
		private readonly roots?: TemplateRootsProvider,
	) {}

	async provideCompletionItems(
		document: vscode.TextDocument,
		position: vscode.Position,
		_token?: vscode.CancellationToken,
		context?: vscode.CompletionContext,
	): Promise<vscode.CompletionItem[] | null> {
		const line = document.lineAt(position).text;
		const textBefore = line.slice(0, position.character);

		if (context?.triggerCharacter === "." && this.graph && this.roots) {
			return this.provideNamespaceCompletions(document, textBefore);
		}

		if (!isInPrintContext(textBefore)) {
			return null;
		}

		const localMacros = extractMacroDefinitions(document.getText()).map((m) =>
			this.localCompletionItem(m),
		);

		if (!this.graph || !this.roots) {
			return localMacros;
		}

		const crossFile = await this.getCrossFileMacros(document.uri);
		return [...localMacros, ...crossFile.map((m) => this.crossFileCompletionItem(m))];
	}

	private async provideNamespaceCompletions(
		document: vscode.TextDocument,
		textBefore: string,
	): Promise<vscode.CompletionItem[]> {
		const dotMatch = textBefore.match(/([A-Za-z_]\w*)\.$/);
		if (!dotMatch || !this.graph || !this.roots) {
			return [];
		}

		const ns = dotMatch[1];
		const node = this.graph.getNode(document.uri);
		if (!node) {
			return [];
		}

		const roots = await this.roots.get();
		const nsImport = node.relations.imports.find(
			(imp) => imp.kind === "import" && imp.alias === ns,
		);
		if (!nsImport) {
			return [];
		}

		const target = resolveToNode(nsImport.path, node, this.graph, roots);
		if (!target) {
			return [];
		}

		return Array.from(target.macros.values()).map(({ definition }) =>
			this.crossFileCompletionItem({
				name: definition.name,
				params: definition.params,
				originUri: target.uri,
				kind: "imported-namespace",
				namespace: ns,
			}),
		);
	}

	private async getCrossFileMacros(uri: vscode.Uri): Promise<CrossFileMacroInfo[]> {
		if (!this.graph || !this.roots) {
			return [];
		}

		const node = this.graph.getNode(uri);
		if (!node) {
			return [];
		}

		const result: CrossFileMacroInfo[] = [];
		const inherited = await getInheritedScope(uri, {
			index: this.graph,
			roots: this.roots,
		});

		for (const sym of inherited) {
			if (sym.kind === "macro" || sym.kind === "imported-macro") {
				const targetNode = this.graph.getNode(sym.originUri);
				const macroDef = targetNode?.macros.get(sym.name);
				if (macroDef) {
					result.push({
						name: sym.name,
						params: macroDef.definition.params,
						originUri: sym.originUri,
						kind: sym.kind === "macro" ? "inherited" : "imported-macro",
					});
				}
			}
		}

		return result;
	}

	private localCompletionItem(macro: MacroDefinition): vscode.CompletionItem {
		const item = new vscode.CompletionItem(macro.name, vscode.CompletionItemKind.Function);
		item.detail = formatMacroSignatureLabel(macro.name, macro.params);
		item.documentation = new vscode.MarkdownString(
			`**${I18n.__("completion.macro.local")}**\n\n` +
				`\`${formatMacroSignatureLabel(macro.name, macro.params)}\``,
		);
		item.insertText = new vscode.SnippetString(formatMacroSnippet(macro.name, macro.params));
		return item;
	}

	private crossFileCompletionItem(macro: CrossFileMacroInfo): vscode.CompletionItem {
		const item = new vscode.CompletionItem(macro.name, vscode.CompletionItemKind.Function);
		item.detail = formatMacroSignatureLabel(macro.name, macro.params);

		const relPath = prettyPath(macro.originUri);
		const originLabel =
			macro.kind === "inherited"
				? I18n.__("completion.macro.inherited", { path: relPath })
				: I18n.__("completion.macro.imported", { path: relPath });

		item.documentation = new vscode.MarkdownString(
			`**${originLabel}**\n\n\`${formatMacroSignatureLabel(macro.name, macro.params)}\``,
		);
		item.insertText = new vscode.SnippetString(formatMacroSnippet(macro.name, macro.params));
		return item;
	}
}

export class MacroSignatureHelpProvider implements vscode.SignatureHelpProvider {
	constructor(
		private readonly graph?: TemplateGraphIndex,
		private readonly roots?: TemplateRootsProvider,
	) {}

	async provideSignatureHelp(
		document: vscode.TextDocument,
		position: vscode.Position,
		_token?: vscode.CancellationToken,
	): Promise<vscode.SignatureHelp | null> {
		const line = document.lineAt(position).text;
		const textBefore = line.slice(0, position.character);

		const call = parseMacroCallContext(textBefore);
		if (!call) {
			return null;
		}

		if (!call.namespace) {
			const macros = extractMacroDefinitions(document.getText());
			const local = macros.find((m) => m.name === call.macroName);
			if (local) {
				return this.buildHelp(
					local,
					call.macroName,
					textBefore,
					I18n.__("signatureHelp.macro.local"),
				);
			}
		}

		if (!this.graph || !this.roots) {
			return null;
		}

		const resolved = await this.resolveCrossFileMacro(
			document.uri,
			call.macroName,
			call.namespace,
		);
		if (!resolved) {
			return null;
		}

		const relPath = prettyPath(resolved.originUri);
		return this.buildHelp(
			resolved.definition,
			call.macroName,
			textBefore,
			I18n.__("signatureHelp.macro.crossFile", { path: relPath }),
		);
	}

	private buildHelp(
		macro: MacroDefinition,
		name: string,
		textBefore: string,
		docLabel: string,
	): vscode.SignatureHelp {
		const label = formatMacroSignatureLabel(name, macro.params);
		const signature = new vscode.SignatureInformation(
			label,
			new vscode.MarkdownString(docLabel),
		);

		signature.parameters = macro.params.map(
			(p) =>
				new vscode.ParameterInformation(
					p.hasDefault ? `${p.name} = …` : p.name,
					p.hasDefault
						? I18n.__("signatureHelp.macro.optional")
						: I18n.__("signatureHelp.macro.required"),
				),
		);

		const help = new vscode.SignatureHelp();
		help.signatures = [signature];
		help.activeSignature = 0;
		help.activeParameter = computeActiveParameter(textBefore);
		return help;
	}

	private async resolveCrossFileMacro(
		uri: vscode.Uri,
		name: string,
		namespace?: string,
	): Promise<{ definition: MacroDefinition; originUri: vscode.Uri } | null> {
		if (!this.graph || !this.roots) {
			return null;
		}

		const node = this.graph.getNode(uri);
		if (!node) {
			return null;
		}

		if (namespace) {
			const roots = await this.roots.get();
			const nsImport = node.relations.imports.find(
				(imp) => imp.kind === "import" && imp.alias === namespace,
			);
			if (!nsImport) {
				return null;
			}

			const target = resolveToNode(nsImport.path, node, this.graph, roots);
			if (!target) {
				return null;
			}

			const macroInfo = target.macros.get(name);
			return macroInfo ? { definition: macroInfo.definition, originUri: target.uri } : null;
		}

		const inherited = await getInheritedScope(uri, {
			index: this.graph,
			roots: this.roots,
		});

		for (const sym of inherited) {
			if ((sym.kind === "macro" || sym.kind === "imported-macro") && sym.name === name) {
				const targetNode = this.graph.getNode(sym.originUri);
				const macroInfo = targetNode?.macros.get(name);
				if (macroInfo) {
					return { definition: macroInfo.definition, originUri: sym.originUri };
				}
			}
		}

		return null;
	}
}

function prettyPath(uri: vscode.Uri): string {
	const folder = vscode.workspace.getWorkspaceFolder(uri);
	if (folder) {
		return uri.fsPath.slice((folder.uri as vscode.Uri).fsPath.length + 1);
	}
	return uri.fsPath;
}
