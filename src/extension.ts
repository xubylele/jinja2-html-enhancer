import * as vscode from 'vscode';

let diagnosticCollection: vscode.DiagnosticCollection;

export function activate(context: vscode.ExtensionContext) {
	diagnosticCollection = vscode.languages.createDiagnosticCollection('jinja2');
	context.subscriptions.push(diagnosticCollection);

	let disposable = vscode.commands.registerCommand('extension.checkJinja2Variables', () => {
		const editor = vscode.window.activeTextEditor;
		if (editor) {
			analyzeDocument(editor.document);
		}
	});

	context.subscriptions.push(disposable);

	let watcher = vscode.workspace.createFileSystemWatcher('**/*.jinja2.html');
	watcher.onDidChange(uri => analyzeDocument(uri));
	watcher.onDidCreate(uri => analyzeDocument(uri));
	context.subscriptions.push(watcher);
}

function analyzeDocument(document: vscode.TextDocument | vscode.Uri) {
	if (document instanceof vscode.Uri) {
		vscode.workspace.openTextDocument(document).then(analyzeDocument);
		return;
	}

	const text = document.getText();
	const variables = extractVariables(text);
	updateDiagnostics(document, variables);
}

function extractVariables(text: string): string[] {
	const variableRegex = /\{\{\s*(\w+)\s*\}\}/g;
	const matches = text.matchAll(variableRegex);
	return [...new Set([...matches].map(match => match[1]))];
}

function updateDiagnostics(document: vscode.TextDocument, variables: string[]) {
	const diagnostics: vscode.Diagnostic[] = [];

	variables.forEach(variable => {
		const regex = new RegExp(`\\{\\{\\s*(${variable})\\s*\\}\\}`, 'g');
		let match;
		while ((match = regex.exec(document.getText())) !== null) {
			const startPos = document.positionAt(match.index);
			const endPos = document.positionAt(match.index + match[0].length);
			const range = new vscode.Range(startPos, endPos);

			const diagnostic = new vscode.Diagnostic(
				range,
				`Variable "${variable}" is used. Make sure it's defined.`,
				vscode.DiagnosticSeverity.Information
			);
			diagnostics.push(diagnostic);
		}
	});

	diagnosticCollection.set(document.uri, diagnostics);
}

export function deactivate() {
	if (diagnosticCollection) {
		diagnosticCollection.clear();
		diagnosticCollection.dispose();
	}
}
